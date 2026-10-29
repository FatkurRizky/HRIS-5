import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class UpdateEmployeeStatusDto {
  @IsEnum(EmployeeStatus, {
    message: 'Status harus TETAP, KONTRAK, atau PROBATION',
  })
  status: EmployeeStatus;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;
}
