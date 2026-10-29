import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RevisePayrollDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Catatan revisi tidak boleh kosong' })
  note?: string;
}
