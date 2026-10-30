import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EmployeeStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto.js';

const SALT_ROUNDS = 10;
const CONTRACT_WARNING_DAYS = 30;

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

const EMPLOYEE_INCLUDE = {
  user: { select: USER_SAFE_SELECT },
  department: true,
  position: true,
  manager: {
    include: {
      user: { select: USER_SAFE_SELECT },
      position: true,
    },
  },
  subordinates: {
    include: {
      user: { select: USER_SAFE_SELECT },
      position: true,
    },
  },
  salary: true,
} as const;

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  private withContractWarning<
    T extends { status: EmployeeStatus; contractEndDate: Date | null },
  >(employee: T) {
    if (!employee.contractEndDate || employee.status === 'TETAP') {
      return {
        ...employee,
        daysUntilContractEnd: null,
        contractExpiringWarning: false,
      };
    }

    const now = new Date();
    const diffMs = employee.contractEndDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      ...employee,
      daysUntilContractEnd: daysRemaining,
      contractExpiringWarning: daysRemaining <= CONTRACT_WARNING_DAYS,
    };
  }

  private async validateNoCircularManager(
    employeeId: string,
    targetManagerId: string,
  ) {
    if (employeeId === targetManagerId) {
      throw new BadRequestException(
        'Karyawan tidak boleh menjadi atasan dirinya sendiri',
      );
    }

    let currentId: string | null = targetManagerId;
    const visited = new Set<string>([employeeId]);

    while (currentId) {
      if (visited.has(currentId)) {
        throw new BadRequestException(
          'Relasi manager melingkar (circular hierarchy) tidak diizinkan',
        );
      }
      visited.add(currentId);

      const managerRecord: { managerId: string | null } | null =
        await this.prisma.employee.findUnique({
          where: { id: currentId },
          select: { managerId: true },
        });

      if (!managerRecord) {
        throw new NotFoundException('Manager yang dipilih tidak ditemukan');
      }

      currentId = managerRecord.managerId;
    }
  }

  async findAll(filters: {
    departmentId?: string;
    status?: EmployeeStatus;
    search?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { nik: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
      ];
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: EMPLOYEE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return employees.map((emp) => this.withContractWarning(emp));
  }

  async findByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: EMPLOYEE_INCLUDE,
    });

    if (!employee) {
      throw new NotFoundException('Profil karyawan belum terdaftar');
    }

    return this.withContractWarning(employee);
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: EMPLOYEE_INCLUDE,
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return this.withContractWarning(employee);
  }

  async create(dto: CreateEmployeeDto) {
    const email = dto.email.trim().toLowerCase();

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('Email sudah terdaftar');
    }

    if (dto.nik) {
      const existingNik = await this.prisma.employee.findUnique({
        where: { nik: dto.nik.trim() },
      });
      if (existingNik) {
        throw new ConflictException('NIK sudah digunakan karyawan lain');
      }
    }

    if (dto.managerId) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: dto.managerId },
      });
      if (!manager) {
        throw new NotFoundException('Manager tidak ditemukan');
      }
    }

    const passwordHash = await hash(dto.password, SALT_ROUNDS);

    const defaultManager = !dto.managerId
      ? await this.prisma.employee.findFirst({
          where: { user: { role: 'MANAGER' } },
          select: { id: true },
        })
      : null;

    const created = await this.prisma.$transaction(async (tx) => {
      let resolvedDeptId = dto.departmentId ?? null;
      if (!resolvedDeptId && dto.departmentName?.trim()) {
        const deptName = dto.departmentName.trim();
        const dept = await tx.department.upsert({
          where: { name: deptName },
          update: {},
          create: { name: deptName, description: `Departemen ${deptName}` },
        });
        resolvedDeptId = dept.id;
      }

      let resolvedPosId = dto.positionId ?? null;
      if (!resolvedPosId && dto.positionName?.trim()) {
        const posName = dto.positionName.trim();
        const pos = await tx.position.upsert({
          where: { name: posName },
          update: {},
          create: { name: posName, baseSalary: dto.baseSalary ?? 10000000 },
        });
        resolvedPosId = pos.id;
      }

      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password: passwordHash,
          role: dto.role ?? 'EMPLOYEE',
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          nik: dto.nik?.trim() || `KRB-${Date.now().toString().slice(-4)}`,
          phone: dto.phone?.trim() ?? null,
          address: dto.address?.trim() ?? null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
          contractEndDate: dto.contractEndDate
            ? new Date(dto.contractEndDate)
            : null,
          leaveQuota: dto.leaveQuota ?? 12,
          status: dto.status ?? 'PROBATION',
          departmentId: resolvedDeptId,
          positionId: resolvedPosId,
          managerId: dto.managerId ?? defaultManager?.id ?? null,
        },
        include: EMPLOYEE_INCLUDE,
      });

      if (dto.baseSalary !== undefined) {
        await tx.salary.create({
          data: {
            employeeId: employee.id,
            baseSalary: dto.baseSalary,
            allowance: dto.allowance ?? 0,
            overtimeRate: dto.overtimeRate ?? 0,
          },
        });
      }

      return tx.employee.findUniqueOrThrow({
        where: { id: employee.id },
        include: EMPLOYEE_INCLUDE,
      });
    });

    return this.withContractWarning(created);
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingEmail && existingEmail.id !== employee.userId) {
        throw new ConflictException('Email sudah digunakan akun lain');
      }
    }

    if (dto.nik) {
      const existingNik = await this.prisma.employee.findUnique({
        where: { nik: dto.nik.trim() },
      });

      if (existingNik && existingNik.id !== id) {
        throw new ConflictException('NIK sudah digunakan karyawan lain');
      }
    }

    if (dto.managerId) {
      await this.validateNoCircularManager(id, dto.managerId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined || dto.email !== undefined || dto.role !== undefined) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.email !== undefined
              ? { email: dto.email.trim().toLowerCase() }
              : {}),
            ...(dto.role !== undefined ? { role: dto.role } : {}),
          },
        });
      }

      return tx.employee.update({
        where: { id },
        data: {
          ...(dto.nik !== undefined ? { nik: dto.nik?.trim() || null } : {}),
          ...(dto.phone !== undefined
            ? { phone: dto.phone?.trim() || null }
            : {}),
          ...(dto.address !== undefined
            ? { address: dto.address?.trim() || null }
            : {}),
          ...(dto.birthDate !== undefined
            ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }
            : {}),
          ...(dto.joinDate !== undefined
            ? { joinDate: new Date(dto.joinDate) }
            : {}),
          ...(dto.contractEndDate !== undefined
            ? {
                contractEndDate: dto.contractEndDate
                  ? new Date(dto.contractEndDate)
                  : null,
              }
            : {}),
          ...(dto.leaveQuota !== undefined
            ? { leaveQuota: dto.leaveQuota }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.departmentId !== undefined
            ? { departmentId: dto.departmentId || null }
            : {}),
          ...(dto.positionId !== undefined
            ? { positionId: dto.positionId || null }
            : {}),
          ...(dto.managerId !== undefined
            ? { managerId: dto.managerId || null }
            : {}),
        },
        include: EMPLOYEE_INCLUDE,
      });
    });

    return this.withContractWarning(updated);
  }

  async updateStatus(id: string, dto: UpdateEmployeeStatusDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.contractEndDate !== undefined
          ? {
              contractEndDate: dto.contractEndDate
                ? new Date(dto.contractEndDate)
                : null,
            }
          : dto.status === 'TETAP'
            ? { contractEndDate: null }
            : {}),
      },
      include: EMPLOYEE_INCLUDE,
    });

    return this.withContractWarning(updated);
  }

  async getSubordinates(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        subordinates: {
          include: {
            user: { select: USER_SAFE_SELECT },
            department: true,
            position: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return employee.subordinates.map((sub) => this.withContractWarning(sub));
  }

  async getManager(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        manager: {
          include: {
            user: { select: USER_SAFE_SELECT },
            department: true,
            position: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return employee.manager;
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.employee.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });
      await tx.employee.delete({ where: { id } });
      await tx.user.delete({ where: { id: employee.userId } });
    });

    return { message: 'Data karyawan dan akun berhasil dihapus' };
  }
}
