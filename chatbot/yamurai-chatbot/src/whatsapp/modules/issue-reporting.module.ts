/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueReportingService } from '../services/reporting/issue-reporting.service';
import { IssueReport } from '../../database/issue-report.entity';
import { User } from '../../database/user.entity';
import { StorageModule } from './storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueReport, User]),
    StorageModule,
  ],
  providers: [
    IssueReportingService,
  ],
  exports: [IssueReportingService]
})
export class IssueReportingModule {}