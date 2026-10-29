import { IsInt, IsOptional, Min } from 'class-validator';

export class UpsertSalaryDto {
  @IsInt()
  @Min(0, { message: 'Gaji pokok tidak boleh negatif' })
  baseSalary: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Tunjangan tidak boleh negatif' })
  allowance?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Tarif lembur tidak boleh negatif' })
  overtimeRate?: number;
}
