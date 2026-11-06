import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
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

interface PayrollActorContext {
  id?: string;
  email?: string;
  suppressLog?: boolean;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activityLog?: ActivityLogService,
  ) {}

  async generatePayroll(dto: GeneratePayrollDto, actor?: PayrollActorContext) {
    const { month, year, startDate, endDate, periodLabel } = normalizePeriod(
      dto.month,
      dto.year,
    );

    const employees = await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
      },
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

      // Jangan timpa record yang sudah APPROVED atau PAID
      if (
        existingRecord &&
        (existingRecord.status === 'APPROVED' ||
          existingRecord.status === 'PAID')
      ) {
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

    if (!actor?.suppressLog) {
      await this.activityLog?.record({
        actorUserId: actor?.id ?? null,
        actorEmail: actor?.email ?? 'sistem',
        action: `Menghitung payroll periode ${periodLabel} (${results.length} karyawan aktif)`,
        category: 'PAYROLL',
        level: 'INFO',
      });
    }

    return {
      message: `Kalkulasi payroll periode ${periodLabel} berhasil diproses`,
      count: results.length,
      records: results,
    };
  }

  async approvePeriod(dto: GeneratePayrollDto, actor?: PayrollActorContext) {
    const { month, year, periodLabel } = normalizePeriod(dto.month, dto.year);

    // Hitung ulang payroll periode agar potongan keterlambatan & lembur terkini langsung tercatat
    await this.generatePayroll({ month, year }, { suppressLog: true });

    const updated = await this.prisma.payrollRecord.updateMany({
      where: { periodMonth: month, periodYear: year, status: 'DRAFT' },
      data: { status: 'APPROVED', revisionNote: null },
    });

    const records = await this.findAll(month, year);

    await this.activityLog?.record({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? 'sistem',
      action: `Menyetujui payroll tahap HR periode ${periodLabel} (${updated.count} slip)`,
      category: 'PAYROLL',
      level: 'INFO',
    });

    return {
      message: `Payroll periode ${periodLabel} berhasil disetujui (${updated.count} slip diperbarui)`,
      approvedCount: updated.count,
      records,
    };
  }

  private async syncDraftRecordIfNeeded(
    record: {
      id: string;
      status: string;
      baseSalary?: number;
      allowance?: number;
      deductions: number;
      total: number;
      overtime: number;
      bpjs: number;
      pph21: number;
    },
    calc: ReturnType<typeof calculatePayrollBreakdown>,
  ) {
    const isDraft = record.status === 'DRAFT';
    const currentBaseSalary = record.baseSalary ?? calc.baseSalary;
    const currentAllowance = record.allowance ?? calc.allowance;

    const baseSalary = isDraft ? calc.baseSalary : currentBaseSalary;
    const allowance = isDraft ? calc.allowance : currentAllowance;
    const deductions = isDraft ? calc.deductions : record.deductions;
    const total = isDraft ? calc.total : record.total;
    const overtime = isDraft ? calc.overtime : record.overtime;
    const bpjs = isDraft ? calc.bpjs : record.bpjs;
    const pph21 = isDraft ? calc.pph21 : record.pph21;

    if (
      isDraft &&
      (currentBaseSalary !== calc.baseSalary ||
        currentAllowance !== calc.allowance ||
        record.deductions !== calc.deductions ||
        record.total !== calc.total ||
        record.overtime !== calc.overtime ||
        record.bpjs !== calc.bpjs ||
        record.pph21 !== calc.pph21)
    ) {
      await this.prisma.payrollRecord.update({
        where: { id: record.id },
        data: {
          baseSalary: calc.baseSalary,
          allowance: calc.allowance,
          deductions: calc.deductions,
          total: calc.total,
          overtime: calc.overtime,
          bpjs: calc.bpjs,
          pph21: calc.pph21,
        },
      });
    }

    return {
      baseSalary,
      allowance,
      deductions,
      total,
      overtime,
      bpjs,
      pph21,
    };
  }

  private async enrichAndSyncPayrollRecord<
    T extends {
      id: string;
      employeeId: string;
      periodMonth: number;
      periodYear: number;
      status: string;
      baseSalary?: number;
      allowance?: number;
      deductions: number;
      total: number;
      overtime: number;
      bpjs: number;
      pph21: number;
      employee: Parameters<typeof calculatePayrollBreakdown>[0];
    },
  >(record: T) {
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
    const synced = await this.syncDraftRecordIfNeeded(record, calc);

    return {
      ...record,
      ...synced,
      overtimeHours: calc.overtimeHours,
      lateCount: calc.lateCount,
      lateDeduction: calc.lateDeduction,
      alphaCount: calc.alphaCount,
      alphaDeduction: calc.alphaDeduction,
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
      records.map((record) => this.enrichAndSyncPayrollRecord(record)),
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
      records.map((record) => this.enrichAndSyncPayrollRecord(record)),
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

    const synced = existingRecord
      ? await this.syncDraftRecordIfNeeded(existingRecord, calc)
      : {
          baseSalary: calc.baseSalary,
          allowance: calc.allowance,
          deductions: calc.deductions,
          total: calc.total,
          overtime: calc.overtime,
          bpjs: calc.bpjs,
          pph21: calc.pph21,
        };

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
      ...synced,
      overtimeHours: calc.overtimeHours,
      lateCount: calc.lateCount,
      lateDeduction: calc.lateDeduction,
      alphaCount: calc.alphaCount,
      alphaDeduction: calc.alphaDeduction,
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

    return this.enrichAndSyncPayrollRecord(record);
  }

  private async recalculateMutableRecord(id: string, paidErrorMsg: string) {
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
      throw new BadRequestException(paidErrorMsg);
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

    return {
      record,
      calcPayload: {
        baseSalary: calc.baseSalary,
        allowance: calc.allowance,
        overtime: calc.overtime,
        deductions: calc.deductions,
        bpjs: calc.bpjs,
        pph21: calc.pph21,
        total: calc.total,
      },
    };
  }

  async approve(id: string, actor?: PayrollActorContext) {
    const { record, calcPayload } = await this.recalculateMutableRecord(
      id,
      'Payroll yang sudah dibayar (PAID) tidak dapat diubah',
    );

    const updated = await this.prisma.payrollRecord.update({
      where: { id },
      data: {
        ...calcPayload,
        status: 'APPROVED',
        revisionNote: null,
      },
    });

    const empName = record.employee?.user?.name;
    await this.activityLog?.record({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? 'sistem',
      action: empName
        ? `Menyetujui payroll tahap HR untuk ${empName}`
        : 'Menyetujui payroll tahap HR',
      category: 'PAYROLL',
      level: 'INFO',
    });

    return updated;
  }

  async revise(id: string, dto: RevisePayrollDto) {
    const { calcPayload } = await this.recalculateMutableRecord(
      id,
      'Payroll yang sudah dibayar (PAID) tidak dapat direvisi',
    );

    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        ...calcPayload,
        status: 'DRAFT',
        revisionNote: dto.note?.trim() ?? 'Perlu revisi kalkulasi gaji',
      },
    });
  }

  async markPaid(id: string, actor?: PayrollActorContext) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: { user: { select: { name: true } } },
        },
      },
    });
    if (!record) throw new NotFoundException('Data payroll tidak ditemukan');
    if (record.status !== 'APPROVED') {
      throw new BadRequestException(
        'Payroll harus berstatus APPROVED terlebih dahulu sebelum ditandai PAID',
      );
    }

    const updated = await this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'PAID' },
    });

    const empName = record.employee?.user?.name;
    await this.activityLog?.record({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? 'sistem',
      action: empName
        ? `Menandai pembayaran gaji selesai (PAID) untuk ${empName}`
        : 'Menandai pembayaran gaji selesai (PAID)',
      category: 'PAYROLL',
      level: 'INFO',
    });

    return updated;
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
