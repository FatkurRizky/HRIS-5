import {
  Controller,
  Get,
  Query,
  Request,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ActivityLogService } from './activity-log.service.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findRecent(@Query('limit') limit?: string) {
    return this.activityLogService.findRecent(limit ? Number(limit) : 25);
  }

  @Get('dashboard')
  getDashboard(
    @Request() req: { user?: { id: string } },
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.getDashboardSnapshot(
      limit ? Number(limit) : 25,
      req.user?.id,
    );
  }

  @Sse('stream')
  stream(@Request() req: { user?: { id: string } }): Observable<MessageEvent> {
    return this.activityLogService.createStream(req.user?.id);
  }
}
