import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama jabatan minimal 2 karakter' })
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseSalary?: number;
}
