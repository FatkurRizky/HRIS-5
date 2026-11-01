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
import { CreateOfficeLocationDto } from './dto/create-office-location.dto.js';
import { UpdateOfficeLocationDto } from './dto/update-office-location.dto.js';
import { OfficeLocationService } from './office-location.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('office-locations')
export class OfficeLocationController {
  constructor(
    private readonly officeLocationService: OfficeLocationService,
  ) {}

  @Get()
  findAll() {
    return this.officeLocationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.officeLocationService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreateOfficeLocationDto) {
    return this.officeLocationService.create(dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOfficeLocationDto) {
    return this.officeLocationService.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.officeLocationService.remove(id);
  }
}
