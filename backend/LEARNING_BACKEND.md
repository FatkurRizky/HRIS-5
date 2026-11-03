# Panduan Belajar Seluruh Backend HRIS

**Stack:** NestJS 12, Prisma 6, TypeScript, MariaDB/MySQL, JWT
**Lokasi project:** `PEMULA/hris/backend`
**Mode dokumen:** Learning Mode — kamu yang mengetik, dokumen ini hanya memberi arah, requirement, dan hint.
opencode -s ses_e5fb5409effefnv7F68qW2jRXF

**Daftar isi**

1. Gambaran besar
2. Setup dan verifikasi database
3. Konsep inti dengan contoh nyata
4. Prisma dan database
5. Bedah seluruh modul (Auth, Department, Position, Employee, Office Location, Attendance, Leave, Salary, Payroll, Prisma)
6. Testing
7. Debugging playbook
8. Checklist keamanan backend
9. Capstone: modul Announcement dari nol
10. Repetisi wajib: modul Holiday
11. Checklist penguasaan backend
12. Cheat sheet
13. Cara belajar yang benar

---

## Cara memakai dokumen ini

1. Baca bagian konsep sampai paham, jangan langsung hafal kode.
2. Kerjakan latihan per modul. Hint dibuka satu per satu.
3. Jangan copy-paste dari modul lain. Boleh membaca sebagai referensi, tetapi ketik ulang sendiri.
4. Setiap kali selesai satu bagian, jelaskan ulang dengan kata-katamu sendiri. Kalau tidak bisa menjelaskan, berarti belum paham.
5. Capstone di bagian akhir wajib dikerjakan dari nol tanpa melihat modul lain.
6. Setelah selesai, minta review. Jangan commit sebelum lint, build, dan test lolos.

### Aturan keselamatan

- Buat branch sebelum mulai: `git checkout -b learning/backend-nestjs`
- Jangan commit `.env`.
- Jangan mengubah modul produksi untuk latihan. Buat modul baru atau branch terpisah.
- Jangan jalankan `prisma migrate reset` di database yang punya data penting.

---

## 1. Gambaran besar

Backend HRIS adalah REST API modular. Setiap fitur punya folder sendiri dan terdiri dari blok yang sama.

```
Client (React / Postman / curl)
   |
   | HTTP + Bearer JWT
   v
main.ts
   |  ValidationPipe (whitelist + transform)
   v
AppModule
   |
   v
Controller  ---> Service ---> PrismaService ---> MariaDB
   |                 |
   |                 +--> aturan bisnis, exception
   +--> routing, guard, ambil user dari JWT
```

### Peta folder

| Folder / file | Tanggung jawab |
|---|---|
| `src/main.ts` | Bootstrap aplikasi, ValidationPipe global, CORS, port |
| `src/app.module.ts` | Menggabungkan semua module fitur |
| `src/prisma/` | Koneksi database lewat PrismaService |
| `src/auth/` | Register, login, JWT, guard role, rate limit login |
| `src/employee/` | Profil karyawan, kontrak, hierarki atasan-bawahan |
| `src/department/` | Master departemen + struktur organisasi |
| `src/position/` | Master jabatan + gaji pokok standar |
| `src/office-location/` | Titik kantor + radius geofence |
| `src/attendance/` | Clock-in/out, GPS, telat, lembur, rekap |
| `src/leave/` | Pengajuan cuti + approval 2 lapis |
| `src/salary/` | Gaji pokok, tunjangan, tarif lembur per karyawan |
| `src/payroll/` | Kalkulasi gaji, approval, revisi, PDF slip |
| `prisma/schema.prisma` | Definisi tabel, enum, relasi |
| `prisma/migrations/` | Riwayat perubahan database |
| `scripts/seed-admin.mjs` | Data awal dan akun demo |
| `test/app.e2e-spec.ts` | Smoke test end-to-end |
| `src/**/*.spec.ts` | Unit test per service |

### Enam blok NestJS yang harus kamu kenali

| Blok | Penanda | Tugas |
|---|---|---|
| Module | `@Module()` | Mendaftarkan controller, provider, export |
| Controller | `@Controller()` | Menerima HTTP, memanggil service |
| Service | `@Injectable()` | Logic bisnis dan query database |
| DTO | class + decorator `class-validator` | Kontrak input dan validasi |
| Guard | `CanActivate` | Menentukan boleh/tidaknya request |
| Decorator | `@Roles()` | Menempelkan metadata role ke handler |

---

## 2. Setup dan verifikasi database

Jalankan dari `PEMULA/hris/backend`.

```bash
npm install
npx prisma generate
npx prisma migrate status
npm run seed
npm run start:dev
```

Cek `.env` (jangan di-print ke chat, jangan di-commit):

```env
DATABASE_URL="mysql://user:password@localhost:3306/hris_db"
JWT_SECRET="random-string-minimal-32-karakter"
```

Pemeriksaan koneksi:

```bash
npx prisma migrate status
npx prisma studio
```

`prisma studio` membuka GUI database. Kalau tabel terlihat, koneksi berhasil.

### Akun demo hasil seed

| Email | Password | Role |
|---|---|---|
| `admin@kerabat.id` | `kerabat123` | `SUPER_ADMIN` |
| `hr@kerabat.id` | `kerabat123` | `HR` |
| `manager@kerabat.id` | `kerabat123` | `MANAGER` |
| `employee@kerabat.id` | `kerabat123` | `EMPLOYEE` |

Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@kerabat.id","password":"kerabat123"}'
```

Simpan `accessToken`. Gunakan di request berikutnya:

```bash
curl http://localhost:3000/employees \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Latihan 2.1 — Buktikan database nyambung

1. Jalankan seed.
2. Buka Prisma Studio.
3. Sebutkan 5 tabel yang ada dan relasi utamanya.
4. Login sebagai HR, lalu panggil `GET /employees`. Apakah password ikut terkirim? Kenapa?

<details>
<summary>Hint</summary>

Lihat `select` di `EmployeeService.findAll()` dan `EMPLOYEE_INCLUDE`. Prisma hanya mengembalikan field yang diminta. Password tidak pernah masuk `select`, jadi tidak mungkin bocor lewat response itu.

</details>

### Latihan 2.2 — Bedakan jenis error

Tanpa mengubah kode, coba skenario berikut dan catat status HTTP-nya:

