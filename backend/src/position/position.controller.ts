import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreatePositionDto } from './dto/create-position.dto.js';
import { UpdatePositionDto } from './dto/update-position.dto.js';
import { PositionService } from './position.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get()
  findAll() {
    return this.positionService.findAll();
  }

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.positionService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.positionService.remove(id);
  }
}
