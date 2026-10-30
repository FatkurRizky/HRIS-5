import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const INITIAL_APPROVALS = [
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
]

function getInitials(name) {
  if (!name) return 'KR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const INITIAL_TEAM = [
  { id: 'tm-1', initials: 'BP', bg: 'bg-[#1a365d]', name: 'Bima Pratama', role: 'Backend Developer', today: 'Hadir 08:02', late: '1x', overtime: '3 jam', leaveQuota: 12 },
  { id: 'tm-2', initials: 'DL', bg: 'bg-[#2b6cb0]', name: 'Dewi Lestari', role: 'UI Designer', today: 'Hadir 07:58', late: '0x', overtime: '0 jam', leaveQuota: 10 },
  { id: 'tm-3', initials: 'KS', bg: 'bg-[#b86d1a]', name: 'Kevin Santoso', role: 'QA Engineer', today: 'Sakit', late: '2x', overtime: '5 jam', leaveQuota: 8 },
]

export default function ManagerPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('ringkasan') // 'ringkasan' | 'persetujuan' | 'tim'
  const [approvalList, setApprovalList] = useState(INITIAL_APPROVALS)
  const [teamList, setTeamList] = useState(INITIAL_TEAM)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const ensureManagerToken = useCallback(async () => {
    const existing = localStorage.getItem('hris_token')
    if (existing) return existing
    try {
      const res = await api.post('/auth/login', {
        email: currentUser?.backendEmail || currentUser?.email || 'manager@kerabat.id',
        password: 'kerabat123',
      })
      const token = res.data?.accessToken ?? res.data?.token
      if (token) {
        localStorage.setItem('hris_token', token)
        return token
      }
    } catch {
      // Ignore if offline
    }
    return null
  }, [currentUser])

  const fetchApprovals = useCallback(async () => {
    try {
      await ensureManagerToken()
      const [appRes, empRes] = await Promise.allSettled([
        api.get('/leaves/approvals'),
        api.get('/employees'),
      ])

      if (appRes.status === 'fulfilled' && Array.isArray(appRes.value.data) && appRes.value.data.length > 0) {
        const mapped = appRes.value.data.map((lv) => ({
          id: lv.id,
          initials: getInitials(lv.employee?.user?.name),
          avatarBg: 'bg-[#285a84]',
          name: lv.employee?.user?.name || 'Karyawan',
          desc: `${lv.type === 'CUTI' ? 'Cuti tahunan' : lv.type === 'SAKIT' ? 'Sakit' : 'Izin'}, ${lv.workDays || 1} hari`,
          status: lv.status === 'PENDING' ? 'PENDING' : 'APPROVED',
          fromBackend: true,
        }))
        setApprovalList([...mapped, ...INITIAL_APPROVALS])
      }

      if (empRes.status === 'fulfilled' && Array.isArray(empRes.value.data) && empRes.value.data.length > 0) {
        const dbMembers = empRes.value.data
          .filter((e) => e.user?.role === 'EMPLOYEE')
          .map((e) => ({
            id: e.id,
            initials: getInitials(e.user?.name),
            bg: 'bg-[#285a84]',
            name: e.user?.name || 'Karyawan',
            role: e.position?.name || 'Staff Engineer',
            today: 'Hadir 08:00',
            late: '0x',
            overtime: '0 jam',
            leaveQuota: e.leaveQuota ?? 12,
          }))
        const existingNames = new Set(dbMembers.map((m) => m.name.toLowerCase()))
        setTeamList([
          ...dbMembers,
          ...INITIAL_TEAM.filter((m) => !existingNames.has(m.name.toLowerCase())),
        ])
      }
    } catch {
      // Fallback to initial showcase list
    }
  }, [ensureManagerToken])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  const handleAction = async (item, action) => {
    if (item.fromBackend) {
      try {
        if (action === 'APPROVED') {
          await api.patch(`/leaves/${item.id}/manager-approve`)
        } else {
          await api.patch(`/leaves/${item.id}/reject`, {
            rejectionReason: 'Ditolak oleh Manager',
          })
        }
      } catch (e) {
        console.warn('Fallback update state lokal:', e)
      }
    }

    setApprovalList((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status: action } : row))
    )
    showToast(`Pengajuan ${item.name} ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'} tahap Manager`)
  }

  const pendingCount = approvalList.filter((a) => a.status === 'PENDING').length
  const managerName = currentUser?.name || 'Sari Utami'

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-stone-900 font-sans antialiased flex">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#1b7a43] text-white text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}

      {/* LEFT SIDEBAR: Page 6-8 Standard */}
      <aside className="w-64 bg-white border-r border-stone-200 h-screen sticky top-0 p-6 flex flex-col justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#285a84] tracking-tight mb-0.5">Kerabat</h1>
          <p className="text-xs text-stone-500 font-medium mb-8">
            {managerName} · Manager
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

            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer mt-2"
            >
              Keluar
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-stone-400">Masuk sebagai</p>
            <p className="text-xs font-bold text-stone-800">{managerName}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold text-stone-600 hover:text-rose-600 transition cursor-pointer"
          >
            Keluar
          </button>
        </div>
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
              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold text-stone-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
              >
                Keluar
              </button>
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
                          onClick={() => handleAction(item, 'REJECTED')}
                          className="px-4 py-1.5 rounded-lg border border-[#e53e3e] text-[#e53e3e] hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleAction(item, 'APPROVED')}
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
                <p className="text-xs text-stone-500 mt-1">{managerName} · Manager Engineering</p>
              </div>
              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold text-stone-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
              >
                Keluar
              </button>
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
                  {teamList.map((member) => (
                    <tr key={member.id} className="hover:bg-stone-50/50 transition">
                      <td className="py-3.5 px-5 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${member.bg} text-white font-bold flex items-center justify-center text-xs`}>
                          {member.initials}
                        </div>
                        <span className="font-bold text-stone-900">{member.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">{member.role}</td>
                      <td className={`py-3.5 px-4 font-semibold ${member.today === 'Sakit' ? 'text-[#c44d27]' : 'text-stone-800'}`}>
                        {member.today}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">{member.late}</td>
                      <td className="py-3.5 px-4 text-stone-600">{member.overtime}</td>
                      <td className="py-3.5 px-5 text-stone-900 font-bold">{member.leaveQuota} hari</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
