import { Module } from '@nestjs/common';
import { OfficeLocationController } from './office-location.controller.js';
import { OfficeLocationService } from './office-location.service.js';

@Module({
  controllers: [OfficeLocationController],
  providers: [OfficeLocationService],
  exports: [OfficeLocationService],
})
export class OfficeLocationModule {}
