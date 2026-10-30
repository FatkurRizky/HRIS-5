import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { GeneratePayrollDto } from './dto/generate-payroll.dto.js';
import { RevisePayrollDto } from './dto/revise-payroll.dto.js';
import { PayrollService } from './payroll.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Roles('HR', 'SUPER_ADMIN')
  @Post('generate')
  generate(@Body() dto: GeneratePayrollDto) {
    return this.payrollService.generatePayroll(dto);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Post('approve-period')
  approvePeriod(@Body() dto: GeneratePayrollDto) {
    return this.payrollService.approvePeriod(dto);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Get()
  findAll(@Query('month') month?: string, @Query('year') year?: string) {
    return this.payrollService.findAll(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('my')
  findMyPayrolls(@Request() req: { user: { id: string } }) {
    return this.payrollService.findMyPayrolls(req.user.id);
  }

  @Get('my/period')
  findMyPeriodSlip(
    @Request() req: { user: { id: string } },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.payrollService.findMyPeriodSlip(
      req.user.id,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('my/payslip-pdf')
  async downloadMyPeriodPayslipPdf(
    @Request() req: { user: { id: string } },
    @Res() res: Response,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const { pdfBuffer, filename } =
      await this.payrollService.generateMyPeriodPayslipPdf(
        req.user.id,
        month ? Number(month) : undefined,
        year ? Number(year) : undefined,
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id/payslip-pdf')
  async downloadPayslipPdf(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: Role } },
    @Res() res: Response,
  ) {
    const { pdfBuffer, filename } =
      await this.payrollService.generatePayslipPdf(
        id,
        req.user.id,
        req.user.role,
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: Role } },
  ) {
    return this.payrollService.findOne(id, req.user.id, req.user.role);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.payrollService.approve(id);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Patch(':id/revise')
  revise(@Param('id') id: string, @Body() dto: RevisePayrollDto) {
    return this.payrollService.revise(id, dto);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.payrollService.markPaid(id);
  }
}