1. Request tanpa token.
2. Request dengan token employee ke `GET /departments`.
3. Request dengan id palsu ke `GET /employees/:id`.
4. Login dengan password salah.
5. Login salah 11 kali dalam satu menit.

<details>
<summary>Hint</summary>

- Tanpa token / token salah: `401 Unauthorized`.
- Role tidak cukup: `403 Forbidden`.
- Data tidak ada: `404 Not Found`.
- Password salah: `401`.
- Terlalu sering: `429 Too Many Requests`.

Kalau bingung, cari exception yang dilempar di service atau guard terkait.

</details>

---

## 3. Konsep inti dengan contoh nyata

### 3.1 Module

`src/department/department.module.ts`

```ts
@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
```

- `controllers`: endpoint yang didaftarkan.
- `providers`: class yang dikelola dependency injection.
- `exports`: boleh dipakai module lain.
- Module fitur harus diimpor di `src/app.module.ts`. Lupa import berarti endpoint 404.

`PrismaModule` diberi `@Global()`, sehingga tidak perlu diimpor ulang di setiap module fitur.

### 3.2 Dependency Injection

```ts
@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}
}
```

Kamu tidak pernah menulis `new DepartmentService(new PrismaService())`. Nest membuat instance dan menyuntikkannya. Inilah alasan Prisma bisa diganti mock saat test.

### 3.3 Controller

`src/department/department.controller.ts:19`

```ts
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  findAll() {
    return this.departmentService.findAll();
  }
}
```

Controller harus tipis:

- Ambil data dari `@Body`, `@Param`, `@Query`, atau `@Request`.
- Panggil service.
- Kembalikan hasil.
- Jangan taruh query Prisma atau aturan bisnis di controller.

### 3.4 DTO dan ValidationPipe

`src/department/dto/create-department.dto.ts`

```ts
export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama departemen tidak boleh kosong' })
  @MinLength(2, { message: 'Nama departemen minimal 2 karakter' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

`src/main.ts` memasang:

```ts
new ValidationPipe({ whitelist: true, transform: true })
```

- `whitelist: true` membuang field yang tidak ada di DTO.
- `transform: true` mengubah query/param ke tipe yang diminta.
- DTO = validasi bentuk dan tipe. Aturan bisnis seperti "nama harus unik" tetap di service.

### 3.5 Guard dan RBAC

`src/auth/roles.guard.ts` membaca metadata dari `@Roles(...)` lalu membandingkannya dengan `request.user.role`.

`src/auth/jwt.strategy.ts` mengubah payload JWT menjadi:

```ts
{ id: payload.sub, email: payload.email, role: payload.role }
```

Urutan guard penting:

```ts
@UseGuards(AuthGuard('jwt'), RolesGuard)
```

`AuthGuard` harus lebih dulu agar `request.user` sudah terisi sebelum `RolesGuard` membacanya.

### 3.6 Exception

Gunakan exception Nest, jangan `throw new Error` untuk kesalahan yang bisa dipetakan ke HTTP:

| Exception | Status | Kapan |
|---|---|---|
| `BadRequestException` | 400 | Input valid secara tipe tapi melanggar aturan bisnis |
| `UnauthorizedException` | 401 | Belum login / kredensial salah |
| `ForbiddenException` | 403 | Sudah login tapi role/relasi tidak berhak |
| `NotFoundException` | 404 | Data tidak ditemukan |
| `ConflictException` | 409 | Duplikat atau state bentrok |

Pesan error sebaiknya spesifik dan bisa ditampilkan ke user.

### Latihan 3.1 — Baca satu fitur utuh

Baca `department.module.ts`, `department.controller.ts`, `department.service.ts`, dan `dto/`. Jawab:

1. Endpoint apa saja yang tersedia?
2. Method service mana yang dipanggil tiap endpoint?
3. Di mana pengecekan duplikat nama dilakukan?
4. Kenapa `getOrgTree` tidak butuh DTO?

<details>
<summary>Hint</summary>

`getOrgTree` hanya menerima `id` dari parameter URL. Tidak ada body yang perlu divalidasi. DTO dibutuhkan ketika ada input kompleks dari body atau query.

</details>

---

## 4. Prisma dan database

### 4.1 Schema

`prisma/schema.prisma`

```prisma
model Department {
  id          String     @id @default(uuid())
  name        String     @unique
  description String?
  employees   Employee[]
}
```

Yang perlu dipahami:

- `String?` = nullable.
- `@default(uuid())` = id dibuat otomatis.
- `@unique` = tidak boleh duplikat.
- `Employee[]` = relasi satu-ke-banyak.
- `@relation(...)` = sisi yang menyimpan foreign key.
- `@@unique([employeeId, date])` = kombinasi dua kolom harus unik.
- `@db.Date` = kolom tanggal tanpa jam.
- `@updatedAt` = Prisma memperbarui otomatis.

### 4.2 Alur perubahan schema

```bash
# 1. edit schema.prisma
# 2. buat migration + terapkan + generate client
npx prisma migrate dev --name nama_perubahan

# 3. verifikasi
npx prisma migrate status
npx prisma studio
```

Kalau hanya mengubah schema tanpa migration, client dan database bisa tidak sinkron. Gejalanya sering berupa error "Unknown argument" atau "column does not exist".

### 4.3 Query yang sering dipakai

```ts
// semua data
await prisma.department.findMany();

// satu data + relasi
await prisma.employee.findUnique({
  where: { id },
  include: { user: true, department: true },
});

// filter + urut
await prisma.attendance.findMany({
  where: { employeeId, date: { gte: start, lte: end } },
  orderBy: { date: 'desc' },
});

// ambil field tertentu saja
await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});

// upsert
await prisma.salary.upsert({
  where: { employeeId },
  update: { baseSalary: 10000000 },
  create: { employeeId, baseSalary: 10000000 },
});

