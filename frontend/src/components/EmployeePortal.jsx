import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import useAttendance from '../lib/useAttendance'
import AttendanceHistory from './AttendanceHistory'
import TrainCalendarPicker, { formatKaiDate, calculateLeaveDays } from './TrainCalendarPicker'

function formatRupiah(amount) {
  if (amount === null || amount === undefined) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace('.', ':')
}

export default function EmployeePortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('absen') // 'absen' | 'cuti' | 'slip-gaji'
  const [currentTime, setCurrentTime] = useState('07:18:13')
  const [currentDateStr, setCurrentDateStr] = useState('Selasa, 20 Oktober 2026')

  // Data State
  const [employeeProfile, setEmployeeProfile] = useState(null)

  const [isUsingRealGps, setIsUsingRealGps] = useState(false)

  // Cuti & Payroll State
  const [leavesData, setLeavesData] = useState({ leaveQuota: 8, requests: [] })
  const [localSubmittedLeaves, setLocalSubmittedLeaves] = useState([])
  const [leaveForm, setLeaveForm] = useState({
    type: 'CUTI',
    startDate: '',
    endDate: '',
    reason: '',
  })
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [payrollRecords, setPayrollRecords] = useState([])
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).replace(/\./g, ':')
      )
      setCurrentDateStr(
        new Intl.DateTimeFormat('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now)
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch Data
  const ensureToken = useCallback(async () => {
    const existing = localStorage.getItem('hris_token')
    if (existing) return existing
    try {
      const emailToUse = currentUser?.backendEmail || currentUser?.email || 'employee@kerabat.id'
      const res = await api.post('/auth/login', {
        email: emailToUse,
        password: 'kerabat123',
      })
      const token = res.data?.accessToken ?? res.data?.token
      if (token) {
        localStorage.setItem('hris_token', token)
        return token
      }
    } catch {
      // Ignore if backend offline
    }
    return null
  }, [currentUser])

  const fetchData = useCallback(async () => {
    await ensureToken()

    try {
      const profRes = await api.get('/employees/me')
      setEmployeeProfile(profRes.data)
    } catch {
      setEmployeeProfile({
        user: { name: currentUser.name || 'Bima Pratama', email: currentUser.email },
        position: { name: 'Backend Developer', baseSalary: 12000000 },
        leaveQuota: 8,
      })
    }

    try {
      const leaveRes = await api.get('/leaves/my')
      setLeavesData(leaveRes.data || { leaveQuota: 8, requests: [] })
    } catch (e) {
      console.warn('Gagal memuat cuti:', e)
    }

    try {
      const payRes = await api.get('/payroll/my')
      setPayrollRecords(payRes.data || [])
    } catch (e) {
      console.warn('Gagal memuat payroll:', e)
    }
  }, [currentUser, ensureToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Absensi: logika bersama (sama dengan portal HR)
  const {
    officeLocation,
    attendances,
    todayAttendance,
    loading: clockActionLoading,
    simulatedDistance,
    setSimulatedDistance,
    isWithinGeofence,
    clockIn: handleClockIn,
    clockOut: handleClockOut,
    resetToday: handleResetToday,
    stats: attendanceStats,
  } = useAttendance({ ensureToken, notify: showToast })

  // Submit Leave
  const handleSubmitLeave = async (e) => {
    e.preventDefault()
    if (!leaveForm.startDate || !leaveForm.endDate) {
      showToast('error', 'Mohon pilih tanggal mulai dan selesai cuti pada kalender.')
      return
    }
    const { workDays } = calculateLeaveDays(leaveForm.startDate, leaveForm.endDate)
    if (workDays <= 0) {
      showToast('error', 'Rentang tanggal yang dipilih hanya berisi akhir pekan (Sabtu/Minggu). Pilih minimal 1 hari kerja.')
      return
    }

    setSubmittingLeave(true)
    try {
      await ensureToken()
      await api.post('/leaves', {
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || 'Keperluan pribadi',
      })
      showToast('success', `Pengajuan cuti (${workDays} hari kerja) berhasil dikirim!`)
      setLeaveForm({ type: 'CUTI', startDate: '', endDate: '', reason: '' })
      fetchData()
    } catch (err) {
      const fallbackItem = {
        id: `local-${Date.now()}`,
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        workDays,
        reason: leaveForm.reason || 'Keperluan pribadi',
        status: 'PENDING',
      }
      setLocalSubmittedLeaves((prev) => [fallbackItem, ...prev])
      showToast(
        'success',
        err.response?.data?.message || `Pengajuan cuti (${workDays} hari kerja) berhasil dicatat!`
      )
      setLeaveForm({ type: 'CUTI', startDate: '', endDate: '', reason: '' })
    } finally {
      setSubmittingLeave(false)
    }
  }

  // Download PDF
  const handleDownloadPdf = async () => {
    const payId = payrollRecords[0]?.id
    if (!payId) {
      showToast('info', 'Mengunduh format PDF contoh slip gaji...')
      // Fallback demo download
      const element = document.createElement('a')
      const file = new Blob(['Slip Gaji Resmi Kerabat Digital\nBima Pratama - Rp 13.815.532'], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = 'slip-gaji-Bima-Pratama-Oktober-2026.txt'
      document.body.appendChild(element)
      element.click()
      showToast('success', 'Slip gaji berhasil diunduh.')
      return
    }

    setDownloadingPdf(true)
    try {
      const res = await api.get(`/payroll/${payId}/payslip-pdf`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `slip-gaji-${currentUser.name}-Oktober-2026.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('success', 'Slip gaji PDF berhasil diunduh.')
    } catch (err) {
      showToast('error', 'Gagal unduh PDF: ' + (err.response?.data?.message || err.message))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const userName = employeeProfile?.user?.name || currentUser.name || 'Bima Pratama'

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans antialiased flex flex-col items-center">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'bg-[#1b7a43] text-white'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-800 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* TOP HEADER: Page 3-5 Standard */}
      <header className="w-full max-w-2xl px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#c44d27] tracking-tight">Kerabat</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-stone-700">{userName}</span>
          <button
            onClick={onLogout}
            className="px-3.5 py-1 text-sm font-medium text-stone-700 bg-white border border-[#e2ddd5] rounded-lg hover:bg-stone-50 transition cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* NAVIGATION PILLS: Page 3-5 Standard */}
      <nav className="w-full max-w-2xl px-5 py-3 flex items-center gap-2.5 mb-2">
        <button
          onClick={() => setActiveTab('absen')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition cursor-pointer ${
            activeTab === 'absen'
              ? 'bg-[#c44d27] text-white shadow-xs'
              : 'bg-white border border-[#e2ddd5] text-stone-700 hover:bg-stone-50'
          }`}
        >
          Absen
        </button>
        <button
          onClick={() => setActiveTab('cuti')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
            activeTab === 'cuti'
              ? 'bg-[#c44d27] text-white shadow-xs font-bold'
              : 'bg-white border border-[#e2ddd5] text-stone-700 hover:bg-stone-50'
          }`}
        >
          Cuti saya
        </button>
        <button
          onClick={() => setActiveTab('slip-gaji')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
            activeTab === 'slip-gaji'
              ? 'bg-[#c44d27] text-white shadow-xs font-bold'
              : 'bg-white border border-[#e2ddd5] text-stone-700 hover:bg-stone-50'
          }`}
        >
          Slip gaji
        </button>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-2xl px-5 pb-16 flex flex-col gap-4">

        {/* =================================================================== */}
        {/* TAB 1: ABSEN (Page 3 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'absen' && (
          <>
            {/* HERO CARD */}
            <div className="bg-gradient-to-r from-[#d85e2b] to-[#c24b1c] rounded-[24px] p-7 md:p-8 text-white shadow-xs">
              <h2 className="text-2xl font-bold mb-0.5">Halo, {userName.split(' ')[0]}!</h2>
              <p className="text-xs text-orange-100 font-medium mb-3">{currentDateStr}</p>
              
              <div className="text-5xl md:text-6xl font-black tracking-tight mb-3">
                {currentTime}
              </div>

              <p className="text-xs text-orange-100 font-medium mb-7">
                Shift pagi 08:00 sampai 17:00, {officeLocation.name}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleClockIn}
                  disabled={clockActionLoading || !!todayAttendance?.clockIn}
                  className={`flex-1 font-bold py-3.5 px-4 rounded-xl text-center text-sm transition cursor-pointer ${
                    todayAttendance?.clockIn
                      ? 'bg-white/20 text-white/70 cursor-not-allowed'
                      : 'bg-[#e6a147] hover:bg-[#d9943b] text-[#4a2608] shadow-xs'
                  }`}
                >
                  {todayAttendance?.clockIn
                    ? `Masuk: ${formatTime(todayAttendance.clockIn)}`
                    : 'Clock in'}
                </button>

                <button
                  onClick={handleClockOut}
                  disabled={
                    clockActionLoading ||
                    !todayAttendance?.clockIn ||
                    !!todayAttendance?.clockOut
                  }
                  className={`flex-1 font-medium py-3.5 px-4 rounded-xl text-center text-sm transition ${
                    !todayAttendance?.clockIn || todayAttendance?.clockOut
                      ? 'bg-white/10 text-white/50 border border-white/10 cursor-not-allowed'
                      : 'bg-white/15 hover:bg-white/25 border border-white/25 text-white cursor-pointer'
                  }`}
                >
                  {todayAttendance?.clockOut
                    ? `Pulang: ${formatTime(todayAttendance.clockOut)}`
                    : 'Clock out'}
                </button>
              </div>

              {todayAttendance?.clockIn && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleResetToday}
                    disabled={clockActionLoading}
                    className="text-[11px] font-semibold text-orange-100 hover:text-white underline cursor-pointer transition"
                  >
                    Ulangi / Reset Absen Hari Ini (Mode Demo)
                  </button>
                </div>
              )}
            </div>

            {/* THREE STATS CARDS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-[#ece7de] py-4 px-2 text-center shadow-xs">
                <div className="text-3xl font-extrabold text-stone-900 leading-tight">
                  {leavesData?.leaveQuota ?? 8}
                </div>
                <div className="text-[11px] text-stone-500 font-medium mt-1">Sisa cuti</div>
              </div>

              <div className="bg-white rounded-2xl border border-[#ece7de] py-4 px-2 text-center shadow-xs">
                <div className="text-3xl font-extrabold text-stone-900 leading-tight">{attendanceStats.lateCount}x</div>
                <div className="text-[11px] text-stone-500 font-medium mt-1">Terlambat bulan ini</div>
              </div>

              <div className="bg-white rounded-2xl border border-[#ece7de] py-4 px-2 text-center shadow-xs">
                <div className="text-3xl font-extrabold text-stone-900 leading-tight">{attendanceStats.workedHours}j</div>
                <div className="text-[11px] text-stone-500 font-medium mt-1">Jam kerja</div>
              </div>
            </div>

            {/* GEOFENCE RADAR CARD */}
            <div className="bg-white rounded-2xl border border-[#ece7de] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-stone-700 font-medium">
                  Jarak dari kantor: <strong className="text-stone-900 text-sm">{simulatedDistance} m</strong>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                    isWithinGeofence
                      ? 'bg-[#e8f7ee] text-[#1b7a43]'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {isWithinGeofence ? 'Dalam radius' : 'Luar radius'}
                </span>
              </div>

              {/* RADAR CIRCLE */}
              <div className="bg-[#f5f2eb] rounded-2xl h-60 flex flex-col items-center justify-center relative mb-4 overflow-hidden">
                <div className="w-48 h-48 rounded-full bg-[#dbe8dd] flex flex-col items-center justify-center relative">
                  {/* Office Pin */}
                  <div className="w-8 h-8 rounded-lg bg-[#c44d27] flex items-center justify-center shadow-xs mb-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-stone-700">Kantor Pusat</span>

                  {/* User Location Dot (positioned by simulatedDistance) */}
                  <div
                    className="absolute w-4 h-4 rounded-full bg-[#e6a147] border-2 border-white shadow-md transition-all duration-300"
                    style={{
                      top: `${Math.max(15, Math.min(80, 50 - simulatedDistance * 0.5))}%`,
                      right: `${Math.max(15, Math.min(80, 50 + simulatedDistance * 0.4))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-xs font-semibold text-stone-700 mb-2">
                Geser untuk mensimulasikan posisi Anda
              </div>
              <input
                type="range"
                min="5"
                max="120"
                value={simulatedDistance}
                onChange={(e) => setSimulatedDistance(Number(e.target.value))}
                className="w-full accent-[#1d64d8] cursor-pointer mb-1"
              />
            </div>

            {/* RIWAYAT ABSENSI CARD */}
            <div className="bg-white rounded-2xl border border-[#ece7de] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3">Riwayat absensi</h3>

              <AttendanceHistory records={attendances} />
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 2: CUTI SAYA (Page 4 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'cuti' && (
          <>
            {/* FORM AJUKAN CUTI */}
            <div className="bg-white rounded-2xl border border-[#ece7de] p-6 shadow-xs">
              <h3 className="text-base font-bold text-stone-900 mb-4">Ajukan cuti</h3>
              <form onSubmit={handleSubmitLeave} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5">Jenis</label>
                  <select
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                    className="w-full bg-[#fbf9f4] border border-[#e8e4db] rounded-xl px-4 py-3 text-sm text-stone-800 outline-none"
                  >
                    <option value="CUTI">Cuti tahunan</option>
                    <option value="SAKIT">Sakit</option>
                    <option value="IZIN">Izin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                    Tanggal Cuti (Klik untuk buka kalender ala Tiket Kereta Api)
                  </label>
                  <TrainCalendarPicker
                    startDate={leaveForm.startDate}
                    endDate={leaveForm.endDate}
                    onChange={({ startDate, endDate }) =>
                      setLeaveForm((prev) => ({ ...prev, startDate, endDate }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5">Alasan</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis alasan singkat"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full bg-[#fbf9f4] border border-[#e8e4db] rounded-xl px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="w-full mt-2 py-3.5 rounded-xl bg-[#c44d27] hover:bg-[#b0421e] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition cursor-pointer"
                >
                  {submittingLeave ? 'Mengirim...' : 'Kirim pengajuan'}
                </button>
              </form>
            </div>

            {/* RIWAYAT PENGAJUAN SAYA */}
            <div className="bg-white rounded-2xl border border-[#ece7de] p-6 shadow-xs">
              <h3 className="text-base font-bold text-stone-900 mb-5">Pengajuan saya</h3>
              
              <div className="flex flex-col gap-6">
                {[...localSubmittedLeaves, ...(leavesData?.requests || [])].map((lv) => {
                  const typeLabel =
                    lv.type === 'CUTI'
                      ? 'Cuti tahunan'
                      : lv.type === 'SAKIT'
                        ? 'Sakit'
                        : 'Izin'
                  const startFormatted = formatKaiDate((lv.startDate || '').slice(0, 10)) || lv.startDate
                  const endFormatted = formatKaiDate((lv.endDate || '').slice(0, 10)) || lv.endDate
                  const dateLabel =
                    startFormatted === endFormatted
                      ? startFormatted
                      : `${startFormatted} s/d ${endFormatted}`

                  const isManagerApproved =
                    lv.status === 'MANAGER_APPROVED' || lv.status === 'HR_APPROVED'
                  const isHrApproved = lv.status === 'HR_APPROVED'
                  const isRejected = lv.status === 'REJECTED'

                  return (
                    <div key={lv.id} className="pb-5 border-b border-stone-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-bold text-stone-900">
                            {typeLabel} ({lv.workDays || 1} hari kerja)
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5">{dateLabel}</div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            isHrApproved
                              ? 'bg-[#e8f7ee] text-[#1b7a43]'
                              : isRejected
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-[#fef3eb] text-[#c44d27]'
                          }`}
                        >
                          {isHrApproved
                            ? 'Disetujui'
                            : isRejected
                              ? 'Ditolak'
                              : isManagerApproved
                                ? 'Menunggu HR'
                                : 'Menunggu Manager'}
                        </span>
                      </div>

                      {/* 3-Point Timeline Stepper */}
                      <div className="relative flex items-center justify-between px-6 pt-2">
                        <div className="absolute left-8 right-8 top-[14px] h-[2px] bg-stone-200 z-0" />

                        <div className="flex flex-col items-center relative z-10">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                          <span className="text-[11px] font-bold text-stone-800 mt-2">Diajukan</span>
                        </div>

                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                              isManagerApproved ? 'bg-[#1b7a43]' : 'bg-[#e6a147]'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-stone-800 mt-2">Manager</span>
                        </div>

                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                              isHrApproved ? 'bg-[#1b7a43]' : 'bg-stone-300'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-stone-500 mt-2">HR</span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Item 1 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-stone-900">Cuti tahunan</div>
                      <div className="text-xs text-stone-500 mt-0.5">22 sampai 24 Okt</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#e8f7ee] text-[#1b7a43]">
                      Disetujui
                    </span>
                  </div>

                  {/* 3-Point Timeline Stepper */}
                  <div className="relative flex items-center justify-between px-6 pt-2">
                    <div className="absolute left-8 right-8 top-[14px] h-[2px] bg-[#1b7a43] z-0" />
                    
                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">Diajukan</span>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">Manager</span>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">HR</span>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-stone-100" />

                {/* Item 2 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-stone-900">Izin</div>
                      <div className="text-xs text-stone-500 mt-0.5">9 Okt</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#e8f7ee] text-[#1b7a43]">
                      Disetujui
                    </span>
                  </div>

                  {/* 3-Point Timeline Stepper */}
                  <div className="relative flex items-center justify-between px-6 pt-2">
                    <div className="absolute left-8 right-8 top-[14px] h-[2px] bg-[#1b7a43] z-0" />
                    
                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">Diajukan</span>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">Manager</span>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">HR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 3: SLIP GAJI (Page 5 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'slip-gaji' && (
          <div className="bg-white rounded-2xl border border-[#ece7de] p-6 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-4">Slip gaji Oktober 2026</h3>
            
            {/* Dashed Border Container */}
            <div className="border border-dashed border-[#dcd7cb] rounded-2xl p-5 mb-5">
              <div className="mb-4">
                <div className="text-sm font-bold text-stone-900">Bima Pratama</div>
                <div className="text-xs text-stone-500">Backend Developer</div>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>Gaji pokok</span>
                  <span className="font-bold text-stone-900">Rp 12.000.000</span>
                </div>

                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>Tunjangan tetap</span>
                  <span className="font-bold text-stone-900">Rp 2.500.000</span>
                </div>

                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>Lembur (3 jam)</span>
                  <span className="font-bold text-stone-900">Rp 312.139</span>
                </div>

                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>BPJS</span>
                  <span className="font-bold text-[#c44d27]">− Rp 480.000</span>
                </div>

                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>Keterlambatan (1x)</span>
                  <span className="font-bold text-[#c44d27]">− Rp 50.000</span>
                </div>

                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>Alpa (0 hari)</span>
                  <span className="font-bold text-[#c44d27]">− Rp 0</span>
                </div>

                <div className="py-2.5 flex justify-between items-center text-stone-700">
                  <span>PPh 21 (estimasi)</span>
                  <span className="font-bold text-[#c44d27]">− Rp 466.607</span>
                </div>

                <div className="pt-4 flex flex-col items-start">
                  <span className="text-[11px] text-stone-500 font-medium">Diterima</span>
                  <span className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight mt-0.5">
                    Rp 13.815.532
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full py-3 rounded-xl border border-[#d0cac0] hover:bg-stone-50 active:bg-stone-100 text-stone-800 font-bold text-sm transition cursor-pointer shadow-xs text-center"
            >
              {downloadingPdf ? 'Membuat PDF...' : 'Unduh PDF'}
            </button>
          </div>
        )}

      </main>

    </div>
  )
}
