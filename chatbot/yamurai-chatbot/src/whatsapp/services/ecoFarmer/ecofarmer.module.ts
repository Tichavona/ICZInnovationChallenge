import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcoFarmerService } from './ecofarmer.service';
import { EcoFarmerSessionService } from './ecofarmer-session.service';
import { FieldContextService } from '../field-context/field-context.service';
import { MessagingService } from '../messaging/messaging.service';
import { SessionManagerService } from '../session-manager.service';
import { 
  ActiveSession, 
  AuthSession, 
  LoginSession, 
  UserSession, 
  RegistrationSession 
} from '../../../database/session.entity';
import { Message } from '../../../database/message.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      ActiveSession, 
      AuthSession,      
      LoginSession, 
      UserSession, 
      RegistrationSession,
      Message]),
  ],
  providers: [
    EcoFarmerService,
    EcoFarmerSessionService,
    FieldContextService,
    MessagingService,
    SessionManagerService,
  ],
  exports: [
    EcoFarmerService,
    EcoFarmerSessionService,
    FieldContextService,
  ],
})
export class EcofarmerModule {}