// transaksi
await prisma.$transaction(async (tx) => {
  await tx.employee.update(...);
  await tx.leaveRequest.update(...);
});
```

Aturan praktis:

- `select` untuk membatasi field, terutama data sensitif.
- `include` untuk mengambil relasi.
- `$transaction` ketika dua operasi harus sukses atau gagal bersama.

### 4.4 Relasi penting di HRIS

```
User 1---1 Employee
Department 1---N Employee
Position 1---N Employee
Employee 1---N Attendance
Employee 1---N LeaveRequest
Employee 1---1 Salary
Employee 1---N PayrollRecord
Employee self-relation: managerId -> manager/subordinates
```

### Latihan 4.1 — Desain tabel

Buat desain (belum coding) untuk tabel `Training`:

- id
- title
- description (opsional, teks panjang)
- startDate
- endDate
- isMandatory (default false)
- createdAt, updatedAt

Tentukan tipe Prisma dan mana yang nullable. Lalu jelaskan kenapa `description` boleh null sedangkan `title` tidak.

<details>
<summary>Hint</summary>

Teks panjang di MySQL memakai `@db.Text`. Field yang belum tentu ada saat dibuat diberi `?`.

</details>

### Latihan 4.2 — Relasi

Tambahkan relasi `Training` ke `Department` (satu training bisa untuk banyak departemen, satu departemen bisa punya banyak training).

1. Apa jenis relasinya?
2. Di mana `@relation` diletakkan?
3. Apakah perlu tabel pivot?

<details>
<summary>Hint</summary>

Banyak-ke-banyak di Prisma memakai relasi implisit dengan dua field list di kedua model. Prisma yang membuat tabel pivot. Baca dokumentasi Prisma bagian "Many-to-many relations".

</details>

---

## 5. Bedah seluruh modul

Urutan belajar yang disarankan:

```
Auth -> Department -> Position -> Employee -> OfficeLocation -> Attendance -> Leave -> Salary -> Payroll
```

Alasannya: modul belakang bergantung pada modul depan.

---

### 5.1 Auth dan RBAC

**File:** `src/auth/`

| File | Isi |
|---|---|
| `auth.controller.ts` | Endpoint register, login, profile, users |
| `auth.service.ts` | Hash password, cek email, JWT, role registrasi |
| `jwt.strategy.ts` | Ekstrak token dari header Authorization |
| `roles.guard.ts` | Cek role dari metadata |
| `roles.decorator.ts` | `@Roles(...)` |
| `login-rate-limit.guard.ts` | Maksimal 10 login per menit per IP |
| `auth.module.ts` | Konfigurasi JWT, secret, expiry 2 jam |

**Endpoint:**

| Method | Path | Akses |
|---|---|---|
| POST | `/auth/register` | Publik |
| POST | `/auth/login` | Publik, rate limited |
| GET | `/auth/profile` | Login |
| GET | `/auth/users` | Publik (catatan keamanan: sebaiknya dibatasi) |
| PATCH | `/auth/users/:id/role` | Login (catatan keamanan: sebaiknya `SUPER_ADMIN`) |

**Aturan bisnis:**

- Password di-hash dengan bcrypt (`SALT_ROUNDS = 10`).
- Email dinormalisasi ke lowercase.
- Login gagal selalu memakai pesan yang sama: "Email atau password salah". Jangan bocorkan apakah email terdaftar.
- Registrasi mandiri tidak boleh menghasilkan `SUPER_ADMIN`.
- JWT payload: `sub`, `email`, `role`.
- Token berlaku 2 jam.
- `JWT_SECRET` wajib ada; `getOrThrow` akan menggagalkan startup kalau kosong.

**Yang harus kamu pahami:**

1. Kenapa password tidak pernah dikembalikan di response.
2. Kenapa `AuthGuard('jwt')` harus mendahului `RolesGuard`.
3. Kenapa pesan login gagal tidak boleh membedakan email salah dan password salah.
4. Kenapa `JWT_SECRET` tidak boleh hardcoded.

**Latihan 5.1**

1. Tambahkan aturan: password minimal 8 karakter dan harus mengandung angka. Ubah file mana saja?
2. Buat endpoint `GET /auth/users` hanya untuk `SUPER_ADMIN`. Apa yang harus ditambahkan dan di mana?
3. Jelaskan apa yang terjadi kalau `JWT_SECRET` diubah saat user masih memegang token lama.

<details>
<summary>Hint 1</summary>

Validasi bentuk password ada di DTO. Decorator yang bisa dipakai: `@MinLength`, `@Matches`. Cek dokumentasi `class-validator`.

</details>

<details>
<summary>Hint 2</summary>

Butuh `@UseGuards(AuthGuard('jwt'), RolesGuard)` dan `@Roles('SUPER_ADMIN')`. Ingat, `RolesGuard` hanya bekerja kalau `request.user` sudah ada.

</details>

<details>
<summary>Hint 3</summary>

JWT ditandatangani dengan secret. Secret berbeda berarti signature tidak valid, sehingga token lama ditolak dengan 401.

</details>

---

### 5.2 Department dan Position

**Department** (`src/department/`)

| Method | Path | Akses |
|---|---|---|
| GET | `/departments` | SUPER_ADMIN, HR, MANAGER |
| GET | `/departments/:id` | SUPER_ADMIN, HR, MANAGER |
| GET | `/departments/:id/tree` | SUPER_ADMIN, HR, MANAGER |
| POST | `/departments` | SUPER_ADMIN, HR |
| PATCH | `/departments/:id` | SUPER_ADMIN, HR |
| DELETE | `/departments/:id` | SUPER_ADMIN, HR |

Aturan:

- Nama departemen unik.
- Tidak boleh hapus departemen yang masih punya karyawan.
- `getOrgTree` membangun pohon atasan-bawahan dari `managerId`.

**Position** (`src/position/`)

| Method | Path | Akses |
|---|---|---|
| GET | `/positions` | SUPER_ADMIN, HR, MANAGER |
| GET | `/positions/:id` | SUPER_ADMIN, HR, MANAGER |
| POST | `/positions` | SUPER_ADMIN, HR |
| PATCH | `/positions/:id` | SUPER_ADMIN, HR |
| DELETE | `/positions/:id` | SUPER_ADMIN, HR |

Aturan:

- Nama jabatan unik.
- `baseSalary` default 0.
- Tidak boleh hapus jabatan yang masih dipakai karyawan.

**Latihan 5.2**

1. Kenapa `getOrgTree` memakai `Map` dan bukan array bersarang? Jelaskan kompleksitasnya.
2. Tambahkan filter `search` pada `GET /positions` berdasarkan nama.
3. Buat aturan: `baseSalary` tidak boleh negatif. Di DTO atau service? Kenapa?

<details>
<summary>Hint 1</summary>

Dengan `Map`, pencarian atasan berdasarkan id adalah O(1). Kalau memakai `find` di array berulang, menjadi O(n^2).

</details>

<details>
<summary>Hint 2</summary>

Tambahkan `@Query('search')` di controller, lalu di service gunakan `where: { name: { contains: search } }`.

</details>

<details>
<summary>Hint 3</summary>

Validasi bentuk angka (integer, minimal 0) di DTO memakai `@IsInt()` dan `@Min(0)`. Aturan yang bergantung pada data lain tetap di service.

</details>

---

### 5.3 Employee

**File:** `src/employee/`

| Method | Path | Akses |
|---|---|---|
| GET | `/employees` | SUPER_ADMIN, HR, MANAGER |
| GET | `/employees/me` | Semua role login |
| GET | `/employees/:id` | SUPER_ADMIN, HR, MANAGER |
| GET | `/employees/:id/subordinates` | SUPER_ADMIN, HR, MANAGER |
| GET | `/employees/:id/manager` | Semua role login |
| POST | `/employees` | SUPER_ADMIN, HR |
| PATCH | `/employees/:id` | SUPER_ADMIN, HR |
| PATCH | `/employees/:id/status` | SUPER_ADMIN, HR |
| DELETE | `/employees/:id` | SUPER_ADMIN, HR |

Filter `GET /employees`: `departmentId`, `status`, `search` (nik, nama, email).

Aturan penting:

- Satu `User` hanya punya satu `Employee`.
- Email dan NIK unik.
- `managerId` tidak boleh diri sendiri.
- Hierarki manager tidak boleh melingkar. Lihat `validateNoCircularManager`.
- Kontrak yang mendekati habis diberi `contractExpiringWarning` dan `daysUntilContractEnd`.
- Hapus karyawan juga menghapus `User` dalam satu transaksi, dan melepas bawahan yang menunjuk ke dia.
- Status: `TETAP`, `KONTRAK`, `PROBATION`.

**Latihan 5.3**

1. Jelaskan dengan kata sendiri bagaimana `validateNoCircularManager` mendeteksi lingkaran.
2. Tambahkan filter `contractExpiring` (boolean) untuk menampilkan karyawan yang kontraknya habis dalam 30 hari.
3. Kenapa penghapusan harus memakai `$transaction`?

<details>
<summary>Hint 1</summary>

Mulai dari calon manager, lalu naik ke `managerId` berikutnya sambil mencatat id yang sudah dikunjungi. Kalau bertemu id yang sudah ada di `visited`, berarti melingkar.

</details>

<details>
<summary>Hint 2</summary>

`contractExpiringWarning` dihitung di `withContractWarning`, bukan kolom database. Filter seperti ini lebih mudah dilakukan di service setelah data diambil, atau dengan filter tanggal di query Prisma.

</details>

<details>
<summary>Hint 3</summary>

Ada dua operasi yang harus konsisten: melepas bawahan dan menghapus employee + user. Kalau satu gagal di tengah, database bisa setengah berubah.

</details>

---

### 5.4 Office Location

**File:** `src/office-location/`

| Method | Path | Akses |
|---|---|---|
| GET | `/office-locations` | Login |
| GET | `/office-locations/:id` | Login |
| POST | `/office-locations` | SUPER_ADMIN, HR |
| PATCH | `/office-locations/:id` | SUPER_ADMIN, HR |
| DELETE | `/office-locations/:id` | SUPER_ADMIN, HR |

Aturan:

- `latitude` antara -90 s/d 90, `longitude` antara -180 s/d 180.
- `radius` dalam meter.
- Saat startup, `onModuleInit` memastikan lokasi default "Kampus 2 UNP Kediri" ada dan aktif.
- Absensi memakai lokasi aktif; kalau tidak ada, memakai konstanta default.

**Latihan 5.4**

1. Apa risiko `onModuleInit` yang menulis ke database saat aplikasi start?
2. Kenapa `radius` sebaiknya divalidasi minimal 1 meter?
3. Kalau ada 3 kantor, bagaimana absensi menentukan kantor terdekat?

<details>
<summary>Hint 1</summary>

Kalau database belum siap, aplikasi bisa gagal start. Ini juga membuat proses start punya efek samping. Diskusikan trade-off-nya.

</details>

<details>
<summary>Hint 2</summary>

Radius 0 atau negatif membuat semua absensi ditolak. Validasi dengan `@Min(1)` di DTO.

</details>

<details>
<summary>Hint 3</summary>

Lihat `validateLocationWithinRadius`: hitung jarak ke semua kantor aktif, pilih jarak minimum, lalu bandingkan dengan radius kantor tersebut.

</details>

---

### 5.5 Attendance

**File:** `src/attendance/`

| Method | Path | Akses |
|---|---|---|
| POST | `/attendance/clock-in` | Login |
| POST | `/attendance/clock-out` | Login |
| DELETE | `/attendance/today` | Login |
| GET | `/attendance/my-records` | Login |
| GET | `/attendance/team` | MANAGER, HR, SUPER_ADMIN |
| GET | `/attendance/recap/my` | Login |
| GET | `/attendance/recap` | HR, SUPER_ADMIN |
| GET | `/attendance` | HR, SUPER_ADMIN |

Aturan:

- Clock-in hanya sekali per hari. Kombinasi `employeeId + date` unik.
- Jam masuk lebih dari 08:00 WIB berstatus `LATE`.
- Clock-out setelah 17:00 WIB menghitung `overtimeMinutes`.
- GPS harus berada dalam radius kantor aktif.
- Tanggal memakai WIB (UTC+7), bukan timezone server.
- Clock-in/out menyinkronkan draft payroll periode berjalan.
- `resetToday` menghapus absensi hari ini (untuk demo).

Rumus Haversine ada di `calculateHaversineDistance`. Hasilnya meter, lalu dibandingkan dengan `radius`.

**Latihan 5.5**

1. Kenapa perhitungan tanggal tidak boleh memakai `new Date().setHours(0,0,0,0)` langsung?
2. Tambahkan aturan: clock-out tidak boleh sebelum clock-in.
3. Ubah jam masuk menjadi 08:30. File mana saja yang terdampak?
4. Buat perhitungan jarak mengembalikan kilometer, bukan meter. Apa yang harus diubah di pemanggilnya?

<details>
<summary>Hint 1</summary>

Timezone server bisa UTC, WIB, atau lainnya. HRIS memakai WIB. Lihat `getWibDate` dan `getTodayDateOnly`.

</details>

<details>
<summary>Hint 2</summary>

Bandingkan `existing.clockIn` dengan `now` sebelum update. Kalau `now < existing.clockIn`, lempar `BadRequestException`.

</details>

<details>
<summary>Hint 3</summary>

Konstanta `WORK_START_HOUR` dan logika menit. Saat ini aturan "lewat 08:00" berarti menit > 0. Untuk 08:30, logikanya berubah, bukan hanya angkanya.

</details>

<details>
<summary>Hint 4</summary>

Kalau fungsi mengembalikan km, bagi dengan 1000 di pemanggil atau ubah pesan error dan perbandingan radius. Jangan lupa test.

</details>

---

### 5.6 Leave

**File:** `src/leave/`

| Method | Path | Akses |
|---|---|---|
| POST | `/leaves` | Login |
| GET | `/leaves/my` | Login |
| GET | `/leaves/approvals` | MANAGER, HR, SUPER_ADMIN |
| GET | `/leaves` | HR, SUPER_ADMIN |
| PATCH | `/leaves/:id/manager-approve` | MANAGER, SUPER_ADMIN |
| PATCH | `/leaves/:id/hr-approve` | HR, SUPER_ADMIN |
| PATCH | `/leaves/:id/reject` | MANAGER, HR, SUPER_ADMIN |

Alur status:

```
PENDING -> MANAGER_APPROVED -> HR_APPROVED
   |               |
   +---------------+--> REJECTED
