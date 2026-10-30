import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_KAMPUS_UNP_LOCATION } from '../office-location/office-location.constants.js';
import { ClockAttendanceDto } from './dto/clock-attendance.dto.js';

const EARTH_RADIUS_METERS = 6371000;
const WORK_START_HOUR = 8; // 08:00
const WORK_END_HOUR = 17; // 17:00

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menghitung jarak 2 koordinat GPS dalam satuan meter menggunakan Haversine Formula.
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  private extractCoords(dto: ClockAttendanceDto): {
    latitude: number;
    longitude: number;
  } {
    const latitude = dto.latitude ?? dto.lat;
    const longitude = dto.longitude ?? dto.long;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException(
        'Koordinat GPS (latitude/lat dan longitude/long) wajib dikirim',
      );
    }

    return { latitude, longitude };
  }

  private getTodayDateOnly(now = new Date()): Date {
    return new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
  }

  private async validateLocationWithinRadius(
    latitude: number,
    longitude: number,
  ) {
    const activeLocations = await this.prisma.officeLocation.findMany({
      where: { isActive: true },
    });

    const locationsToCheck =
      activeLocations.length > 0
        ? activeLocations
        : [
            {
              id: 'default-kampus-2-unp',
              ...DEFAULT_KAMPUS_UNP_LOCATION,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

    let nearestOffice = locationsToCheck[0];
    let minDistance = this.calculateHaversineDistance(
      latitude,
      longitude,
      nearestOffice.latitude,
      nearestOffice.longitude,
    );

    for (let i = 1; i < locationsToCheck.length; i++) {
      const loc = locationsToCheck[i];
      const dist = this.calculateHaversineDistance(
        latitude,
        longitude,
        loc.latitude,
        loc.longitude,
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestOffice = loc;
      }
    }

    const roundedDistance = Math.round(minDistance);

    if (minDistance > nearestOffice.radius) {
      throw new BadRequestException(
        `Anda berada di luar area kantor (${roundedDistance}m, batas radius: ${nearestOffice.radius}m). Silakan dekati lokasi kantor untuk mencatat kehadiran.`,
      );
    }

    return { office: nearestOffice, distanceMeters: roundedDistance };
  }

  private async getEmployeeByUserId(userId: string) {
    let employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }
      employee = await this.prisma.employee.create({
        data: {
          userId: user.id,
          nik: `EMP-${Date.now().toString().slice(-6)}`,
          status: 'TETAP',
          leaveQuota: 12,
        },
      });
    }

    return employee;
  }

  async clockIn(userId: string, dto: ClockAttendanceDto) {
    const employee = await this.getEmployeeByUserId(userId);
    const { latitude, longitude } = this.extractCoords(dto);

    const { office, distanceMeters } = await this.validateLocationWithinRadius(
      latitude,
      longitude,
    );

    const now = new Date();
    const today = this.getTodayDateOnly(now);

    const existing = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Anda sudah melakukan clock-in hari ini');
    }

    // Status LATE jika lewat jam 08:00:59
    const isLate =
      now.getHours() > WORK_START_HOUR ||
      (now.getHours() === WORK_START_HOUR && now.getMinutes() > 0);

    const status: AttendanceStatus = isLate ? 'LATE' : 'PRESENT';

    const record = await this.prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        clockIn: now,
        latitude,
        longitude,
        status,
      },
    });

    return {
      message:
        status === 'LATE'
          ? 'Clock-in berhasil dicatat (Terlambat)'
          : 'Clock-in berhasil dicatat (Tepat Waktu)',
      distanceMeters,
      officeName: office?.name ?? 'Default Office',
      attendance: record,
    };
  }

  async clockOut(userId: string, dto: ClockAttendanceDto) {
    const employee = await this.getEmployeeByUserId(userId);
    const { latitude, longitude } = this.extractCoords(dto);

    const { office, distanceMeters } = await this.validateLocationWithinRadius(
      latitude,
      longitude,
    );

    const now = new Date();
    const today = this.getTodayDateOnly(now);

    const existing = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    });

    if (!existing) {
      throw new BadRequestException(
        'Anda belum melakukan clock-in pada hari ini',
      );
    }

    if (existing.clockOut) {
      throw new ConflictException('Anda sudah melakukan clock-out hari ini');
    }

    // Hitung lembur (overtime) jika pulang lewat jam 17:00
    const workEndTime = new Date(now);
    workEndTime.setHours(WORK_END_HOUR, 0, 0, 0);

    let overtimeMinutes = 0;
    if (now > workEndTime) {
      overtimeMinutes = Math.floor(
        (now.getTime() - workEndTime.getTime()) / (1000 * 60),
      );
    }

    const updated = await this.prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOut: now,
        clockOutLat: latitude,
        clockOutLong: longitude,
        overtimeMinutes,
      },
    });

    return {
      message: 'Clock-out berhasil dicatat',
      distanceMeters,
      officeName: office?.name ?? 'Default Office',
      attendance: updated,
    };
  }

  async resetToday(userId: string) {
    const employee = await this.getEmployeeByUserId(userId);
    const today = this.getTodayDateOnly(new Date());

    await this.prisma.attendance.deleteMany({
      where: {
        employeeId: employee.id,
        date: today,
      },
    });

    return { message: 'Presensi hari ini berhasil di-reset' };
  }

  async getMyRecords(userId: string, month?: number, year?: number) {
    const employee = await this.getEmployeeByUserId(userId);
    const where: Record<string, unknown> = { employeeId: employee.id };

    if (month && year) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));
      where.date = { gte: startDate, lte: endDate };
    }

    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getTeamRecords(userId: string, date?: string) {
    const manager = await this.getEmployeeByUserId(userId);

    const where: Record<string, unknown> = {
      employee: {
        managerId: manager.id,
      },
    };

    if (date) {
      where.date = new Date(date);
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            position: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAll(filters: {
    date?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    status?: AttendanceStatus;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.date) {
      where.date = new Date(filters.date);
    } else if (filters.startDate || filters.endDate) {
      where.date = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            position: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { clockIn: 'desc' }],
    });
  }

  async getMonthlyRecap(month: number, year: number) {
    if (!month || !year || month < 1 || month > 12) {
      throw new BadRequestException('Parameter month (1-12) dan year wajib valid');
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const employees = await this.prisma.employee.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: true,
        position: true,
        attendances: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
        },
        leaveRequests: {
          where: {
            status: 'HR_APPROVED',
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return employees.map((emp) => {
      let presentCount = 0;
      let lateCount = 0;
      let alphaCount = 0;
      let leaveAttendanceCount = 0;
      let totalOvertimeMinutes = 0;

      for (const att of emp.attendances) {
        if (att.status === 'PRESENT') presentCount++;
        else if (att.status === 'LATE') {
          presentCount++;
          lateCount++;
        } else if (att.status === 'ALPHA') alphaCount++;
        else if (att.status === 'LEAVE') leaveAttendanceCount++;

        totalOvertimeMinutes += att.overtimeMinutes;
      }

      const approvedLeaveDays = emp.leaveRequests.reduce(
        (sum, req) => sum + req.workDays,
        0,
      );

      return {
        employeeId: emp.id,
        name: emp.user.name,
        email: emp.user.email,
        nik: emp.nik,
        department: emp.department?.name ?? null,
        position: emp.position?.name ?? null,
        period: { month, year },
        summary: {
          present: presentCount,
          late: lateCount,
          alpha: alphaCount,
          leave: Math.max(leaveAttendanceCount, approvedLeaveDays),
          overtimeMinutes: totalOvertimeMinutes,
          overtimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
        },
      };
    });
  }

  async getMyMonthlyRecap(userId: string, month: number, year: number) {
    const employee = await this.getEmployeeByUserId(userId);
    const allRecaps = await this.getMonthlyRecap(month, year);
    const myRecap = allRecaps.find((item) => item.employeeId === employee.id);

    if (!myRecap) {
      throw new NotFoundException('Rekap absensi tidak ditemukan');
    }

    return myRecap;
  }
}
