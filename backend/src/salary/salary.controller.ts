import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UpsertSalaryDto } from './dto/upsert-salary.dto.js';
import { SalaryService } from './salary.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('salaries')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Roles('HR', 'SUPER_ADMIN')
  @Get()
  findAll() {
    return this.salaryService.findAll();
  }

  @Get('me')
  findMySalary(@Request() req: { user: { id: string } }) {
    return this.salaryService.findMySalary(req.user.id);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Get(':employeeId')
  findByEmployeeId(@Param('employeeId') employeeId: string) {
    return this.salaryService.findByEmployeeId(employeeId);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Put(':employeeId')
  upsert(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertSalaryDto,
  ) {
    return this.salaryService.upsert(employeeId, dto);
  }
}
