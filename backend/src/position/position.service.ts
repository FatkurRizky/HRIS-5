import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePositionDto } from './dto/create-position.dto.js';
import { UpdatePositionDto } from './dto/update-position.dto.js';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.position.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!position) {
      throw new NotFoundException('Jabatan tidak ditemukan');
    }

    return position;
  }

  async create(dto: CreatePositionDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.position.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException('Nama jabatan sudah terdaftar');
    }

    return this.prisma.position.create({
      data: {
        name,
        baseSalary: dto.baseSalary ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdatePositionDto) {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });

    if (!position) {
      throw new NotFoundException('Jabatan tidak ditemukan');
    }

    if (dto.name) {
      const name = dto.name.trim();
      const duplicate = await this.prisma.position.findUnique({
        where: { name },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Nama jabatan sudah digunakan');
      }
    }

    return this.prisma.position.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: dto.baseSalary } : {}),
      },
    });
  }

  async remove(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!position) {
      throw new NotFoundException('Jabatan tidak ditemukan');
    }

    if (position._count.employees > 0) {
      throw new BadRequestException(
        'Jabatan tidak dapat dihapus karena masih digunakan oleh karyawan',
      );
    }

    await this.prisma.position.delete({ where: { id } });

    return { message: 'Jabatan berhasil dihapus' };
  }
}
