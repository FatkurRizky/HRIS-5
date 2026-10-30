import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LeaveStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { RejectLeaveDto } from './dto/reject-leave.dto.js';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menghitung jumlah hari kerja (Senin - Jumat) antara startDate dan endDate (inklusif).
   */
  calculateWorkDays(start: Date, end: Date): number {
    let count = 0;
    const cursor = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
    );
    const last = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    );

    while (cursor <= last) {
      const dayOfWeek = cursor.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return count;
  }

  private async getEmployeeByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Profil karyawan belum terdaftar');
    }

    return employee;
  }

  async create(userId: string, dto: CreateLeaveDto) {
    const employee = await this.getEmployeeByUserId(userId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh lebih awal dari tanggal mulai',
      );
    }

    const workDays = this.calculateWorkDays(startDate, endDate);

    if (workDays <= 0) {
      throw new BadRequestException(
        'Rentang tanggal yang dipilih hanya mencakup hari libur akhir pekan (Sabtu/Minggu)',
      );
    }

    if (dto.type === 'CUTI' && employee.leaveQuota < workDays) {
      throw new BadRequestException(
        `Jatah cuti tahunan tidak mencukupi (Sisa kuota: ${employee.leaveQuota} hari, diajukan: ${workDays} hari kerja).`,
      );
    }

    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type: dto.type,
        startDate,
        endDate,
        workDays,
        reason: dto.reason?.trim() ?? null,
        status: 'PENDING',
      },
    });

    return {
      message:
        'Pengajuan berhasil dikirim dan sedang menunggu persetujuan Manager (Layer 1)',
      workDays,
      remainingQuotaPreview:
        dto.type === 'CUTI'
          ? employee.leaveQuota - workDays
          : employee.leaveQuota,
      leave,
    };
  }

  async getMyLeaves(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const requests = await this.prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      leaveQuota: employee.leaveQuota,
      requests,
    };
  }

  async getApprovalsQueue(userId: string, role: Role) {
    if (role === 'MANAGER') {
      const manager = await this.getEmployeeByUserId(userId);
      return this.prisma.leaveRequest.findMany({
        where: {
          status: 'PENDING',
          employee: {
            id: { not: manager.id },
            OR: [{ managerId: manager.id }, { managerId: null }],
          },
        },
        include: {
          employee: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              department: true,
              position: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    // HR / SUPER_ADMIN hanya melihat antrean Layer 2 (sudah disetujui Manager)
    return this.prisma.leaveRequest.findMany({
      where: {
        status: 'MANAGER_APPROVED',
      },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAll(status?: LeaveStatus) {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async managerApprove(id: string, userId: string, role: Role) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) {
      throw new NotFoundException('Data pengajuan cuti tidak ditemukan');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        `Pengajuan tidak dapat disetujui Manager karena berstatus ${leave.status}`,
      );
    }

    if (leave.employee.userId === userId) {
      throw new ForbiddenException(
        'Anda tidak dapat menyetujui pengajuan cuti milik sendiri',
      );
    }

    if (role === 'MANAGER') {
      const manager = await this.getEmployeeByUserId(userId);
      if (
        leave.employee.managerId &&
        leave.employee.managerId !== manager.id
      ) {
        throw new ForbiddenException(
          'Anda hanya dapat menyetujui pengajuan cuti bawahan langsung Anda',
        );
      }
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'MANAGER_APPROVED' },
    });

    return {
      message:
        'Pengajuan disetujui oleh Manager (Layer 1) dan diteruskan ke HR untuk persetujuan final',
      leave: updated,
    };
  }

  async hrApprove(id: string, userId: string) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) {
      throw new NotFoundException('Data pengajuan cuti tidak ditemukan');
    }

    if (leave.status === 'HR_APPROVED') {
      throw new BadRequestException('Pengajuan cuti ini sudah disetujui final');
    }

    if (leave.status === 'REJECTED') {
      throw new BadRequestException(
        'Pengajuan cuti yang sudah ditolak tidak dapat disetujui',
      );
    }

    if (leave.employee.userId === userId) {
      throw new ForbiddenException(
        'Anda tidak dapat menyetujui pengajuan cuti milik sendiri',
      );
    }

    // Verifikasi 2 lapis: HR wajib menunggu persetujuan Manager (Layer 1)
    if (leave.status !== 'MANAGER_APPROVED') {
      throw new BadRequestException(
        'Pengajuan harus disetujui oleh Manager (Layer 1) terlebih dahulu sebelum disetujui final oleh HR',
      );
    }

    if (
      leave.type === 'CUTI' &&
      leave.employee.leaveQuota < leave.workDays
    ) {
      throw new BadRequestException(
        'Kuota cuti karyawan sudah tidak mencukupi untuk disetujui',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (leave.type === 'CUTI') {
        await tx.employee.update({
          where: { id: leave.employeeId },
          data: {
            leaveQuota: {
              decrement: leave.workDays,
            },
          },
        });
      }

      return tx.leaveRequest.update({
        where: { id },
        data: { status: 'HR_APPROVED' },
      });
    });

    return {
      message:
        'Pengajuan cuti resmi disetujui oleh HR (Final) dan kuota cuti telah diperbarui',
      leave: updated,
    };
  }

  async reject(id: string, dto: RejectLeaveDto) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leave) {
      throw new NotFoundException('Data pengajuan cuti tidak ditemukan');
    }

    if (leave.status === 'HR_APPROVED' || leave.status === 'REJECTED') {
      throw new BadRequestException(
        `Pengajuan berstatus ${leave.status} tidak dapat ditolak kembali`,
      );
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason:
          dto.reason?.trim() ??
          dto.rejectionReason?.trim() ??
          'Ditolak oleh atasan / HR Administrator',
      },
    });

    return {
      message: 'Pengajuan cuti telah ditolak',
      leave: updated,
    };
  }
}
