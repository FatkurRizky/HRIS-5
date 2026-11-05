import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Role } from '@prisma/client';
import { normalizeClientIp } from '../activity-log/activity-log.service.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

interface RequestWithContext {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  user: { id: string; email: string; role: Role };
}

function extractRequestIp(req?: Partial<RequestWithContext>): string | null {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return normalizeClientIp(
    rawForwarded ?? req.ip ?? req.socket?.remoteAddress ?? null,
  );
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Request() req: RequestWithContext) {
    return this.authService.register(dto, extractRequestIp(req));
  }

  @UseGuards(LoginRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Request() req: RequestWithContext) {
    return this.authService.login(dto, extractRequestIp(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(@Request() request: RequestWithContext) {
    return request.user;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('users')
  findAllUsers() {
    return this.authService.findAllUsers();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('users/:id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Request() req: RequestWithContext,
  ) {
    return this.authService.updateUserRole(
      id,
      dto.role,
      req.user,
      extractRequestIp(req),
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: RequestWithContext,
  ) {
    return this.authService.updateUserStatus(
      id,
      dto.isActive,
      req.user,
      extractRequestIp(req),
    );
  }
}
