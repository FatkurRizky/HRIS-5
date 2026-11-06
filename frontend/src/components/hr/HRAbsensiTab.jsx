import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { LATE_PENALTY_PER_DAY } from '../../lib/constants'
import { downloadBlob, formatRupiah, formatTime } from '../../lib/formatters'
import PeriodSelector from '../shared/PeriodSelector'

const ATTENDANCE_STATUS_BADGE = {
  PRESENT: { label: 'Hadir (Tepat Waktu)', cls: 'bg-[#e8f7ee] text-[#1b7a43]' },
  LATE: { label: 'Terlambat', cls: 'bg-[#fef3eb] text-[#b86d1a]' },
  ALPHA: { label: 'Alpa', cls: 'bg-rose-100 text-rose-700' },
  LEAVE: { label: 'Cuti / Izin', cls: 'bg-[#ebf3fb] text-[#285a84]' },
}

function formatDailyDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10)
  return d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Tab 3 Portal HR: Rekapitulasi Absensi Bulanan (Jam Kerja, Terlambat, Alpa)
 * & Riwayat Kehadiran Harian Karyawan (Waktu Masuk, Waktu Pulang, Status).
 */
export default function HRAbsensiTab({ ensureToken }) {
  const [recapPeriod, setRecapPeriod] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [recapRows, setRecapRows] = useState([])
  const [dailyLogs, setDailyLogs] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [recapLoading, setRecapLoading] = useState(false)

  const fetchAttendanceData = useCallback(async () => {
    setRecapLoading(true)
    try {
      await ensureToken()
      const startDate = `${recapPeriod.year}-${String(recapPeriod.month).padStart(2, '0')}-01`
      const lastDay = new Date(recapPeriod.year, recapPeriod.month, 0).getDate()
      const endDate = `${recapPeriod.year}-${String(recapPeriod.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const [recapRes, logsRes] = await Promise.allSettled([
        api.get('/attendance/recap', {
          params: { month: recapPeriod.month, year: recapPeriod.year },
        }),
        api.get('/attendance', {
          params: { startDate, endDate },
        }),
      ])

      if (
        recapRes.status === 'fulfilled' &&
        Array.isArray(recapRes.value.data)
      ) {
        setRecapRows(recapRes.value.data)
      } else {
        setRecapRows([])
      }

      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value.data)) {
        setDailyLogs(logsRes.value.data)
      } else {
        setDailyLogs([])
      }
    } catch (err) {
      console.warn('Gagal memuat rekap absensi:', err)
      setRecapRows([])
      setDailyLogs([])
    } finally {
      setRecapLoading(false)
    }
  }, [ensureToken, recapPeriod.month, recapPeriod.year])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  const exportRecapCsv = () => {
    const header = [
      'Nama',
      'Email',
      'Departemen',
      'Hadir',
      'Jam Kerja (jam)',
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
        r.summary.workHours ?? 0,
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

  const filteredDailyLogs = dailyLogs.filter((log) => {
    if (statusFilter === 'ALL') return true
    return log.status === statusFilter
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">
          Rekapitulasi &amp; Riwayat Absensi
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Rekap bulanan jam kerja, jumlah keterlambatan, jumlah alpa, serta log
          kehadiran harian karyawan
        </p>
      </div>

      {/* Card 1: Rekapitulasi Absensi Bulanan */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Rekapitulasi absensi bulanan per karyawan
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Mencakup total jam kerja, hadir, keterlambatan (potongan
              Rp100.000/hari), alpa, cuti, dan jam lembur.
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
                <th className="py-2 px-2 font-semibold text-center">
                  Jam Kerja
                </th>
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
                  <td colSpan="8" className="py-4 text-stone-400">
                    Memuat rekap...
                  </td>
                </tr>
              ) : recapRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-4 text-stone-400">
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
                    <td className="py-2.5 px-2 text-center font-semibold text-stone-800">
                      {r.summary.workHours ?? 0}j
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

      {/* Card 2: Riwayat Kehadiran Harian Karyawan */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Riwayat kehadiran harian karyawan
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Log waktu masuk (clock-in), waktu pulang (clock-out), dan status
              kehadiran harian
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#f4f3ef] border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-800 outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PRESENT">Hadir (Tepat Waktu)</option>
            <option value="LATE">Terlambat</option>
            <option value="ALPHA">Alpa</option>
            <option value="LEAVE">Cuti / Izin</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-stone-500 border-b border-stone-200">
                <th className="py-2 pr-3 font-semibold">Tanggal</th>
                <th className="py-2 px-2 font-semibold">Karyawan</th>
                <th className="py-2 px-2 font-semibold text-center">
                  Waktu Masuk
                </th>
                <th className="py-2 px-2 font-semibold text-center">
                  Waktu Pulang
                </th>
                <th className="py-2 pl-2 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredDailyLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-stone-400">
                    Belum ada log kehadiran harian untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredDailyLogs.map((log) => {
                  const badge = ATTENDANCE_STATUS_BADGE[log.status] || {
                    label: log.status,
                    cls: 'bg-stone-100 text-stone-700',
                  }
                  return (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-3 font-medium text-stone-800">
                        {formatDailyDate(log.date)}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-stone-900">
                          {log.employee?.user?.name || 'Karyawan'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {log.employee?.department?.name || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-stone-800">
                        {formatTime(log.clockIn)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-stone-800">
                        {formatTime(log.clockOut)}
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
