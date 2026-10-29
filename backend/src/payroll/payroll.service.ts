import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeneratePayrollDto } from './dto/generate-payroll.dto.js';
import { RevisePayrollDto } from './dto/revise-payroll.dto.js';
import { buildPayslipPdfBuffer } from './pdf-builder.js';

const LATE_PENALTY_PER_DAY = 50000;
const WORK_DAYS_PER_MONTH = 22;
const BPJS_EMPLOYEE_RATE = 0.03; // 1% Kesehatan + 2% Ketenagakerjaan
const MONTHLY_PTKP = 4500000;
const PPH21_RATE = 0.05;

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePayroll(dto: GeneratePayrollDto) {
    const { month, year } = dto;
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const employees = await this.prisma.employee.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        position: true,
        salary: true,
        attendances: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    const results = [];

    for (const emp of employees) {
      const existingRecord = await this.prisma.payrollRecord.findUnique({
        where: {
          employeeId_periodMonth_periodYear: {
            employeeId: emp.id,
            periodMonth: month,
            periodYear: year,
          },
        },
      });

      // Jangan timpa record yang sudah APPROVED atau PAID
      if (
        existingRecord &&
        (existingRecord.status === 'APPROVED' ||
          existingRecord.status === 'PAID')
      ) {
        results.push(existingRecord);
        continue;
      }

      const baseSalary =
        emp.salary?.baseSalary ?? emp.position?.baseSalary ?? 0;
      const allowance = emp.salary?.allowance ?? 0;
      const overtimeRate =
        emp.salary?.overtimeRate && emp.salary.overtimeRate > 0
          ? emp.salary.overtimeRate
          : Math.round(baseSalary / 173);

      let lateCount = 0;
      let alphaCount = 0;
      let totalOvertimeMinutes = 0;

      for (const att of emp.attendances) {
        if (att.status === 'LATE') lateCount++;
        else if (att.status === 'ALPHA') alphaCount++;
        totalOvertimeMinutes += att.overtimeMinutes;
      }

      const overtimeHours = Math.floor(totalOvertimeMinutes / 60);
      const overtime = overtimeHours * overtimeRate;

      const lateDeduction = lateCount * LATE_PENALTY_PER_DAY;
      const alphaDeduction =
        alphaCount * Math.round(baseSalary / WORK_DAYS_PER_MONTH);
      const deductions = lateDeduction + alphaDeduction;

      const bpjs = Math.round((baseSalary + allowance) * BPJS_EMPLOYEE_RATE);
      const grossIncome = baseSalary + allowance + overtime;
      const taxableIncome = Math.max(0, grossIncome - MONTHLY_PTKP);
      const pph21 = Math.round(taxableIncome * PPH21_RATE);

      const total = Math.max(
        0,
        grossIncome - (deductions + bpjs + pph21),
      );

      const saved = await this.prisma.payrollRecord.upsert({
        where: {
          employeeId_periodMonth_periodYear: {
            employeeId: emp.id,
            periodMonth: month,
            periodYear: year,
          },
        },
        update: {
          baseSalary,
          allowance,
          overtime,
          deductions,
          bpjs,
          pph21,
          total,
          status: 'DRAFT',
        },
        create: {
          employeeId: emp.id,
          periodMonth: month,
          periodYear: year,
          baseSalary,
          allowance,
          overtime,
          deductions,
          bpjs,
          pph21,
          total,
          status: 'DRAFT',
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
      });

      results.push(saved);
    }

    return {
      message: `Kalkulasi payroll periode ${MONTH_NAMES[month - 1]} ${year} berhasil diproses`,
      count: results.length,
      records: results,
    };
  }

  async findAll(month?: number, year?: number) {
    const where: Record<string, unknown> = {};
    if (month) where.periodMonth = month;
    if (year) where.periodYear = year;

    return this.prisma.payrollRecord.findMany({
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
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findMyPayrolls(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Profil karyawan belum terdaftar');
    }

    return this.prisma.payrollRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
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

    if (!record) {
      throw new NotFoundException('Data payroll tidak ditemukan');
    }

    if (role !== 'HR' && role !== 'SUPER_ADMIN') {
      if (record.employee.userId !== userId) {
        throw new ForbiddenException(
          'Anda tidak berhak melihat slip gaji karyawan lain',
        );
      }
    }

    return record;
  }

  async approve(id: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Data payroll tidak ditemukan');
    }

    if (record.status === 'PAID') {
      throw new BadRequestException(
        'Payroll yang sudah dibayar (PAID) tidak dapat diubah',
      );
    }

    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        status: 'APPROVED',
        revisionNote: null,
      },
    });
  }

  async revise(id: string, dto: RevisePayrollDto) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Data payroll tidak ditemukan');
    }

    if (record.status === 'PAID') {
      throw new BadRequestException(
        'Payroll yang sudah dibayar (PAID) tidak dapat direvisi',
      );
    }

    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        status: 'DRAFT',
        revisionNote: dto.note?.trim() ?? 'Perlu revisi kalkulasi gaji',
      },
    });
  }

  async markPaid(id: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Data payroll tidak ditemukan');
    }

    if (record.status !== 'APPROVED') {
      throw new BadRequestException(
        'Payroll harus berstatus APPROVED terlebih dahulu sebelum ditandai PAID',
      );
    }

    return this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'PAID' },
    });
  }

  async generatePayslipPdf(id: string, userId: string, role: Role) {
    const record = await this.findOne(id, userId, role);
    const monthName =
      MONTH_NAMES[record.periodMonth - 1] ?? String(record.periodMonth);

    const pdfBuffer = buildPayslipPdfBuffer({
      companyName: 'PT KERABAT DIGITAL INDONESIA (HRIS)',
      periodLabel: `${monthName} ${record.periodYear}`,
      employeeName: record.employee.user.name,
      nik: record.employee.nik ?? '-',
      department: record.employee.department?.name ?? '-',
      position: record.employee.position?.name ?? '-',
      status: record.employee.status,
      baseSalary: record.baseSalary,
      allowance: record.allowance,
      overtime: record.overtime,
      deductions: record.deductions,
      bpjs: record.bpjs,
      pph21: record.pph21,
      total: record.total,
      payrollStatus: record.status,
    });

    const filename = `slip-gaji-${record.employee.user.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${record.periodMonth}-${record.periodYear}.pdf`;

    return { pdfBuffer, filename };
  }
}
