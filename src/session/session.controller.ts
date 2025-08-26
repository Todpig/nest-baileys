import { Controller, Post, Body } from '@nestjs/common';
import { SessionService } from './session.service';
import type { AnyMessageContent } from 'baileys';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Session')
@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Criar ou iniciar uma sessão' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', example: 'sessao123' },
        showQRCode: { type: 'boolean', example: true },
      },
      required: ['sessionId', 'showQRCode'],
    },
  })
  async create(
    @Body('sessionId') sessionId: string,
    @Body('showQRCode') showQRCode: boolean,
  ) {
    return this.sessionService.createSession({ sessionId, showQRCode });
  }

  @Post('send/message')
  @ApiOperation({ summary: 'Enviar mensagem para destinatários' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', example: 'sessao123' },
        message: {
          oneOf: [
            {
              type: 'object',
              properties: {
                text: { type: 'string', example: 'Olá mundo' },
              },
              required: ['text'],
            },
            {
              type: 'object',
              properties: {
                url: { type: 'string', example: 'https://imagem.com/img.jpg' },
                text: { type: 'string', example: 'Legenda da imagem' },
              },
              required: ['url', 'text'],
            },
            {
              type: 'object',
              properties: {
                url: { type: 'string', example: 'https://video.com/video.mp4' },
                text: { type: 'string', example: 'Legenda do vídeo' },
              },
              required: ['url', 'text'],
            },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Qual sua cor favorita?' },
                values: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Azul', 'Verde', 'Vermelho'],
                },
                selectableCount: { type: 'number', example: 1 },
              },
              required: ['name', 'values'],
            },
          ],
        },
        receivers: {
          type: 'array',
          items: { type: 'string' },
          example: ['5511999999999@s.whatsapp.net'],
        },
        type: {
          type: 'string',
          enum: ['text', 'image', 'video', 'poll'],
          example: 'text',
        },
      },
      required: ['sessionId', 'message', 'receivers', 'type'],
    },
  })
  async sendMessage(
    @Body('sessionId') sessionId: string,
    @Body('message') message: AnyMessageContent,
    @Body('receivers') receivers: string[],
    @Body('type') type: 'text' | 'image' | 'video' | 'poll',
  ) {
    return this.sessionService.sendMessage({
      sessionId,
      message,
      receivers,
      type,
    });
  }
}
