import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import {
  ActivityLogService,
  normalizeClientIp,
} from '../activity-log/activity-log.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const SALT_ROUNDS = 10;
const VALID_ROLES: readonly Role[] = [
  'SUPER_ADMIN',
  'HR',
  'MANAGER',
  'EMPLOYEE',
];

function formatRoleLabel(role: Role): string {
  if (role === 'SUPER_ADMIN') return 'SuperAdmin';
  if (role === 'MANAGER') return 'Manager';
  if (role === 'HR') return 'HR';
  return 'Employee';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Optional() private readonly activityLog?: ActivityLogService,
  ) {}

  /**
   * Menentukan role saat registrasi mandiri berdasarkan input role dan departemen.
   * Mencegah eskalasi hak akses (privilege escalation) ke SUPER_ADMIN.
   */
  determineRegistrationRole(requestedRole?: string, department?: string): Role {
    const normalizedDept = department?.trim().toUpperCase();

    if (requestedRole) {
      const normalizedRole = requestedRole.trim().toUpperCase();
      const strippedRole = normalizedRole.replace(/[\s\-_]+/g, '');

      // Cegah eskalasi hak akses ke SUPER_ADMIN atau variasi admin lainnya
      if (
        strippedRole.includes('ADMIN') ||
        strippedRole === 'SUPER' ||
        strippedRole === 'ROOT'
      ) {
        throw new ForbiddenException(
          'Pendaftaran mandiri dengan role SUPER_ADMIN tidak diizinkan',
        );
      }

      if (normalizedRole === 'HR') {
        return 'HR';
      }

      if (normalizedRole === 'MANAGER') {
        return 'MANAGER';
      }

      if (normalizedRole === 'EMPLOYEE') {
        // Jika departemen HR, tetapkan role HR
        if (normalizedDept === 'HR' || normalizedDept === 'HUMAN RESOURCES') {
          return 'HR';
        }
        return 'EMPLOYEE';
      }

      throw new BadRequestException(
        `Role '${requestedRole}' tidak valid untuk registrasi mandiri`,
      );
    }

    // Jika role tidak dikirimkan, tentukan berdasarkan departemen
    if (normalizedDept === 'HR' || normalizedDept === 'HUMAN RESOURCES') {
      return 'HR';
    }

    return 'EMPLOYEE';
  }

  /**
   * Membuat kode karyawan berurutan: KRB-0001, KRB-0002, dst.
   * Mengambil nomor tertinggi yang sudah ada lalu menambah 1.
   */
  private async generateEmployeeCode(): Promise<string> {
    const rows = await this.prisma.employee.findMany({
      where: { nik: { startsWith: 'KRB-' } },
      select: { nik: true },
    });
    let max = 0;
    for (const row of rows) {
      const match = /^KRB-(\d+)$/.exec(row.nik ?? '');
      if (match) max = Math.max(max, Number(match[1]));
    }
    return `KRB-${String(max + 1).padStart(4, '0')}`;
  }

  async register(dto: RegisterDto, ipAddress?: string | null) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email sudah terdaftar di database');
    }

    const assignedRole = this.determineRegistrationRole(
      dto.role,
      dto.department,
    );

    const passwordHash = await hash(dto.password, SALT_ROUNDS);

    // ID karyawan dibuat otomatis oleh sistem (KRB-0001, KRB-0002, ...)
    const nikToUse = await this.generateEmployeeCode();

    let deptName = dto.department?.trim();
    if (!deptName) {
      deptName = assignedRole === 'HR' ? 'HR' : 'Engineering';
    } else if (deptName.toUpperCase() === 'HR') {
      deptName = 'HR';
    }

    const defaultPosName =
      assignedRole === 'HR' || deptName === 'HR'
        ? 'HR Specialist'
        : assignedRole === 'MANAGER'
          ? 'Engineering Manager'
          : 'Staff Engineer';

    // Cari manager default agar pengajuan cuti karyawan baru otomatis masuk ke antrean Manager
    const defaultManager =
      assignedRole === 'MANAGER'
        ? null
        : await this.prisma.employee.findFirst({
            where: { user: { role: 'MANAGER' } },
            select: { id: true },
          });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: passwordHash,
        role: assignedRole,
        employee: {
          create: {
            nik: nikToUse,
            status: 'TETAP',
            leaveQuota: 12,
            ...(defaultManager ? { manager: { connect: { id: defaultManager.id } } } : {}),
            department: {
              connectOrCreate: {
                where: { name: deptName },
                create: { name: deptName, description: `Departemen ${deptName}` },
              },
            },
            position: {
              connectOrCreate: {
                where: { name: defaultPosName },
                create: { name: defaultPosName, baseSalary: 10000000 },
              },
            },
            salary: {
              create: {
                baseSalary: 10000000,
                allowance: 2000000,
                overtimeRate: 50000,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        employee: {
          select: {
            id: true,
            nik: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    await this.activityLog?.record({
      actorUserId: user.id,
      actorEmail: user.email,
      action: `Registrasi akun baru (${formatRoleLabel(user.role)})`,
      category: 'AUTH_REGISTER',
      level: 'INFO',
      ipAddress,
    });

    return {
      accessToken,
      user,
    };
  }

  async findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            nik: true,
            status: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(
    id: string,
    role: Role,
    actor?: { id: string; email: string },
    ipAddress?: string | null,
  ) {
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException('Peran pengguna tidak valid');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (
      existing.role === 'SUPER_ADMIN' &&
      existing.isActive !== false &&
      role !== 'SUPER_ADMIN'
    ) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Operasi ditolak: Sistem wajib memiliki minimal satu akun SuperAdmin aktif',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await this.activityLog?.record({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? 'sistem',
      action: `Mengubah peran ${updated.email} dari ${formatRoleLabel(existing.role)} menjadi ${formatRoleLabel(updated.role)}`,
      category: 'USER_ROLE',
      level: 'INFO',
      ipAddress,
    });

    return updated;
  }

  async updateUserStatus(
    id: string,
    isActive: boolean,
    actor?: { id: string; email: string },
    ipAddress?: string | null,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (actor?.id === id && !isActive) {
      throw new BadRequestException(
        'Operasi ditolak: Anda tidak dapat menonaktifkan akun Anda sendiri',
      );
    }

    if (
      existing.role === 'SUPER_ADMIN' &&
      existing.isActive !== false &&
      !isActive
    ) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Operasi ditolak: Sistem wajib memiliki minimal satu akun SuperAdmin aktif',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await this.activityLog?.record({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? 'sistem',
      action: isActive
        ? `Mengaktifkan kembali akun ${updated.email}`
        : `Menonaktifkan akun ${updated.email}`,
      category: 'USER_STATUS',
      level: isActive ? 'INFO' : 'WARNING',
      ipAddress,
    });

    return updated;
  }

  async login(dto: LoginDto, ipAddress?: string | null) {
    const email = dto.email.trim().toLowerCase();
    const invalid = new UnauthorizedException('Email atau password salah');
    const cleanIp = normalizeClientIp(ipAddress);
    const ipSuffix = cleanIp ? `, IP ${cleanIp}` : '';

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await this.activityLog?.record({
        actorEmail: email || 'unknown',
        action: `Login gagal (akun tidak ditemukan)${ipSuffix}`,
        category: 'AUTH_FAILED',
        level: 'ERROR',
        ipAddress: cleanIp,
      });
      throw invalid;
    }

    const isMatch = await compare(dto.password, user.password);

    if (!isMatch) {
      await this.activityLog?.record({
        actorUserId: user.id,
        actorEmail: user.email,
        action: `Login gagal (kata sandi salah)${ipSuffix}`,
        category: 'AUTH_FAILED',
        level: 'ERROR',
        ipAddress: cleanIp,
      });
      throw invalid;
    }

    if (user.isActive === false) {
      await this.activityLog?.record({
        actorUserId: user.id,
        actorEmail: user.email,
        action: `Percobaan login ditolak (akun nonaktif)${ipSuffix}`,
        category: 'AUTH_FAILED',
        level: 'WARNING',
        ipAddress: cleanIp,
      });
      throw new ForbiddenException(
        'Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi tim HR atau SuperAdmin.',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    await this.activityLog?.record({
      actorUserId: user.id,
      actorEmail: user.email,
      action: `Login berhasil (${formatRoleLabel(user.role)})`,
      category: 'AUTH_LOGIN',
      level: 'INFO',
      ipAddress: cleanIp,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive ?? true,
      },
    };
  }
}
