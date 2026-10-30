import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectLeaveDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan tidak boleh kosong' })
  reason?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
