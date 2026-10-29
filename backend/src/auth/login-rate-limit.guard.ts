import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 1000; // 1 menit
const MAX_ATTEMPTS = 10; // Maksimal 10 percobaan login per menit per IP

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip: string =
      req.ip || req.socket?.remoteAddress || 'unknown-client';
    const now = Date.now();

    const entry = this.store.get(ip);

    if (!entry || now > entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (entry.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Terlalu banyak percobaan login. Silakan tunggu 1 menit sebelum mencoba kembali.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
    return true;
  }
}
