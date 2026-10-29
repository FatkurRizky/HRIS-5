import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DepartmentModule } from './department/department.module.js';
import { EmployeeModule } from './employee/employee.module.js';
import { LeaveModule } from './leave/leave.module.js';
import { OfficeLocationModule } from './office-location/office-location.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { PositionModule } from './position/position.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SalaryModule } from './salary/salary.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DepartmentModule,
    PositionModule,
    EmployeeModule,
    OfficeLocationModule,
    AttendanceModule,
    LeaveModule,
    SalaryModule,
    PayrollModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
