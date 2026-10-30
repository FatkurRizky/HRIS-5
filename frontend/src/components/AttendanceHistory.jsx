const STATUS_MAP = {
  PRESENT: ['Tepat waktu', 'bg-[#e8f7ee] text-[#1b7a43]'],
  LATE: ['Terlambat', 'bg-[#fef3eb] text-[#c44d27]'],
  ALPHA: ['Alpa', 'bg-rose-100 text-rose-700'],
  LEAVE: ['Cuti/Izin', 'bg-[#ebf3fb] text-[#285a84]'],
}

function formatAttendanceDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function formatClockTime(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
}

/** Daftar riwayat absensi dari data asli backend (dipakai semua portal). */
export default function AttendanceHistory({ records, limit = 15 }) {
  return (
    <div className="divide-y divide-stone-100">
      {records.length === 0 ? (
        <div className="py-4 text-xs text-stone-400">Belum ada riwayat absensi.</div>
      ) : (
        records.slice(0, limit).map((rec) => {
          const [label, badge] = STATUS_MAP[rec.status] || [rec.status, 'bg-stone-100 text-stone-600']
          return (
            <div key={rec.id || rec.date} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-stone-800">{formatAttendanceDate(rec.date)}</div>
                <div className="text-stone-500 mt-0.5">
                  Masuk {formatClockTime(rec.clockIn)} · Pulang {formatClockTime(rec.clockOut)}
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${badge}`}>{label}</span>
            </div>
          )
        })
      )}
    </div>
  )
}
