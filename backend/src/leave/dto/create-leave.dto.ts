import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
  @IsEnum(LeaveType, {
    message: 'Tipe pengajuan harus CUTI, SAKIT, atau IZIN',
  })
  type: LeaveType;

  @IsDateString({}, { message: 'Tanggal mulai harus berformat YYYY-MM-DD' })
  startDate: string;

  @IsDateString({}, { message: 'Tanggal selesai harus berformat YYYY-MM-DD' })
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
