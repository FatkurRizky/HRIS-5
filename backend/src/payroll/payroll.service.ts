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
import {
  buildPayslipFilename,
  calculatePayrollBreakdown,
  COMPANY_SLIP_NAME,
  EMPLOYEE_PAYROLL_INCLUDE,
  MONTH_NAMES,
  normalizePeriod,
} from './payroll-calculator.js';
import { buildPayslipPdfBuffer } from './pdf-builder.js';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePayroll(dto: GeneratePayrollDto) {
    const { month, year, startDate, endDate, periodLabel } = normalizePeriod(
      dto.month,
      dto.year,
    );

    const employees = await this.prisma.employee.findMany({
      include: {
        ...EMPLOYEE_PAYROLL_INCLUDE,
        salary: true,
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
        },
      },
    });

    const results = [];

    for (const emp of employees) {
      const calc = calculatePayrollBreakdown(emp, emp.attendances);
      const uniqueWhere = {
        employeeId_periodMonth_periodYear: {
          employeeId: emp.id,
          periodMonth: month,
          periodYear: year,
        },
      };

      const existingRecord = await this.prisma.payrollRecord.findUnique({
        where: uniqueWhere,
        include: { employee: { include: EMPLOYEE_PAYROLL_INCLUDE } },
      });

      // Jangan timpa record yang sudah PAID
      if (existingRecord && existingRecord.status === 'PAID') {
        results.push({
          ...existingRecord,
          overtimeHours: calc.overtimeHours,
          lateCount: calc.lateCount,
          lateDeduction: calc.lateDeduction,
          alphaCount: calc.alphaCount,
          alphaDeduction: calc.alphaDeduction,
        });
        continue;
      }

      const payload = {
        baseSalary: calc.baseSalary,
        allowance: calc.allowance,
        overtime: calc.overtime,
        deductions: calc.deductions,
        bpjs: calc.bpjs,
        pph21: calc.pph21,
        total: calc.total,
        status: (existingRecord?.status ?? 'DRAFT') as 'DRAFT' | 'APPROVED',
      };

      const saved = await this.prisma.payrollRecord.upsert({
        where: uniqueWhere,
        update: payload,
        create: {
          employeeId: emp.id,
          periodMonth: month,
          periodYear: year,
          ...payload,
        },
        include: { employee: { include: EMPLOYEE_PAYROLL_INCLUDE } },
      });

      results.push({
        ...saved,
        overtimeHours: calc.overtimeHours,
        lateCount: calc.lateCount,
        lateDeduction: calc.lateDeduction,
        alphaCount: calc.alphaCount,
        alphaDeduction: calc.alphaDeduction,
      });
    }

    return {
      message: `Kalkulasi payroll periode ${periodLabel} berhasil diproses`,
      count: results.length,
      records: results,
    };
  }

  async approvePeriod(dto: GeneratePayrollDto) {
    const { month, year, periodLabel } = normalizePeriod(dto.month, dto.year);

    // Hitung ulang payroll periode agar potongan keterlambatan & lembur terkini langsung tercatat
    await this.generatePayroll({ month, year });

    const updated = await this.prisma.payrollRecord.updateMany({
      where: { periodMonth: month, periodYear: year, status: 'DRAFT' },
      data: { status: 'APPROVED', revisionNote: null },
    });

    const records = await this.findAll(month, year);

    return {
      message: `Payroll periode ${periodLabel} berhasil disetujui (${updated.count} slip diperbarui)`,
      approvedCount: updated.count,
      records,
    };
  }

  async findAll(month?: number, year?: number) {
    const where: Record<string, unknown> = {};
    if (month) where.periodMonth = month;
    if (year) where.periodYear = year;

    const records = await this.prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          include: { ...EMPLOYEE_PAYROLL_INCLUDE, salary: true },
        },
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return Promise.all(
      records.map(async (record) => {
        const { startDate, endDate } = normalizePeriod(
          record.periodMonth,
          record.periodYear,
        );
        const attendances = await this.prisma.attendance.findMany({
          where: {
            employeeId: record.employeeId,
            date: { gte: startDate, lte: endDate },
          },
          select: { status: true, overtimeMinutes: true },
        });
        const calc = calculatePayrollBreakdown(record.employee, attendances);
        const isPaid = record.status === 'PAID';

        const deductions = isPaid ? record.deductions : calc.deductions;
        const total = isPaid ? record.total : calc.total;
        const overtime = isPaid ? record.overtime : calc.overtime;
        const bpjs = isPaid ? record.bpjs : calc.bpjs;
        const pph21 = isPaid ? record.pph21 : calc.pph21;

        if (
          !isPaid &&
          (record.deductions !== calc.deductions ||
            record.total !== calc.total ||
            record.overtime !== calc.overtime ||
            record.bpjs !== calc.bpjs ||
            record.pph21 !== calc.pph21)
        ) {
          await this.prisma.payrollRecord.update({
            where: { id: record.id },
            data: {
              deductions: calc.deductions,
              total: calc.total,
              overtime: calc.overtime,
              bpjs: calc.bpjs,
              pph21: calc.pph21,
            },
          });
        }

        return {
          ...record,
          deductions,
          total,
          overtime,
          bpjs,
          pph21,
          overtimeHours: calc.overtimeHours,
          lateCount: calc.lateCount,
          lateDeduction: calc.lateDeduction,
          alphaCount: calc.alphaCount,
          alphaDeduction: calc.alphaDeduction,
        };
      }),
    );
  }

  async findMyPayrolls(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Profil karyawan belum terdaftar');
    }

    const records = await this.prisma.payrollRecord.findMany({
      where: { employeeId: employee.id },
      include: {
        employee: {
          include: { ...EMPLOYEE_PAYROLL_INCLUDE, salary: true },
        },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return Promise.all(
      records.map(async (record) => {
        const { startDate, endDate } = normalizePeriod(
          record.periodMonth,
          record.periodYear,
        );
        const attendances = await this.prisma.attendance.findMany({
          where: {
            employeeId: record.employeeId,
            date: { gte: startDate, lte: endDate },
          },
          select: { status: true, overtimeMinutes: true },
        });
        const calc = calculatePayrollBreakdown(record.employee, attendances);
        const isPaid = record.status === 'PAID';

        const deductions = isPaid ? record.deductions : calc.deductions;
        const total = isPaid ? record.total : calc.total;
        const overtime = isPaid ? record.overtime : calc.overtime;
        const bpjs = isPaid ? record.bpjs : calc.bpjs;
        const pph21 = isPaid ? record.pph21 : calc.pph21;

        if (
          !isPaid &&
          (record.deductions !== calc.deductions ||
            record.total !== calc.total ||
            record.overtime !== calc.overtime ||
            record.bpjs !== calc.bpjs ||
            record.pph21 !== calc.pph21)
        ) {
          await this.prisma.payrollRecord.update({
            where: { id: record.id },
            data: {
              deductions: calc.deductions,
              total: calc.total,
              overtime: calc.overtime,
              bpjs: calc.bpjs,
              pph21: calc.pph21,
            },
          });
        }

        return {
          ...record,
          deductions,
          total,
          overtime,
          bpjs,
          pph21,
          overtimeHours: calc.overtimeHours,
          lateCount: calc.lateCount,
          lateDeduction: calc.lateDeduction,
          alphaCount: calc.alphaCount,
          alphaDeduction: calc.alphaDeduction,
        };
      }),
    );
  }

  /**
   * Mengambil slip gaji karyawan pada periode (bulan & tahun) tertentu.
   * Jika HR belum men-generate payroll pada bulan tersebut (misal karyawan baru
   * atau melihat proyeksi gaji bulan selanjutnya), sistem menghitung estimasi
   * real-time dari gaji pokok, tunjangan, dan absensi berjalan.
   */
  async findMyPeriodSlip(userId: string, month?: number, year?: number) {
    const {
      month: m,
      year: y,
      startDate,
      endDate,
      periodLabel,
    } = normalizePeriod(month, year);

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        ...EMPLOYEE_PAYROLL_INCLUDE,
        salary: true,
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Profil karyawan belum terdaftar');
    }

    const calc = calculatePayrollBreakdown(employee, employee.attendances);
    const existingRecord = await this.prisma.payrollRecord.findUnique({
      where: {
        employeeId_periodMonth_periodYear: {
          employeeId: employee.id,
          periodMonth: m,
          periodYear: y,
        },
      },
    });

    const isPaid = existingRecord?.status === 'PAID';
    const deductions = isPaid ? existingRecord.deductions : calc.deductions;
    const total = isPaid ? existingRecord.total : calc.total;
    const overtime = isPaid ? existingRecord.overtime : calc.overtime;
    const bpjs = isPaid ? existingRecord.bpjs : calc.bpjs;
    const pph21 = isPaid ? existingRecord.pph21 : calc.pph21;
    const baseSalary = existingRecord?.baseSalary ?? calc.baseSalary;
    const allowance = existingRecord?.allowance ?? calc.allowance;

    if (
      existingRecord &&
      !isPaid &&
      (existingRecord.deductions !== calc.deductions ||
        existingRecord.total !== calc.total ||
        existingRecord.overtime !== calc.overtime ||
        existingRecord.bpjs !== calc.bpjs ||
        existingRecord.pph21 !== calc.pph21)
    ) {
      await this.prisma.payrollRecord.update({
        where: { id: existingRecord.id },
        data: {
          deductions: calc.deductions,
          total: calc.total,
          overtime: calc.overtime,
          bpjs: calc.bpjs,
          pph21: calc.pph21,
        },
      });
    }

    const employeeSummary = {
      id: employee.id,
      nik: employee.nik ?? '-',
      name: employee.user.name,
      email: employee.user.email,
      department: employee.department?.name ?? 'Engineering',
      position: employee.position?.name ?? 'Staff',
      status: employee.status,
    };

    return {
      id: existingRecord?.id ?? null,
      periodMonth: m,
      periodYear: y,
      periodLabel,
      isEstimated: !existingRecord,
      status: existingRecord ? existingRecord.status : 'ESTIMASI',
      revisionNote: existingRecord?.revisionNote ?? null,
      baseSalary,
      allowance,
      overtimeHours: calc.overtimeHours,
      overtime,
      lateCount: calc.lateCount,
      lateDeduction: calc.lateDeduction,
      alphaCount: calc.alphaCount,
      alphaDeduction: calc.alphaDeduction,
      deductions,
      bpjs,
      pph21,
      total,
      employee: employeeSummary,
    };
  }

  async generateMyPeriodPayslipPdf(
    userId: string,
    month?: number,
    year?: number,
  ) {
    const slip = await this.findMyPeriodSlip(userId, month, year);

    const pdfBuffer = buildPayslipPdfBuffer({
      companyName: COMPANY_SLIP_NAME,
      periodLabel: slip.periodLabel,
      employeeName: slip.employee.name,
      nik: slip.employee.nik,
      department: slip.employee.department,
      position: slip.employee.position,
      status: slip.employee.status,
      baseSalary: slip.baseSalary,
      allowance: slip.allowance,
      overtime: slip.overtime,
      deductions: slip.deductions,
      bpjs: slip.bpjs,
      pph21: slip.pph21,
      total: slip.total,
      payrollStatus: slip.isEstimated ? 'ESTIMASI BERJALAN' : slip.status,
    });

    const filename = buildPayslipFilename(
      slip.employee.name,
      slip.periodMonth,
      slip.periodYear,
    );

    return { pdfBuffer, filename };
  }

  async findOne(id: string, userId: string, role: Role) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: { ...EMPLOYEE_PAYROLL_INCLUDE, salary: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Data payroll tidak ditemukan');
    }

    if (
      role !== 'HR' &&
      role !== 'SUPER_ADMIN' &&
      record.employee.userId !== userId
    ) {
      throw new ForbiddenException(
        'Anda tidak berhak melihat slip gaji karyawan lain',
      );
    }

    const { startDate, endDate } = normalizePeriod(
      record.periodMonth,
      record.periodYear,
    );
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: record.employeeId,
        date: { gte: startDate, lte: endDate },
      },
      select: { status: true, overtimeMinutes: true },
    });
    const calc = calculatePayrollBreakdown(record.employee, attendances);
    const isPaid = record.status === 'PAID';

    const deductions = isPaid ? record.deductions : calc.deductions;
    const total = isPaid ? record.total : calc.total;
    const overtime = isPaid ? record.overtime : calc.overtime;
    const bpjs = isPaid ? record.bpjs : calc.bpjs;
    const pph21 = isPaid ? record.pph21 : calc.pph21;

    if (
      !isPaid &&
      (record.deductions !== calc.deductions ||
        record.total !== calc.total ||
        record.overtime !== calc.overtime ||
        record.bpjs !== calc.bpjs ||
        record.pph21 !== calc.pph21)
    ) {
      await this.prisma.payrollRecord.update({
        where: { id: record.id },
        data: {
          deductions: calc.deductions,
          total: calc.total,
          overtime: calc.overtime,
          bpjs: calc.bpjs,
          pph21: calc.pph21,
        },
      });
    }

    return {
      ...record,
      deductions,
      total,
      overtime,
      bpjs,
      pph21,
      overtimeHours: calc.overtimeHours,
      lateCount: calc.lateCount,
      lateDeduction: calc.lateDeduction,
      alphaCount: calc.alphaCount,
      alphaDeduction: calc.alphaDeduction,
    };
  }

  async approve(id: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: { ...EMPLOYEE_PAYROLL_INCLUDE, salary: true },
        },
      },
    });
    if (!record) throw new NotFoundException('Data payroll tidak ditemukan');
    if (record.status === 'PAID') {
      throw new BadRequestException(
        'Payroll yang sudah dibayar (PAID) tidak dapat diubah',
      );
    }

    const { startDate, endDate } = normalizePeriod(
      record.periodMonth,
      record.periodYear,
    );
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: record.employeeId,
        date: { gte: startDate, lte: endDate },
      },
      select: { status: true, overtimeMinutes: true },
    });
    const calc = calculatePayrollBreakdown(record.employee, attendances);

    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        baseSalary: calc.baseSalary,
        allowance: calc.allowance,
        overtime: calc.overtime,
        deductions: calc.deductions,
        bpjs: calc.bpjs,
        pph21: calc.pph21,
        total: calc.total,
        status: 'APPROVED',
        revisionNote: null,
      },
    });
  }

  async revise(id: string, dto: RevisePayrollDto) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: { ...EMPLOYEE_PAYROLL_INCLUDE, salary: true },
        },
      },
    });
    if (!record) throw new NotFoundException('Data payroll tidak ditemukan');
    if (record.status === 'PAID') {
      throw new BadRequestException(
        'Payroll yang sudah dibayar (PAID) tidak dapat direvisi',
      );
    }

    const { startDate, endDate } = normalizePeriod(
      record.periodMonth,
      record.periodYear,
    );
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: record.employeeId,
        date: { gte: startDate, lte: endDate },
      },
      select: { status: true, overtimeMinutes: true },
    });
    const calc = calculatePayrollBreakdown(record.employee, attendances);

    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        baseSalary: calc.baseSalary,
        allowance: calc.allowance,
        overtime: calc.overtime,
        deductions: calc.deductions,
        bpjs: calc.bpjs,
        pph21: calc.pph21,
        total: calc.total,
        status: 'DRAFT',
        revisionNote: dto.note?.trim() ?? 'Perlu revisi kalkulasi gaji',
      },
    });
  }

  async markPaid(id: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Data payroll tidak ditemukan');
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
      companyName: COMPANY_SLIP_NAME,
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

    const filename = buildPayslipFilename(
      record.employee.user.name,
      record.periodMonth,
      record.periodYear,
    );

    return { pdfBuffer, filename };
  }
}
