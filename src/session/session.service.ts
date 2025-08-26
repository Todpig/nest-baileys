import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Worker } from 'worker_threads';
import { resolve } from 'path';
import { AnyMessageContent } from 'baileys';

interface UserSession {
  sessionId: string;
  showQRCode: boolean;
}

@Injectable()
export class SessionService {
  private sessions: Map<string, Worker>;

  constructor() {
    this.sessions = new Map<string, Worker>();
  }

  private haveSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  private createWorker(sessionId: string, showQRCode: boolean): Worker {
    const workerPath = resolve(__dirname, '../worker/worker.js');
    const worker = new Worker(workerPath, {
      workerData: { sessionId, showQRCode },
    });

    worker.on('exit', (code) => {
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, worker);
    return worker;
  }

  private startSession(
    sessionId: string,
    showQRCode: boolean,
  ): Promise<{ qrcode: string; status: 'open' | 'close' | 'pending' }> {
    const worker = this.createWorker(sessionId, showQRCode);
    return new Promise((resolve, reject) => {
      worker.postMessage({
        signal: 'start',
        data: { sessionId, showQRCode },
      });
      worker.on('message', (message) => {
        if (message.signal === 'error' || message.signal === 'delete') {
          this.sessions.delete(sessionId);
          return reject(
            new InternalServerErrorException(
              message?.error || 'Falha ao iniciar a sessão',
            ),
          );
        }
        resolve(message.data);
      });

      worker.on('error', (error) =>
        reject(new InternalServerErrorException(error.message)),
      );
    });
  }

  async createSession(userSession: UserSession): Promise<any> {
    if (this.haveSession(userSession.sessionId)) {
      throw new ConflictException('Sessão já existe');
    }
    try {
      return await this.startSession(
        userSession.sessionId,
        userSession.showQRCode,
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Erro ao criar sessão',
      );
    }
  }

  async sendMessage({
    sessionId,
    message,
    receivers,
    type,
  }: {
    sessionId: string;
    message: AnyMessageContent;
    receivers: string[];
    type: 'text' | 'image' | 'video' | 'poll';
  }) {
    const worker = this.sessions.get(sessionId);
    if (!worker) throw new NotFoundException('Sessão não encontrada');
    worker.postMessage({
      signal: 'sendMessage',
      data: { message, receivers, type },
    });

    return { message: 'Enviando mensagem.' };
  }
}
