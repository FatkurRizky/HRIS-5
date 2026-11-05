import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'Status aktif (isActive) harus berupa nilai boolean' })
  isActive: boolean;
}
