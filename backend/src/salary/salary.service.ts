import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertSalaryDto } from './dto/upsert-salary.dto.js';

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.salary.findMany({
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            position: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findMySalary(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        position: true,
        salary: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Profil karyawan belum terdaftar');
    }

    if (!employee.salary) {
      return {
        employeeId: employee.id,
        baseSalary: employee.position?.baseSalary ?? 0,
        allowance: 0,
        overtimeRate: 0,
      };
    }

    return employee.salary;
  }

  async findByEmployeeId(employeeId: string) {
    const salary = await this.prisma.salary.findUnique({
      where: { employeeId },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: true,
            position: true,
          },
        },
      },
    });

    if (!salary) {
      throw new NotFoundException('Data master gaji karyawan belum diatur');
    }

    return salary;
  }

  async upsert(employeeId: string, dto: UpsertSalaryDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return this.prisma.salary.upsert({
      where: { employeeId },
      update: {
        baseSalary: dto.baseSalary,
        ...(dto.allowance !== undefined ? { allowance: dto.allowance } : {}),
        ...(dto.overtimeRate !== undefined
          ? { overtimeRate: dto.overtimeRate }
          : {}),
      },
      create: {
        employeeId,
        baseSalary: dto.baseSalary,
        allowance: dto.allowance ?? 0,
        overtimeRate: dto.overtimeRate ?? 0,
      },
    });
  }
}
