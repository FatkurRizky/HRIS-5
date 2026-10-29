import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AttendanceStatus } from '@prisma/client';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AttendanceService } from './attendance.service.js';
import { ClockAttendanceDto } from './dto/clock-attendance.dto.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  clockIn(
    @Request() req: { user: { id: string } },
    @Body() dto: ClockAttendanceDto,
  ) {
    return this.attendanceService.clockIn(req.user.id, dto);
  }

  @Post('clock-out')
  clockOut(
    @Request() req: { user: { id: string } },
    @Body() dto: ClockAttendanceDto,
  ) {
    return this.attendanceService.clockOut(req.user.id, dto);
  }

  @Delete('today')
  resetToday(@Request() req: { user: { id: string } }) {
    return this.attendanceService.resetToday(req.user.id);
  }

  @Get('my-records')
  getMyRecords(
    @Request() req: { user: { id: string } },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.attendanceService.getMyRecords(
      req.user.id,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Roles('MANAGER', 'HR', 'SUPER_ADMIN')
  @Get('team')
  getTeamRecords(
    @Request() req: { user: { id: string } },
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getTeamRecords(req.user.id, date);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Get('recap')
  getMonthlyRecap(
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getMonthlyRecap(month, year);
  }

  @Get('recap/my')
  getMyMonthlyRecap(
    @Request() req: { user: { id: string } },
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getMyMonthlyRecap(req.user.id, month, year);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.attendanceService.findAll({
      date,
      startDate,
      endDate,
      departmentId,
      status,
    });
  }
}
