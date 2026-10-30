/**
 * Tab 1 Portal Manager: Ringkasan kehadiran tim & jadwal cuti (Page 6 desain_UI.pdf).
 */
export default function ManagerRingkasanTab({
  pendingCount,
  teamCount,
  onLogout,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Tim Engineering</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-stone-500">Selasa, 20 Oktober 2026</span>
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold text-stone-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#285a84] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold mb-1">{teamCount || 3}</div>
            <div className="text-xs text-blue-100 font-medium">Anggota tim</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold text-stone-900 mb-1">
              {Math.max(1, (teamCount || 3) - 1)}
            </div>
            <div className="text-xs text-stone-500 font-medium">Hadir hari ini</div>
          </div>
          <div className="mt-3">
            <span className="bg-[#e8f7ee] text-[#1b7a43] px-2 py-0.5 rounded-md text-[11px] font-semibold">
              1 sedang sakit
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold text-stone-900 mb-1">{pendingCount}</div>
            <div className="text-xs text-stone-500 font-medium">Menunggu keputusan Anda</div>
          </div>
          <div className="mt-3">
            <span className="bg-[#ebf3fb] text-[#285a84] px-2 py-0.5 rounded-md text-[11px] font-semibold">
              Tahap Manager
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold text-stone-900 mb-1">3x</div>
            <div className="text-xs text-stone-500 font-medium">Terlambat bulan ini</div>
          </div>
          <div className="mt-3">
            <span className="bg-[#fdf2f2] text-[#e53e3e] px-2 py-0.5 rounded-md text-[11px] font-semibold">
              +1 dari bulan lalu
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Kehadiran Bar Chart & Jadwal Cuti Tim */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-6">Kehadiran tim minggu ini</h3>

          <div className="flex items-end justify-between gap-4 h-44 px-4 pb-2">
            {[
              { day: 'Sen', percent: '100%', h: 'h-36' },
              { day: 'Sel', percent: '100%', h: 'h-36' },
              { day: 'Rab', percent: '67%', h: 'h-24' },
              { day: 'Kam', percent: '100%', h: 'h-36' },
              { day: 'Jum', percent: '67%', h: 'h-24' },
            ].map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[11px] text-stone-500 font-medium">{bar.percent}</span>
                <div className={`w-full max-w-[56px] ${bar.h} bg-[#285a84] rounded-t-lg transition-all`} />
                <span className="text-xs font-semibold text-stone-700">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 mb-4">Jadwal cuti tim</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-stone-900">Dewi Lestari</div>
                  <div className="text-xs text-stone-500 mt-0.5">3 sampai 5 November</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#ebf3fb] text-[#285a84]">
                  Cuti tahunan
                </span>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-stone-900">Kevin Santoso</div>
                  <div className="text-xs text-stone-500 mt-0.5">20 sampai 21 Oktober</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#c44d27]">
                  Sakit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
