import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama jabatan tidak boleh kosong' })
  @MinLength(2, { message: 'Nama jabatan minimal 2 karakter' })
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseSalary?: number;
}
