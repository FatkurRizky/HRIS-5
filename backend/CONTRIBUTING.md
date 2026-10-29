# CONTRIBUTING — HRIS Project

Panduan kerja kolaborasi untuk repo **HRIS-5** (https://github.com/FatkurRizky/HRIS-5).

---

## 1. Setup Awal (sekali saja)

### Backend (NestJS)

```bash
git clone https://github.com/FatkurRizky/HRIS-5.git
cd HRIS-5/hris                     # lokasi folder backend

# 1. Install dependency
npm install

# 2. Konfigurasi environment
#    buat file .env (copy dari contoh), isi:
#    DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
#    JWT_SECRET="isi-dengan-string-random"

# 3. Siapkan database
npx prisma migrate dev
npm run seed                       # bikin SuperAdmin (admin@hris.local)

# 4. Jalanin server
npm run start:dev                  # http://localhost:3000
```

### Pilih 1 cara database (paling gampang: Opsi A)

#### ✅ Opsi A — Database Cloud (NEON/Supabase) — REKOMENDASI

Tanpa install apa pun, selesai 2 menit. Cocok kalau tim belum kenal Docker.

1. Daftar gratis di https://neon.tech (atau https://supabase.com)
2. **Create project** → nama bebas (mis. `hris-dev`) → region Singapore
3. Copy **connection string** (bentuknya `postgresql://user:pass@ep-xxx...neon.tech/dbname?sslmode=require`)
4. Paste ke file `.env` di folder `hris/`:
   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx...neon.tech/dbname?sslmode=require"
   JWT_SECRET="rahasia-random-minimal-32-karakter"
   ```
5. Lanjut `npx prisma migrate dev` → `npm run seed`

> **Tips tim:** setiap orang bikin akun Neon sendiri (gratis) + database sendiri, supaya data saling tidak bentrok. `.env` JANGAN di-push ke Git.

#### Opsi B — Postgres Lokal (install native)

Windows (paling gampang): download installer di https://www.postgresql.org/download/windows/ → ikuti wizard → ingat password user `postgres`.

Mac:
```bash
brew install postgresql@16
brew services start postgresql@16
```

Linux (Ubuntu/Debian):
```bash
sudo apt update && sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb hris_db
```

Lalu buat `.env`:
```
DATABASE_URL="postgresql://postgres:PASSWORD_KAMU@localhost:5432/hris_db?schema=public"
```

#### Opsi C — Docker (buat yang sudah paham)

```bash
docker run -d --name hris-postgres \
  -e POSTGRES_USER=root -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=hris_db -p 5434:5432 postgres:16-alpine
```

Lalu `.env`:
```
DATABASE_URL="postgresql://root:password@localhost:5434/hris_db?schema=public"
```

### Frontend (React + Vite)

```bash
cd HRIS-5/hris-frontend
npm install
npm run dev                        # http://localhost:5173 (proxy ke :3000)
```

> **Catatan:** `.env` TIDAK BOLEH di-push. Sudah masuk `.gitignore`.

> **Gak perlu Docker sama sekali.** Database pakai cloud (Neon/Supabase) atau Postgres lokal — pilih salah satu opsi di atas.

---

## 2. Alur Kerja Harian

```
Issue (task) → Branch → Coding → Commit → Push → PR → Merge → Issue auto-close
```

### Step 1 — Ambil Issue

Buka https://github.com/FatkurRizky/HRIS-5/issues, pilih 1 issue (misal #4).
Kalau ada collaborator, assign ke diri sendiri biar tidak dobel.

### Step 2 — Buat Branch

```bash
git checkout main
git pull origin main               # SELALU sync dulu

git checkout -b feature/crud-departments
```

**Format nama branch:**

| Prefix | Dipakai untuk | Contoh |
|--------|---------------|--------|
| `feature/` | Fitur baru | `feature/crud-employees` |
| `fix/` | Perbaikan bug | `fix/clock-in-gps-radius` |
| `chore/` | Task non-fitur (config, docs) | `chore/pr-template` |

**Aturan: 1 issue = 1 branch.** Jangan gabung 2-3 fitur dalam 1 branch.

### Step 3 — Coding

Kerjakan sampai selesai sesuai checklist di issue. Sisipkan commit kecil-kecil:

```bash
git add .
git commit -m "feat: add departments module with CRUD"
```

**Format commit message:**

| Prefix | Untuk |
|--------|-------|
| `feat:` | Fitur baru |
| `fix:` | Perbaikan bug |
| `refactor:` | Rapikan kode tanpa ubah perilaku |
| `chore:` | Config, dependency, docs |

### Step 4 — Pastikan Lolos Sebelum Push

```bash
npm run build                      # wajib sukses
npm run lint                       # wajib bersih
# smoke test endpoint yang dibuat (curl/Postman)
```

### Step 5 — Push BRANCH (bukan main!)

```bash
git push origin feature/crud-departments
```

> ❌ **DILARANG** push langsung ke `main`. Semua lewat Pull Request.

### Step 6 — Buka Pull Request

```bash
gh pr create \
  --title "feat: CRUD Departments" \
  --body "Closes #4

## Yang dikerjakan
- GET /departments (list)
- POST /departments (HR/SuperAdmin only via RolesGuard)
- PATCH /departments/:id
- DELETE /departments/:id

## Cara test
1. Login sbg HR → POST /departments → 201
2. Login sbg Employee → POST /departments → 403

## Checklist
- [x] npm run build lolos
- [x] npm run lint bersih
- [x] Smoke test via curl"
```

**`Closes #4` = kunci penutup issue otomatis.** Begitu PR di-merge, issue #4 langsung closed — tidak perlu centang manual.

### Step 7 — Review & Merge

```bash
# kalau solo (self-review):
gh pr merge --squash --delete-branch

# kalau ada collaborator: tunggu approve dulu, baru merge
```

### Step 8 — Bersih-bersih

```bash
git checkout main
git pull origin main
git branch -d feature/crud-departments
```

---

## 3. Definition of Done (sebelum buka PR)

Sebuah task dianggap selesai kalau:

- [x] Semua checklist di issue terkerjakan
- [x] `npm run build` sukses
- [x] `npm run lint` bersih (oxlint)
- [x] Tidak ada `console.log` tertinggal
- [x] Password/token TIDAK muncul di response
- [x] Error handling pakai `try/catch/finally` di async function
- [x] Pesan error dari backend: `err.response?.data?.message` (frontend)
- [x] Smoke test endpoint via curl lolos
- [x] PR description berisi `Closes #<nomor issue>`

---

## 4. Aturan Penting

1. **Wajib PR** — tidak ada push langsung ke `main`
2. **1 PR = 1 issue** — gampang di-review & di-revert
3. **PR kecil** — idealnya < 400 baris perubahan
4. **Merge + hapus branch** — biar daftar branch tidak menggunung
5. **Jangan push `.env`** — sudah di `.gitignore`, jangan di-`-f`
6. **Sync dulu** — `git pull origin main` sebelum bikin branch baru

---

## 5. Cheat Sheet

```bash
# Mulai kerja issue baru
git checkout main && git pull origin main
git checkout -b feature/nama-fitur

# Selesai coding
npm run build && npm run lint
git add . && git commit -m "feat: deskripsi"
git push origin feature/nama-fitur
gh pr create --title "feat: ..." --body "Closes #N"

# Setelah merge
gh pr merge --squash --delete-branch
git checkout main && git pull origin main
git branch -d feature/nama-fitur

# Liat status
git status
gh issue list                        # daftar issue
gh pr list                           # daftar PR
gh pr status                         # status PR branch ini
```

---

## 6. Struktur Repo

```
HRIS-5/
├── HRIS_BLUEPRINT.md     # dokumen blueprint sistem
├── hris/                 # Backend NestJS + Prisma (port 3000)
│   ├── src/
│   │   ├── auth/         # register, login, JWT, RolesGuard
│   │   ├── prisma/       # PrismaService (global)
│   │   └── main.ts       # ValidationPipe + CORS
│   └── prisma/schema.prisma
├── hris-frontend/        # Frontend React + Vite (port 5173)
│   ├── src/lib/api.js    # axios instance, proxy /api
│   └── src/App.jsx
└── ISSUE_BACKLOG.md      # backlog referensi
```

## 7. Kontak

- Repo owner: **Fatkur_Rizky** (muhammadfatkur676@gmail.com)
- Ada kendala? Buka issue baru dengan label yang sesuai.
