import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { PayrollService } from './payroll.service.js';
import {
  calculatePayrollBreakdown,
} from './payroll-calculator.js';

describe('PayrollService & Late Deductions', () => {
  let service: PayrollService;
  let prismaMock: {
    employee: { findUnique: any; findMany: any };
    payrollRecord: {
      findUnique: any;
      findMany: any;
      upsert: any;
      update: any;
      updateMany: any;
      count: any;
    };
    attendance: { findMany: any };
  };

  beforeEach(async () => {
    prismaMock = {
      employee: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      payrollRecord: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      attendance: {
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  describe('calculatePayrollBreakdown (Late Penalty)', () => {
    const mockEmployee = {
      salary: {
        baseSalary: 10000000,
        allowance: 2000000,
        overtimeRate: 50000,
      },
    };

    it('should have 0 deductions when there are no late attendances', () => {
      const attendances = [
        { status: 'PRESENT' as const, overtimeMinutes: 0 },
        { status: 'PRESENT' as const, overtimeMinutes: 0 },
      ];

      const res = calculatePayrollBreakdown(mockEmployee, attendances);
      expect(res.lateCount).toBe(0);
      expect(res.lateDeduction).toBe(0);
      expect(res.deductions).toBe(0);
      // gross: 12.000.000, bpjs: 360.000, pph21: 375.000 -> total: 11.265.000
      expect(res.total).toBe(11265000);
    });

    it('should deduct Rp 100.000 per late arrival from deductions and take home pay', () => {
      const attendances = [
        { status: 'LATE' as const, overtimeMinutes: 0 },
        { status: 'PRESENT' as const, overtimeMinutes: 0 },
      ];

      const res = calculatePayrollBreakdown(mockEmployee, attendances);
      expect(res.lateCount).toBe(1);
      expect(res.lateDeduction).toBe(100000);
      expect(res.deductions).toBe(100000);
      // 11.265.000 - 100.000 = 11.165.000
      expect(res.total).toBe(11165000);
    });

    it('should deduct Rp 300.000 for 3 late arrivals', () => {
      const attendances = [
        { status: 'LATE' as const, overtimeMinutes: 0 },
        { status: 'LATE' as const, overtimeMinutes: 0 },
        { status: 'LATE' as const, overtimeMinutes: 0 },
      ];

      const res = calculatePayrollBreakdown(mockEmployee, attendances);
      expect(res.lateCount).toBe(3);
      expect(res.lateDeduction).toBe(300000);
      expect(res.deductions).toBe(300000);
      // 11.265.000 - 300.000 = 10.965.000
      expect(res.total).toBe(10965000);
    });
  });

  describe('findMyPeriodSlip', () => {
    it('should apply late deduction even if an existing draft had 0 deductions', async () => {
      const mockEmp = {
        id: 'emp-1',
        userId: 'user-1',
        nik: 'EMP-001',
        status: 'TETAP',
        user: { name: 'Budi', email: 'budi@kerabat.id' },
        department: { name: 'Engineering' },
        position: { name: 'Staff' },
        salary: { baseSalary: 10000000, allowance: 2000000, overtimeRate: 50000 },
        attendances: [
          { status: 'LATE', overtimeMinutes: 0 },
        ],
      };

      prismaMock.employee.findUnique.mockResolvedValue(mockEmp);

      // Existing record created before employee was late (deductions = 0, total = 11.265.000)
      const staleExistingDraft = {
        id: 'rec-1',
        employeeId: 'emp-1',
        periodMonth: 10,
        periodYear: 2026,
        baseSalary: 10000000,
        allowance: 2000000,
        overtime: 0,
        deductions: 0,
        bpjs: 360000,
        pph21: 375000,
        total: 11265000,
        status: 'DRAFT',
      };

      prismaMock.payrollRecord.findUnique.mockResolvedValue(staleExistingDraft);
      prismaMock.payrollRecord.update.mockResolvedValue({});

      const slip = await service.findMyPeriodSlip('user-1', 10, 2026);

      // Must have lateCount = 1, lateDeduction = 100.000, deductions = 100.000, total = 11.165.000
      expect(slip.lateCount).toBe(1);
      expect(slip.lateDeduction).toBe(100000);
      expect(slip.deductions).toBe(100000);
      expect(slip.total).toBe(11165000);

      // Should have triggered DB update to fix stale draft
      expect(prismaMock.payrollRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({
            deductions: 100000,
            total: 11165000,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should recalculate and return late deductions for all employees in period', async () => {
      const records = [
        {
          id: 'rec-1',
          employeeId: 'emp-1',
          periodMonth: 10,
          periodYear: 2026,
          baseSalary: 10000000,
          allowance: 2000000,
          overtime: 0,
          deductions: 0,
          bpjs: 360000,
          pph21: 375000,
          total: 11265000,
          status: 'DRAFT',
          employee: {
            salary: { baseSalary: 10000000, allowance: 2000000, overtimeRate: 50000 },
          },
        },
      ];

      prismaMock.payrollRecord.findMany.mockResolvedValue(records);
      prismaMock.attendance.findMany.mockResolvedValue([
        { status: 'LATE', overtimeMinutes: 0 },
      ]);
      prismaMock.payrollRecord.update.mockResolvedValue({});

      const results = await service.findAll(10, 2026);

      expect(results[0].lateCount).toBe(1);
      expect(results[0].lateDeduction).toBe(100000);
      expect(results[0].deductions).toBe(100000);
      expect(results[0].total).toBe(11165000);
    });
  });

  describe('approve', () => {
    it('should recalculate late deductions from attendances before marking APPROVED', async () => {
      const staleDraft = {
        id: 'rec-approve-1',
        employeeId: 'emp-1',
        periodMonth: 10,
        periodYear: 2026,
        baseSalary: 10000000,
        allowance: 2000000,
        overtime: 0,
        deductions: 0,
        bpjs: 360000,
        pph21: 375000,
        total: 11265000,
        status: 'DRAFT',
        employee: {
          salary: { baseSalary: 10000000, allowance: 2000000, overtimeRate: 50000 },
        },
      };

      prismaMock.payrollRecord.findUnique.mockResolvedValue(staleDraft);
      prismaMock.attendance.findMany.mockResolvedValue([
        { status: 'LATE', overtimeMinutes: 0 },
        { status: 'LATE', overtimeMinutes: 0 },
      ]);
      prismaMock.payrollRecord.update.mockImplementation((args) =>
        Promise.resolve(args.data),
      );

      const approved = await service.approve('rec-approve-1');

      // Must have updated deductions to 200.000 and total to 11.065.000 before setting APPROVED
      expect(approved.deductions).toBe(200000);
      expect(approved.total).toBe(11065000);
      expect(approved.status).toBe('APPROVED');
      expect(prismaMock.payrollRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-approve-1' },
          data: expect.objectContaining({
            deductions: 200000,
            total: 11065000,
            status: 'APPROVED',
          }),
        }),
      );
    });
  });

  describe('findMyPayrolls', () => {
    it('should recalculate late deductions for non-PAID records in my payroll list', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
      prismaMock.payrollRecord.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          employeeId: 'emp-1',
          periodMonth: 10,
          periodYear: 2026,
          baseSalary: 10000000,
          allowance: 2000000,
          overtime: 0,
          deductions: 0,
          bpjs: 360000,
          pph21: 375000,
          total: 11265000,
          status: 'DRAFT',
          employee: {
            salary: { baseSalary: 10000000, allowance: 2000000, overtimeRate: 50000 },
          },
        },
      ]);
      prismaMock.attendance.findMany.mockResolvedValue([
        { status: 'LATE', overtimeMinutes: 0 },
      ]);
      prismaMock.payrollRecord.update.mockResolvedValue({});

      const list = await service.findMyPayrolls('user-1');

      expect(list[0].lateCount).toBe(1);
      expect(list[0].lateDeduction).toBe(100000);
      expect(list[0].deductions).toBe(100000);
      expect(list[0].total).toBe(11165000);
    });
  });
});
