import { parentPort } from 'worker_threads';
import { fakeTyping } from '../utils/global';
import { Session } from 'src/session/session';
import { AnyMessageContent, getUrlInfo } from 'baileys';

interface SignalActions {
  start: ({ sessionId }: any) => Promise<void>;
  sendMessage: ({
    receivers,
    type,
    message,
  }: {
    receivers: string[];
    type: 'text' | 'image' | 'video' | 'poll';
    message: AnyMessageContent;
  }) => Promise<void>;
  close: () => Promise<void>;
}

let session: Session;

const formatMessage = {
  text: ({ text }: any) => ({ text }),
  image: ({ url, text }: any) => ({
    image: { url },
    caption: text,
  }),
  video: ({ url, text }: any) => ({
    video: { url },
    caption: text,
  }),
  poll: ({ name, values, selectableCount }: any) => ({
    poll: { name, values, selectableCount },
  }),
};

async function genericSend<T>(
  receivers: string[],
  content: T,
  formatMessage: (content: T) => any,
) {
  if (!session)
    return parentPort?.postMessage({
      signal: 'error',
      data: 'Session not initialized',
    });

  const progress = {
    sentChats: 0,
    unsentChats: 0,
    totalChats: receivers.length,
  };
  const socket = session.getWASocket();
  const formattedMessage = formatMessage(content);
  try {
    const linkPreviewPattern = /http(s)?:\/\/(www\.)?([^\s]+)/g;
    const linkPreviewMatches = formattedMessage.text.match(linkPreviewPattern);
    if (linkPreviewMatches) {
      formattedMessage.linkPreview = await getUrlInfo(linkPreviewMatches[0], {
        thumbnailWidth: 1024,
        fetchOpts: {
          timeout: 5000,
        },
        uploadImage: socket.waUploadToServer,
      });
    }
  } catch (error) {
    console.error(error);
  }
  for (const chat of receivers) {
    try {
      await fakeTyping(socket, chat, formattedMessage.text);
      await socket?.sendMessage(chat, formattedMessage);
      progress.sentChats++;
    } catch (error) {
      console.error(error);
      progress.unsentChats++;
    }
  }
}

const signalsActions: SignalActions = {
  start: async ({ sessionId, showQRCode }: any) => {
    session = new Session(sessionId, showQRCode);
    const { qrcode, status } = await session.connect();
    parentPort?.postMessage({
      signal: 'qrcode',
      data: { qrcode, status },
    });
  },
  sendMessage: async ({
    receivers,
    type,
    message,
  }: Parameters<SignalActions['sendMessage']>[0]) => {
    await genericSend(receivers, message, formatMessage[type]);
  },
  close: async () => {
    if (!session) return;
    parentPort?.postMessage({
      signal: 'close',
      data: 'Close session',
    });
    session.getWASocket()?.end(new Error('Closed by user'));
    process.exit(0);
  },
};

parentPort?.on(
  'message',
  async (message: { signal: keyof SignalActions; data: any }) => {
    try {
      if (signalsActions[message.signal]) {
        signalsActions[message.signal](message.data);
      } else {
        parentPort?.postMessage({
          signal: 'error',
          data: 'Unknown message signal',
        });
      }
    } catch (error: any) {
      parentPort?.postMessage({ signal: 'error', data: error.message });
    }
  },
);
