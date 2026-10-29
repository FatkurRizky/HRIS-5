import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { LeaveStatus, Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { RejectLeaveDto } from './dto/reject-leave.dto.js';
import { LeaveService } from './leave.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.create(req.user.id, dto);
  }

  @Get('my')
  getMyLeaves(@Request() req: { user: { id: string } }) {
    return this.leaveService.getMyLeaves(req.user.id);
  }

  @Roles('MANAGER', 'HR', 'SUPER_ADMIN')
  @Get('approvals')
  getApprovalsQueue(@Request() req: { user: { id: string; role: Role } }) {
    return this.leaveService.getApprovalsQueue(req.user.id, req.user.role);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Get()
  findAll(@Query('status') status?: LeaveStatus) {
    return this.leaveService.findAll(status);
  }

  @Roles('MANAGER', 'SUPER_ADMIN')
  @Patch(':id/manager-approve')
  managerApprove(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: Role } },
  ) {
    return this.leaveService.managerApprove(id, req.user.id, req.user.role);
  }

  @Roles('HR', 'SUPER_ADMIN')
  @Patch(':id/hr-approve')
  hrApprove(@Param('id') id: string) {
    return this.leaveService.hrApprove(id);
  }

  @Roles('MANAGER', 'HR', 'SUPER_ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectLeaveDto) {
    return this.leaveService.reject(id, dto);
  }
}
