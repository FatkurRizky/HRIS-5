import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOfficeLocationDto } from './dto/create-office-location.dto.js';
import { UpdateOfficeLocationDto } from './dto/update-office-location.dto.js';

@Injectable()
export class OfficeLocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.officeLocation.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.officeLocation.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException('Lokasi kantor tidak ditemukan');
    }

    return location;
  }

  async create(dto: CreateOfficeLocationDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.officeLocation.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException('Nama lokasi kantor sudah terdaftar');
    }

    return this.prisma.officeLocation.create({
      data: {
        name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius ?? 50,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateOfficeLocationDto) {
    const location = await this.prisma.officeLocation.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException('Lokasi kantor tidak ditemukan');
    }

    if (dto.name) {
      const name = dto.name.trim();
      const duplicate = await this.prisma.officeLocation.findUnique({
        where: { name },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Nama lokasi kantor sudah digunakan');
      }
    }

    return this.prisma.officeLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.radius !== undefined ? { radius: dto.radius } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    const location = await this.prisma.officeLocation.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException('Lokasi kantor tidak ditemukan');
    }

    await this.prisma.officeLocation.delete({ where: { id } });

    return { message: 'Lokasi kantor berhasil dihapus' };
  }
}
