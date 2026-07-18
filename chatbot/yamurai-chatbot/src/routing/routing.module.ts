import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutingService } from './routing.service';
import { IncidentRoutingRule } from '../database/incident-routing-rule.entity';
import { Department } from '../database/department.entity';
import { Station } from '../database/station.entity';
import { DepartmentStaff } from '../database/department.entity';
import { UtilsModule } from '../shared/utils/utils.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncidentRoutingRule,
      Department,
      Station,
      DepartmentStaff
    ]),
    UtilsModule
  ],
  providers: [RoutingService],
  exports: [RoutingService]
})
export class RoutingModule {}
