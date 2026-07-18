/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionManagerService } from '../services/session-manager.service';
import { AuthSession, LoginSession, UserSession, RegistrationSession, ActiveSession } from '../../database/session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthSession,
      LoginSession,
      UserSession,
      RegistrationSession,
      ActiveSession
    ]),
  ],
  providers: [SessionManagerService],
  exports: [SessionManagerService],
})
export class SessionModule {}