import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { LATE_PENALTY_PER_DAY } from '../../lib/constants'
import { downloadBlob, formatRupiah } from '../../lib/formatters'
import PeriodSelector from '../shared/PeriodSelector'

/**
 * Tab 3 Portal HR: Rekap Absensi Bulanan Karyawan (Staf).
 * HR dan Manager tidak memiliki absensi pribadi, sehingga tab ini murni menampilkan rekapitulasi staf.
 */
export default function HRAbsensiTab({ ensureToken }) {
  const [recapPeriod, setRecapPeriod] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [recapRows, setRecapRows] = useState([])
  const [recapLoading, setRecapLoading] = useState(false)

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
        <h2 className="text-2xl font-bold text-stone-900">Rekap Absensi Karyawan</h2>
        <p className="text-xs text-stone-500 mt-1">
          Monitoring kehadiran dan rekapitulasi absensi seluruh staf karyawan bulanan sebagai dasar evaluasi &amp; payroll.
        </p>
      </div>

      {/* Rekap Absensi Bulanan Staf (HR) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Rekap absensi bulanan karyawan
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Telat dipotong Rp100.000 per hari. Data diambil langsung dari absensi seluruh staf karyawan.
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
