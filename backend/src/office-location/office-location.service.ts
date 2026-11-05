import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOfficeLocationDto } from './dto/create-office-location.dto.js';
import { UpdateOfficeLocationDto } from './dto/update-office-location.dto.js';
import { DEFAULT_KAMPUS_UNP_LOCATION } from './office-location.constants.js';

export { DEFAULT_KAMPUS_UNP_LOCATION };

@Injectable()
export class OfficeLocationService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activityLog?: ActivityLogService,
  ) {}

  async onModuleInit() {
    const existingKampus = await this.prisma.officeLocation.findUnique({
      where: { name: DEFAULT_KAMPUS_UNP_LOCATION.name },
    });

    if (existingKampus) {
      await this.prisma.officeLocation.update({
        where: { id: existingKampus.id },
        data: {
          latitude: DEFAULT_KAMPUS_UNP_LOCATION.latitude,
          longitude: DEFAULT_KAMPUS_UNP_LOCATION.longitude,
          radius:
            !existingKampus.radius || existingKampus.radius === 300
              ? DEFAULT_KAMPUS_UNP_LOCATION.radius
              : existingKampus.radius,
          isActive: true,
        },
      });
      return;
    }

    const firstExisting = await this.prisma.officeLocation.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (firstExisting) {
      await this.prisma.officeLocation.update({
        where: { id: firstExisting.id },
        data: {
          name: DEFAULT_KAMPUS_UNP_LOCATION.name,
          latitude: DEFAULT_KAMPUS_UNP_LOCATION.latitude,
          longitude: DEFAULT_KAMPUS_UNP_LOCATION.longitude,
          radius: DEFAULT_KAMPUS_UNP_LOCATION.radius,
          isActive: true,
        },
      });
    } else {
      await this.prisma.officeLocation.create({
        data: {
          ...DEFAULT_KAMPUS_UNP_LOCATION,
          isActive: true,
        },
      });
    }
  }

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
        radius: dto.radius ?? 200,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateOfficeLocationDto,
    actor?: { id?: string; email?: string },
  ) {
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

    const updated = await this.prisma.officeLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.radius !== undefined ? { radius: dto.radius } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.activityLog?.record({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? 'sistem',
      action: `Memperbarui konfigurasi geofence ${updated.name} (radius ${updated.radius}m)`,
      category: 'CONFIG',
      level: 'INFO',
    });

    return updated;
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
