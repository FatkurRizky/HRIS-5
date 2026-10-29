import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

export interface OrgTreeNode {
  id: string;
  name: string;
  email: string;
  nik: string | null;
  position: string | null;
  status: string;
  managerId: string | null;
  subordinates: OrgTreeNode[];
}

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            position: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    return department;
  }

  async getOrgTree(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            position: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    const nodeMap = new Map<string, OrgTreeNode>();

    for (const emp of department.employees) {
      nodeMap.set(emp.id, {
        id: emp.id,
        name: emp.user.name,
        email: emp.user.email,
        nik: emp.nik,
        position: emp.position?.name ?? null,
        status: emp.status,
        managerId: emp.managerId,
        subordinates: [],
      });
    }

    const roots: OrgTreeNode[] = [];

    for (const node of nodeMap.values()) {
      if (node.managerId && nodeMap.has(node.managerId)) {
        nodeMap.get(node.managerId)!.subordinates.push(node);
      } else {
        roots.push(node);
      }
    }

    return {
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
      },
      tree: roots,
    };
  }

  async create(dto: CreateDepartmentDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.department.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException('Nama departemen sudah terdaftar');
    }

    return this.prisma.department.create({
      data: {
        name,
        description: dto.description?.trim() ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    if (dto.name) {
      const name = dto.name.trim();
      const duplicate = await this.prisma.department.findUnique({
        where: { name },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Nama departemen sudah digunakan');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
      },
    });
  }

  async remove(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!department) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    if (department._count.employees > 0) {
      throw new BadRequestException(
        'Departemen tidak dapat dihapus karena masih memiliki karyawan aktif',
      );
    }

    await this.prisma.department.delete({ where: { id } });

    return { message: 'Departemen berhasil dihapus' };
  }
}
