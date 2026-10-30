import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import useAttendance from '../lib/useAttendance'
import AttendanceHistory from './AttendanceHistory'

const INITIAL_EMPLOYEES = [
  { id: 'emp-1', init: 'BP', name: 'Bima Pratama', email: 'bima@kerabat.id', role: 'Backend Developer', dept: 'Engineering', status: 'Tetap', bg: 'bg-[#0f3832]' },
  { id: 'emp-2', init: 'DL', name: 'Dewi Lestari', email: 'dewi@kerabat.id', role: 'UI Designer', dept: 'Engineering', status: 'Kontrak', bg: 'bg-[#285a84]' },
  { id: 'emp-3', init: 'KS', name: 'Kevin Santoso', email: 'kevin@kerabat.id', role: 'QA Engineer', dept: 'Engineering', status: 'Probation', bg: 'bg-[#c57b1b]' },
  { id: 'emp-4', init: 'AS', name: 'Agus Salim', email: 'agus@kerabat.id', role: 'Payroll Specialist', dept: 'HR', status: 'Tetap', bg: 'bg-[#7c3aed]' },
  { id: 'emp-5', init: 'MP', name: 'Maya Putri', email: 'maya@kerabat.id', role: 'Recruiter', dept: 'HR', status: 'Kontrak', bg: 'bg-[#d94826]' },
]

const AVATAR_COLORS = [
  'bg-[#0f3832]',
  'bg-[#285a84]',
  'bg-[#c57b1b]',
  'bg-[#7c3aed]',
  'bg-[#d94826]',
  'bg-[#1b7a43]',
]

function getInitials(name) {
  if (!name) return 'KR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatStatusLabel(status) {
  if (!status) return 'Probation'
  const upper = status.toUpperCase()
  if (upper === 'TETAP') return 'Tetap'
  if (upper === 'KONTRAK') return 'Kontrak'
  if (upper === 'PROBATION') return 'Probation'
  return status
}

function getStatusBadgeStyle(statusLabel) {
  if (statusLabel === 'Tetap') return 'bg-[#e8f7ee] text-[#1b7a43]'
  if (statusLabel === 'Kontrak') return 'bg-[#ebf3fb] text-[#285a84]'
  return 'bg-[#fef3eb] text-[#b86d1a]'
}

