import { DisconnectReason, ParticipantAction, WASocket } from 'baileys';
import { Boom } from '@hapi/boom';
import { Socket } from '../socket/socket';
import qrcode from 'qrcode-terminal';

type ConnectionStatus = 'open' | 'close' | 'pending';

export class Session {
  id: string;
  socket: Socket;
  waSocket: WASocket | null = null;
  isConnected: boolean;
  chats: any[] = [];
  showQRCode: boolean;

  constructor(id: string, showQRCode: boolean) {
    this.id = id;
    this.showQRCode = showQRCode;
    this.isConnected = false;
    this.socket = new Socket(id);
  }

  getWASocket() {
    return this.socket.getSocket();
  }

  async connect(): Promise<{
    qrcode: string;
    status: ConnectionStatus;
  }> {
    await this.socket.start();
    this.waSocket = this.socket.getSocket();
    return new Promise((resolve, reject) => {
      this.waSocket!.ev.on('connection.update', async (update) => {
        const statusCode = (update.lastDisconnect?.error as Boom)?.output
          ?.statusCode;
        const { connection, qr } = update;
        if (connection === 'open') {
          this.isConnected = true;
          return resolve({
            qrcode: '',
            status: 'open',
          });
        }
        if (connection === 'close') {
          if (DisconnectReason.restartRequired == statusCode)
            return this.connect();
          resolve({
            qrcode: '',
            status: 'close',
          });
        }
        if (qr && this.id) {
          setTimeout(() => {
            if (!this.isConnected) console.log('Deleted!');
          }, 50 * 1000);
          if (this.showQRCode) qrcode.generate(qr, { small: true });
          resolve({
            qrcode: qr,
            status: 'pending',
          });
        }
      });
      this.waSocket!.ev.on('messaging-history.set', async ({ contacts }) => {
        this.chats = contacts.map((contact) => {
          return { id: contact.id, name: contact.name || 'Desconhecido' };
        });
      });
      this.waSocket!.ev.on('contacts.upsert', async (contacts) => {});
    });
  }

  async updateGroupParticipants(
    groupId: string,
    participants: string[],
    action: ParticipantAction,
  ) {
    const socket = this.socket.getSocket();
    if (!socket) return;
    return await socket.groupParticipantsUpdate(groupId, participants, action);
  }
}
