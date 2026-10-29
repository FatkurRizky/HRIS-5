/**
 * Seed akun SuperAdmin awal & 4 akun demo sesuai RANCANGAN_UX_HRIS.md.
 * Jalankan: npm run seed
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const adminEmail = (
  process.env.ADMIN_EMAIL ?? 'admin@hris.local'
).trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin12345';

async function main() {
  const defaultAdminHash = await hash(adminPassword, 10);
  const demoPasswordHash = await hash('kerabat123', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: defaultAdminHash,
      role: 'SUPER_ADMIN',
    },
  });

  // Master Department & Position
  const engineeringDept = await prisma.department.upsert({
    where: { name: 'Engineering & Product' },
    update: {},
    create: {
      name: 'Engineering & Product',
      description: 'Divisi Pengembangan Perangkat Lunak dan Produk Digital',
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: {
      name: 'Human Resources',
      description: 'Divisi Manajemen SDM dan Operasional Internal',
    },
  });

  const managerPos = await prisma.position.upsert({
    where: { name: 'Engineering Manager' },
    update: {},
    create: {
      name: 'Engineering Manager',
      baseSalary: 15000000,
    },
  });

  const hrPos = await prisma.position.upsert({
    where: { name: 'HR Specialist' },
    update: {},
    create: {
      name: 'HR Specialist',
      baseSalary: 10000000,
    },
  });

  const engineerPos = await prisma.position.upsert({
    where: { name: 'Software Engineer' },
    update: {},
    create: {
      name: 'Software Engineer',
      baseSalary: 9000000,
    },
  });

  // Master Lokasi Kantor (Radius 50m)
  await prisma.officeLocation.upsert({
    where: { name: 'Kantor Pusat Kerabat Digital' },
    update: {},
    create: {
      name: 'Kantor Pusat Kerabat Digital',
      latitude: -7.8166,
      longitude: 112.0114,
      radius: 50,
      isActive: true,
    },
  });

  // 1. Demo SuperAdmin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kerabat.id' },
    update: {},
    create: {
      name: 'Fatkur Rizky (Admin)',
      email: 'admin@kerabat.id',
      password: demoPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const adminEmp = await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      nik: 'EMP-2026-000',
      phone: '081234567800',
      address: 'Kantor Pusat Kerabat Digital',
      status: 'TETAP',
      departmentId: engineeringDept.id,
      positionId: managerPos.id,
      leaveQuota: 12,
    },
  });

  await prisma.salary.upsert({
    where: { employeeId: adminEmp.id },
    update: {},
    create: {
      employeeId: adminEmp.id,
      baseSalary: 20000000,
      allowance: 5000000,
      overtimeRate: 100000,
    },
  });

  // 2. Demo HR
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@kerabat.id' },
    update: {},
    create: {
      name: 'Agus Purnomo',
      email: 'hr@kerabat.id',
      password: demoPasswordHash,
      role: 'HR',
    },
  });

  const hrEmp = await prisma.employee.upsert({
    where: { userId: hrUser.id },
    update: {},
    create: {
      userId: hrUser.id,
      nik: 'EMP-2026-001',
      phone: '081234567801',
      address: 'Jl. Merdeka No. 10, Kediri',
      status: 'TETAP',
      departmentId: hrDept.id,
      positionId: hrPos.id,
      leaveQuota: 12,
    },
  });

  await prisma.salary.upsert({
    where: { employeeId: hrEmp.id },
    update: {},
    create: {
      employeeId: hrEmp.id,
      baseSalary: 10000000,
      allowance: 1500000,
      overtimeRate: 60000,
    },
  });

  // 3. Demo Manager
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@kerabat.id' },
    update: {},
    create: {
      name: 'Siti Rahmawati',
      email: 'manager@kerabat.id',
      password: demoPasswordHash,
      role: 'MANAGER',
    },
  });

  const managerEmp = await prisma.employee.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId: managerUser.id,
      nik: 'EMP-2026-002',
      phone: '081234567802',
      address: 'Jl. Soekarno Hatta No. 25, Kediri',
      status: 'TETAP',
      departmentId: engineeringDept.id,
      positionId: managerPos.id,
      leaveQuota: 12,
    },
  });

  await prisma.salary.upsert({
    where: { employeeId: managerEmp.id },
    update: {},
    create: {
      employeeId: managerEmp.id,
      baseSalary: 15000000,
      allowance: 2500000,
      overtimeRate: 85000,
    },
  });

  // 4. Demo Employee (Bawahan langsung Manager Siti Rahmawati)
  const empUser = await prisma.user.upsert({
    where: { email: 'employee@kerabat.id' },
    update: {},
    create: {
      name: 'Budi Santoso',
      email: 'employee@kerabat.id',
      password: demoPasswordHash,
      role: 'EMPLOYEE',
    },
  });

  const budiEmp = await prisma.employee.upsert({
    where: { userId: empUser.id },
    update: {},
    create: {
      userId: empUser.id,
      nik: 'EMP-2026-003',
      phone: '081234567803',
      address: 'Jl. Brawijaya No. 40, Kediri',
      status: 'KONTRAK',
      contractEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      departmentId: engineeringDept.id,
      positionId: engineerPos.id,
      managerId: managerEmp.id,
      leaveQuota: 12,
    },
  });

  await prisma.salary.upsert({
    where: { employeeId: budiEmp.id },
    update: {},
    create: {
      employeeId: budiEmp.id,
      baseSalary: 9000000,
      allowance: 1000000,
      overtimeRate: 50000,
    },
  });

  process.stdout.write(
    `Seed selesai: SuperAdmin (${adminEmail}) + 4 akun demo (@kerabat.id)\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
