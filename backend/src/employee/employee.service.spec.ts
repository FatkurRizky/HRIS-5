import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { EmployeeService } from './employee.service.js';

describe('EmployeeService (CRUD, Contract Monitoring, Org Hierarchy & No KK)', () => {
  let service: EmployeeService;
  let prismaMock: {
    user: { findUnique: any; create: any; update: any; delete: any };
    employee: {
      findMany: any;
      findUnique: any;
      findUniqueOrThrow: any;
      findFirst: any;
      create: any;
      update: any;
      updateMany: any;
      delete: any;
    };
    department: { upsert: any };
    position: { upsert: any };
    salary: { create: any; upsert: any };
    $transaction: any;
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      employee: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      department: { upsert: vi.fn() },
      position: { upsert: vi.fn() },
      salary: { create: vi.fn(), upsert: vi.fn() },
      $transaction: vi.fn((cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  it('does not include KK (noKk / kk) in CreateEmployeeDto', () => {
    const dto = new CreateEmployeeDto();
    expect('kk' in dto).toBe(false);
    expect('noKk' in dto).toBe(false);
  });

  it('creates employee profile with phone, address, photoUrl, and salary', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.employee.findUnique.mockResolvedValue(null);
    prismaMock.employee.findFirst.mockResolvedValue({ id: 'mgr-1' });
    prismaMock.department.upsert.mockResolvedValue({
      id: 'dept-1',
      name: 'Engineering',
    });
    prismaMock.position.upsert.mockResolvedValue({
      id: 'pos-1',
      name: 'Backend Developer',
    });
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Raka Pratama',
      email: 'raka@kerabat.id',
      role: 'EMPLOYEE',
    });
    prismaMock.employee.create.mockResolvedValue({
      id: 'emp-1',
      userId: 'user-1',
    });
    prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
      id: 'emp-1',
      userId: 'user-1',
      nik: 'EMP-2026-010',
      phone: '08123456789',
      address: 'Jl. Dhoho No. 10, Kediri',
      photoUrl: 'https://example.com/raka.jpg',
      status: 'KONTRAK',
      contractEndDate: new Date(Date.now() + 15 * 86400000),
      user: { name: 'Raka Pratama', email: 'raka@kerabat.id', role: 'EMPLOYEE' },
    });

    const result = await service.create({
      name: 'Raka Pratama',
      email: 'raka@kerabat.id',
      password: 'password123',
      nik: 'EMP-2026-010',
      phone: '08123456789',
      address: 'Jl. Dhoho No. 10, Kediri',
      photoUrl: 'https://example.com/raka.jpg',
      departmentName: 'Engineering',
      positionName: 'Backend Developer',
      status: 'KONTRAK',
      baseSalary: 9500000,
      allowance: 1500000,
    });

    expect(prismaMock.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nik: 'EMP-2026-010',
          phone: '08123456789',
          address: 'Jl. Dhoho No. 10, Kediri',
          photoUrl: 'https://example.com/raka.jpg',
          departmentId: 'dept-1',
          positionId: 'pos-1',
          managerId: 'mgr-1',
        }),
      }),
    );
    expect(prismaMock.salary.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'emp-1',
          baseSalary: 9500000,
          allowance: 1500000,
        }),
      }),
    );
    expect(result.contractExpiringWarning).toBe(true);
    expect(result.daysUntilContractEnd).toBeLessThanOrEqual(30);
  });

  it('rejects duplicate NIK when creating employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.employee.findUnique.mockResolvedValue({ id: 'existing-emp' });

    await expect(
      service.create({
        name: 'Dup NIK',
        email: 'dup@kerabat.id',
        password: 'password123',
        nik: 'EMP-DUP',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('prevents self-manager and circular manager hierarchy on update', async () => {
    prismaMock.employee.findUnique.mockResolvedValueOnce({
      id: 'emp-1',
      userId: 'user-1',
      user: { id: 'user-1' },
    });

    await expect(
      service.update('emp-1', { managerId: 'emp-1' }),
    ).rejects.toThrow(BadRequestException);

    // Circular: emp-1 -> emp-2 -> emp-1
    prismaMock.employee.findUnique
      .mockResolvedValueOnce({
        id: 'emp-1',
        userId: 'user-1',
        user: { id: 'user-1' },
      })
      .mockResolvedValueOnce({ managerId: 'emp-1' });

    await expect(
      service.update('emp-1', { managerId: 'emp-2' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('clears contractEndDate when status is updated to TETAP', async () => {
    prismaMock.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      status: 'KONTRAK',
      contractEndDate: new Date('2026-12-31'),
    });
    prismaMock.employee.update.mockImplementation((args) =>
      Promise.resolve({
        id: 'emp-1',
        status: args.data.status,
        contractEndDate: args.data.contractEndDate ?? null,
      }),
    );

    const res = await service.updateStatus('emp-1', { status: 'TETAP' });
    expect(res.status).toBe('TETAP');
    expect(res.contractEndDate).toBeNull();
    expect(res.contractExpiringWarning).toBe(false);
  });

  it('unlinks subordinates before deleting employee and user', async () => {
    prismaMock.employee.findUnique.mockResolvedValue({
      id: 'emp-mgr',
      userId: 'user-mgr',
      user: { email: 'mgr@kerabat.id', name: 'Manager' },
    });

    const res = await service.remove('emp-mgr');
    expect(prismaMock.employee.updateMany).toHaveBeenCalledWith({
      where: { managerId: 'emp-mgr' },
      data: { managerId: null },
    });
    expect(prismaMock.employee.delete).toHaveBeenCalledWith({
      where: { id: 'emp-mgr' },
    });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-mgr' },
    });
    expect(res.message).toContain('berhasil dihapus');
  });

  it('clears phone, address, photoUrl, and contractEndDate to null when updated with null/empty values', async () => {
    prismaMock.employee.findUnique.mockResolvedValue({
      id: 'emp-1',
      userId: 'user-1',
      phone: '08123456789',
      address: 'Jl. Lama',
      photoUrl: 'https://example.com/old.jpg',
      status: 'KONTRAK',
      contractEndDate: new Date('2026-12-31'),
      user: { id: 'user-1', name: 'Bima', email: 'bima@kerabat.id' },
    });
    prismaMock.employee.update.mockImplementation((args) =>
      Promise.resolve({
        id: 'emp-1',
        status: 'KONTRAK',
        ...args.data,
      }),
    );

    const updated = await service.update('emp-1', {
      phone: null,
      address: null,
      photoUrl: null,
      contractEndDate: null,
    });

    expect(prismaMock.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'emp-1' },
        data: expect.objectContaining({
          phone: null,
          address: null,
          photoUrl: null,
          contractEndDate: null,
        }),
      }),
    );
    expect(updated.phone).toBeNull();
    expect(updated.address).toBeNull();
    expect(updated.photoUrl).toBeNull();
    expect(updated.contractEndDate).toBeNull();
  });
});
