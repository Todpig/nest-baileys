import { SessionService } from './session.service';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Worker } from 'worker_threads';

jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    on: jest.fn(),
  })),
}));

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
  });

  describe('createSession', () => {
    it('deve lançar ConflictException se a sessão já existe', async () => {
      // @ts-ignore
      service.sessions.set('sessao1', {} as Worker);
      await expect(
        service.createSession({ sessionId: 'sessao1', showQRCode: true }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve criar uma nova sessão e retornar dados', async () => {
      const mockWorker = {
        postMessage: jest.fn(),
        on: jest.fn((event, cb) => {
          if (event === 'message') {
            setTimeout(
              () =>
                cb({
                  signal: 'qrcode',
                  data: { qrcode: 'qr', status: 'pending' },
                }),
              0,
            );
          }
        }),
      } as any;
      jest.spyOn(service as any, 'createWorker').mockReturnValue(mockWorker);

      const result = await service.createSession({
        sessionId: 'sessao2',
        showQRCode: true,
      });
      expect(result).toEqual({ qrcode: 'qr', status: 'pending' });
    });

    it('deve lançar InternalServerErrorException em erro', async () => {
      jest.spyOn(service as any, 'createWorker').mockImplementation(() => {
        throw new Error('erro');
      });
      await expect(
        service.createSession({ sessionId: 'sessao3', showQRCode: true }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('sendMessage', () => {
    it('deve lançar NotFoundException se a sessão não existe', async () => {
      await expect(
        service.sendMessage({
          sessionId: 'naoexiste',
          message: { text: 'oi' },
          receivers: ['123'],
          type: 'text',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve chamar postMessage do worker se sessão existe', async () => {
      const mockWorker = { postMessage: jest.fn() } as any;
      // @ts-ignore
      service.sessions.set('sessao4', mockWorker);
      const result = await service.sendMessage({
        sessionId: 'sessao4',
        message: { text: 'oi' },
        receivers: ['123'],
        type: 'text',
      });
      expect(mockWorker.postMessage).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Enviando mensagem.' });
    });
  });
});
