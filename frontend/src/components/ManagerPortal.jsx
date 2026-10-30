import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { getInitials } from '../lib/formatters'
import useAuthEnsure from '../lib/useAuthEnsure'
import useToast from '../lib/useToast'
import ManagerRingkasanTab from './manager/ManagerRingkasanTab'
import ManagerPersetujuanTab from './manager/ManagerPersetujuanTab'
import ManagerTimTab from './manager/ManagerTimTab'

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

const INITIAL_TEAM = [
  { id: 'tm-1', initials: 'BP', bg: 'bg-[#1a365d]', name: 'Bima Pratama', role: 'Backend Developer', today: 'Hadir 08:02', late: '1x', overtime: '3 jam', leaveQuota: 12 },
  { id: 'tm-2', initials: 'DL', bg: 'bg-[#2b6cb0]', name: 'Dewi Lestari', role: 'UI Designer', today: 'Hadir 07:58', late: '0x', overtime: '0 jam', leaveQuota: 10 },
  { id: 'tm-3', initials: 'KS', bg: 'bg-[#b86d1a]', name: 'Kevin Santoso', role: 'QA Engineer', today: 'Sakit', late: '2x', overtime: '5 jam', leaveQuota: 8 },
]

export default function ManagerPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('ringkasan')
  const [approvalList, setApprovalList] = useState(INITIAL_APPROVALS)
  const [teamList, setTeamList] = useState(INITIAL_TEAM)
  const { toast, showToast } = useToast()

  const ensureManagerToken = useAuthEnsure(currentUser, 'manager@kerabat.id')

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
    showToast(
      'success',
      `Pengajuan ${item.name} ${action === 'APPROVED' ? 'Disetujui' : 'Ditolak'} tahap Manager`
    )
  }

  const pendingCount = approvalList.filter((a) => a.status === 'PENDING').length
  const managerName = currentUser?.name || 'Sari Utami'

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-stone-900 font-sans antialiased flex">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#1b7a43] text-white text-sm font-semibold shadow-lg">
          {toast.message}
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

      <main className="flex-1 p-8 lg:p-10 max-w-6xl">
        {activeTab === 'ringkasan' && (
          <ManagerRingkasanTab
            pendingCount={pendingCount}
            teamCount={teamList.length}
            onLogout={onLogout}
          />
        )}

        {activeTab === 'persetujuan' && (
          <ManagerPersetujuanTab
            approvalList={approvalList}
            onAction={handleAction}
            onLogout={onLogout}
          />
        )}

        {activeTab === 'tim' && (
          <ManagerTimTab
            managerName={managerName}
            teamList={teamList}
            onLogout={onLogout}
          />
        )}
      </main>
    </div>
  )
}
