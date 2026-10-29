import { useState } from 'react'

export default function HRPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('beranda') // 'beranda' | 'karyawan' | 'absensi' | 'cuti' | 'payroll'
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const [selectedEmployee, setSelectedEmployee] = useState({
    name: 'Bima Pratama',
    role: 'Backend Developer',
    gajiPokok: 'Rp 12.000.000',
    tunjangan: 'Rp 2.500.000',
    lembur: 'Rp 312.139',
    bpjs: '− Rp 480.000',
    telat: '− Rp 50.000',
    alpa: '− Rp 0',
    pph: '− Rp 466.607',
    diterima: 'Rp 13.815.532',
  })

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-stone-900 font-sans antialiased flex">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#1b7a43] text-white text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}

      {/* LEFT SIDEBAR: Page 9-13 Standard (Dark Forest Green) */}
      <aside className="w-64 bg-[#0f3832] text-white min-h-screen p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & System Name */}
          <div className="flex items-start gap-3 mb-8">
            <div className="w-6 h-6 rounded-md bg-[#f59e0b] mt-0.5 shrink-0" />
            <h1 className="text-sm font-bold leading-tight tracking-wide">
              Human<br />Resource<br />Information<br />System
            </h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 text-sm">
            <button
              onClick={() => setActiveTab('beranda')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'beranda'
                  ? 'bg-[#f59e0b] text-[#0f3832] shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>Beranda</span>
            </button>

            <button
              onClick={() => setActiveTab('karyawan')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'karyawan'
                  ? 'bg-[#f59e0b] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>Karyawan</span>
            </button>

            <button
              onClick={() => setActiveTab('absensi')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'absensi'
                  ? 'bg-[#f59e0b] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>Absensi</span>
            </button>

            <button
              onClick={() => setActiveTab('cuti')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'cuti'
                  ? 'bg-[#f59e0b] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>Cuti</span>
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'payroll'
                  ? 'bg-[#f59e0b] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>Payroll</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 rounded-xl font-semibold text-stone-400 hover:text-rose-400 transition cursor-pointer mt-4"
            >
              Keluar
            </button>
          </nav>
        </div>

        {/* User Info Bottom */}
        <div className="pt-6 border-t border-white/10">
          <p className="text-[11px] text-stone-400">Masuk sebagai</p>
          <p className="text-xs font-bold text-white mt-0.5">
            {currentUser.name || 'Rina Kusuma'} · HR
          </p>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 p-8 lg:p-10 max-w-6xl overflow-x-hidden">
        
        {/* =================================================================== */}
        {/* TAB 1: BERANDA (Page 9 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'beranda' && (
          <div className="flex flex-col gap-6">
            {/* Hero Card Top */}
            <div className="bg-gradient-to-r from-[#14473f] to-[#0f3832] text-white rounded-2xl p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Selamat pagi, Rina</h2>
                <p className="text-xs text-stone-300 mb-2">Selasa, 20 Oktober 2026</p>
                <p className="text-xs text-stone-300">Shift pagi 08:00 sampai 17:00, Kantor Pusat Surabaya</p>
              </div>

              <div className="flex flex-col items-end gap-2.5">
                <div className="text-4xl md:text-5xl font-black tracking-tight">07:18:16</div>
                <button
                  onClick={() => showToast('Presensi Anda tercatat sebagai Hadir Tepat Waktu')}
                  className="bg-[#f59e0b] hover:bg-[#e08e08] text-[#0f3832] font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  Absen sekarang
                </button>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#14473f] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold mb-1">142</div>
                  <div className="text-xs text-stone-200">Karyawan aktif</div>
                </div>
                <div className="mt-3">
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[11px] font-semibold">
                    +3 bulan ini
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-stone-900 mb-1">131</div>
                  <div className="text-xs text-stone-500">Hadir hari ini</div>
                </div>
                <div className="mt-3">
                  <span className="bg-[#e8f7ee] text-[#1b7a43] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                    92% dari total
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-stone-900 mb-1">6</div>
                  <div className="text-xs text-stone-500">Sedang cuti atau izin</div>
                </div>
                <div className="mt-3">
                  <span className="bg-[#ebf3fb] text-[#285a84] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                    2 menunggu persetujuan
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-stone-900 mb-1">4</div>
                  <div className="text-xs text-stone-500">Terlambat pagi ini</div>
                </div>
                <div className="mt-3">
                  <span className="bg-[#fdf2f2] text-[#e53e3e] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                    +1 dari kemarin
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Kehadiran Bar Chart & Menunggu Persetujuan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart (col-span-2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-6">Kehadiran minggu ini</h3>
                <div className="flex items-end justify-between gap-4 h-44 px-4 pb-2">
                  {[
                    { day: 'Sen', percent: '96%', h: 'h-36', bg: 'bg-[#1e584f]' },
                    { day: 'Sel', percent: '93%', h: 'h-32', bg: 'bg-[#1e584f]' },
                    { day: 'Rab', percent: '97%', h: 'h-40', bg: 'bg-[#1e584f]' },
                    { day: 'Kam', percent: '91%', h: 'h-28', bg: 'bg-[#1e584f]' },
                    { day: 'Jum', percent: '92%', h: 'h-30', bg: 'bg-[#f59e0b]' },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[11px] text-stone-500 font-medium">{bar.percent}</span>
                      <div className={`w-full max-w-[56px] ${bar.h} ${bar.bg} rounded-t-lg transition-all`} />
                      <span className="text-xs font-semibold text-stone-700">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Menunggu Persetujuan */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">Menunggu persetujuan</h3>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-stone-900">Kevin Santoso</div>
                      <div className="text-xs text-stone-500 mt-0.5">Sakit, 2 hari</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#c44d27]">
                      Tahap Manager
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-stone-900">Dewi Lestari</div>
                      <div className="text-xs text-stone-500 mt-0.5">Cuti tahunan, 3 hari</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#ebf3fb] text-[#285a84]">
                      Tahap HR
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-stone-900">Maya Putri</div>
                      <div className="text-xs text-stone-500 mt-0.5">Izin, 1 hari</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#c44d27]">
                      Tahap Manager
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Komposisi Karyawan & Pengumuman */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Komposisi Donut Chart */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-4">Komposisi karyawan</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#133d36]" />
                      <span className="text-stone-700">Tetap, 91 orang</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                      <span className="text-stone-700">Kontrak, 37 orang</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#285a84]" />
                      <span className="text-stone-700">Probation, 14 orang</span>
                    </div>
                  </div>
                </div>

                <div className="w-32 h-32 rounded-full border-[14px] border-[#133d36] border-t-[#f59e0b] border-r-[#285a84] flex items-center justify-center">
                  <span className="text-2xl font-black text-stone-900">142</span>
                </div>
              </div>

              {/* Pengumuman */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">Pengumuman</h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-900">Libur Maulid Nabi</div>
                      <div className="text-stone-500 mt-0.5">Kantor tutup Senin, 26 Oktober</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#ebf3fb] text-[#285a84]">
                      Libur
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-900">Cut-off payroll</div>
                      <div className="text-stone-500 mt-0.5">Absensi dikunci tanggal 25</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#c44d27]">
                      8 hari lagi
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-900">Kontrak Dewi Lestari</div>
                      <div className="text-stone-500 mt-0.5">Berakhir 31 Desember 2026</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fdf2f2] text-[#e53e3e]">
                      Perpanjang
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: KARYAWAN (Page 10 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'karyawan' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Karyawan</h2>
                <p className="text-xs text-stone-500 mt-1">Profil, jabatan, status kontrak, dan struktur tim</p>
              </div>

              <button
                onClick={() => showToast('Form wizard onboarding karyawan baru dibuka')}
                className="bg-[#0f3832] hover:bg-[#134941] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                + Tambah karyawan
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table (col-span-2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-100">
                  <input
                    type="text"
                    placeholder="Cari nama atau departemen..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 outline-none"
                  />
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Nama</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">Departemen</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {[
                      { init: 'BP', name: 'Bima Pratama', role: 'Backend Developer', dept: 'Engineering', status: 'Tetap', bg: 'bg-[#1a365d]' },
                      { init: 'DL', name: 'Dewi Lestari', role: 'UI Designer', dept: 'Engineering', status: 'Kontrak', bg: 'bg-[#2b6cb0]' },
                      { init: 'KS', name: 'Kevin Santoso', role: 'QA Engineer', dept: 'Engineering', status: 'Probation', bg: 'bg-[#b86d1a]' },
                      { init: 'AS', name: 'Agus Salim', role: 'Payroll Specialist', dept: 'HR', status: 'Tetap', bg: 'bg-[#14473f]' },
                      { init: 'MP', name: 'Maya Putri', role: 'Recruiter', dept: 'HR', status: 'Kontrak', bg: 'bg-[#7c3aed]' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${row.bg} text-white font-bold flex items-center justify-center text-xs`}>
                            {row.init}
                          </div>
                          <span className="font-bold text-stone-900">{row.name}</span>
                        </td>
                        <td className="py-3 px-4 text-stone-600">{row.role}</td>
                        <td className="py-3 px-4 text-stone-600">{row.dept}</td>
                        <td className="py-3 px-4 font-semibold text-stone-800">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Struktur Organisasi Tree */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">Struktur organisasi</h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="font-bold text-stone-900">Hendra Wijaya</div>
                    <div className="text-[11px] text-stone-500">Direktur Operasional</div>
                  </div>

                  <div className="pl-4 border-l-2 border-stone-200 space-y-3">
                    <div>
                      <div className="font-bold text-[#285a84]">Sari Utami</div>
                      <div className="text-[11px] text-stone-500">Manager Engineering</div>
                      <div className="pl-3 mt-1.5 space-y-1 text-stone-600 text-[11px]">
                        <div>• Bima Pratama</div>
                        <div>• Dewi Lestari</div>
                        <div>• Kevin Santoso</div>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-[#0f3832]">Rina Kusuma</div>
                      <div className="text-[11px] text-stone-500">Kepala HR</div>
                      <div className="pl-3 mt-1.5 space-y-1 text-stone-600 text-[11px]">
                        <div>• Agus Salim</div>
                        <div>• Maya Putri</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PAYROLL (Page 13 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'payroll' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Payroll Oktober 2026</h2>
                <p className="text-xs text-stone-500 mt-1">Kalkulasi otomatis dari absensi, lembur, dan potongan</p>
              </div>

              <button
                onClick={() => showToast('Batch Payroll berhasil disetujui HR & diteruskan ke Direktur')}
                className="bg-[#0f3832] hover:bg-[#134941] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Setujui payroll
              </button>
            </div>

            {/* Stepper Status */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs mb-6 flex items-center justify-between text-xs font-semibold px-8">
              <span className="text-stone-400">✓ Draft dihitung</span>
              <span className="text-[#0f3832] font-bold">● Ditinjau HR</span>
              <span className="text-stone-400">○ Disetujui direktur</span>
              <span className="text-stone-400">○ Dicairkan</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table (col-span-2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Karyawan</th>
                      <th className="py-3 px-4">Pendapatan</th>
                      <th className="py-3 px-4">Potongan</th>
                      <th className="py-3 px-4">Diterima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {[
                      { init: 'BP', name: 'Bima Pratama', in: 'Rp 14.812.139', out: 'Rp 996.607', net: 'Rp 13.815.532', bg: 'bg-[#1a365d]' },
                      { init: 'DL', name: 'Dewi Lestari', in: 'Rp 11.000.000', out: 'Rp 661.000', net: 'Rp 10.339.000', bg: 'bg-[#2b6cb0]' },
                      { init: 'KS', name: 'Kevin Santoso', in: 'Rp 8.303.468', out: 'Rp 849.355', net: 'Rp 7.454.113', bg: 'bg-[#b86d1a]' },
                      { init: 'AS', name: 'Agus Salim', in: 'Rp 12.173.410', out: 'Rp 738.671', net: 'Rp 11.434.740', bg: 'bg-[#14473f]' },
                      { init: 'MP', name: 'Maya Putri', in: 'Rp 9.700.000', out: 'Rp 708.000', net: 'Rp 8.992.000', bg: 'bg-[#7c3aed]' },
                    ].map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedEmployee({ ...selectedEmployee, name: row.name, diterima: row.net })}
                        className="hover:bg-stone-50 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${row.bg} text-white font-bold flex items-center justify-center text-xs`}>
                            {row.init}
                          </div>
                          <span className="font-bold text-stone-900">{row.name}</span>
                        </td>
                        <td className="py-3 px-4 text-stone-700">{row.in}</td>
                        <td className="py-3 px-4 text-[#c44d27]">{row.out}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">{row.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Slip Gaji Preview (Right Side) */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">Slip gaji</h3>
                <div className="mb-3">
                  <div className="font-bold text-sm text-stone-900">{selectedEmployee.name}</div>
                  <div className="text-xs text-stone-500">{selectedEmployee.role}</div>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  <div className="py-2 flex justify-between">
                    <span>Gaji pokok</span>
                    <span className="font-bold">{selectedEmployee.gajiPokok}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>Tunjangan tetap</span>
                    <span className="font-bold">{selectedEmployee.tunjangan}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>Lembur (3 jam)</span>
                    <span className="font-bold">{selectedEmployee.lembur}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>BPJS Kesehatan & KT</span>
                    <span className="font-bold text-[#c44d27]">{selectedEmployee.bpjs}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>Keterlambatan (1x)</span>
                    <span className="font-bold text-[#c44d27]">{selectedEmployee.telat}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>Alpa (0 hari)</span>
                    <span className="font-bold text-[#c44d27]">{selectedEmployee.alpa}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>PPh 21 (estimasi)</span>
                    <span className="font-bold text-[#c44d27]">{selectedEmployee.pph}</span>
                  </div>
                  <div className="pt-3 flex flex-col">
                    <span className="text-[11px] text-stone-500">Diterima</span>
                    <span className="text-xl font-black text-stone-900">{selectedEmployee.diterima}</span>
                  </div>
                </div>

                <button
                  onClick={() => showToast(`Slip gaji ${selectedEmployee.name} berhasil diunduh`)}
                  className="w-full mt-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-xs font-bold text-stone-800 transition cursor-pointer"
                >
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for other tabs */}
        {(activeTab === 'absensi' || activeTab === 'cuti') && (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center text-stone-500">
            <h3 className="text-base font-bold text-stone-800 mb-2">Modul {activeTab.toUpperCase()} HR</h3>
            <p className="text-xs">Pengaturan dan monitoring data {activeTab} terintegrasi.</p>
          </div>
        )}

      </main>
    </div>
  )
}