export default function HRPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('beranda') // 'beranda' | 'karyawan' | 'absensi' | 'cuti' | 'payroll'
  const [toast, setToast] = useState(null)
  const [currentTime, setCurrentTime] = useState('07:18:16')

  // Employees & Search State
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES)
  const [searchQuery, setSearchQuery] = useState('')
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])

  // Modal Tambah Karyawan State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [submittingEmployee, setSubmittingEmployee] = useState(false)
  const [addError, setAddError] = useState('')
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    password: 'kerabat123',
    nik: '',
    positionName: 'Frontend Developer',
    departmentName: 'Engineering',
    status: 'TETAP',
    role: 'EMPLOYEE',
    baseSalary: 10000000,
    allowance: 2000000,
  })

  // Absensi HR State (Page 11)

  // Cuti HR State (Page 12)
  const [leaveForm, setLeaveForm] = useState({
    type: 'Cuti tahunan',
    dateRange: '3 sampai 5 November 2026',
    reason: '',
  })
  const [myLeaves, setMyLeaves] = useState([
    { id: 1, type: 'Cuti tahunan', dates: '22 sampai 24 Okt', status: 'Disetujui' },
    { id: 2, type: 'Izin', dates: '9 Okt', status: 'Disetujui' },
  ])

  // Rekap absensi bulanan (data nyata dari backend)
  const nowDate = new Date()
  const [recapMonth, setRecapMonth] = useState(nowDate.getMonth() + 1)
  const [recapYear, setRecapYear] = useState(nowDate.getFullYear())
  const [recapRows, setRecapRows] = useState([])
  const [recapLoading, setRecapLoading] = useState(false)

  // Antrean persetujuan cuti Layer 2 (sudah disetujui Manager)
  const [hrLeaveQueue, setHrLeaveQueue] = useState([])
  const [processingLeaveId, setProcessingLeaveId] = useState(null)

  // Payroll State (Page 13)
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

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Real-time Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).replace(/\./g, ':')
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Ensure valid JWT token for HR actions
  const ensureHrToken = useCallback(async () => {
    const existing = localStorage.getItem('hris_token')
    if (existing) return existing
    try {
      const res = await api.post('/auth/login', {
        email: currentUser?.backendEmail || currentUser?.email || 'hr@kerabat.id',
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

  // Absensi pribadi HR: logika bersama dengan portal Karyawan
  const {
    attendances: myAttendances,
    todayAttendance,
    loading: clockLoading,
    simulatedDistance,
    setSimulatedDistance,
    isWithinGeofence,
    clockIn: handleHrClockIn,
    clockOut: handleHrClockOut,
    stats: myAttendanceStats,
  } = useAttendance({
    ensureToken: ensureHrToken,
    notify: (type, msg) => showToast(msg, type),
  })

  // Fetch Employees, Departments, Positions from Backend
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

      if (empRes.status === 'fulfilled' && Array.isArray(empRes.value.data) && empRes.value.data.length > 0) {
        const mappedFromDb = empRes.value.data.map((emp, idx) => ({
          id: emp.id,
          init: getInitials(emp.user?.name),
          name: emp.user?.name || 'Karyawan',
          email: emp.user?.email || '',
          role: emp.position?.name || (emp.user?.role === 'HR' ? 'HR Specialist' : emp.user?.role === 'MANAGER' ? 'Manager' : 'Staff'),
          dept: emp.department?.name || 'Engineering',
          status: formatStatusLabel(emp.status),
          bg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        }))

        // Merge with showcase employees avoiding duplicate emails/names
        const existingNames = new Set(mappedFromDb.map((e) => e.name.toLowerCase()))
        const combined = [
          ...mappedFromDb,
          ...INITIAL_EMPLOYEES.filter((e) => !existingNames.has(e.name.toLowerCase())),
        ]
        setEmployees(combined)
      }
    } catch (err) {
      console.warn('Menggunakan daftar karyawan lokal:', err)
    }
  }, [ensureHrToken])

  useEffect(() => {
    fetchBackendEmployees()
  }, [fetchBackendEmployees])

  const LATE_PENALTY = 100000 // harus sama dengan LATE_PENALTY_PER_DAY di backend

  const fetchAttendanceRecap = useCallback(async () => {
    setRecapLoading(true)
    try {
      await ensureHrToken()
      const res = await api.get('/attendance/recap', {
        params: { month: recapMonth, year: recapYear },
      })
      setRecapRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.warn('Gagal memuat rekap absensi:', err)
      setRecapRows([])
    } finally {
      setRecapLoading(false)
    }
  }, [ensureHrToken, recapMonth, recapYear])

  useEffect(() => {
    fetchAttendanceRecap()
  }, [fetchAttendanceRecap])

  const exportRecapCsv = () => {
    const header = ['Nama', 'Email', 'Departemen', 'Hadir', 'Telat', 'Alpa', 'Cuti/Izin', 'Lembur (jam)', 'Potongan Telat (Rp)']
    const lines = recapRows.map((r) => [
      r.name, r.email, r.department ?? '-', r.summary.present, r.summary.late,
      r.summary.alpha, r.summary.leave, r.summary.overtimeHours, r.summary.late * LATE_PENALTY,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rekap_absensi_${recapYear}-${String(recapMonth).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Ambil antrean persetujuan cuti Layer 2 dari backend
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
    fetchHrLeaveQueue()
  }, [fetchHrLeaveQueue])

  const handleHrLeaveAction = async (leave, action) => {
    setProcessingLeaveId(leave.id)
    try {
      await ensureHrToken()
      if (action === 'APPROVE') {
        await api.patch(`/leaves/${leave.id}/hr-approve`)
        showToast('Cuti disetujui final oleh HR')
      } else {
        await api.patch(`/leaves/${leave.id}/reject`, { reason: 'Ditolak oleh HR' })
        showToast('Pengajuan cuti ditolak')
      }
      await fetchHrLeaveQueue()
    } catch (err) {
      const msg = err?.response?.data?.message
      showToast(Array.isArray(msg) ? msg.join(', ') : msg || 'Gagal memproses pengajuan cuti', 'error')
    } finally {
      setProcessingLeaveId(null)
    }
  }

  // Handle Tambah Karyawan Submit
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault()
    setAddError('')

    if (!newEmp.name.trim()) {
      setAddError('Nama lengkap karyawan wajib diisi.')
      return
    }
    if (!newEmp.email.trim()) {
      setAddError('Email kerja wajib diisi.')
      return
    }
    if (!newEmp.password || newEmp.password.length < 6) {
      setAddError('Kata sandi minimal 6 karakter.')
      return
    }

    setSubmittingEmployee(true)

    try {
      await ensureHrToken()
      // Find matching departmentId & positionId if available in DB
      const matchedDept = departments.find(
        (d) => d.name.toLowerCase() === newEmp.departmentName.toLowerCase()
      )
      const matchedPos = positions.find(
        (p) => p.name.toLowerCase() === newEmp.positionName.toLowerCase()
      )

      const payload = {
        name: newEmp.name.trim(),
        email: newEmp.email.trim().toLowerCase(),
        password: newEmp.password,
        role: newEmp.role,
        status: newEmp.status,
        departmentName: newEmp.departmentName,
        positionName: newEmp.positionName.trim() || 'Staff',
        ...(newEmp.nik.trim() ? { nik: newEmp.nik.trim() } : {}),
        ...(matchedDept ? { departmentId: matchedDept.id } : {}),
        ...(matchedPos ? { positionId: matchedPos.id } : {}),
        baseSalary: Number(newEmp.baseSalary) || 10000000,
        allowance: Number(newEmp.allowance) || 2000000,
      }

      const res = await api.post('/employees', payload)
      const createdEmp = res.data

      const addedItem = {
        id: createdEmp?.id || `emp-${Date.now()}`,
        init: getInitials(newEmp.name),
        name: newEmp.name.trim(),
        email: newEmp.email.trim().toLowerCase(),
        role: newEmp.positionName.trim() || 'Staff',
        dept: newEmp.departmentName,
        status: formatStatusLabel(newEmp.status),
        bg: AVATAR_COLORS[employees.length % AVATAR_COLORS.length],
      }

      setEmployees((prev) => [addedItem, ...prev])
      setIsAddModalOpen(false)
      setNewEmp({
        name: '',
        email: '',
        password: 'kerabat123',
        nik: '',
        positionName: 'Frontend Developer',
        departmentName: 'Engineering',
        status: 'TETAP',
        role: 'EMPLOYEE',
        baseSalary: 10000000,
        allowance: 2000000,
      })
      showToast(`Karyawan ${addedItem.name} berhasil ditambahkan ke database!`)
    } catch (err) {
      const backendMsg = err.response?.data?.message
      // If backend is unreachable or offline demo mode, still add to UI state unless it's a validation conflict
      if (err.response && (err.response.status === 409 || err.response.status === 400)) {
        setAddError(Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg || 'Gagal menyimpan data karyawan.')
      } else {
        const fallbackItem = {
          id: `emp-${Date.now()}`,
          init: getInitials(newEmp.name),
          name: newEmp.name.trim(),
          email: newEmp.email.trim().toLowerCase(),
          role: newEmp.positionName.trim() || 'Staff',
          dept: newEmp.departmentName,
          status: formatStatusLabel(newEmp.status),
          bg: AVATAR_COLORS[employees.length % AVATAR_COLORS.length],
        }
        setEmployees((prev) => [fallbackItem, ...prev])
        setIsAddModalOpen(false)
        showToast(`Karyawan ${fallbackItem.name} berhasil ditambahkan!`)
      }
    } finally {
      setSubmittingEmployee(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.dept.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q))
    )
  })


  return (
    <div className="min-h-screen bg-[#f5f6f2] text-stone-900 font-sans antialiased flex">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-[#1b7a43]'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL TAMBAH KARYAWAN BARU */}
      {/* =================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#0f3832] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Tambah Karyawan Baru</h3>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Buat akun login dan profil kepegawaian secara langsung
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-300 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  ⚠️ {addError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Nama lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Raka Pratama"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">NIK / ID Karyawan</label>
                  <input
                    type="text"
                    placeholder="KRB-0148"
                    value={newEmp.nik}
                    onChange={(e) => setNewEmp({ ...newEmp, nik: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Email kerja *</label>
                  <input
                    type="email"
                    required
                    placeholder="raka@kerabat.id"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Password awal *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.password}
                    onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Jabatan / Posisi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Frontend Developer"
                    value={newEmp.positionName}
                    onChange={(e) => setNewEmp({ ...newEmp, positionName: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Departemen *</label>
                  <select
                    value={newEmp.departmentName}
                    onChange={(e) => setNewEmp({ ...newEmp, departmentName: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Finance">Finance</option>
                    <option value="Product">Product</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Status Kontrak</label>
                  <select
                    value={newEmp.status}
                    onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  >
                    <option value="TETAP">Tetap</option>
                    <option value="KONTRAK">Kontrak</option>
                    <option value="PROBATION">Probation</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Role Akses Sistem</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  >
                    <option value="EMPLOYEE">Employee (Karyawan)</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEmp.baseSalary}
                    onChange={(e) => setNewEmp({ ...newEmp, baseSalary: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Tunjangan Tetap (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEmp.allowance}
                    onChange={(e) => setNewEmp({ ...newEmp, allowance: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEmployee}
                  className="px-5 py-2.5 rounded-xl bg-[#0f3832] hover:bg-[#144941] text-white font-bold shadow-xs transition cursor-pointer"
                >
                  {submittingEmployee ? 'Menyimpan...' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR: Page 9-13 Standard (Dark Forest Green) */}
      <aside className="w-64 bg-[#0f3832] text-white min-h-screen p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & System Name */}
          <div className="flex items-start gap-3 mb-8">
            <div className="w-4 h-7 rounded-full bg-[#eab04c] mt-1 shrink-0" />
            <h1 className="text-base font-extrabold leading-snug tracking-tight">
              Human<br />Resource<br />Information<br />System
            </h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('beranda')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'beranda'
                  ? 'bg-[#eab04c] text-[#0f3832] shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>⊞</span>
              <span>Beranda</span>
            </button>

            <button
              onClick={() => setActiveTab('karyawan')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'karyawan'
                  ? 'bg-[#eab04c] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>👥</span>
              <span>Karyawan</span>
            </button>

            <button
              onClick={() => setActiveTab('absensi')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'absensi'
                  ? 'bg-[#eab04c] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>📍</span>
              <span>Absensi</span>
            </button>

            <button
              onClick={() => setActiveTab('cuti')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'cuti'
                  ? 'bg-[#eab04c] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>📅</span>
              <span>Cuti</span>
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition cursor-pointer flex items-center gap-3 ${
                activeTab === 'payroll'
                  ? 'bg-[#eab04c] text-[#0f3832] font-bold shadow-xs'
                  : 'text-stone-300 hover:bg-white/10'
              }`}
            >
              <span>💳</span>
              <span>Payroll</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-3 rounded-xl font-semibold text-stone-300 hover:text-rose-300 transition cursor-pointer mt-2"
            >
              Keluar
            </button>
          </nav>
        </div>

        {/* User Info Bottom */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
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
                <div className="text-4xl md:text-5xl font-black tracking-tight">{currentTime}</div>
                <button
                  onClick={() => setActiveTab('absensi')}
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
                  <div className="text-3xl font-extrabold mb-1">{137 + employees.length}</div>
                  <div className="text-xs text-stone-200">Karyawan aktif</div>
                </div>
                <div className="mt-3">
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[11px] font-semibold">
                    +{employees.length - 2} bulan ini
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
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-6">Kehadiran minggu ini</h3>
                <div className="flex items-end justify-between gap-4 h-44 px-4 pb-2">
                  {[
                    { day: 'Sen', percent: '96%', h: 'h-36', bg: 'bg-[#1e584f]' },
                    { day: 'Sel', percent: '93%', h: 'h-32', bg: 'bg-[#1e584f]' },
                    { day: 'Rab', percent: '97%', h: 'h-40', bg: 'bg-[#1e584f]' },
                    { day: 'Kam', percent: '91%', h: 'h-28', bg: 'bg-[#1e584f]' },
                    { day: 'Jum', percent: '92%', h: 'h-30', bg: 'bg-[#eab04c]' },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[11px] text-stone-500 font-medium">{bar.percent}</span>
                      <div className={`w-full max-w-[56px] ${bar.h} ${bar.bg} rounded-t-lg transition-all`} />
                      <span className="text-xs font-semibold text-stone-700">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>

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
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#fef3eb] text-[#b86d1a]">
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
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-4">Komposisi karyawan</h3>
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
                  <span className="text-2xl font-black text-stone-900">{137 + employees.length}</span>
                </div>
              </div>

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
                onClick={() => {
                  setAddError('')
                  setIsAddModalOpen(true)
                }}
                className="bg-[#0f3832] hover:bg-[#134941] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Tambah karyawan
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table (col-span-2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-100">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau departemen"
                    className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 outline-none focus:border-[#0f3832]"
                  />
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="text-stone-500 font-semibold text-[11px] border-b border-stone-100">
                    <tr>
                      <th className="py-3 px-4">Nama</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">Departemen</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredEmployees.map((row) => (
                      <tr key={row.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${row.bg} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                            {row.init}
                          </div>
                          <span className="font-bold text-stone-900">{row.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">{row.role}</td>
                        <td className="py-3.5 px-4 text-stone-600">{row.dept}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-stone-400">
                          Tidak ada karyawan yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Struktur Organisasi Tree */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">Struktur organisasi</h3>
                <div className="space-y-4 text-xs border-l border-stone-200 pl-4">
                  <div>
                    <div className="font-bold text-stone-900">Hendra Wijaya</div>
                    <div className="text-[11px] text-stone-500">Direktur Operasional</div>
                  </div>

                  <div className="pl-3 border-l border-stone-200 space-y-4">
                    <div>
                      <div className="font-bold text-stone-900">Sari Utami</div>
                      <div className="text-[11px] text-stone-500">Manager Engineering</div>
                      <div className="pl-3 mt-2 border-l border-stone-200 space-y-1.5 text-stone-700 text-[11px]">
                        {employees
                          .filter((e) => e.dept === 'Engineering')
                          .map((e) => (
                            <div key={e.id}>{e.name}</div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-stone-900">Rina Kusuma</div>
                      <div className="text-[11px] text-stone-500">Kepala HR</div>
                      <div className="pl-3 mt-2 border-l border-stone-200 space-y-1.5 text-stone-700 text-[11px]">
                        {employees
                          .filter((e) => e.dept !== 'Engineering')
                          .map((e) => (
                            <div key={e.id}>{e.name}</div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: ABSENSI (Page 11 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'absensi' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-stone-900">Absensi</h2>
              <p className="text-xs text-stone-500 mt-1">
                Clock in dan clock out hanya bisa dilakukan dalam radius kantor
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Card: Radar & Clock In/Out */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <div className="text-4xl font-black text-stone-900 tracking-tight mb-2">
                  {currentTime}
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs">
                  <span className="text-stone-600">
                    Jarak dari kantor: <strong className="text-stone-900">{simulatedDistance} m</strong>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      isWithinGeofence
                        ? 'bg-[#e8f7ee] text-[#1b7a43]'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isWithinGeofence ? 'Dalam radius' : 'Luar radius'}
                  </span>
                </div>

                {/* Grid Map Container */}
                <div className="bg-[#f3f5f0] border border-stone-200 rounded-2xl h-64 flex items-center justify-center relative mb-4 overflow-hidden">
                  <div className="w-48 h-48 rounded-full bg-[#d8e6de] flex flex-col items-center justify-center relative">
                    <div className="w-7 h-7 rounded-lg bg-[#0f3832] shadow-xs mb-1" />
                    <span className="text-[11px] font-semibold text-stone-700">Kantor Pusat</span>

                    {/* User Orange Dot */}
                    <div
                      className="absolute w-4 h-4 rounded-full bg-[#eab04c] border-2 border-white shadow-sm transition-all"
                      style={{
                        top: `${Math.max(15, Math.min(80, 48 - simulatedDistance * 0.4))}%`,
                        right: `${Math.max(15, Math.min(80, 38 - simulatedDistance * 0.3))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs font-bold text-stone-800 mb-2">
                  Geser untuk mensimulasikan posisi Anda
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={simulatedDistance}
                  onChange={(e) => setSimulatedDistance(Number(e.target.value))}
                  className="w-full accent-[#1d64d8] cursor-pointer mb-5"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleHrClockIn}
                    disabled={clockLoading || !!todayAttendance?.clockIn}
                    className={`py-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                      todayAttendance?.clockIn
                        ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                        : 'bg-[#0f3832] hover:bg-[#14473f] text-white'
                    }`}
                  >
                    {todayAttendance?.clockIn ? 'Sudah Clock in' : 'Clock in'}
                  </button>

                  <button
                    onClick={handleHrClockOut}
                    disabled={clockLoading || !todayAttendance?.clockIn || !!todayAttendance?.clockOut}
                    className="py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {todayAttendance?.clockOut ? 'Sudah Clock out' : 'Clock out'}
                  </button>
                </div>
              </div>

              {/* Right Card: Riwayat Absensi */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-4">Riwayat absensi</h3>
                  <AttendanceHistory records={myAttendances} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-stone-100 mt-4">
                  <div>
                    <div className="text-2xl font-black text-stone-900">{myAttendanceStats.workedHours} jam</div>
                    <div className="text-xs text-stone-500 mt-0.5">Total jam kerja bulan ini</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-stone-900">{myAttendanceStats.lateCount} kali</div>
                    <div className="text-xs text-stone-500 mt-0.5">Terlambat bulan ini</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rekap Absensi Bulanan (HR) */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs mt-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Rekap absensi bulanan</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Telat dipotong Rp100.000 per hari. Data diambil langsung dari absensi karyawan.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={recapMonth}
                    onChange={(e) => setRecapMonth(Number(e.target.value))}
                    className="bg-[#f4f3ef] border border-stone-200 rounded-lg px-3 py-2 outline-none"
                  >
                    {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={recapYear}
                    onChange={(e) => setRecapYear(Number(e.target.value))}
                    className="w-20 bg-[#f4f3ef] border border-stone-200 rounded-lg px-3 py-2 outline-none"
                  />
                  <button
                    onClick={exportRecapCsv}
                    disabled={recapRows.length === 0}
                    className="px-3 py-2 rounded-lg bg-[#0f3832] hover:bg-[#14473f] text-white font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Unduh CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-stone-500 border-b border-stone-200">
                      <th className="py-2 pr-3 font-semibold">Karyawan</th>
                      <th className="py-2 px-2 font-semibold text-center">Hadir</th>
                      <th className="py-2 px-2 font-semibold text-center">Telat</th>
                      <th className="py-2 px-2 font-semibold text-center">Alpa</th>
                      <th className="py-2 px-2 font-semibold text-center">Cuti/Izin</th>
                      <th className="py-2 px-2 font-semibold text-center">Lembur (jam)</th>
                      <th className="py-2 pl-2 font-semibold text-right">Potongan telat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapLoading ? (
                      <tr><td colSpan="7" className="py-4 text-stone-400">Memuat rekap...</td></tr>
                    ) : recapRows.length === 0 ? (
                      <tr><td colSpan="7" className="py-4 text-stone-400">Belum ada data absensi pada periode ini.</td></tr>
                    ) : (
                      recapRows.map((r) => (
                        <tr key={r.employeeId} className="border-b border-stone-100">
                          <td className="py-2.5 pr-3">
                            <div className="font-bold text-stone-900">{r.name}</div>
                            <div className="text-stone-500">{r.department ?? '-'}</div>
                          </td>
                          <td className="py-2.5 px-2 text-center">{r.summary.present}</td>
                          <td className="py-2.5 px-2 text-center text-[#b86d1a] font-semibold">{r.summary.late}</td>
                          <td className="py-2.5 px-2 text-center text-[#c44d27] font-semibold">{r.summary.alpha}</td>
                          <td className="py-2.5 px-2 text-center">{r.summary.leave}</td>
                          <td className="py-2.5 px-2 text-center">{r.summary.overtimeHours}</td>
                          <td className="py-2.5 pl-2 text-right font-semibold">
                            Rp {(r.summary.late * LATE_PENALTY).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CUTI DAN IZIN (Page 12 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'cuti' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-stone-900">Cuti dan izin</h2>
              <p className="text-xs text-stone-500 mt-1">
                Persetujuan berjenjang: Manager, lalu HR
              </p>
            </div>

            {/* Antrean Persetujuan HR (Layer 2) */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs mb-6">
              <h3 className="text-sm font-bold text-stone-900 mb-1">Antrean persetujuan HR (Layer 2)</h3>
              <p className="text-xs text-stone-500 mb-4">
                Hanya pengajuan yang sudah disetujui Manager yang muncul di sini.
              </p>
              {hrLeaveQueue.length === 0 ? (
                <div className="text-xs text-stone-400 py-2">Tidak ada pengajuan yang menunggu persetujuan HR.</div>
              ) : (
                <div className="space-y-3">
                  {hrLeaveQueue.map((lv) => (
                    <div
                      key={lv.id}
                      className="flex items-center justify-between gap-4 border border-stone-100 rounded-xl px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-stone-900">
                          {lv.employee?.user?.name || 'Karyawan'}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {lv.type === 'CUTI' ? 'Cuti tahunan' : lv.type === 'SAKIT' ? 'Sakit' : 'Izin'},{' '}
                          {lv.workDays} hari kerja ({(lv.startDate || '').slice(0, 10)} s/d {(lv.endDate || '').slice(0, 10)})
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#ebf3fb] text-[#285a84]">
                          Disetujui Manager
                        </span>
                        <button
                          disabled={processingLeaveId === lv.id}
                          onClick={() => handleHrLeaveAction(lv, 'REJECT')}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          disabled={processingLeaveId === lv.id}
                          onClick={() => handleHrLeaveAction(lv, 'APPROVE')}
                          className="px-3 py-1.5 rounded-lg bg-[#0f3832] hover:bg-[#14473f] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          Setujui final
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Card: Ajukan Cuti */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">Ajukan cuti</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setMyLeaves((prev) => [
                      {
                        id: Date.now(),
                        type: leaveForm.type,
                        dates: leaveForm.dateRange || '3 sampai 5 Nov',
                        status: 'Disetujui',
                      },
                      ...prev,
                    ])
                    setLeaveForm({ ...leaveForm, reason: '' })
                    showToast('Pengajuan cuti berhasil dikirim!')
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="font-bold text-stone-700 block mb-1.5">Jenis</label>
                    <select
                      value={leaveForm.type}
                      onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                      className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none"
                    >
                      <option value="Cuti tahunan">Cuti tahunan</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Izin">Izin</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1.5">Tanggal</label>
                    <input
                      type="text"
                      value={leaveForm.dateRange}
                      onChange={(e) => setLeaveForm({ ...leaveForm, dateRange: e.target.value })}
                      className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1.5">Alasan</label>
                    <textarea
                      rows="3"
                      placeholder="Tulis alasan singkat"
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#0f3832] hover:bg-[#14473f] text-white font-bold text-xs transition cursor-pointer"
                  >
                    Kirim pengajuan
                  </button>
                </form>
              </div>

              {/* Right Card: Pengajuan Saya */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-5">Pengajuan saya</h3>
                <div className="space-y-6">
                  {myLeaves.map((lv, idx) => (
                    <div key={lv.id} className={idx > 0 ? 'pt-5 border-t border-stone-100' : ''}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-bold text-stone-900">{lv.type}</div>
                          <div className="text-xs text-stone-500 mt-0.5">{lv.dates}</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#e8f7ee] text-[#1b7a43]">
                          {lv.status}
                        </span>
                      </div>

                      <div className="relative flex items-center justify-between px-6 pt-2">
                        <div className="absolute left-8 right-8 top-[14px] h-[2px] bg-[#1b7a43] z-0" />
                        {['Diajukan', 'Manager', 'HR'].map((step) => (
                          <div key={step} className="flex flex-col items-center relative z-10">
                            <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                            <span className="text-[11px] font-bold text-stone-800 mt-2">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: PAYROLL (Page 13 desain_UI.pdf) */}
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

      </main>
    </div>
  )
}