```

Aturan:

- Tipe: `CUTI`, `SAKIT`, `IZIN`.
- Hari dihitung Senin-Jumat saja.
- Rentang yang hanya berisi Sabtu/Minggu ditolak.
- `CUTI` memeriksa sisa kuota saat pengajuan.
- Tidak boleh menyetujui pengajuan sendiri.
- Manager hanya boleh menyetujui bawahan langsung.
- HR hanya boleh menyetujui yang sudah `MANAGER_APPROVED`.
- Persetujuan final HR memotong kuota di dalam transaksi.
- Penolakan menyimpan `rejectionReason`.

**Latihan 5.6**

1. Tambahkan validasi: tanggal mulai tidak boleh di masa lalu.
2. Kenapa pemotongan kuota dilakukan saat HR approve, bukan saat pengajuan?
3. Buat aturan: cuti `SAKIT` lebih dari 2 hari wajib punya `reason` minimal 10 karakter.
4. Jelaskan kenapa `managerApprove` memeriksa `leave.employee.userId === userId`.

<details>
<summary>Hint 1</summary>

Bandingkan dengan awal hari ini di WIB. Taruh di service karena butuh konteks waktu.

</details>

<details>
<summary>Hint 2</summary>

Kuota baru boleh berkurang setelah pengajuan benar-benar disetujui final. Kalau dipotong saat pengajuan, pengajuan yang ditolak akan merusak kuota.

</details>

<details>
<summary>Hint 3</summary>

Validasi bergantung pada nilai `type`, jadi tempatnya di service (bukan DTO murni). Gunakan `BadRequestException`.

</details>

<details>
<summary>Hint 4</summary>

Mencegah self-approval. Tanpa cek ini, manager bisa menyetujui cutinya sendiri.

</details>

---

### 5.7 Salary

**File:** `src/salary/`

| Method | Path | Akses |
|---|---|---|
| GET | `/salaries` | HR, SUPER_ADMIN |
| GET | `/salaries/me` | Login |
| GET | `/salaries/:employeeId` | HR, SUPER_ADMIN |
| PUT | `/salaries/:employeeId` | HR, SUPER_ADMIN |

Aturan:

- Satu karyawan satu record salary (`employeeId @unique`).
- `PUT` bersifat upsert: buat kalau belum ada, update kalau sudah ada.
- Kalau salary belum diatur, `findMySalary` memakai `baseSalary` dari position.

**Latihan 5.7**

1. Kenapa memakai `PUT` dan bukan `PATCH` untuk upsert?
2. Tambahkan field `bpjsEnabled` (boolean, default true) di schema dan DTO. Apa dampaknya ke payroll?
3. Apa yang terjadi kalau `upsert` dipanggil dengan `employeeId` yang tidak ada?

<details>
<summary>Hint 1</summary>

`PUT` menggambarkan penggantian/penetapan resource secara utuh. Namun di kode ini beberapa field tetap opsional. Diskusikan apakah itu benar-benar semantik PUT.

</details>

<details>
<summary>Hint 2</summary>

Kamu perlu migration, DTO, service, dan menyesuaikan `calculatePayrollBreakdown`. Jangan lupa test kalkulasi.

</details>

<details>
<summary>Hint 3</summary>

Service memeriksa employee dulu dan melempar `NotFoundException`. Prisma juga akan menolak foreign key, tetapi pesannya kurang ramah.

</details>

---

### 5.8 Payroll

**File:** `src/payroll/`

| Method | Path | Akses |
|---|---|---|
| POST | `/payroll/generate` | HR, SUPER_ADMIN |
| POST | `/payroll/approve-period` | HR, SUPER_ADMIN |
| GET | `/payroll` | HR, SUPER_ADMIN |
| GET | `/payroll/my` | Login |
| GET | `/payroll/my/period` | Login |
| GET | `/payroll/my/payslip-pdf` | Login |
| GET | `/payroll/:id/payslip-pdf` | Login (owner/HR/SUPER_ADMIN) |
| GET | `/payroll/:id` | Login (owner/HR/SUPER_ADMIN) |
| PATCH | `/payroll/:id/approve` | HR, SUPER_ADMIN |
| PATCH | `/payroll/:id/revise` | HR, SUPER_ADMIN |
| PATCH | `/payroll/:id/mark-paid` | HR, SUPER_ADMIN |

Status:

```
DRAFT -> APPROVED -> PAID
   ^         |
   +---------+ (revise)
