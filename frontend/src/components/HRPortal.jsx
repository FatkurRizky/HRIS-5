import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { AVATAR_COLORS } from '../lib/constants'
import { formatStatusLabel, getInitials } from '../lib/formatters'
import useAuthEnsure from '../lib/useAuthEnsure'
import useLiveClock from '../lib/useLiveClock'
import useToast from '../lib/useToast'
import useAttendance from '../lib/useAttendance'
import AddEmployeeModal from './hr/AddEmployeeModal'
import HRBerandaTab from './hr/HRBerandaTab'
import HRKaryawanTab from './hr/HRKaryawanTab'
import HRAbsensiTab from './hr/HRAbsensiTab'
import HRCutiTab from './hr/HRCutiTab'
import HRPayrollTab from './hr/HRPayrollTab'

const INITIAL_EMPLOYEES = [
  { id: 'emp-1', init: 'BP', name: 'Bima Pratama', email: 'bima@kerabat.id', role: 'Backend Developer', dept: 'Engineering', status: 'Tetap', bg: 'bg-[#0f3832]' },
  { id: 'emp-2', init: 'DL', name: 'Dewi Lestari', email: 'dewi@kerabat.id', role: 'UI Designer', dept: 'Engineering', status: 'Kontrak', bg: 'bg-[#285a84]' },
  { id: 'emp-3', init: 'KS', name: 'Kevin Santoso', email: 'kevin@kerabat.id', role: 'QA Engineer', dept: 'Engineering', status: 'Probation', bg: 'bg-[#c57b1b]' },
  { id: 'emp-4', init: 'AS', name: 'Agus Salim', email: 'agus@kerabat.id', role: 'Payroll Specialist', dept: 'HR', status: 'Tetap', bg: 'bg-[#7c3aed]' },
  { id: 'emp-5', init: 'MP', name: 'Maya Putri', email: 'maya@kerabat.id', role: 'Recruiter', dept: 'HR', status: 'Kontrak', bg: 'bg-[#d94826]' },
]

const NAV_ITEMS = [
  { id: 'beranda', icon: '⊞', label: 'Beranda' },
  { id: 'karyawan', icon: '👥', label: 'Karyawan' },
  { id: 'absensi', icon: '📍', label: 'Absensi' },
  { id: 'cuti', icon: '📅', label: 'Cuti' },
  { id: 'payroll', icon: '💳', label: 'Payroll' },
]

export default function HRPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('beranda')
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES)
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [hrLeaveQueue, setHrLeaveQueue] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { currentTime, currentDateStr } = useLiveClock()
  const { toast, showToast } = useToast()
  const ensureHrToken = useAuthEnsure(currentUser, 'hr@kerabat.id')

  const attendance = useAttendance({
    ensureToken: ensureHrToken,
    notify: showToast,
  })

  const fetchBackendEmployees = useCallback(async () => {
    try {
      await ensureHrToken()
      const [empRes, deptRes, posRes] = await Promise.allSettled([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/positions'),
      ])

      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value.data)) {
        setDepartments(deptRes.value.data)
      }
      if (posRes.status === 'fulfilled' && Array.isArray(posRes.value.data)) {
        setPositions(posRes.value.data)
      }

      if (
        empRes.status === 'fulfilled' &&
        Array.isArray(empRes.value.data) &&
        empRes.value.data.length > 0
      ) {
        const mappedFromDb = empRes.value.data.map((emp, idx) => ({
          id: emp.id,
          nik: emp.nik || '',
          init: getInitials(emp.user?.name),
          name: emp.user?.name || 'Karyawan',
          email: emp.user?.email || '',
          role:
            emp.position?.name ||
            (emp.user?.role === 'HR'
              ? 'HR Specialist'
              : emp.user?.role === 'MANAGER'
                ? 'Manager'
                : 'Staff'),
          dept: emp.department?.name || 'Engineering',
          status: formatStatusLabel(emp.status),
          bg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        }))

        const existingNames = new Set(
          mappedFromDb.map((e) => e.name.toLowerCase())
        )
        setEmployees([
          ...mappedFromDb,
          ...INITIAL_EMPLOYEES.filter(
            (e) => !existingNames.has(e.name.toLowerCase())
          ),
        ])
      }
    } catch (err) {
      console.warn('Menggunakan daftar karyawan lokal:', err)
    }
  }, [ensureHrToken])

  const fetchHrLeaveQueue = useCallback(async () => {
    try {
      await ensureHrToken()
      const res = await api.get('/leaves/approvals')
      setHrLeaveQueue(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.warn('Gagal memuat antrean cuti HR:', err)
    }
  }, [ensureHrToken])

  useEffect(() => {
    fetchBackendEmployees()
    fetchHrLeaveQueue()
  }, [fetchBackendEmployees, fetchHrLeaveQueue])

  const hrName = currentUser.name || 'Rina Kusuma'

  return (
    <div className="min-h-screen bg-[#f5f6f2] text-stone-900 font-sans antialiased flex">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'info'
                ? 'bg-stone-800'
                : 'bg-[#1b7a43]'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Modal Tambah Karyawan Baru */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        departments={departments}
        positions={positions}
        employeeCount={employees.length}
        ensureToken={ensureHrToken}
        onCreated={(added) => setEmployees((prev) => [added, ...prev])}
        showToast={showToast}
      />

      {/* LEFT SIDEBAR: Page 9-13 Standard (Dark Forest Green) */}
      <aside className="w-64 bg-[#0f3832] text-white min-h-screen p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-start gap-3 mb-8">
            <div className="w-4 h-7 rounded-full bg-[#eab04c] mt-1 shrink-0" />
            <h1 className="text-base font-extrabold leading-snug tracking-tight">
              Human
              <br />
              Resource
              <br />
              Information
              <br />
              System
            </h1>
          </div>

          <nav className="flex flex-col gap-1.5 text-xs">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition cursor-pointer flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#eab04c] text-[#0f3832] font-bold shadow-xs'
                      : 'text-stone-300 font-semibold hover:bg-white/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}

            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-3 rounded-xl font-semibold text-stone-300 hover:text-rose-300 transition cursor-pointer mt-2"
            >
              Keluar
            </button>
          </nav>
        </div>

        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[11px] text-stone-400">Masuk sebagai</p>
          <p className="text-xs font-bold text-white mt-0.5">{hrName} · HR</p>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 p-8 lg:p-10 max-w-6xl overflow-x-hidden">
        {activeTab === 'beranda' && (
          <HRBerandaTab
            hrName={hrName.split(' ')[0]}
            currentTime={currentTime}
            currentDateStr={currentDateStr}
            officeLocationName={attendance.officeLocation.name}
            employeesCount={employees.length}
            pendingQueueCount={hrLeaveQueue.length}
            onNavigateAbsensi={() => setActiveTab('absensi')}
          />
        )}

        {activeTab === 'karyawan' && (
          <HRKaryawanTab
            employees={employees}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        )}

        {activeTab === 'absensi' && (
          <HRAbsensiTab
            currentTime={currentTime}
            attendance={attendance}
            ensureToken={ensureHrToken}
          />
        )}

        {activeTab === 'cuti' && (
          <HRCutiTab
            hrLeaveQueue={hrLeaveQueue}
            ensureToken={ensureHrToken}
            onRefreshQueue={fetchHrLeaveQueue}
            showToast={showToast}
          />
        )}

        {activeTab === 'payroll' && (
          <HRPayrollTab ensureToken={ensureHrToken} showToast={showToast} />
        )}
      </main>
    </div>
  )
}
