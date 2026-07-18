/* eslint-disable prettier/prettier */
import { Module, Global } from '@nestjs/common';
import { GeoDistanceUtil } from './geo-distance.util';
import { SLACalculatorUtil } from './sla-calculator.util';

@Global()
@Module({
  providers: [
    GeoDistanceUtil,
    SLACalculatorUtil,
  ],
  exports: [
    GeoDistanceUtil,
    SLACalculatorUtil,
  ],
})
export class UtilsModule {}