```

Aturan:

- Generate menghitung ulang semua karyawan untuk periode tertentu.
- Record `APPROVED` atau `PAID` tidak boleh ditimpa oleh generate.
- Payroll `PAID` tidak boleh diubah atau direvisi.
- `markPaid` hanya boleh dari `APPROVED`.
- Revisi mengembalikan status ke `DRAFT` dan menyimpan catatan.
- Karyawan hanya boleh melihat slip miliknya.
- PDF dibuat sendiri tanpa dependency eksternal di `pdf-builder.ts`.

Rumus di `payroll-calculator.ts`:

```
baseSalary   = salary.baseSalary ?? position.baseSalary ?? 10.000.000
allowance    = salary.allowance ?? 2.000.000
overtimeRate = salary.overtimeRate > 0 ? salary.overtimeRate : round(baseSalary / 173)
overtime     = floor(totalOvertimeMinutes / 60) * overtimeRate
lateDeduction  = jumlah LATE * 100.000
alphaDeduction = jumlah ALPHA * round(baseSalary / 22)
deductions   = lateDeduction + alphaDeduction
bpjs         = round((baseSalary + allowance) * 3%)
grossIncome  = baseSalary + allowance + overtime
pph21        = round(max(0, grossIncome - 4.500.000) * 5%)
total        = max(0, grossIncome - (deductions + bpjs + pph21))
```

**Latihan 5.8**

1. Kenapa generate tidak boleh menimpa payroll `APPROVED`?
2. Tambahkan komponen `bonus` (integer, default 0) ke PayrollRecord dan masukkan ke `grossIncome`. Sebutkan semua file yang berubah.
3. Buat aturan: payroll hanya bisa digenerate jika semua karyawan punya salary. Apakah ini ide bagus? Diskusikan.
4. Kenapa `findOne` menghitung ulang breakdown untuk status `DRAFT`?

<details>
<summary>Hint 1</summary>

Approved berarti nominal sudah disetujui. Menimpanya akan mengubah kesepakatan tanpa persetujuan ulang.

</details>

<details>
<summary>Hint 2</summary>

`schema.prisma`, migration, `payroll-calculator.ts`, DTO terkait, `payroll.service.ts` (payload generate/approve/revise/findOne), `pdf-builder.ts`, dan test.

</details>

<details>
<summary>Hint 3</summary>

Trade-off antara konsistensi dan kelonggaran. Kalau semua wajib punya salary, karyawan baru tanpa salary akan memblokir seluruh periode. Bisa juga pakai fallback dari position.

</details>

<details>
<summary>Hint 4</summary>

Absensi bisa berubah selama periode masih draft. Breakdown dihitung ulang agar angka yang ditampilkan selalu terbaru.

</details>

---

### 5.9 Prisma module

**File:** `src/prisma/`

- `PrismaModule` diberi `@Global()`.
- `PrismaService` extends `PrismaClient`.
- `onModuleInit` menghubungkan database.
- `onModuleDestroy` memutus koneksi.

Ini contoh bagus penerapan lifecycle hook NestJS: koneksi dibuka saat module init dan ditutup saat aplikasi berhenti.

**Latihan 5.9**

1. Apa yang terjadi kalau `$connect()` dihapus?
2. Kenapa `PrismaModule` tidak perlu diimpor di setiap module fitur?
3. Apa bedanya `@Global()` dengan `exports` biasa?

<details>
<summary>Hint</summary>

`@Global()` membuat provider tersedia di semua module tanpa import eksplisit. Ini nyaman, tetapi bisa menyembunyikan dependency antar module.

</details>

---

## 6. Testing

Dua jenis test di project ini:

| Jenis | File | Menyentuh DB? | Tujuan |
|---|---|---|---|
| Unit test | `src/**/*.spec.ts` | Tidak (Prisma di-mock) | Menguji logic service |
| E2E test | `test/*.e2e-spec.ts` | Ya | Menguji alur HTTP nyata |

Perintah:

```bash
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
npx vitest run src/payroll/payroll.service.spec.ts
```

### Pola unit test

`src/department/department.service.spec.ts`

```ts
const module = await Test.createTestingModule({
  providers: [
    DepartmentService,
    {
      provide: PrismaService,
      useValue: {
        department: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
        },
      },
    },
  ],
}).compile();
```

- `Test.createTestingModule` adalah versi test dari `@Module`.
- `useValue` mengganti Prisma asli dengan tiruan.
- `vi.fn()` membuat fungsi mock.
- `module.get<DepartmentService>(DepartmentService)` mengambil instance dari container.

Contoh test yang menguji logic nyata ada di `attendance.service.spec.ts` (WIB, status telat) dan `payroll.service.spec.ts` (kalkulasi).

### Latihan 6.1 — Tulis unit test

Buat test untuk `LeaveService.calculateWorkDays`:

1. Senin-Jumat = 5 hari.
2. Jumat-Senin = 2 hari.
3. Sabtu-Minggu = 0 hari.
4. Rentang satu hari kerja = 1 hari.

<details>
<summary>Hint</summary>

`calculateWorkDays` adalah method publik dan tidak memakai Prisma, jadi tidak perlu mock. Cukup buat instance service dengan Prisma mock kosong.

</details>

### Latihan 6.2 — Mock error

Buat test `DepartmentService.findOne`:

- Saat Prisma mengembalikan objek, hasilnya sama dengan objek tersebut.
- Saat Prisma mengembalikan `null`, lempar `NotFoundException`.

<details>
<summary>Hint</summary>

Gunakan `mockResolvedValue` dan `expect(...).rejects.toThrow(NotFoundException)`.

</details>

### Latihan 6.3 — E2E

Tambahkan skenario e2e: employee tidak boleh mengakses `GET /payroll` (403), tetapi HR boleh (200).

<details>
<summary>Hint</summary>

Lihat pola di `test/app.e2e-spec.ts`: login untuk mendapatkan token, lalu `request(app.getHttpServer()).get(...).set('Authorization', ...)`.

</details>

---

## 7. Debugging playbook

| Gejala | Kemungkinan penyebab | Cara cek |
|---|---|---|
| 404 di endpoint baru | Module belum diimpor di `AppModule` | Cek `app.module.ts` |
| 404 padahal route ada | Urutan route `:id` menangkap path statis | Pindahkan route statis ke atas |
| 401 | Token tidak dikirim, kadaluarsa, atau secret berubah | Cek header dan `JWT_SECRET` |
| 403 | Role tidak sesuai | Cek `@Roles` dan role user |
| 400 | DTO tidak lolos validasi | Baca pesan error, cek decorator DTO |
| 409 | Duplikat atau state bentrok | Cek `@unique` dan status record |
| Prisma error `P2002` | Unique constraint | Cari field yang duplikat |
| Prisma error `P2025` | Record yang di-update/delete tidak ada | Cek id |
| Prisma error `P2003` | Foreign key tidak valid | Cek relasi/id terkait |
| Error import `.js` | ESM mewajibkan ekstensi | Import lokal pakai `.service.js` |
| Database tidak konek | MariaDB mati / URL salah | `prisma migrate status` |
| Schema tidak sinkron | Belum migrate/generate | `prisma migrate dev` |

Urutan debug yang benar:

1. Baca pesan error, jangan langsung ubah kode.
2. Tentukan layer: route, guard, DTO, service, atau database.
3. Reproduksi dengan request paling kecil.
4. Baru perbaiki akar masalahnya.

### Latihan 7.1 — Diagnosis

Untuk setiap kasus, tentukan layer dan kemungkinan penyebab:

1. `POST /departments` mengembalikan 400 "name must be a string".
2. `GET /employees/me` mengembalikan 404 "Profil karyawan belum terdaftar".
3. `POST /attendance/clock-in` mengembalikan 400 "di luar area kantor".
4. `GET /payroll/:id` mengembalikan 403 untuk employee lain.
5. `POST /leaves` mengembalikan 400 "Jatah cuti tidak mencukupi".

<details>
<summary>Hint</summary>

1. DTO. 2. Service mencari Employee berdasarkan userId. 3. Haversine/radius. 4. Pengecekan owner di service. 5. Validasi kuota di service.

</details>

---

## 8. Checklist keamanan backend

- [ ] `.env` tidak pernah di-commit.
- [ ] `JWT_SECRET` kuat dan bukan nilai default.
- [ ] Password di-hash, tidak pernah dikembalikan di response.
- [ ] Endpoint yang sensitif memakai `AuthGuard` + `RolesGuard`.
- [ ] Data milik user dicek kepemilikannya, bukan hanya role.
- [ ] Input divalidasi di DTO, aturan bisnis di service.
- [ ] Query memakai `select` agar field sensitif tidak bocor.
- [ ] Tidak ada `console.log` token/password.
- [ ] Error tidak membocorkan detail internal.
- [ ] CORS dibatasi di production.
- [ ] Rate limit login aktif.
- [ ] `whitelist: true` aktif agar field asing dibuang.

### Latihan 8.1 — Audit kecil

Buka `auth.controller.ts`. Temukan dua endpoint yang belum dibatasi role dengan tepat. Jelaskan risiko dan perbaikannya. Jangan langsung mengubah kode produksi; tulis rencana perbaikannya dulu.

<details>
<summary>Hint</summary>

`GET /auth/users` dan `PATCH /auth/users/:id/role`. Siapa yang seharusnya boleh mengakses? Apa akibatnya kalau semua user login bisa mengubah role?

</details>

---

## 9. Capstone: bangun modul Announcement dari nol

Tujuan: membuktikan kamu bisa mengulang seluruh resep tanpa menyalin modul lain.

### Requirement database

Model `Announcement`:

| Kolom | Tipe | Aturan |
|---|---|---|
| id | String | `@id @default(uuid())` |
| title | String | wajib |
| content | String | wajib, `@db.Text` |
| isPublished | Boolean | default false |
| publishedAt | DateTime? | nullable |
| authorId | String | relasi ke User |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

Tambahkan relasi balik di `User`.

### Requirement endpoint

| Method | Path | Akses | Perilaku |
|---|---|---|---|
| GET | `/announcements` | Semua login | Hanya published, urut createdAt desc |
| GET | `/announcements/:id` | Semua login | 404 jika tidak ada |
| POST | `/announcements` | HR, SUPER_ADMIN | authorId dari JWT |
| PATCH | `/announcements/:id/publish` | HR, SUPER_ADMIN | set published + publishedAt |
| DELETE | `/announcements/:id` | HR, SUPER_ADMIN | 404 jika tidak ada |

### Requirement bisnis

1. Create dengan `isPublished: true` otomatis mengisi `publishedAt`.
2. Create tanpa `isPublished` menghasilkan `false` dan `publishedAt` null.
3. `findOne` dan `remove` melempar `NotFoundException` jika id tidak ada.
4. Judul minimal 5 karakter, isi minimal 10 karakter.
5. `authorId` tidak boleh diambil dari body.

### Requirement test

1. Create published mengisi `publishedAt`.
2. Create unpublished membiarkan `publishedAt` null.
3. `findOne` melempar `NotFoundException` saat Prisma mengembalikan null.

### Tahapan dan hint

#### Stage 1 — Schema dan migration

<details>
<summary>Hint 1</summary>

Relasi dua arah butuh field di kedua model. Di `User`: `announcements Announcement[]`.

</details>

<details>
<summary>Hint 2</summary>

Teks panjang di MySQL: `content String @db.Text`.

</details>

<details>
<summary>Hint 3</summary>

`npx prisma migrate dev --name add_announcement`.

</details>

#### Stage 2 — DTO

<details>
<summary>Hint 1</summary>

Gunakan `@IsString`, `@IsNotEmpty`, `@MinLength`, `@IsBoolean`, `@IsOptional`.

</details>

<details>
<summary>Hint 2</summary>

DTO update membuat semua field opsional.

</details>

<details>
<summary>Hint 3</summary>

`isPublished` harus boolean. Jangan mengakali string "true" di service; perbaiki input di client.

</details>

#### Stage 3 — Service

<details>
<summary>Hint 1</summary>

`@Injectable()` dan constructor `private readonly prisma: PrismaService`.

</details>

<details>
<summary>Hint 2</summary>

Hitung `publishedAt` sebelum memanggil `prisma.announcement.create`.

</details>

<details>
<summary>Hint 3</summary>

Exception dari `@nestjs/common`, bukan `@nestjs/core`.

</details>

#### Stage 4 — Controller

<details>
<summary>Hint 1</summary>

`@Controller('announcements')` + `@UseGuards(AuthGuard('jwt'), RolesGuard)`.

</details>

<details>
<summary>Hint 2</summary>

`authorId` dari `req.user.id`. Jangan pernah dari `@Body`.

</details>

<details>
<summary>Hint 3</summary>

`@Roles('HR', 'SUPER_ADMIN')` hanya untuk method tulis.

</details>

<details>
<summary>Hint 4</summary>

Route statis harus diletakkan sebelum route `:id`.

</details>

#### Stage 5 — Module dan wiring

<details>
<summary>Hint 1</summary>

Buat `announcement.module.ts` dengan `controllers` dan `providers`.

</details>

<details>
<summary>Hint 2</summary>

Import `AnnouncementModule` di `app.module.ts`. Lupa ini berarti 404.

</details>

<details>
<summary>Hint 3</summary>

`PrismaModule` sudah global, tidak perlu diimpor lagi.

</details>

#### Stage 6 — Verifikasi manual

1. `npx prisma migrate dev`.
2. `npm run start:dev`.
3. Login HR, ambil token.
4. `POST /announcements`.
5. `GET /announcements`.
6. Cek baris di Prisma Studio.
7. Coba pakai token EMPLOYEE untuk create/delete: harus 403.
8. Coba delete id palsu: harus 404.

<details>
<summary>Hint 1</summary>

Cek `auth.service.ts` untuk nama field token: `accessToken`.

</details>

<details>
<summary>Hint 2</summary>

401 = token; 403 = role; 404 = route/id. Jangan campur.

</details>

#### Stage 7 — Unit test

<details>
<summary>Hint 1</summary>

Tiru struktur `department.service.spec.ts`, ganti mock ke `announcement.create/findUnique/...`.

</details>

<details>
<summary>Hint 2</summary>

`vi.fn().mockResolvedValue(...)` untuk mengatur hasil.

</details>

<details>
<summary>Hint 3</summary>

`await expect(service.findOne('x')).rejects.toThrow(NotFoundException)`.

</details>

### Kriteria lulus capstone

- [ ] Migration bersih dan tabel ada.
- [ ] `npm run build` sukses.
- [ ] `npm run lint` tanpa error.
- [ ] Kelima endpoint berfungsi.
- [ ] `authorId` dari JWT.
- [ ] Employee mendapat 403 untuk create/delete.
- [ ] `publishedAt` otomatis saat publish.
- [ ] Tiga test lulus.
- [ ] Bisa menjelaskan alur request tanpa melihat kode.

---

## 10. Repetisi wajib: modul Holiday

Setelah capstone lulus, ulangi dari nol **tanpa melihat Announcement**.

### Requirement

Model:

```prisma
Holiday {
  id          String   @id @default(uuid())
  name        String
  date        DateTime @unique
  description String?
  createdAt   DateTime @default(now())
}
```

Endpoint:

| Method | Path | Akses |
|---|---|---|
| GET | `/holidays` | Semua login |
| POST | `/holidays` | HR, SUPER_ADMIN |
| DELETE | `/holidays/:id` | HR, SUPER_ADMIN |

Aturan:

- Tanggal duplikat menghasilkan `409 Conflict`.
- Tanggal wajib format `YYYY-MM-DD` di DTO.
- Delete id yang tidak ada menghasilkan 404.

Test wajib:

1. Create berhasil.
2. Create duplikat melempar `ConflictException`.

Target waktu: lebih cepat dari capstone. Kalau masih sama lambatnya, ulangi sekali lagi dengan modul berbeda (misal `Asset` atau `Training`).

---

## 11. Checklist penguasaan backend

Kamu dianggap paham seluruh backend jika bisa menjawab tanpa membuka kode:

- [ ] Apa fungsi `main.ts`, `AppModule`, module fitur, controller, service, DTO, guard.
- [ ] Kenapa dependency injection memudahkan testing.
- [ ] Perbedaan `select` dan `include` di Prisma.
- [ ] Kenapa perubahan schema butuh migration dan generate.
- [ ] Kapan memakai `$transaction`.
- [ ] Perbedaan 400, 401, 403, 404, 409.
- [ ] Cara kerja JWT dan RBAC di project ini.
- [ ] Alur absensi dari GPS sampai record database.
- [ ] Alur cuti dua lapis dan kapan kuota dipotong.
- [ ] Rumus payroll dan komponen yang memengaruhinya.
- [ ] Cara menulis unit test dengan Prisma mock.
- [ ] Cara menambah fitur baru dari schema sampai test.

Kalau ada satu yang belum bisa, kembali ke bagian terkait sebelum lanjut.

---

## 12. Cheat sheet

### Perintah

```bash
npm run start:dev          # jalankan backend (watch)
npm run build              # compile ke dist/
npm run lint               # oxlint
npm run test               # unit test
npm run test:e2e           # e2e test
npm run seed               # data awal
npx prisma generate        # generate client
npx prisma migrate dev     # migration + generate
npx prisma migrate status  # cek status migration
npx prisma studio          # GUI database
```

### Endpoint utama

```
POST   /auth/register
POST   /auth/login
GET    /auth/profile

GET    /employees
GET    /employees/me
POST   /employees
PATCH  /employees/:id
DELETE /employees/:id

GET    /departments
GET    /departments/:id/tree
POST   /departments

GET    /positions
POST   /positions

GET    /office-locations
POST   /office-locations
PATCH  /office-locations/:id

POST   /attendance/clock-in
POST   /attendance/clock-out
GET    /attendance/my-records
GET    /attendance/recap

POST   /leaves
GET    /leaves/my
GET    /leaves/approvals
PATCH  /leaves/:id/manager-approve
PATCH  /leaves/:id/hr-approve
PATCH  /leaves/:id/reject

GET    /salaries/me
PUT    /salaries/:employeeId

POST   /payroll/generate
GET    /payroll/my
PATCH  /payroll/:id/approve
PATCH  /payroll/:id/revise
PATCH  /payroll/:id/mark-paid
GET    /payroll/:id/payslip-pdf
```

### Status payroll

```
DRAFT -> APPROVED -> PAID
```

### Status cuti

```
PENDING -> MANAGER_APPROVED -> HR_APPROVED
        -> REJECTED
```

---

## 13. Cara belajar yang benar

1. Baca requirement, tutup hint.
2. Tulis kode sendiri.
3. Jalankan dan baca error.
4. Buka hint hanya jika stuck lebih dari 10 menit.
5. Setelah berhasil, jelaskan ulang alurnya.
6. Hapus dan ulangi dari nol untuk membangun muscle memory.
7. Minta review, terima koreksi, lalu perbaiki.

Kalau kamu meminta jawaban lengkap sebelum mencoba, kamu hanya akan merasa paham. Kamu tidak akan benar-benar bisa mengerjakannya di interview atau di pekerjaan.
