import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { LATE_PENALTY_PER_DAY } from '../../lib/constants'
import { downloadBlob, formatRupiah } from '../../lib/formatters'
import AttendanceHistory from '../AttendanceHistory'
import GeofenceRadarCard from '../shared/GeofenceRadarCard'
import PeriodSelector from '../shared/PeriodSelector'

/**
 * Tab 3 Portal HR: Absensi Geofence Kampus 2 UNP Kediri (Radius 200m) & Rekap Bulanan (Page 11 desain_UI.pdf).
 */
export default function HRAbsensiTab({
  currentTime,
  attendance,
  ensureToken,
}) {
  const [recapPeriod, setRecapPeriod] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [recapRows, setRecapRows] = useState([])
  const [recapLoading, setRecapLoading] = useState(false)

  const {
    officeLocation,
    radius: maxOfficeRadius,
    attendances: myAttendances,
    todayAttendance,
    loading: clockLoading,
    simulatedDistance,
    setSimulatedDistance,
    realCoords,
    gpsLoading,
    detectRealGps,
    isWithinGeofence,
    clockIn: handleHrClockIn,
    clockOut: handleHrClockOut,
    stats: myAttendanceStats,
  } = attendance

  const fetchAttendanceRecap = useCallback(async () => {
    setRecapLoading(true)
    try {
      await ensureToken()
      const res = await api.get('/attendance/recap', {
        params: { month: recapPeriod.month, year: recapPeriod.year },
      })
      setRecapRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.warn('Gagal memuat rekap absensi:', err)
      setRecapRows([])
    } finally {
      setRecapLoading(false)
    }
  }, [ensureToken, recapPeriod.month, recapPeriod.year])

  useEffect(() => {
    fetchAttendanceRecap()
  }, [fetchAttendanceRecap])

  const exportRecapCsv = () => {
    const header = [
      'Nama',
      'Email',
      'Departemen',
      'Hadir',
      'Telat',
      'Alpa',
      'Cuti/Izin',
      'Lembur (jam)',
      'Potongan Telat (Rp)',
    ]
    const lines = recapRows.map((r) =>
      [
        r.name,
        r.email,
        r.department ?? '-',
        r.summary.present,
        r.summary.late,
        r.summary.alpha,
        r.summary.leave,
        r.summary.overtimeHours,
        r.summary.late * LATE_PENALTY_PER_DAY,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    downloadBlob(
      blob,
      `rekap_absensi_${recapPeriod.year}-${String(recapPeriod.month).padStart(2, '0')}.csv`
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Absensi</h2>
        <p className="text-xs text-stone-500 mt-1">
          Clock in dan clock out hanya bisa dilakukan dalam radius{' '}
          {maxOfficeRadius}m area {officeLocation.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Radar & Clock In/Out */}
        <GeofenceRadarCard
          officeLocation={officeLocation}
          maxOfficeRadius={maxOfficeRadius}
          simulatedDistance={simulatedDistance}
          setSimulatedDistance={setSimulatedDistance}
          realCoords={realCoords}
          gpsLoading={gpsLoading}
          detectRealGps={detectRealGps}
          isWithinGeofence={isWithinGeofence}
          variant="emerald"
          headerSlot={
            <div className="text-4xl font-black text-stone-900 tracking-tight mb-2">
              {currentTime}
            </div>
          }
          footerSlot={
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
                disabled={
                  clockLoading ||
                  !todayAttendance?.clockIn ||
                  !!todayAttendance?.clockOut
                }
                className="py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {todayAttendance?.clockOut ? 'Sudah Clock out' : 'Clock out'}
              </button>
            </div>
          }
        />

        {/* Right Card: Riwayat Absensi */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 mb-4">
              Riwayat absensi
            </h3>
            <AttendanceHistory records={myAttendances} />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-stone-100 mt-4">
            <div>
              <div className="text-2xl font-black text-stone-900">
                {myAttendanceStats.workedHours} jam
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                Total jam kerja bulan ini
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-stone-900">
                {myAttendanceStats.lateCount} kali
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                Terlambat bulan ini
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rekap Absensi Bulanan (HR) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Rekap absensi bulanan
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Telat dipotong Rp100.000 per hari. Data diambil langsung dari
              absensi karyawan.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodSelector
              month={recapPeriod.month}
              year={recapPeriod.year}
              onChange={setRecapPeriod}
              variant="emerald"
            />
            <button
              onClick={exportRecapCsv}
              disabled={recapRows.length === 0}
              className="px-3 py-2 rounded-lg bg-[#0f3832] hover:bg-[#14473f] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
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
                <th className="py-2 px-2 font-semibold text-center">
                  Cuti/Izin
                </th>
                <th className="py-2 px-2 font-semibold text-center">
                  Lembur (jam)
                </th>
                <th className="py-2 pl-2 font-semibold text-right">
                  Potongan telat
                </th>
              </tr>
            </thead>
            <tbody>
              {recapLoading ? (
                <tr>
                  <td colSpan="7" className="py-4 text-stone-400">
                    Memuat rekap...
                  </td>
                </tr>
              ) : recapRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 text-stone-400">
                    Belum ada data absensi pada periode ini.
                  </td>
                </tr>
              ) : (
                recapRows.map((r) => (
                  <tr key={r.employeeId} className="border-b border-stone-100">
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-stone-900">{r.name}</div>
                      <div className="text-stone-500">
                        {r.department ?? '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {r.summary.present}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[#b86d1a] font-semibold">
                      {r.summary.late}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[#c44d27] font-semibold">
                      {r.summary.alpha}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {r.summary.leave}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {r.summary.overtimeHours}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-semibold">
                      {formatRupiah(r.summary.late * LATE_PENALTY_PER_DAY)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
