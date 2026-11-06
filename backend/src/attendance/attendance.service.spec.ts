import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttendanceService } from './attendance.service.js';

describe('AttendanceService (Timezone & Late Handling)', () => {
  let service: AttendanceService;
  let prismaMock: {
    officeLocation: { findMany: any };
    attendance: { findUnique: any; create: any; update: any; deleteMany: any; findMany: any };
    employee: { findUnique: any; create: any; findMany: any };
    user: { findUnique: any };
    payrollRecord: { findUnique: any; update: any };
  };

  beforeEach(async () => {
    prismaMock = {
      officeLocation: { findMany: vi.fn() },
      attendance: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      employee: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      user: { findUnique: vi.fn() },
      payrollRecord: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('getWibDate', () => {
    it('should correctly convert a UTC date to WIB (UTC+7)', () => {
      // 01:15 UTC is 08:15 WIB
      const utcDate = new Date('2026-10-31T01:15:00.000Z');
      const wib = service.getWibDate(utcDate);

      expect(wib.getHours()).toBe(8);
      expect(wib.getMinutes()).toBe(15);
    });

    it('should identify 08:01 WIB as late', () => {
      // 01:01 UTC is 08:01 WIB
      const utcDate = new Date('2026-10-31T01:01:00.000Z');
      const wib = service.getWibDate(utcDate);

      const isLate =
        wib.getHours() > 8 || (wib.getHours() === 8 && wib.getMinutes() > 0);
      expect(isLate).toBe(true);
    });

    it('should identify 07:59 WIB as on time', () => {
      // 00:59 UTC is 07:59 WIB
      const utcDate = new Date('2026-10-31T00:59:00.000Z');
      const wib = service.getWibDate(utcDate);

      const isLate =
        wib.getHours() > 8 || (wib.getHours() === 8 && wib.getMinutes() > 0);
      expect(isLate).toBe(false);
    });
  });

  describe('clockIn late status determination', () => {
    it('should set status to LATE when clocking in after 08:00 WIB', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
      prismaMock.officeLocation.findMany.mockResolvedValue([
        {
          id: 'office-1',
          name: 'Kantor',
          latitude: -7.8036003,
          longitude: 112.005465,
          radius: 200,
          isActive: true,
        },
      ]);
      prismaMock.attendance.findUnique.mockResolvedValue(null);
      prismaMock.attendance.create.mockImplementation((args) => Promise.resolve(args.data));
      prismaMock.payrollRecord.findUnique.mockResolvedValue(null);

      // Force getWibDate to return 08:15 WIB
      vi.spyOn(service, 'getWibDate').mockReturnValue(new Date('2026-10-31T08:15:00'));

      const result = await service.clockIn('user-1', {
        latitude: -7.8036003,
        longitude: 112.005465,
      });

      expect(result.attendance.status).toBe('LATE');
      expect(result.message).toContain('Terlambat');
    });
  });

  describe('clockOut overtime calculation', () => {
    it('should calculate overtime minutes when clocking out after 17:00 WIB', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
      prismaMock.officeLocation.findMany.mockResolvedValue([
        {
          id: 'office-1',
          name: 'Kantor',
          latitude: -7.8036003,
          longitude: 112.005465,
          radius: 200,
          isActive: true,
        },
      ]);
      prismaMock.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        employeeId: 'emp-1',
        clockIn: new Date(),
        clockOut: null,
      });
      prismaMock.attendance.update.mockImplementation((args) => Promise.resolve(args.data));
      prismaMock.payrollRecord.findUnique.mockResolvedValue(null);

      // Force getWibDate to return 18:30 WIB (90 minutes overtime)
      vi.spyOn(service, 'getWibDate').mockReturnValue(new Date('2026-10-31T18:30:00'));

      const result = await service.clockOut('user-1', {
        latitude: -7.8036003,
        longitude: 112.005465,
      });

      expect(result.attendance.overtimeMinutes).toBe(90);
      expect(result.message).toContain('Clock-out berhasil');
    });

    it('should calculate 0 overtime minutes when clocking out before or at 17:00 WIB', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
      prismaMock.officeLocation.findMany.mockResolvedValue([
        {
          id: 'office-1',
          name: 'Kantor',
          latitude: -7.8036003,
          longitude: 112.005465,
          radius: 200,
          isActive: true,
        },
      ]);
      prismaMock.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        employeeId: 'emp-1',
        clockIn: new Date(),
        clockOut: null,
      });
      prismaMock.attendance.update.mockImplementation((args) => Promise.resolve(args.data));
      prismaMock.payrollRecord.findUnique.mockResolvedValue(null);

      // Force getWibDate to return 17:00 WIB
      vi.spyOn(service, 'getWibDate').mockReturnValue(new Date('2026-10-31T17:00:00'));

      const result = await service.clockOut('user-1', {
        latitude: -7.8036003,
        longitude: 112.005465,
      });

      expect(result.attendance.overtimeMinutes).toBe(0);
    });

    it('should NOT update payroll record if its status is APPROVED or PAID', async () => {
      prismaMock.employee.findUnique.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
      prismaMock.officeLocation.findMany.mockResolvedValue([
        {
          id: 'office-1',
          name: 'Kantor',
          latitude: -7.8036003,
          longitude: 112.005465,
          radius: 200,
          isActive: true,
        },
      ]);
      prismaMock.attendance.findUnique.mockResolvedValue({
        id: 'att-1',
        employeeId: 'emp-1',
        clockIn: new Date(),
        clockOut: null,
      });
      prismaMock.attendance.update.mockImplementation((args) => Promise.resolve(args.data));
      // Payroll is already APPROVED
      prismaMock.payrollRecord.findUnique.mockResolvedValue({
        id: 'payroll-1',
        status: 'APPROVED',
      });

      vi.spyOn(service, 'getWibDate').mockReturnValue(new Date('2026-10-31T17:00:00'));

      await service.clockOut('user-1', {
        latitude: -7.8036003,
        longitude: 112.005465,
      });

      // Must not update approved payroll record
      expect(prismaMock.payrollRecord.update).not.toHaveBeenCalled();
    });
  });

  describe('Attendance RBAC (HR and Manager role rejection)', () => {
    it.each(['HR', 'MANAGER', 'SUPER_ADMIN'])(
      'should throw ForbiddenException when %s tries to clockIn',
      async (role) => {
        prismaMock.employee.findUnique.mockResolvedValue({
          id: `emp-${role}`,
          userId: `user-${role}`,
          user: { role },
        });

        await expect(
          service.clockIn(`user-${role}`, {
            latitude: -7.8036003,
            longitude: 112.005465,
          }),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it.each(['HR', 'MANAGER', 'SUPER_ADMIN'])(
      'should throw ForbiddenException when %s tries to clockOut',
      async (role) => {
        prismaMock.employee.findUnique.mockResolvedValue({
          id: `emp-${role}`,
          userId: `user-${role}`,
          user: { role },
        });

        await expect(
          service.clockOut(`user-${role}`, {
            latitude: -7.8036003,
            longitude: 112.005465,
          }),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it.each(['HR', 'MANAGER', 'SUPER_ADMIN'])(
      'should throw ForbiddenException when %s tries to resetToday',
      async (role) => {
        prismaMock.employee.findUnique.mockResolvedValue({
          id: `emp-${role}`,
          userId: `user-${role}`,
          user: { role },
        });

        await expect(service.resetToday(`user-${role}`)).rejects.toThrow(
          ForbiddenException,
        );
      },
    );

    it.each(['HR', 'MANAGER', 'SUPER_ADMIN'])(
      'should throw ForbiddenException when %s tries to getMyRecords',
      async (role) => {
        prismaMock.employee.findUnique.mockResolvedValue({
          id: `emp-${role}`,
          userId: `user-${role}`,
          user: { role },
        });

        await expect(service.getMyRecords(`user-${role}`)).rejects.toThrow(
          ForbiddenException,
        );
      },
    );

    it.each(['HR', 'MANAGER', 'SUPER_ADMIN'])(
      'should throw ForbiddenException when %s tries to getMyMonthlyRecap',
      async (role) => {
        prismaMock.employee.findUnique.mockResolvedValue({
          id: `emp-${role}`,
          userId: `user-${role}`,
          user: { role },
        });

        await expect(
          service.getMyMonthlyRecap(`user-${role}`, 10, 2026),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it('getMonthlyRecap should filter by role EMPLOYEE and calculate workHours, late, and alpha', async () => {
      prismaMock.employee.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          nik: 'EMP-001',
          user: { id: 'u-1', name: 'Budi', email: 'budi@kerabat.id' },
          department: { name: 'Engineering' },
          position: { name: 'Developer' },
          attendances: [
            {
              status: 'PRESENT',
              clockIn: new Date('2026-10-01T01:00:00.000Z'),
              clockOut: new Date('2026-10-01T10:00:00.000Z'), // 9 hours = 540 mins
              overtimeMinutes: 0,
            },
            {
              status: 'LATE',
              clockIn: new Date('2026-10-02T01:30:00.000Z'),
              clockOut: new Date('2026-10-02T11:00:00.000Z'), // 9.5 hours = 570 mins
              overtimeMinutes: 60,
            },
            {
              status: 'ALPHA',
              clockIn: null,
              clockOut: null,
              overtimeMinutes: 0,
            },
          ],
          leaveRequests: [],
        },
      ]);

      const recap = await service.getMonthlyRecap(10, 2026);

      expect(prismaMock.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user: { role: 'EMPLOYEE' },
          },
        }),
      );
      expect(recap[0].summary).toEqual({
        present: 2,
        late: 1,
        alpha: 1,
        leave: 0,
        workMinutes: 1110,
        workHours: 18.5,
        overtimeMinutes: 60,
        overtimeHours: 1,
      });
    });

    it('findAll should filter by employee user role EMPLOYEE', async () => {
      prismaMock.attendance.findMany.mockResolvedValue([]);

      await service.findAll({ departmentId: 'dept-1' });

      expect(prismaMock.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employee: expect.objectContaining({
              user: { role: 'EMPLOYEE' },
              departmentId: 'dept-1',
            }),
          }),
        }),
      );
    });
  });
});
