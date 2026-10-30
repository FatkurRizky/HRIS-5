const WEEKLY_ATTENDANCE_BARS = [
  { day: 'Sen', percent: '96%', h: 'h-36', bg: 'bg-[#1e584f]' },
  { day: 'Sel', percent: '93%', h: 'h-32', bg: 'bg-[#1e584f]' },
  { day: 'Rab', percent: '97%', h: 'h-40', bg: 'bg-[#1e584f]' },
  { day: 'Kam', percent: '91%', h: 'h-28', bg: 'bg-[#1e584f]' },
  { day: 'Jum', percent: '92%', h: 'h-30', bg: 'bg-[#eab04c]' },
]

/**
 * Tab 1 Portal HR: Beranda Ringkasan Eksekutif (Page 9 desain_UI.pdf).
 */
export default function HRBerandaTab({
  hrName,
  currentTime,
  currentDateStr,
  officeLocationName,
  employeesCount,
  pendingQueueCount,
  onNavigateAbsensi,
}) {
  const totalHeadcount = 137 + employeesCount

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Card Top */}
      <div className="bg-gradient-to-r from-[#14473f] to-[#0f3832] text-white rounded-2xl p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            Selamat bertugas, {hrName}
          </h2>
          <p className="text-xs text-stone-300 mb-2">{currentDateStr}</p>
          <p className="text-xs text-stone-300">
            Shift pagi 08:00 sampai 17:00, {officeLocationName}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <div className="text-4xl md:text-5xl font-black tracking-tight">
            {currentTime}
          </div>
          <button
            onClick={onNavigateAbsensi}
            className="bg-[#eab04c] hover:bg-[#dfa038] text-[#0f3832] font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
          >
            Absen sekarang
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#14473f] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold mb-1">{totalHeadcount}</div>
            <div className="text-xs text-stone-200">Karyawan aktif</div>
          </div>
          <div className="mt-3">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[11px] font-semibold">
              +{Math.max(1, employeesCount - 2)} bulan ini
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold text-stone-900 mb-1">
              131
            </div>
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
              {pendingQueueCount || 2} menunggu persetujuan
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
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-6">
            Kehadiran minggu ini
          </h3>
          <div className="flex items-end justify-between gap-4 h-44 px-4 pb-2">
            {WEEKLY_ATTENDANCE_BARS.map((bar) => (
              <div
                key={bar.day}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <span className="text-[11px] text-stone-500 font-medium">
                  {bar.percent}
                </span>
                <div
                  className={`w-full max-w-[56px] ${bar.h} ${bar.bg} rounded-t-lg transition-all`}
                />
                <span className="text-xs font-semibold text-stone-700">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-4">
            Menunggu persetujuan
          </h3>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">
                  Kevin Santoso
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Sakit, 2 hari
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#c44d27]">
                Tahap Manager
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">
                  Dewi Lestari
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Cuti tahunan, 3 hari
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#b86d1a]">
                Tahap HR
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">
                  Maya Putri
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Izin, 1 hari
                </div>
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
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 mb-4">
              Komposisi karyawan
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#133d36]" />
                <span className="text-stone-700">Tetap, 91 orang</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#eab04c]" />
                <span className="text-stone-700">Kontrak, 37 orang</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#285a84]" />
                <span className="text-stone-700">Probation, 14 orang</span>
              </div>
            </div>
          </div>

          <div className="w-32 h-32 rounded-full border-[14px] border-[#133d36] border-t-[#eab04c] border-r-[#285a84] flex items-center justify-center">
            <span className="text-2xl font-black text-stone-900">
              {totalHeadcount}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-4">Pengumuman</h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-stone-900">
                  Libur Maulid Nabi
                </div>
                <div className="text-stone-500 mt-0.5">
                  Kantor tutup Senin, 26 Oktober
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#ebf3fb] text-[#285a84]">
                Libur
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-stone-900">Cut-off payroll</div>
                <div className="text-stone-500 mt-0.5">
                  Absensi dikunci tanggal 25 setiap bulan
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#c44d27]">
                Rutin
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-stone-900">
                  Kontrak Dewi Lestari
                </div>
                <div className="text-stone-500 mt-0.5">
                  Berakhir 31 Desember 2026
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fdf2f2] text-[#e53e3e]">
                Perpanjang
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
