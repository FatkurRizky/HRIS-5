import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateUserRoleDto {
  @IsNotEmpty({ message: 'Peran wajib diisi' })
  @IsEnum(Role, {
    message:
      'Peran harus salah satu dari: SUPER_ADMIN, HR, MANAGER, EMPLOYEE',
  })
  role: Role;
}
