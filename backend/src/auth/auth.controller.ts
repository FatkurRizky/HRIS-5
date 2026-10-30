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
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LoginRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(
    @Request() request: { user: { id: string; email: string; role: Role } },
  ) {
    return request.user;
  }

  @Get('users')
  findAllUsers() {
    return this.authService.findAllUsers();
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.authService.updateUserRole(id, role);
  }
}
