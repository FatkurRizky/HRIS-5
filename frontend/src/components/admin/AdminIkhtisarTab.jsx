/**
 * Tab 1 Portal SuperAdmin: Ikhtisar metrik sistem, log aktivitas, & distribusi peran (Page 14 desain_UI.pdf).
 */
export default function AdminIkhtisarTab({ totalUsersCount }) {
  const displayTotal = Math.max(146, totalUsersCount || 0)

  return (
    <div className="flex flex-col gap-6">
      {/* 4 Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#a78bfa] text-[#1e1b4b] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-3xl font-black mb-1">{displayTotal}</div>
            <div className="text-xs font-bold text-[#1e1b4b]/80">Pengguna terdaftar</div>
          </div>
          <div className="mt-3">
            <span className="bg-white/30 text-[#1e1b4b] px-2 py-0.5 rounded-md text-[11px] font-extrabold">
              +3 bulan ini
            </span>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-3xl font-black text-white mb-1">118</div>
            <div className="text-xs text-stone-400 font-medium">Sesi aktif</div>
          </div>
          <div className="mt-3">
            <span className="bg-blue-950/60 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
              Puncak 09:00
            </span>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-3xl font-black text-white mb-1">7</div>
            <div className="text-xs text-stone-400 font-medium">Login gagal 24 jam</div>
          </div>
          <div className="mt-3">
            <span className="bg-amber-950/60 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
              2 dari IP asing
            </span>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-3xl font-black text-white mb-1">99,98%</div>
            <div className="text-xs text-stone-400 font-medium">Uptime 30 hari</div>
          </div>
          <div className="mt-3">
            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
              Normal
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Log Aktivitas & Distribusi Peran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-5">Log aktivitas</h3>
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">09:12 rina@kerabat.id</span>
              <span className="text-stone-300">Menyetujui payroll tahap HR</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">08:55 bima@kerabat.id</span>
              <span className="text-stone-300">Clock in, dalam radius 200m Kampus 2 UNP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">08:41 sari@kerabat.id</span>
              <span className="text-stone-300">Menyetujui cuti Dewi Lestari</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">08:02 sistem</span>
              <span className="text-stone-300">Backup harian selesai</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">07:30 unknown</span>
              <span className="text-rose-400">Login gagal, IP 103.xx.xx.12</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-6">Distribusi peran</h3>
          <div className="space-y-5 text-xs">
            {[
              { role: 'Employee', count: 131, width: 'w-[88%]' },
              { role: 'Manager', count: 9, width: 'w-[15%]' },
              { role: 'HR', count: 4, width: 'w-[8%]' },
              { role: 'SuperAdmin', count: 2, width: 'w-[4%]' },
            ].map((item) => (
              <div key={item.role}>
                <div className="flex justify-between mb-1 text-stone-300">
                  <span>{item.role}</span>
                  <span className="font-bold">{item.count}</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className={`bg-[#a78bfa] h-full ${item.width}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
