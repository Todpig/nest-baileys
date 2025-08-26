import { Module } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { SessionController } from 'src/session/session.controller';
import { SessionService } from 'src/session/session.service';
import { pino } from 'pino';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ||
        'mongodb://admin:pass@localhost:27017/auth?authSource=admin',
      {
        dbName: process.env.DB_NAME || 'test',
      },
    ),
  ],
  controllers: [SessionController],
  providers: [
    SessionService,
    {
      provide: 'MONGO_DB',
      useFactory: async (connection) => connection.db,
      inject: [getConnectionToken()],
    },
    {
      provide: 'LOGGER',
      useValue: pino({ level: 'debug' }),
    },
  ],
  exports: ['MONGO_DB', 'LOGGER'],
})
export class AuthModule {}
