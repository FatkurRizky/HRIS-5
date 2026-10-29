# 🏢 HRIS Enterprise Monorepo (Human Resource Information System)

Repositori monorepo resmi sistem **Human Resource Information System (HRIS)** yang mengintegrasikan layanan **Backend (NestJS + Prisma + MariaDB)** dan **Frontend (React 19 + Vite + Tailwind CSS)** dalam satu kesatuan arsitektur terpadu.

---

## 🏛️ Struktur Arsitektur Monorepo

```mermaid
graph TD
    Root["HRIS Monorepo Root (package.json - NPM Workspaces)"]
    
    subgraph Frontend Workspace ["/frontend (React 19 + Vite)"]
        F_UI["KaryawanPortal & LoginPage"]
        F_Proxy["Vite Dev Server (Port 5173)\nProxy: /api -> http://localhost:3000"]
        F_UI --> F_Proxy
    end

    subgraph Backend Workspace ["/backend (NestJS 12 + Prisma)"]
        B_API["REST API Server (Port 3000)"]
        B_DB[(MariaDB Database)]
        B_Auth["JWT Guard & RBAC Hierarchy"]
        B_API --> B_Auth --> B_DB
    end

    F_Proxy -->|REST Calls| B_API
    Root -.->|npm run dev:frontend| Frontend
    Root -.->|npm run dev:backend| Backend
```

---

## 📁 Struktur Direktori

```text
hris/
├── backend/                       # REST API Backend Service
│   ├── prisma/                    # Skema Prisma ORM & Migrasi DB
│   │   └── schema.prisma
│   ├── scripts/                   # Seeding Database
│   │   └── seed-admin.mjs         # Inisialisasi 4 Akun Demo & SuperAdmin
│   ├── src/                       # Source Code NestJS
│   │   ├── attendance/            # Geofencing GPS Presensi (Haversine)
│   │   ├── auth/                  # JWT Authentication & Guards
│   │   ├── employees/             # Profil & Kontrak Karyawan
│   │   ├── leaves/                # Workflow Approval Cuti Multi-tier
│   │   ├── payroll/               # Payroll Engine, PPh21 & PDF Slip Gaji
│   │   └── main.ts
│   ├── API_DOCUMENTATION.md       # Spesifikasi Lengkap Endpoint REST API
│   ├── package.json               # Backend Dependencies (@nestjs, prisma, dll)
│   └── .env                       # Konfigurasi Port & DATABASE_URL
│
├── frontend/                      # Client Single Page Application (SPA)
│   ├── public/                    # Aset Statis
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx      # Autentikasi & Quick Demo Persona Selector
│   │   │   └── KaryawanPortal.jsx # Portal Presensi GPS, Cuti & Slip Gaji
│   │   ├── lib/
│   │   │   └── api.js             # Axios Interceptor (Auto Bearer Token)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js             # Konfigurasi Tailwind & Proxy Reverse ke :3000
│   └── package.json               # Frontend Dependencies (react 19, tailwind 4, axios)
│
├── .gitignore                     # Monorepo Git Ignore
├── package.json                   # Root NPM Workspaces Configuration
└── README.md                      # Dokumentasi Utama
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat Sistem
* **Node.js:** Versi 18+ LTS
* **Database:** MariaDB atau MySQL berjalan pada port 3306

### 2. Konfigurasi Environment Backend
Salin dan sesuaikan konfigurasi database di direktori `backend/`:
```bash
cp backend/.env.example backend/.env
```
Contoh isi file `backend/.env`:
```env
PORT=3000
DATABASE_URL="mysql://root:password@localhost:3306/hris_db"
JWT_SECRET="rahasia_super_aman_jwt_hris_kerabat_digital"
JWT_EXPIRATION="7d"
```

### 3. Migrasi Database & Seeding Data Awal
Jalankan sinkronisasi skema Prisma dan buat user demo awal langsung dari root folder:
```bash
# Dari root monorepo:
npm run seed
```
> Script ini otomatis menginisialisasi 4 persona akun demo (`@kerabat.id`) dan titik geofence Kantor Pusat (`-7.8166, 112.0114`).

---

## 💻 Menjalankan Server Development

Monorepo ini mendukung perintah terpadu melalui NPM Workspaces:

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan **Frontend** (Port 5173) dan **Backend** (Port 3000) sekaligus secara paralel |
| `npm run dev:backend` | Menjalankan backend NestJS dengan fitur hot-reload (*watch mode*) |
| `npm run dev:frontend` | Menjalankan frontend React Vite dengan Hot Module Replacement (HMR) |
| `npm run build` | Melakukan kompilasi production build untuk kedua workspace |
| `npm run build:backend` | Build backend NestJS (`dist/main.js`) |
| `npm run build:frontend` | Build frontend SPA (`frontend/dist/`) |
| `npm run seed` | Mengeksekusi database seeder akun demo |
| `npm run test` | Menjalankan unit test Vitest pada backend |

---

## 👥 Akun Demo & Persona Karyawan

Semua akun demo di bawah ini menggunakan kata sandi: **`kerabat123`**

| Role / Persona | Email | Nama | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `admin@kerabat.id` | Fatkur Rizky (Admin) | Akses penuh master data, audit trail log, dan konfigurasi GPS kantor |
| **HR** | `hr@kerabat.id` | Agus Purnomo | Approval cuti final (Layer 2), wizard karyawan, payroll engine |
| **Manager** | `manager@kerabat.id` | Siti Rahmawati | Approval cuti tim (Layer 1) & monitoring kehadiran divisi |
| **Employee** | `employee@kerabat.id` | Budi Santoso | Presensi Geofencing GPS (Radius 50m), pengajuan cuti, unduh slip gaji PDF |

---

## 🔗 Dokumentasi Terkait
* [Dokumentasi REST API Backend](file:///home/muhammad/PEMULA/hris/backend/API_DOCUMENTATION.md)
* [Panduan Belajar Backend HRIS Playbook](file:///home/muhammad/code-playbook/backend-hris/README.md)
* [Panduan Belajar Frontend HRIS Playbook](file:///home/muhammad/code-playbook/frontend-hris/README.md)
