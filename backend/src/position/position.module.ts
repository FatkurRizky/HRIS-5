import { Module } from '@nestjs/common';
import { PositionController } from './position.controller.js';
import { PositionService } from './position.service.js';

@Module({
  controllers: [PositionController],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}
