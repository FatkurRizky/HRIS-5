import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { EmployeeStatus } from '@prisma/client';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto.js';
import { EmployeeService } from './employee.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get()
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('search') search?: string,
  ) {
    return this.employeeService.findAll({ departmentId, status, search });
  }

  @Get('me')
  findMyProfile(@Request() req: { user: { id: string } }) {
    return this.employeeService.findByUserId(req.user.id);
  }

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'HR', 'MANAGER')
  @Get(':id/subordinates')
  getSubordinates(@Param('id') id: string) {
    return this.employeeService.getSubordinates(id);
  }

  @Get(':id/manager')
  getManager(@Param('id') id: string) {
    return this.employeeService.getManager(id);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateEmployeeStatusDto) {
    return this.employeeService.updateStatus(id, dto);
  }

  @Roles('SUPER_ADMIN', 'HR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeService.remove(id);
  }
}
