import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { formatTime } from '../lib/formatters'
import useAuthEnsure from '../lib/useAuthEnsure'
import useLiveClock from '../lib/useLiveClock'
import useToast from '../lib/useToast'
import useAttendance from '../lib/useAttendance'
import AttendanceHistory from './AttendanceHistory'
import GeofenceRadarCard from './shared/GeofenceRadarCard'
import EmployeeLeaveTab from './employee/EmployeeLeaveTab'
import EmployeePayslipTab from './employee/EmployeePayslipTab'

const PORTAL_TABS = [
  { id: 'absen', label: 'Absen' },
  { id: 'cuti', label: 'Cuti saya' },
  { id: 'slip-gaji', label: 'Slip gaji' },
]

export default function EmployeePortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('absen')
  const [employeeProfile, setEmployeeProfile] = useState(null)
  const [leavesData, setLeavesData] = useState({ leaveQuota: 12, requests: [] })

  const { currentTime, currentDateStr } = useLiveClock()
  const { toast, showToast } = useToast()
  const ensureToken = useAuthEnsure(currentUser, 'employee@kerabat.id')

  const fetchData = useCallback(async () => {
    await ensureToken()

    try {
      const profRes = await api.get('/employees/me')
      setEmployeeProfile(profRes.data)
    } catch {
      setEmployeeProfile({
        user: {
          name: currentUser.name || 'Bima Pratama',
          email: currentUser.email,
        },
        position: { name: 'Staff Engineer', baseSalary: 10000000 },
        department: { name: 'Engineering' },
        leaveQuota: 12,
      })
    }

    try {
      const leaveRes = await api.get('/leaves/my')
      setLeavesData(leaveRes.data || { leaveQuota: 12, requests: [] })
    } catch (e) {
      console.warn('Gagal memuat cuti:', e)
    }
  }, [currentUser, ensureToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const {
    officeLocation,
    radius: maxOfficeRadius,
    attendances,
    todayAttendance,
    loading: clockActionLoading,
    simulatedDistance,
    setSimulatedDistance,
    realCoords,
    gpsLoading,
    detectRealGps,
    isWithinGeofence,
    clockIn: handleClockIn,
    clockOut: handleClockOut,
    resetToday: handleResetToday,
    stats: attendanceStats,
  } = useAttendance({ ensureToken, notify: showToast })

  const userName =
    employeeProfile?.user?.name || currentUser.name || 'Bima Pratama'
  const isDemoEmployee =
    (currentUser?.backendEmail || currentUser?.email) === 'employee@kerabat.id'

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans antialiased flex flex-col items-center">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${
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

      {/* TOP HEADER */}
      <header className="w-full max-w-3xl px-5 pt-7 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900">
            Halo, {userName}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">{currentDateStr}</p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer shadow-2xs"
        >
          Keluar
        </button>
      </header>

      {/* PILL TABS NAVIGATION */}
      <nav className="w-full max-w-3xl px-5 mb-6">
        <div className="bg-[#f1ede6] p-1 rounded-xl grid grid-cols-3 gap-1">
          {PORTAL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT CONTAINER */}
      <main className="w-full max-w-3xl px-5 pb-14 flex flex-col gap-5">
        {/* TAB 1: ABSEN (Page 3 desain_UI.pdf) */}
        {activeTab === 'absen' && (
          <>
            {/* HERO CLOCK CARD */}
            <div className="bg-gradient-to-br from-[#c44d27] to-[#9c3919] text-white rounded-2xl p-6 md:p-8 shadow-sm">
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

            {/* 3 METRICS ROW */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-[#ece7de] py-4 px-2 text-center shadow-xs">
                <div className="text-3xl font-extrabold text-stone-900 leading-tight">
                  {leavesData?.leaveQuota ?? employeeProfile?.leaveQuota ?? 12}
                </div>
                <div className="text-[11px] text-stone-500 font-medium mt-1">
                  Sisa cuti
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#ece7de] py-4 px-2 text-center shadow-xs">
                <div className="text-3xl font-extrabold text-stone-900 leading-tight">
                  {attendanceStats.lateCount}x
                </div>
                <div className="text-[11px] text-stone-500 font-medium mt-1">
                  Terlambat bulan ini
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#ece7de] py-4 px-2 text-center shadow-xs">
                <div className="text-3xl font-extrabold text-stone-900 leading-tight">
                  {attendanceStats.workedHours}j
                </div>
                <div className="text-[11px] text-stone-500 font-medium mt-1">
                  Jam kerja
                </div>
              </div>
            </div>

            {/* GEOFENCE RADAR CARD */}
            <GeofenceRadarCard
              officeLocation={officeLocation}
              maxOfficeRadius={maxOfficeRadius}
              simulatedDistance={simulatedDistance}
              setSimulatedDistance={setSimulatedDistance}
              realCoords={realCoords}
              gpsLoading={gpsLoading}
              detectRealGps={detectRealGps}
              isWithinGeofence={isWithinGeofence}
              variant="warm"
            />

            {/* RIWAYAT ABSENSI CARD */}
            <div className="bg-white rounded-2xl border border-[#ece7de] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3">
                Riwayat absensi
              </h3>
              <AttendanceHistory records={attendances} />
            </div>
          </>
        )}

        {/* TAB 2: CUTI SAYA (Page 4 desain_UI.pdf) */}
        {activeTab === 'cuti' && (
          <EmployeeLeaveTab
            leavesData={leavesData}
            isDemoEmployee={isDemoEmployee}
            ensureToken={ensureToken}
            onRefresh={fetchData}
            showToast={showToast}
          />
        )}

        {/* TAB 3: SLIP GAJI (Page 5 desain_UI.pdf) */}
        {activeTab === 'slip-gaji' && (
          <EmployeePayslipTab
            currentUser={currentUser}
            employeeProfile={employeeProfile}
            ensureToken={ensureToken}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  )
}
