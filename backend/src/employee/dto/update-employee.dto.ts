import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EmployeeStatus, Role } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  nik?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  leaveQuota?: number;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  departmentName?: string;

  @IsOptional()
  @IsString()
  positionId?: string | null;

  @IsOptional()
  @IsString()
  positionName?: string;

  @IsOptional()
  @IsString()
  managerId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  allowance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeRate?: number;
}
