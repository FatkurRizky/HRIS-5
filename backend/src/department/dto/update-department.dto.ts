import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama departemen minimal 2 karakter' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
