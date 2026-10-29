import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOfficeLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama lokasi kantor tidak boleh kosong' })
  @MinLength(2, { message: 'Nama lokasi minimal 2 karakter' })
  name: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(5000)
  radius?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
