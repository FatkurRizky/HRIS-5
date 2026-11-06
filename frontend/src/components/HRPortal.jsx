import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import {
  INITIAL_EMPLOYEES,
  isLocalEmployeeId,
  mapApiEmployeeToView,
} from '../lib/employeeUtils'
import useAuthEnsure from '../lib/useAuthEnsure'
import useLiveClock from '../lib/useLiveClock'
import useToast from '../lib/useToast'
import AddEmployeeModal from './hr/AddEmployeeModal'
import HRBerandaTab from './hr/HRBerandaTab'
import HRKaryawanTab from './hr/HRKaryawanTab'
import HRAbsensiTab from './hr/HRAbsensiTab'
import HRCutiTab from './hr/HRCutiTab'
import HRPayrollTab from './hr/HRPayrollTab'
import {
  IconDashboard,
  IconUsers,
  IconMapPin,
  IconCalendar,
  IconCreditCard,
} from './shared/Icons'

const NAV_ITEMS = [
  { id: 'beranda', Icon: IconDashboard, label: 'Beranda' },
  { id: 'karyawan', Icon: IconUsers, label: 'Karyawan' },
  { id: 'absensi', Icon: IconMapPin, label: 'Rekap Absensi' },
  { id: 'cuti', Icon: IconCalendar, label: 'Cuti' },
  { id: 'payroll', Icon: IconCreditCard, label: 'Payroll' },
]

export default function HRPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('beranda')
  const localShowcaseRef = useRef(INITIAL_EMPLOYEES)
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES)
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [hrLeaveQueue, setHrLeaveQueue] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)

  const { currentTime, currentDateStr } = useLiveClock()
  const { toast, showToast } = useToast()
  const ensureHrToken = useAuthEnsure(currentUser, 'hr@kerabat.id')

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

      if (empRes.status === 'fulfilled' && Array.isArray(empRes.value.data)) {
        const mappedFromDb = empRes.value.data.map((emp, idx) =>
          mapApiEmployeeToView(emp, idx)
        )
        const existingNames = new Set(
          mappedFromDb.map((e) => e.name.toLowerCase())
        )
        setEmployees([
          ...mappedFromDb,
          ...localShowcaseRef.current.filter(
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

      {/* Modal Tambah / Edit Karyawan */}
      <AddEmployeeModal
        isOpen={isAddModalOpen || Boolean(editingEmployee)}
        mode={editingEmployee ? 'edit' : 'create'}
        initialData={editingEmployee}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingEmployee(null)
        }}
        departments={departments}
        positions={positions}
        employees={employees}
        employeeCount={employees.length}
        ensureToken={ensureHrToken}
        onCreated={(added) => {
          if (isLocalEmployeeId(added.id)) {
            localShowcaseRef.current = [added, ...localShowcaseRef.current]
          }
          setEmployees((prev) => [added, ...prev])
          fetchBackendEmployees()
        }}
        onUpdated={(updated) => {
          if (isLocalEmployeeId(updated.id)) {
            localShowcaseRef.current = localShowcaseRef.current.map((item) =>
              item.id === updated.id ? updated : item
            )
          }
          setEmployees((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          )
          if (!isLocalEmployeeId(updated.id)) {
            fetchBackendEmployees()
          }
        }}
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
              const NavIcon = item.Icon
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
                  <NavIcon className="w-4 h-4 shrink-0" />
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
            employeesCount={employees.length}
            pendingQueueCount={hrLeaveQueue.length}
          />
        )}

        {activeTab === 'karyawan' && (
          <HRKaryawanTab
            employees={employees}
            departments={departments}
            positions={positions}
            ensureToken={ensureHrToken}
            onOpenAddModal={() => {
              setEditingEmployee(null)
              setIsAddModalOpen(true)
            }}
            onEditEmployee={(emp) => setEditingEmployee(emp)}
            onDeleteEmployee={(deletedId) => {
              localShowcaseRef.current = localShowcaseRef.current.filter(
                (e) => e.id !== deletedId
              )
              setEmployees((prev) => prev.filter((e) => e.id !== deletedId))
            }}
            onAssignManager={(empId, managerId, managerName) => {
              localShowcaseRef.current = localShowcaseRef.current.map((e) =>
                e.id === empId ? { ...e, managerId, managerName } : e
              )
              setEmployees((prev) =>
                prev.map((e) =>
                  e.id === empId ? { ...e, managerId, managerName } : e
                )
              )
            }}
            onRefreshMaster={fetchBackendEmployees}
            showToast={showToast}
          />
        )}

        {activeTab === 'absensi' && (
          <HRAbsensiTab ensureToken={ensureHrToken} />
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
          <HRPayrollTab
            ensureToken={ensureHrToken}
            onRefreshEmployees={fetchBackendEmployees}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  )
}
