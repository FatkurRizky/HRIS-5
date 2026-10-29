import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('HRIS Backend Smoke E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let hrToken: string;
  let managerToken: string;
  let employeeToken: string;
  let employeeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const empRecord = await prisma.employee.findFirst({
      where: { user: { email: 'employee@kerabat.id' } },
    });
    if (empRecord) {
      employeeId = empRecord.id;
      await prisma.attendance.deleteMany({
        where: { employeeId: empRecord.id },
      });
      await prisma.leaveRequest.deleteMany({
        where: { employeeId: empRecord.id },
      });
      await prisma.payrollRecord.deleteMany({
        where: { employeeId: empRecord.id },
      });
      await prisma.employee.update({
        where: { id: empRecord.id },
        data: { leaveQuota: 12 },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return Hello World!', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /auth/login should authenticate HR, Manager, and Employee', async () => {
    const hrRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@kerabat.id', password: 'kerabat123' })
      .expect(200);
    hrToken = hrRes.body.accessToken;
    expect(hrToken).toBeDefined();

    const mgrRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@kerabat.id', password: 'kerabat123' })
      .expect(200);
    managerToken = mgrRes.body.accessToken;
    expect(managerToken).toBeDefined();

    const empRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'employee@kerabat.id', password: 'kerabat123' })
      .expect(200);
    employeeToken = empRes.body.accessToken;
    expect(employeeToken).toBeDefined();
  });

  it('GET /departments should forbid Employee (403) and allow HR (200)', async () => {
    await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);

    const res = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /employees should return employee list without password field', async () => {
    const res = await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].user.password).toBeUndefined();
  });

  it('POST /attendance/clock-in should validate GPS radius and prevent duplicate clock-in', async () => {
    // 1. Luar radius (> 50m dari kantor -7.8166, 112.0114) -> 400
    await request(app.getHttpServer())
      .post('/attendance/clock-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ latitude: -7.825, longitude: 112.025 })
      .expect(400);

    // 2. Dalam radius kantor -> 201
    await request(app.getHttpServer())
      .post('/attendance/clock-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ latitude: -7.8166, longitude: 112.0114 })
      .expect(201);

    // 3. Dobel clock-in di hari yang sama -> 409 Conflict
    await request(app.getHttpServer())
      .post('/attendance/clock-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ latitude: -7.8166, longitude: 112.0114 })
      .expect(409);
  });

  it('POST & PATCH /leaves should process 2-layer approval (Manager -> HR) and deduct quota', async () => {
    // Employee ajukan cuti 2 hari kerja (Senin - Selasa)
    const createRes = await request(app.getHttpServer())
      .post('/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        type: 'CUTI',
        startDate: '2026-10-26',
        endDate: '2026-10-27',
        reason: 'Acara keluarga',
      })
      .expect(201);

    const leaveId = createRes.body.leave.id;
    expect(createRes.body.workDays).toBe(2);

    // Manager approve (Layer 1)
    const mgrApprove = await request(app.getHttpServer())
      .patch(`/leaves/${leaveId}/manager-approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(mgrApprove.body.leave.status).toBe('MANAGER_APPROVED');

    // HR approve (Layer 2 Final)
    const hrApprove = await request(app.getHttpServer())
      .patch(`/leaves/${leaveId}/hr-approve`)
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(hrApprove.body.leave.status).toBe('HR_APPROVED');

    // Cek kuota cuti karyawan berkurang dari 12 jadi 10
    const updatedEmp = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    expect(updatedEmp?.leaveQuota).toBe(10);
  });

  it('POST /payroll/generate, approve, and download PDF payslip', async () => {
    const genRes = await request(app.getHttpServer())
      .post('/payroll/generate')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: 10, year: 2026 })
      .expect(201);

    expect(genRes.body.count).toBeGreaterThan(0);

    const budiPayroll = genRes.body.records.find(
      (r: { employeeId: string }) => r.employeeId === employeeId,
    );
    expect(budiPayroll).toBeDefined();

    // HR Approve payroll
    const approveRes = await request(app.getHttpServer())
      .patch(`/payroll/${budiPayroll.id}/approve`)
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    expect(approveRes.body.status).toBe('APPROVED');

    // Employee download PDF slip gaji
    const pdfRes = await request(app.getHttpServer())
      .get(`/payroll/${budiPayroll.id}/payslip-pdf`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(pdfRes.headers['content-type']).toContain('application/pdf');
  });
});
