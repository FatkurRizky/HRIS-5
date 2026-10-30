import { BadRequestException } from '@nestjs/common';
import type { AttendanceStatus } from '@prisma/client';

export const COMPANY_SLIP_NAME = 'PT KERABAT DIGITAL INDONESIA (HRIS)';
const LATE_PENALTY_PER_DAY = 100000; // Potongan gaji Rp100.000 per hari terlambat
const WORK_DAYS_PER_MONTH = 22;
const BPJS_EMPLOYEE_RATE = 0.03; // 1% Kesehatan + 2% Ketenagakerjaan
const MONTHLY_PTKP = 4500000;
const PPH21_RATE = 0.05;

export const MONTH_NAMES = [
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

export const EMPLOYEE_PAYROLL_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  department: true,
  position: true,
} as const;

export interface AttendanceRowLike {
  status: AttendanceStatus;
  overtimeMinutes: number;
}

export interface EmployeeSalarySource {
  position?: { baseSalary: number } | null;
  salary?: {
    baseSalary: number;
    allowance: number;
    overtimeRate: number;
  } | null;
}

export function normalizePeriod(month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new BadRequestException('Bulan harus berupa angka 1 sampai 12');
  }
  if (!Number.isInteger(y) || y < 2020 || y > 2100) {
    throw new BadRequestException('Tahun harus berada di rentang 2020 - 2100');
  }

  const startDate = new Date(Date.UTC(y, m - 1, 1));
  const endDate = new Date(Date.UTC(y, m, 0));
  const periodLabel = `${MONTH_NAMES[m - 1]} ${y}`;

  return { month: m, year: y, startDate, endDate, periodLabel };
}

export function calculatePayrollBreakdown(
  emp: EmployeeSalarySource,
  attendances: AttendanceRowLike[],
) {
  const baseSalary =
    emp.salary?.baseSalary ?? emp.position?.baseSalary ?? 10000000;
  const allowance = emp.salary?.allowance ?? 2000000;
  const overtimeRate =
    emp.salary?.overtimeRate && emp.salary.overtimeRate > 0
      ? emp.salary.overtimeRate
      : Math.round(baseSalary / 173);

  let lateCount = 0;
  let alphaCount = 0;
  let totalOvertimeMinutes = 0;

  for (const att of attendances) {
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
  const total = Math.max(0, grossIncome - (deductions + bpjs + pph21));

  return {
    baseSalary,
    allowance,
    overtimeHours,
    overtime,
    lateCount,
    lateDeduction,
    alphaCount,
    alphaDeduction,
    deductions,
    bpjs,
    grossIncome,
    pph21,
    total,
  };
}

export function buildPayslipFilename(
  employeeName: string,
  month: number,
  year: number,
) {
  const slug = employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `slip-gaji-${slug}-${month}-${year}.pdf`;
}
