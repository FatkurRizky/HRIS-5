import { Injectable, OnModuleInit } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { ActivityLevel, ActivityLog, Role } from '@prisma/client';
import { defer, from, interval, map, merge, Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CreateActivityLogInput {
  actorUserId?: string | null;
  actorEmail: string;
  action: string;
  category?: string;
  level?: ActivityLevel;
  ipAddress?: string | null;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  activeSessions: number;
  failedLogins24h: number;
  failedLoginUniqueIps24h: number;
  uptimeSeconds: number;
  roleDistribution: Record<Role, number>;
}

export interface ActivityStreamPayload {
  type: 'snapshot' | 'activity' | 'stats' | 'heartbeat';
  log?: ActivityLog;
  logs?: ActivityLog[];
  stats?: DashboardStats;
  uptimeSeconds?: number;
  timestamp: string;
}

const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000; // Sesuai masa berlaku JWT 2 jam
const FAILED_LOGIN_WINDOW_MS = 24 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15000;

export function normalizeClientIp(rawIp?: string | null): string | null {
  if (!rawIp) return null;
  const first = rawIp.split(',')[0]?.trim() ?? '';
  if (!first) return null;
  if (first.startsWith('::ffff:')) {
    return first.slice(7);
  }
  if (first === '::1') {
    return '127.0.0.1';
  }
  return first;
}

@Injectable()
export class ActivityLogService implements OnModuleInit {
  private readonly streamSubject = new Subject<ActivityStreamPayload>();
  private readonly activeViewerIds = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const existingCount = await this.prisma.activityLog.count();
      if (existingCount === 0) {
        await this.prisma.activityLog.create({
          data: {
            actorEmail: 'sistem',
            action: 'Layanan pemantauan aktivitas real-time aktif',
            category: 'SYSTEM',
            level: 'INFO',
          },
        });
      }
    } catch {
      // Abaikan jika dipanggil pada lingkungan mock unit test
    }
  }

  private getStartOfCurrentMonthWib(now = new Date()): Date {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utcMs + 7 * 3600000);
    // Konversi kembali 00:00 WIB tanggal 1 bulan berjalan ke UTC
    return new Date(
      Date.UTC(wib.getFullYear(), wib.getMonth(), 1, 0, 0, 0) - 7 * 3600000,
    );
  }

  async record(input: CreateActivityLogInput): Promise<ActivityLog | null> {
    try {
      const normalizedIp = normalizeClientIp(input.ipAddress);
      const created = await this.prisma.activityLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail.trim() || 'unknown',
          action: input.action.trim(),
          category: input.category ?? 'SYSTEM',
          level: input.level ?? 'INFO',
          ipAddress: normalizedIp,
        },
      });

      const stats = await this.getDashboardStats();
      this.streamSubject.next({
        type: 'activity',
        log: created,
        stats,
        timestamp: new Date().toISOString(),
      });

      return created;
    } catch {
      return null;
    }
  }

  async notifyStatsChanged(): Promise<void> {
    try {
      const stats = await this.getDashboardStats();
      this.streamSubject.next({
        type: 'stats',
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Abaikan kegagalan broadcast statistik non-kritis
    }
  }

  async findRecent(limit = 25): Promise<ActivityLog[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit) || 25));
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });
  }

  async getDashboardStats(viewerUserId?: string): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = this.getStartOfCurrentMonthWib(now);
    const sessionSince = new Date(now.getTime() - SESSION_WINDOW_MS);
    const failedSince = new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      roleGroups,
      recentSessionActors,
      failedLogs24h,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.activityLog.findMany({
        where: {
          createdAt: { gte: sessionSince },
          actorUserId: { not: null },
          category: { not: 'AUTH_FAILED' },
        },
        distinct: ['actorUserId'],
        select: { actorUserId: true },
      }),
      this.prisma.activityLog.findMany({
        where: {
          category: 'AUTH_FAILED',
          createdAt: { gte: failedSince },
        },
        select: { ipAddress: true },
      }),
    ]);

    const candidateUserIds = new Set<string>();
    for (const row of recentSessionActors) {
      if (row.actorUserId) candidateUserIds.add(row.actorUserId);
    }
    for (const connectedId of this.activeViewerIds) {
      candidateUserIds.add(connectedId);
    }
    if (viewerUserId) {
      candidateUserIds.add(viewerUserId);
    }

    const activeSessions =
      candidateUserIds.size > 0
        ? await this.prisma.user.count({
            where: {
              id: { in: [...candidateUserIds] },
              isActive: true,
            },
          })
        : 0;

    const uniqueIps = new Set(
      failedLogs24h
        .map((item) => item.ipAddress)
        .filter((ip): ip is string => Boolean(ip)),
    );

    const roleDistribution: Record<Role, number> = {
      EMPLOYEE: 0,
      MANAGER: 0,
      HR: 0,
      SUPER_ADMIN: 0,
    };

    for (const group of roleGroups) {
      roleDistribution[group.role] = group._count._all;
    }

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: Math.max(0, totalUsers - activeUsers),
      newUsersThisMonth,
      activeSessions,
      failedLogins24h: failedLogs24h.length,
      failedLoginUniqueIps24h: uniqueIps.size,
      uptimeSeconds: Math.floor(process.uptime()),
      roleDistribution,
    };
  }

  async getDashboardSnapshot(limit = 25, viewerUserId?: string) {
    const [stats, logs] = await Promise.all([
      this.getDashboardStats(viewerUserId),
      this.findRecent(limit),
    ]);
    return { stats, logs };
  }

  createStream(viewerUserId?: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      if (viewerUserId) {
        this.activeViewerIds.add(viewerUserId);
      }

      const initial$ = defer(() =>
        from(this.getDashboardSnapshot(25, viewerUserId)),
      ).pipe(
        map(
          ({ stats, logs }): MessageEvent => ({
            data: {
              type: 'snapshot',
              stats,
              logs,
              timestamp: new Date().toISOString(),
            } satisfies ActivityStreamPayload,
          }),
        ),
      );

      const updates$ = this.streamSubject.asObservable().pipe(
        map((payload): MessageEvent => ({ data: payload })),
      );

      const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
        map(
          (): MessageEvent => ({
            data: {
              type: 'heartbeat',
              uptimeSeconds: Math.floor(process.uptime()),
              timestamp: new Date().toISOString(),
            } satisfies ActivityStreamPayload,
          }),
        ),
      );

      const subscription = merge(initial$, updates$, heartbeat$).subscribe(
        subscriber,
      );

      return () => {
        if (viewerUserId) {
          this.activeViewerIds.delete(viewerUserId);
        }
        subscription.unsubscribe();
      };
    });
  }
}
