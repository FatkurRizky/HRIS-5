import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateOfficeLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama lokasi minimal 2 karakter' })
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(5000)
  radius?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
