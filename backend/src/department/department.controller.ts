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
import { DepartmentService } from './department.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get()
  findAll() {
    return this.departmentService.findAll();
  }

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get(':id/tree')
  getOrgTree(@Param('id') id: string) {
    return this.departmentService.getOrgTree(id);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }
}
