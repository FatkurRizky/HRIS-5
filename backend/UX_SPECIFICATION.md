# HRIS UX Specification & Guidelines

Dokumen perancangan UX lengkap dapat dilihat pada:
👉 [docs/hris/PEMBAGIAN_TUGAS_TIM.md](file:///home/muhammad/PEMULA/docs/hris/PEMBAGIAN_TUGAS_TIM.md) (Dokumen Pembagian Peran Tim SDLC: UX, UI, FE, BE)
👉 [docs/hris/TUGAS_PERANCANGAN_UX_HRIS.md](file:///home/muhammad/PEMULA/docs/hris/TUGAS_PERANCANGAN_UX_HRIS.md) (Dokumen Laporan Tugas UX Kelompok 5)
👉 [docs/hris/RANCANGAN_UX_HRIS.md](file:///home/muhammad/PEMULA/docs/hris/RANCANGAN_UX_HRIS.md) (Dokumen Spesifikasi Teknis UX)

---

## Ringkasan Eksekutif UX

1. **Role Target:**
   - **Employee**: Mobile-first, serba instan (Clock-in < 3 detik, cek sisa cuti, download slip gaji).
   - **Manager**: Action-driven (Antrian approval cuti 1-klik, kalender kehadiran tim).
   - **HR Admin**: Data-dense desktop (Master data karyawan wizard, monitoring absensi, verifikasi cuti).
   - **SuperAdmin / Finance**: Governance & Control (Geofence kantor, kunci siklus payroll, audit log).

2. **Prinsip Utama UX:**
   - **Error Prevention**: Cegah tombol ganda (double-click guard), auto-exclude hari libur pada cuti, konfirmasi 2 langkah untuk aksi destruktif.
   - **4 Visual States Wajib**: Idle, Loading (Skeleton Shimmer), Success (Toast), Error (Inline Helper Text).
   - **Pemisahan Perangkat**: Halaman admin dirancang desktop-first (tabel freeze-column & filter), halaman karyawan dirancang mobile-first.
