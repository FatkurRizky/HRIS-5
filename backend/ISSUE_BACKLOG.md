# HRIS — Backlog Issue

Repo: https://github.com/FatkurRizky/HRIS-5.git

**Cara pakai:** GitHub → tab **Issues** → **New issue** → copy blok issue dari bawah → sesuaikan nomor. Atau install `gh` dulu (`sudo apt install gh`), lalu `gh auth login`, dan buat issue via CLI.

**Sudah selesai (referensi):** Auth backend (register/login JWT/profile + guard) — lihat commit `feat/auth`.

opencode -s ses_eb4b33a7bffehoU5kgPWrke5sI

---

## Sprint 1 — Fondasi Repo

### Issue #1 — [Chore] Init git & push ke HRIS-5
**Labels:** `chore`, `infra`
**Milestone:** Sprint 1
```
- [ ] git init di hris/ dan hris-frontend/
- [ ] Push initial commit ke https://github.com/FatkurRizky/HRIS-5.git
- [ ] Verifikasi .env TIDAK ikut ter-push (cek .gitignore)
- [ ] README: cara run backend + frontend
```

### Issue #2 — [Chore] Workflow kolaborasi (branch & PR)
**Labels:** `chore`, `infra`
**Milestone:** Sprint 1
```
- [ ] Tambah .github/pull_request_template.md
- [ ] Branch naming: feature/*, fix/*, chore/*
- [ ] Aturan: wajib PR, dilarang push langsung ke main
- [ ] Commit convention: feat/fix/chore/refactor
```

---

## Sprint 2 — Master Data Karyawan

### Issue #3 — [Backend] CRUD Departments
**Labels:** `backend`, `feature`
**Milestone:** Sprint 2
```
- [ ] GET /departments (list)
- [ ] POST /departments (HR/SuperAdmin only)
- [ ] PATCH /departments/:id
- [ ] DELETE /departments/:id (guard: jangan hapus kalau masih ada employee)
- [ ] DTO + validasi input
```
**Acceptance:** Employee tidak bisa akses endpoint ini (403). Build & lint bersih.

### Issue #4 — [Backend] CRUD Positions
**Labels:** `backend`, `feature`
**Milestone:** Sprint 2
```
- [ ] GET /positions
- [ ] POST /positions (HR/SuperAdmin only)
- [ ] PATCH /positions/:id
- [ ] DELETE /positions/:id
```

### Issue #5 — [Backend] CRUD Employees + relasi
**Labels:** `backend`, `feature`
**Milestone:** Sprint 2
```
- [ ] GET /employees (list + filter by department/status)
- [ ] GET /employees/:id
- [ ] POST /employees (buat user + employee sekaligus, role default EMPLOYEE)
- [ ] PATCH /employees/:id
- [ ] DELETE /employees/:id
- [ ] Relasi: department, position, manager (self-relation)
```
**Acceptance:** Password di-hash (bcrypt), response TIDAK pernah mengembalikan field password.

### Issue #6 — [Backend] Struktur organisasi (manager → subordinates)
**Labels:** `backend`, `feature`
**Milestone:** Sprint 2
```
- [ ] GET /employees/:id/subordinates
- [ ] GET /employees/:id/manager
- [ ] Validasi: manager tidak boleh bawahan sendiri (cegah circular)
- [ ] Endpoint org chart: GET /departments/:id/tree
```

### Issue #7 — [Backend] Kontrak & status karyawan
**Labels:** `backend`, `feature`
**Milestone:** Sprint 2
```
- [ ] Field status: TETAP / KONTRAK / PROBATION (sudah ada di schema)
- [ ] PATCH /employees/:id/status (HR only)
- [ ] Warning: kontrak akan habis < 30 hari
```

---

## Sprint 3 — Absensi

### Issue #8 — [Backend] Master lokasi kantor (radius GPS)
**Labels:** `backend`, `feature`
**Milestone:** Sprint 3
```
- [ ] Model OfficeLocation (nama, lat, long, radius meter)
- [ ] CRUD /office-locations (SuperAdmin/HR only)
- [ ] GET /office-locations (semua role butuh buat validasi clock-in)
```

### Issue #9 — [Backend] Clock In/Out dengan validasi GPS
**Labels:** `backend`, `feature`
**Milestone:** Sprint 3
```
- [ ] POST /attendance/clock-in {lat, long}
- [ ] POST /attendance/clock-out {lat, long}
- [ ] Validasi: hitung jarak (Haversine) vs radius lokasi → 400 kalau di luar
- [ ] Guard: 1 record per hari per employee (unique employeeId+date → 409 kalau dobel)
- [ ] Status otomatis: LATE kalau clock-in > jam kerja (mis. 08:00)
```

### Issue #10 — [Backend] Riwayat absensi
**Labels:** `backend`, `feature`
**Milestone:** Sprint 3
```
- [ ] GET /attendance/my-records (employee: riwayat sendiri)
- [ ] GET /attendance/team (manager: riwayat bawahan)
- [ ] GET /attendance (HR: semua + filter tanggal/department)
```

### Issue #11 — [Backend] Pengajuan cuti/izin/sakit + approval berjenjang
**Labels:** `backend`, `feature`
**Milestone:** Sprint 3
```
- [ ] POST /leaves (employee ajukan: type, startDate, endDate, reason)
- [ ] GET /leaves/my
- [ ] GET /leaves/approvals (manager: antrian bawahan)
- [ ] PATCH /leaves/:id/manager-approve (Manager only)
- [ ] PATCH /leaves/:id/hr-approve (HR only, final)
- [ ] PATCH /leaves/:id/reject (Manager/HR)
- [ ] Notifikasi status ke pemohon (response message cukup untuk MVP)
```

