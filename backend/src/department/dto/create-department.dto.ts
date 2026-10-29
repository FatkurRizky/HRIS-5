import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama departemen tidak boleh kosong' })
  @MinLength(2, { message: 'Nama departemen minimal 2 karakter' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
