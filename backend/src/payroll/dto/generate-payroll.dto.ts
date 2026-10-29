import { IsInt, Max, Min } from 'class-validator';

export class GeneratePayrollDto {
  @IsInt()
  @Min(1, { message: 'Bulan harus antara 1 sampai 12' })
  @Max(12, { message: 'Bulan harus antara 1 sampai 12' })
  month: number;

  @IsInt()
  @Min(2020, { message: 'Tahun tidak valid' })
  @Max(2100, { message: 'Tahun tidak valid' })
  year: number;
}