### Issue #12 — [Backend] Rekap absensi bulanan
**Labels:** `backend`, `feature`
**Milestone:** Sprint 3
```
- [ ] GET /attendance/recap?month=&year= (HR: semua karyawan)
- [ ] GET /attendance/recap/my?month=&year= (employee)
- [ ] Output: total hadir, terlambat, alpa, cuti per karyawan
```

---

## Sprint 4 — Payroll

### Issue #13 — [Backend] Master gaji per karyawan
**Labels:** `backend`, `feature`
**Milestone:** Sprint 4
```
- [ ] Model Salary (sudah ada) — CRUD endpoint
- [ ] PUT /salaries/:employeeId (HR only: baseSalary, allowance, overtimeRate)
- [ ] GET /salaries/me (employee lihat gaji pokok sendiri)
```

### Issue #14 — [Backend] Kalkulasi payroll otomatis
**Labels:** `backend`, `feature`
**Milestone:** Sprint 4
```
- [ ] POST /payroll/generate {month, year}
- [ ] Rumus: (gaji pokok + tunjangan + lembur) − (potongan telat + alpa + BPJS + PPh21)
- [ ] Data lembur/telat/alpa diambil dari tabel attendance
- [ ] Simpan ke payroll_records (status DRAFT)
- [ ] GET /payroll?month=&year= (HR: draft list + detail)
```

### Issue #15 — [Backend] Approval payroll cycle
**Labels:** `backend`, `feature`
**Milestone:** Sprint 4
```
- [ ] PATCH /payroll/:id/approve (HR → status APPROVED)
- [ ] PATCH /payroll/:id/revise (kembalikan ke DRAFT + catatan revisi)
- [ ] PATCH /payroll/:id/mark-paid (HR → status PAID)
```

### Issue #16 — [Backend] Slip gaji digital (PDF)
**Labels:** `backend`, `feature`
**Milestone:** Sprint 4
```
- [ ] Library generate PDF (mis. pdfkit / puppeteer)
- [ ] GET /payroll/:id/payslip-pdf (employee: slip sendiri; HR: semua)
- [ ] Template slip: komponen pendapatan + potongan + total bersih
```

---

## Sprint 5 — Frontend (React + Vite)

### Issue #17 — [Frontend] Layout & halaman login
**Labels:** `frontend`, `feature`
**Milestone:** Sprint 5
```
- [ ] Layout dasar (sidebar + content)
- [ ] Halaman login → simpan token (localStorage admin_token)
- [ ] Axios interceptor: attach Bearer token
- [ ] Redirect kalau 401 → halaman login
- [ ] Logout
```

### Issue #18 — [Frontend] Dashboard per role
**Labels:** `frontend`, `feature`
**Milestone:** Sprint 5
```
- [ ] Dashboard Manager: antrian approval cuti + status tim
- [ ] Dashboard HR: jumlah karyawan, absensi hari ini, payroll draft
- [ ] Dashboard Employee: status absen hari ini, sisa cuti, slip gaji terbaru
```

### Issue #19 — [Frontend] Modul Karyawan
**Labels:** `frontend`, `feature`
**Milestone:** Sprint 5
```
- [ ] Tabel karyawan + filter (department, status, search)
- [ ] Form tambah/edit karyawan
- [ ] Halaman detail (profil + struktur atasan)
```

### Issue #20 — [Frontend] Modul Absensi
**Labels:** `frontend`, `feature`
**Milestone:** Sprint 5
```
- [ ] Tombol Clock In/Out — ambil GPS via navigator.geolocation
- [ ] Validasi radius di frontend (disabled kalau jauh) + error message UI state
- [ ] Riwayat absensi (tabel)
- [ ] Form pengajuan cuti + status approval
```

### Issue #21 — [Frontend] Modul Payroll
**Labels:** `frontend`, `feature`
**Milestone:** Sprint 5
```
- [ ] HR: generate payroll, tabel draft, approve/revise
- [ ] Employee: daftar slip gaji + download PDF
```

---

## Sprint 6 — Kualitas & Keamanan

### Issue #22 — [Backend] Rate limiting & hardening
**Labels:** `backend`, `security`
**Milestone:** Sprint 6
```
- [ ] Rate limit endpoint login (mis. 5x/menit per IP)
- [ ] Review: semua input sudah divalidasi DTO
- [ ] CORS: kunci ke origin frontend saja
```

### Issue #23 — [Testing] Smoke test endpoint utama
**Labels:** `testing`
**Milestone:** Sprint 6
```
- [ ] Test auth (register/login/profile)
- [ ] Test CRUD employee
- [ ] Test clock-in (valid + luar radius + dobel)
- [ ] Test approval cuti 2 layer
```

---

## Label yang Dipakai

| Label | Arti |
|-------|------|
| `backend` / `frontend` | Layer |
| `feature` / `fix` / `chore` / `security` / `testing` | Jenis |
| `infra` | Setup repo, CI, workflow |
| `priority:high` / `priority:medium` / `priority:low` | Urgensi |
| `blocked` | Nunggu issue lain selesai |

## Setup Cepat (opsional)

```bash
# install gh, lalu:
gh auth login
gh issue create --title "[Backend] CRUD Departments" --label "backend,feature" --milestone "Sprint 2" --body "- [ ] GET/POST/PATCH/DELETE"
```
