import { useState } from 'react'

export default function ManagerPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('ringkasan') // 'ringkasan' | 'persetujuan' | 'tim'
  const [approvalList, setApprovalList] = useState([
    {
      id: '1',
      initials: 'KS',
      avatarBg: 'bg-[#b86d1a]',
      name: 'Kevin Santoso',
      desc: 'Sakit, 2 hari (20 sampai 21 Okt)',
      status: 'PENDING',
    },
    {
      id: '2',
      initials: 'DL',
      avatarBg: 'bg-[#2b6cb0]',
      name: 'Dewi Lestari',
      desc: 'Cuti tahunan, 3 hari (3 sampai 5 Nov)',
      status: 'PENDING',
    },
    {
      id: '3',
      initials: 'BP',
      avatarBg: 'bg-[#1a365d]',
      name: 'Bima Pratama',
      desc: 'Izin, 1 hari (28 Okt)',
      status: 'PENDING',
    },
  ])

  const [toast, setToast] = useState(null)
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = (id, action) => {
    setApprovalList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    )
    showToast(`Pengajuan ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'} tahap Manager`)
  }

  const pendingCount = approvalList.filter((a) => a.status === 'PENDING').length

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-stone-900 font-sans antialiased flex">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#1b7a43] text-white text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}

      {/* LEFT SIDEBAR: Page 6-8 Standard */}
      <aside className="w-64 bg-white border-r border-stone-200 min-h-screen p-6 flex flex-col justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#285a84] tracking-tight mb-0.5">Kerabat</h1>
          <p className="text-xs text-stone-500 font-medium mb-8">
            {currentUser.name || 'Sari Utami'} · Manager
          </p>

          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('ringkasan')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'ringkasan'
                  ? 'bg-[#285a84] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              Ringkasan
            </button>

            <button
              onClick={() => setActiveTab('persetujuan')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'persetujuan'
                  ? 'bg-[#285a84] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>Persetujuan</span>
              {pendingCount > 0 && (
                <span className="bg-[#e53e3e] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tim')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'tim'
                  ? 'bg-[#285a84] text-white shadow-xs'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              Tim saya
            </button>
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="text-left text-sm font-semibold text-stone-600 hover:text-rose-600 transition pt-6 border-t border-stone-100 cursor-pointer"
        >
          Keluar
        </button>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 p-8 lg:p-10 max-w-6xl">
        
        {/* =================================================================== */}
        {/* TAB 1: RINGKASAN (Page 6 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'ringkasan' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900">Tim Engineering</h2>
              <span className="text-xs font-medium text-stone-500">Selasa, 20 Oktober 2026</span>
            </div>

            {/* 4 Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#285a84] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold mb-1">3</div>
                  <div className="text-xs text-blue-100 font-medium">Anggota tim</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-stone-900 mb-1">2</div>
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
              {/* Bar Chart (col-span-2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-6">Kehadiran tim minggu ini</h3>
                
                <div className="flex items-end justify-between gap-4 h-44 px-4 pb-2">
                  {[
                    { day: 'Sen', percent: '100%', h: 'h-36' },
                    { day: 'Sel', percent: '100%', h: 'h-36' },
                    { day: 'Rab', percent: '67%', h: 'h-24' },
                    { day: 'Kam', percent: '100%', h: 'h-36' },
                    { day: 'Jum', percent: '67%', h: 'h-24' },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[11px] text-stone-500 font-medium">{bar.percent}</span>
                      <div className={`w-full max-w-[56px] ${bar.h} bg-[#285a84] rounded-t-lg transition-all`} />
                      <span className="text-xs font-semibold text-stone-700">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jadwal Cuti Tim */}
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
        )}

        {/* =================================================================== */}
        {/* TAB 2: PERSETUJUAN (Page 7 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'persetujuan' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Persetujuan</h2>
                <p className="text-xs text-stone-500 mt-1">Keputusan Anda diteruskan ke HR sebagai tahap akhir</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100">
              {approvalList.map((item) => (
                <div key={item.id} className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-full ${item.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-xs`}>
                      {item.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{item.name}</h4>
                      <p className="text-xs text-stone-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleAction(item.id, 'REJECTED')}
                          className="px-4 py-1.5 rounded-lg border border-[#e53e3e] text-[#e53e3e] hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'APPROVED')}
                          className="px-4 py-1.5 rounded-lg bg-[#1b7a43] hover:bg-[#156034] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Setujui
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'APPROVED' ? 'bg-[#e8f7ee] text-[#1b7a43]' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: TIM SAYA (Page 8 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'tim' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Tim saya</h2>
                <p className="text-xs text-stone-500 mt-1">Sari Utami · Manager Engineering</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-5">Nama</th>
                    <th className="py-3.5 px-4">Jabatan</th>
                    <th className="py-3.5 px-4">Hari ini</th>
                    <th className="py-3.5 px-4">Terlambat</th>
                    <th className="py-3.5 px-4">Lembur</th>
                    <th className="py-3.5 px-5">Sisa cuti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a365d] text-white font-bold flex items-center justify-center text-xs">
                        BP
                      </div>
                      <span className="font-bold text-stone-900">Bima Pratama</span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">Backend Developer</td>
                    <td className="py-3.5 px-4 text-stone-800 font-semibold">Hadir 08:02</td>
                    <td className="py-3.5 px-4 text-stone-600">1x</td>
                    <td className="py-3.5 px-4 text-stone-600">3 jam</td>
                    <td className="py-3.5 px-5 text-stone-900 font-bold">12 hari</td>
                  </tr>

                  <tr className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2b6cb0] text-white font-bold flex items-center justify-center text-xs">
                        DL
                      </div>
                      <span className="font-bold text-stone-900">Dewi Lestari</span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">UI Designer</td>
                    <td className="py-3.5 px-4 text-stone-800 font-semibold">Hadir 07:58</td>
                    <td className="py-3.5 px-4 text-stone-600">0x</td>
                    <td className="py-3.5 px-4 text-stone-600">0 jam</td>
                    <td className="py-3.5 px-5 text-stone-900 font-bold">10 hari</td>
                  </tr>

                  <tr className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#b86d1a] text-white font-bold flex items-center justify-center text-xs">
                        KS
                      </div>
                      <span className="font-bold text-stone-900">Kevin Santoso</span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">QA Engineer</td>
                    <td className="py-3.5 px-4 text-[#c44d27] font-semibold">Sakit</td>
                    <td className="py-3.5 px-4 text-stone-600">2x</td>
                    <td className="py-3.5 px-4 text-stone-600">5 jam</td>
                    <td className="py-3.5 px-5 text-stone-900 font-bold">8 hari</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
