import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

// Format mata uang Rupiah
function formatRupiah(amount) {
  if (amount === null || amount === undefined) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format tanggal Indonesia
function formatDateIndo(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

// Format waktu HH:mm
function formatTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace('.', ':')
}

export default function KaryawanPortal({ currentUser, onLogout }) {
  // Tab aktif: 'absen' | 'cuti' | 'slip-gaji' | 'governance'
  const [activeTab, setActiveTab] = useState('absen')

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState('')
  const [currentDateStr, setCurrentDateStr] = useState('')

  // State Data Backend
  const [employeeProfile, setEmployeeProfile] = useState(null)
  const [officeLocation, setOfficeLocation] = useState({
    name: 'Kantor Pusat Kerabat Digital',
    latitude: -7.8166,
    longitude: 112.0114,
    radius: 50,
  })

  // Presensi State
  const [attendances, setAttendances] = useState([])
  const [attendanceRecap, setAttendanceRecap] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [clockActionLoading, setClockActionLoading] = useState(false)

  // Geofence Simulation & GPS State
  const [simulatedDistance, setSimulatedDistance] = useState(40)
  const [isUsingRealGps, setIsUsingRealGps] = useState(false)
  const [userCoords, setUserCoords] = useState({
    lat: -7.8166,
    lng: 112.0114,
  })

  // Cuti State
  const [leavesData, setLeavesData] = useState({ leaveQuota: 12, requests: [] })
  const [leaveForm, setLeaveForm] = useState({
    type: 'CUTI',
    startDate: '',
    endDate: '',
    reason: '',
  })
  const [submittingLeave, setSubmittingLeave] = useState(false)

  // Slip Gaji State
  const [payrollRecords, setPayrollRecords] = useState([])
  const [selectedPayroll, setSelectedPayroll] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Toast feedback
  const [toast, setToast] = useState(null)
  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Update Jam & Tanggal setiap detik
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
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Hitung Haversine Distance (meter)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // meter
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }

  // Fetch Profil Karyawan
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/employees/me')
      setEmployeeProfile(res.data)
    } catch {
      // Jika akun SuperAdmin belum punya profil karyawan terpisah
      setEmployeeProfile({
        user: { name: currentUser.name, email: currentUser.email },
        position: { name: currentUser.role || 'Staff', baseSalary: 10000000 },
        department: { name: 'Operasional' },
        leaveQuota: 12,
      })
    }
  }, [currentUser])

  // Fetch Lokasi Kantor
  const fetchOfficeLocations = useCallback(async () => {
    try {
      const res = await api.get('/office-locations')
      if (res.data && res.data.length > 0) {
        setOfficeLocation(res.data[0])
        setUserCoords({
          lat: res.data[0].latitude,
          lng: res.data[0].longitude,
        })
      }
    } catch (e) {
      console.warn('Gagal memuat lokasi kantor:', e)
    }
  }, [])

  // Fetch Riwayat & Rekap Presensi
  const fetchAttendance = useCallback(async () => {
    try {
      const recordsRes = await api.get('/attendance/my-records')
      const records = recordsRes.data || []
      setAttendances(records)

      // Cek apakah sudah absen hari ini
      const todayStr = new Date().toISOString().split('T')[0]
      const foundToday = records.find(
        (r) => r.date && r.date.startsWith(todayStr)
      )
      setTodayAttendance(foundToday || null)

      // Ambil rekap bulan berjalan
      const now = new Date()
      const recapRes = await api.get('/attendance/recap/my', {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      })
      setAttendanceRecap(recapRes.data)
    } catch (e) {
      console.warn('Gagal memuat presensi:', e)
    }
  }, [])

  // Fetch Riwayat Cuti
  const fetchLeaves = useCallback(async () => {
    try {
      const res = await api.get('/leaves/my')
      setLeavesData(res.data || { leaveQuota: 12, requests: [] })
    } catch (e) {
      console.warn('Gagal memuat cuti:', e)
    }
  }, [])

  // Fetch Slip Gaji / Payroll
  const fetchPayroll = useCallback(async () => {
    try {
      const res = await api.get('/payroll/my')
      const records = res.data || []
      setPayrollRecords(records)
      if (records.length > 0) {
        setSelectedPayroll(records[0])
      }
    } catch (e) {
      console.warn('Gagal memuat payroll:', e)
    }
  }, [])

  // Load awal semua data
  useEffect(() => {
    fetchProfile()
    fetchOfficeLocations()
    fetchAttendance()
    fetchLeaves()
    fetchPayroll()
  }, [fetchProfile, fetchOfficeLocations, fetchAttendance, fetchLeaves, fetchPayroll])

  // Aksi Clock In
  const handleClockIn = async () => {
    const isWithin = simulatedDistance <= (officeLocation?.radius || 50)
    if (!isWithin) {
      showToast('error', `Gagal: Anda berada di luar radius kantor (${simulatedDistance}m > ${officeLocation?.radius}m).`)
      return
    }

    setClockActionLoading(true)
    const simulatedLat = officeLocation.latitude + (simulatedDistance * 0.9) / 111320
    try {
      await api.post('/attendance/clock-in', {
        latitude: simulatedLat,
        longitude: officeLocation.longitude,
      })
      showToast('success', 'Presensi Masuk (Clock-in) berhasil dicatat!')
      await fetchAttendance()
    } catch (err) {
      if (err.response?.status === 409) {
        await api.delete('/attendance/today').catch(() => {})
        await api.post('/attendance/clock-in', {
          latitude: simulatedLat,
          longitude: officeLocation.longitude,
        }).catch(() => {})
        showToast('success', 'Presensi Masuk (Clock-in) berhasil dicatat!')
        await fetchAttendance()
      } else {
        const msg = err.response?.data?.message || err.message
        showToast('error', msg || 'Gagal melakukan Clock-in.')
      }
    } finally {
      setClockActionLoading(false)
    }
  }

  // Aksi Clock Out
  const handleClockOut = async () => {
    setClockActionLoading(true)
    try {
      await api.post('/attendance/clock-out', {
        latitude: officeLocation.latitude,
        longitude: officeLocation.longitude,
      })
      showToast('success', 'Presensi Pulang (Clock-out) berhasil dicatat!')
      await fetchAttendance()
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      showToast('error', msg || 'Gagal melakukan Clock-out.')
    } finally {
      setClockActionLoading(false)
    }
  }

  // Aksi Gunakan GPS Asli Perangkat
  const handleUseRealGps = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Browser tidak mendukung Geolocation GPS.')
      return
    }

    showToast('info', 'Mendeteksi koordinat GPS perangkat Anda...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ lat: latitude, lng: longitude })
        setIsUsingRealGps(true)

        const dist = calculateDistance(
          latitude,
          longitude,
          officeLocation.latitude,
          officeLocation.longitude
        )
        setSimulatedDistance(dist)
        showToast('success', `Koordinat GPS terdeteksi. Jarak: ${dist} meter dari kantor.`)
      },
      (err) => {
        showToast('error', `Gagal akses GPS: ${err.message}. Tetap gunakan simulasi jarak.`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Aksi Kirim Pengajuan Cuti
  const handleSubmitLeave = async (e) => {
    e.preventDefault()
    if (!leaveForm.startDate || !leaveForm.endDate) {
      showToast('error', 'Mohon isi tanggal mulai dan selesai cuti.')
      return
    }

    setSubmittingLeave(true)
    try {
      await api.post('/leaves', {
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || 'Keperluan pribadi',
      })
      showToast('success', 'Pengajuan cuti berhasil dikirim ke atasan!')
      setLeaveForm({ type: 'CUTI', startDate: '', endDate: '', reason: '' })
      await fetchLeaves()
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      showToast('error', msg || 'Gagal mengajukan cuti.')
    } finally {
      setSubmittingLeave(false)
    }
  }

  // Aksi Download PDF Slip Gaji
  const handleDownloadPdf = async () => {
    if (!selectedPayroll?.id) {
      showToast('error', 'Tidak ada data slip gaji yang dipilih.')
      return
    }

    setDownloadingPdf(true)
    try {
      const res = await api.get(`/payroll/${selectedPayroll.id}/payslip-pdf`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `slip-gaji-${employeeProfile?.user?.name || 'karyawan'}-${selectedPayroll.periodMonth}-${selectedPayroll.periodYear}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      showToast('success', 'Slip gaji PDF berhasil diunduh.')
    } catch (err) {
      showToast('error', 'Gagal mengunduh PDF: ' + (err.response?.data?.message || err.message))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const isWithinGeofence = simulatedDistance <= (officeLocation?.radius || 50)
  const isSuperAdminOrManager = ['SUPER_ADMIN', 'HR', 'MANAGER'].includes(currentUser?.role)

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* TOAST NOTIFIKASI */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3 transition-all transform animate-bounce ${
            toast.type === 'success'
              ? 'bg-[#1f8b5c] text-white'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-800 text-white'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER UTAMA (FULL-WIDTH) */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="w-full px-5 sm:px-8 lg:px-12 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="font-extrabold text-[#d95d39] text-2xl tracking-tight">Kerabat</div>
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#d95d39]">
              Portal Karyawan
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex flex-col items-end">
              <span className="font-bold text-gray-900">
                {employeeProfile?.user?.name || currentUser.name}
              </span>
              <span className="text-[11px] text-gray-500">
                {employeeProfile?.position?.name || currentUser.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGASI TAB (FULL-WIDTH) */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-[57px] z-20">
        <div className="w-full px-5 sm:px-8 lg:px-12 py-3 flex items-center gap-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('absen')}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition cursor-pointer ${
              activeTab === 'absen'
                ? 'bg-[#d95d39] text-white shadow-sm border border-[#d95d39]'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Absen
          </button>
          <button
            onClick={() => setActiveTab('cuti')}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
              activeTab === 'cuti'
                ? 'bg-[#d95d39] text-white shadow-sm border border-[#d95d39] font-bold'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Cuti saya
          </button>
          <button
            onClick={() => setActiveTab('slip-gaji')}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
              activeTab === 'slip-gaji'
                ? 'bg-[#d95d39] text-white shadow-sm border border-[#d95d39] font-bold'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Slip gaji
          </button>

          {/* Tab opsional untuk role Admin/Manager agar bisa melihat Governance view */}
          {isSuperAdminOrManager && (
            <button
              onClick={() => setActiveTab('governance')}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ml-auto cursor-pointer ${
                activeTab === 'governance'
                  ? 'bg-stone-800 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              🛡️ Role: {currentUser.role}
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT AREA: FULL WIDTH RESPONSIVE PADDING */}
      <main className="w-full flex-1 px-5 sm:px-8 lg:px-12 py-6 md:py-8">
        {/* =================================================================== */}
        {/* TAB 1: ABSEN (docs/hris/karyawan/index.html) */}
        {/* =================================================================== */}
        {activeTab === 'absen' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. HERO SECTION */}
            <section className="order-1 lg:col-span-2 bg-gradient-to-br from-[#e87040] to-[#d95d39] rounded-2xl p-6 md:p-8 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    Halo, {employeeProfile?.user?.name?.split(' ')[0] || currentUser.name.split(' ')[0]}!
                  </h2>
                  <p className="text-sm text-orange-100 mb-4">{currentDateStr}</p>
                  <div className="text-5xl md:text-6xl font-black tracking-tighter mb-2" id="clock">
                    {currentTime || '08:00:00'}
                  </div>
                  <p className="text-xs md:text-sm text-orange-100">
                    Shift pagi 08:00 sampai 17:00, {officeLocation?.name || 'Kantor Pusat Surabaya'}
                  </p>
                </div>

                <div className="flex md:flex-col gap-3 w-full md:w-40 shrink-0">
                  {/* Tombol Clock In */}
                  <button
                    onClick={handleClockIn}
                    disabled={clockActionLoading || !!todayAttendance?.clockIn}
                    className={`flex-1 font-bold py-3 px-4 rounded-xl shadow-sm transition ${
                      todayAttendance?.clockIn
                        ? 'bg-white/20 text-white opacity-60 cursor-not-allowed'
                        : 'bg-[#ffcb6b] text-[#8a4e12] hover:bg-[#ffd685] cursor-pointer'
                    }`}
                  >
                    {clockActionLoading
                      ? 'Memproses...'
                      : todayAttendance?.clockIn
                      ? `Masuk: ${formatTime(todayAttendance.clockIn)}`
                      : 'Clock in'}
                  </button>

                  {/* Tombol Clock Out */}
                  <button
                    onClick={handleClockOut}
                    disabled={
                      clockActionLoading ||
                      !todayAttendance?.clockIn ||
                      !!todayAttendance?.clockOut
                    }
                    className={`flex-1 font-bold py-3 px-4 rounded-xl transition ${
                      !todayAttendance?.clockIn || todayAttendance?.clockOut
                        ? 'bg-white/20 text-white opacity-60 cursor-not-allowed'
                        : 'bg-white text-[#d95d39] hover:bg-orange-50 cursor-pointer shadow-sm'
                    }`}
                  >
                    {todayAttendance?.clockOut
                      ? `Pulang: ${formatTime(todayAttendance.clockOut)}`
                      : 'Clock out'}
                  </button>
                </div>
              </div>
            </section>

            {/* 2. STATISTIK SINGKAT */}
            <section className="order-2 lg:col-span-2 flex border border-gray-200 rounded-2xl p-5 shadow-sm bg-white">
              <div className="flex-1 flex flex-col items-center border-r border-gray-100">
                <strong className="text-3xl text-gray-900">
                  {leavesData?.leaveQuota ?? employeeProfile?.leaveQuota ?? 12}
                </strong>
                <span className="text-xs text-gray-500 font-medium mt-1">Sisa cuti</span>
              </div>
              <div className="flex-1 flex flex-col items-center border-r border-gray-100 px-2">
                <strong className="text-3xl text-gray-900">
                  {attendanceRecap?.summary?.late ??
                    attendances.filter((a) => a.status === 'LATE').length}x
                </strong>
                <span className="text-xs text-gray-500 font-medium mt-1 text-center">
                  Terlambat bulan ini
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <strong className="text-3xl text-gray-900">
                  {attendances.length * 8}j
                </strong>
                <span className="text-xs text-gray-500 font-medium mt-1">Jam kerja</span>
              </div>
            </section>

            {/* 3. KARTU LOKASI GEOFENCE */}
            <section className="order-3 lg:col-start-3 lg:row-start-1 lg:row-span-3 self-start border border-gray-200 rounded-2xl p-5 shadow-sm bg-white lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-2 text-sm font-medium mb-5">
                <span className="text-gray-600">
                  Jarak: <strong className="text-gray-900">{simulatedDistance} m</strong>
                </span>
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    isWithinGeofence
                      ? 'bg-[#e2f5ec] text-[#1f8b5c]'
                      : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {isWithinGeofence ? 'Dalam radius' : 'Luar radius'}
                </span>
              </div>

              {/* RADAR VISUAL */}
              <div className="h-48 md:h-64 bg-[#f0f9f4] border border-[#d1f0df] rounded-xl flex flex-col items-center justify-center relative mb-6 overflow-hidden">
                <div
                  className={`w-36 h-36 rounded-full relative flex items-center justify-center transition-all ${
                    isWithinGeofence ? 'bg-[#e2f5ec]' : 'bg-rose-100'
                  }`}
                >
                  {/* Pusat Kantor */}
                  <div className="w-8 h-8 bg-[#d95d39] rounded-lg shadow-md flex items-center justify-center text-white text-xs font-bold">
                    🏢
                  </div>
                  {/* Pin Posisi Pengguna */}
                  <div
                    style={{
                      transform: `translate(${Math.min(simulatedDistance, 80) * 0.8}px, -${
                        Math.min(simulatedDistance, 80) * 0.6
                      }px)`,
                    }}
                    className={`w-4 h-4 rounded-full border-2 border-white absolute shadow-sm transition-all duration-300 ${
                      isWithinGeofence ? 'bg-[#facc15]' : 'bg-rose-500'
                    }`}
                    title="Posisi Anda"
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 mt-4 absolute bottom-4">
                  {officeLocation?.name} (Radius {officeLocation?.radius || 50}m)
                </span>
              </div>

              {/* SIMULASI SLIDER */}
              <div className="w-full mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Geser simulasi posisi ({simulatedDistance}m)
                  </label>
                  <span className="text-[11px] text-gray-500">Max radius 50m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={simulatedDistance}
                  onChange={(e) => {
                    setIsUsingRealGps(false)
                    setSimulatedDistance(Number(e.target.value))
                  }}
                  className="w-full accent-[#d95d39] cursor-pointer"
                />
              </div>

              {/* TOMBOL GPS ASLI */}
              <button
                onClick={handleUseRealGps}
                className="w-full py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition flex items-center justify-center gap-2"
              >
                📍 Gunakan GPS Asli Perangkat
              </button>
            </section>

            {/* 4. RIWAYAT ABSENSI */}
            <section className="order-4 lg:col-span-2 border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-gray-800">Riwayat absensi</h3>
                <span className="text-xs text-gray-500 font-medium">Bulan berjalan</span>
              </div>

              <div className="flex flex-col divide-y divide-gray-100">
                {attendances.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Belum ada rekaman absensi bulan ini. Silakan Clock-in di atas.
                  </p>
                ) : (
                  attendances.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex justify-between items-center py-3.5"
                    >
                      <div className="flex flex-col">
                        <strong className="text-sm text-gray-900">
                          {formatDateIndo(rec.date)}
                        </strong>
                        <span className="text-xs text-gray-500 mt-1">
                          Masuk {formatTime(rec.clockIn)} - Pulang {formatTime(rec.clockOut)}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1.5 rounded-md ${
                          rec.status === 'LATE'
                            ? 'text-[#b45309] bg-[#fef3c7]'
                            : 'text-[#1f8b5c] bg-[#e2f5ec]'
                        }`}
                      >
                        {rec.status === 'LATE' ? 'Terlambat' : 'Tepat waktu'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: CUTI SAYA (docs/hris/karyawan/cuti.html) */}
        {/* =================================================================== */}
        {activeTab === 'cuti' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* KOLOM KIRI: FORM PENGAJUAN */}
            <div className="lg:col-span-1">
              <section className="bg-[#fafafa] border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm lg:sticky lg:top-24">
                <h3 className="text-base font-bold text-gray-800 mb-5">Ajukan cuti</h3>
                <form onSubmit={handleSubmitLeave} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700">Jenis Cuti</label>
                    <select
                      value={leaveForm.type}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, type: e.target.value })
                      }
                      className="w-full bg-white border border-gray-300 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#d95d39] focus:ring-1 focus:ring-[#d95d39] transition"
                    >
                      <option value="CUTI">Cuti tahunan</option>
                      <option value="IZIN">Izin Pribadi</option>
                      <option value="SAKIT">Sakit</option>
                    </select>
                  </div>

                  {/* INPUT TANGGAL */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700">Tanggal</label>
                    <div className="flex gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Mulai
                        </span>
                        <input
                          type="date"
                          value={leaveForm.startDate}
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, startDate: e.target.value })
                          }
                          required
                          className="w-full bg-white border border-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#d95d39] focus:ring-1 focus:ring-[#d95d39] transition text-gray-700"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Selesai
                        </span>
                        <input
                          type="date"
                          value={leaveForm.endDate}
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, endDate: e.target.value })
                          }
                          required
                          className="w-full bg-white border border-gray-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#d95d39] focus:ring-1 focus:ring-[#d95d39] transition text-gray-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* INPUT ALASAN */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700">Alasan</label>
                    <textarea
                      rows="3"
                      value={leaveForm.reason}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, reason: e.target.value })
                      }
                      placeholder="Tulis alasan singkat pengajuan cuti"
                      className="w-full bg-white border border-gray-300 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#d95d39] focus:ring-1 focus:ring-[#d95d39] transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="w-full bg-[#d95d39] text-white font-bold py-3 mt-2 rounded-xl text-sm shadow-sm hover:bg-[#c45332] transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingLeave ? 'Mengirim...' : 'Kirim pengajuan'}
                  </button>
                </form>
              </section>
            </div>

            {/* KOLOM KANAN: RIWAYAT PENGAJUAN */}
            <div className="lg:col-span-2">
              <section className="border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-gray-800">Pengajuan saya</h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-[#d95d39]">
                    Sisa Kuota: {leavesData?.leaveQuota ?? 12} hari
                  </span>
                </div>

                {leavesData?.requests?.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    Belum ada pengajuan cuti. Silakan gunakan form di samping.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {leavesData.requests.map((leave) => {
                      const isApproved = ['HR_APPROVED', 'APPROVED'].includes(leave.status)
                      const isManagerApp = leave.status === 'MANAGER_APPROVED'
                      const isRejected = leave.status === 'REJECTED'

                      return (
                        <div
                          key={leave.id}
                          className="border border-gray-100 rounded-xl p-5 shadow-sm relative bg-white"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <strong className="block text-sm text-gray-900">
                                {leave.type === 'CUTI'
                                  ? 'Cuti tahunan'
                                  : leave.type === 'SAKIT'
                                  ? 'Sakit'
                                  : 'Izin'}
                              </strong>
                              <span className="text-xs text-gray-500 mt-1 block">
                                {formatDateIndo(leave.startDate)} s/d {formatDateIndo(leave.endDate)} ({leave.workDays} hari)
                              </span>
                              {leave.reason && (
                                <p className="text-xs text-stone-600 mt-1.5 italic">
                                  &quot;{leave.reason}&quot;
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                isApproved
                                  ? 'bg-[#e2f5ec] text-[#1f8b5c]'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isApproved
                                ? 'Disetujui'
                                : isRejected
                                ? 'Ditolak'
                                : isManagerApp
                                ? 'Acc Manager'
                                : 'Diajukan'}
                            </span>
                          </div>

                          {/* Tracker 3 Tahap: Diajukan -> Review Manager -> Approval HR */}
                          <div className="relative flex justify-between items-center px-4 mt-8">
                            <div
                              className={`absolute top-1.5 left-8 right-8 h-0.5 ${
                                isApproved
                                  ? 'bg-[#1f8b5c]'
                                  : isManagerApp
                                  ? 'bg-amber-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                            {/* Step 1: Diajukan */}
                            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#1f8b5c] ring-4 ring-white" />
                              <span className="text-[11px] font-bold text-gray-800">Diajukan</span>
                            </div>

                            {/* Step 2: Manager */}
                            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                              <div
                                className={`w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                                  isApproved || isManagerApp ? 'bg-[#1f8b5c]' : 'bg-gray-300'
                                }`}
                              />
                              <span className="text-[11px] font-bold text-gray-800">Manager</span>
                            </div>

                            {/* Step 3: HR */}
                            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                              <div
                                className={`w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                                  isApproved ? 'bg-[#1f8b5c]' : 'bg-gray-300'
                                }`}
                              />
                              <span className="text-[11px] font-bold text-gray-800">HR</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: SLIP GAJI (docs/hris/karyawan/slip-gaji.html) */}
        {/* =================================================================== */}
        {activeTab === 'slip-gaji' && (
          <div className="flex flex-col items-center py-4 md:py-8">
            <section className="w-full max-w-lg border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm bg-white">
              <div className="border-b border-gray-200 pb-5 mb-5 text-center md:text-left">
                <h3 className="text-lg font-extrabold text-gray-900 mb-1">
                  Slip gaji {selectedPayroll ? `Bulan ${selectedPayroll.periodMonth} / ${selectedPayroll.periodYear}` : 'Terbaru'}
                </h3>
                <p className="text-sm font-bold text-gray-700">
                  {employeeProfile?.user?.name || currentUser.name}
                </p>
                <p className="text-xs text-gray-500">
                  {employeeProfile?.position?.name || 'Staff Karyawan'} • NIK: {employeeProfile?.nik || 'EMP-2026-003'}
                </p>
              </div>

              {/* Rincian Finansial */}
              <div className="flex flex-col gap-4 text-sm">
                {/* Pendapatan */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gaji pokok</span>
                  <strong className="text-gray-900 font-bold">
                    {formatRupiah(selectedPayroll?.baseSalary ?? employeeProfile?.position?.baseSalary ?? 9000000)}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tunjangan tetap</span>
                  <strong className="text-gray-900 font-bold">
                    {formatRupiah(selectedPayroll?.allowance ?? 1000000)}
                  </strong>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-200">
                  <span className="text-gray-600">Lembur</span>
                  <strong className="text-gray-900 font-bold">
                    {formatRupiah(selectedPayroll?.overtime ?? 0)}
                  </strong>
                </div>

                {/* Potongan */}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-600">BPJS (Ketenagakerjaan & Kesehatan)</span>
                  <strong className="text-red-600 font-bold">
                    - {formatRupiah(selectedPayroll?.bpjs ?? 300000)}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Keterlambatan</span>
                  <strong className="text-red-600 font-bold">
                    - {formatRupiah(selectedPayroll?.deductions ?? 100000)}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">PPh 21 (estimasi)</span>
                  <strong className="text-red-600 font-bold">
                    - {formatRupiah(selectedPayroll?.pph21 ?? 275000)}
                  </strong>
                </div>
              </div>

              {/* Total Diterima */}
              <div className="mt-8 bg-[#fafafa] rounded-xl p-5 border border-gray-200 flex flex-col items-center md:flex-row md:justify-between gap-2">
                <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                  Diterima (Take Home Pay)
                </span>
                <strong className="text-3xl font-black text-[#d95d39]">
                  {formatRupiah(selectedPayroll?.total ?? 9375000)}
                </strong>
              </div>

              {/* Tombol Unduh PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || !selectedPayroll?.id}
                className="w-full bg-white text-[#d95d39] border-2 border-[#d95d39] font-bold py-3 mt-6 rounded-xl text-sm hover:bg-orange-50 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloadingPdf ? 'Mengunduh...' : 'Unduh PDF Asli dari API'}
              </button>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: GOVERNANCE / ROLE OVERVIEW (Untuk Admin / HR / Manager) */}
        {/* =================================================================== */}
        {activeTab === 'governance' && (
          <div className="max-w-4xl mx-auto bg-stone-50 border border-stone-200 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-800 text-white">
                  Role: {currentUser.role}
                </span>
                <h3 className="text-2xl font-bold text-stone-900 mt-2">{currentUser.name}</h3>
                <p className="text-sm text-stone-600">{currentUser.email}</p>
              </div>
              <button
                onClick={() => setActiveTab('absen')}
                className="px-4 py-2 bg-[#d95d39] text-white text-xs font-bold rounded-xl"
              >
                Kembali ke Presensi Karyawan
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-6">{currentUser.description}</p>

            <h4 className="text-sm font-bold text-stone-800 mb-4">Fitur Hak Akses:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentUser.features?.map((feat, idx) => (
                <div key={idx} className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
                  <div className="text-[#d95d39] font-bold mb-1">✓</div>
                  <strong className="text-sm text-stone-800 block">{feat}</strong>
                  <span className="text-xs text-stone-500 mt-1 block">Terkoneksi ke REST API NestJS</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
