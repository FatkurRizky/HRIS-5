import { useState, useMemo, useRef, useEffect } from 'react'

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const SHORT_MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

const DAYS_HEADER = [
  { label: 'Sen', isWeekend: false },
  { label: 'Sel', isWeekend: false },
  { label: 'Rab', isWeekend: false },
  { label: 'Kam', isWeekend: false },
  { label: 'Jum', isWeekend: false },
  { label: 'Sab', isWeekend: true },
  { label: 'Min', isWeekend: true },
]

const SHORT_DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// Helper: Date object -> "YYYY-MM-DD"
export function toIsoDateStr(dateObj) {
  if (!dateObj) return ''
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Helper: "YYYY-MM-DD" -> Date object (local midnight)
export function parseIsoDateStr(str) {
  if (!str) return null
  const parts = str.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

// Format ala Tiket KAI: "Sel, 03 Nov 2026"
export function formatKaiDate(str) {
  const d = parseIsoDateStr(str)
  if (!d) return null
  const dayName = SHORT_DAYS_ID[d.getDay()]
  const dateNum = String(d.getDate()).padStart(2, '0')
  const monthName = SHORT_MONTHS_ID[d.getMonth()]
  const yearNum = d.getFullYear()
  return `${dayName}, ${dateNum} ${monthName} ${yearNum}`
}

// Hitung jumlah hari kerja (Senin-Jumat) & total hari kalender
export function calculateLeaveDays(startStr, endStr) {
  const start = parseIsoDateStr(startStr)
  const end = parseIsoDateStr(endStr)
  if (!start || !end || end < start) {
    return { totalDays: 0, workDays: 0, weekendDays: 0 }
  }

  let totalDays = 0
  let workDays = 0
  let weekendDays = 0
  const cur = new Date(start)

  while (cur <= end) {
    totalDays++
    const dayOfWeek = cur.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++
    } else {
      workDays++
    }
    cur.setDate(cur.getDate() + 1)
  }

  return { totalDays, workDays, weekendDays }
}

export default function TrainCalendarPicker({
  startDate,
  endDate,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  // 'start' = sedang pilih tanggal mulai, 'end' = sedang pilih tanggal selesai
  const [selectingStep, setSelectingStep] = useState('start')
  const [hoverDateStr, setHoverDateStr] = useState(null)

  const initialViewDate = useMemo(() => {
    const parsed = parseIsoDateStr(startDate)
    return parsed || new Date()
  }, [startDate])

  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth())

  const containerRef = useRef(null)

  // Tutup popover jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Bangun grid kalender (Senin s/d Minggu) untuk bulan aktif
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    // Konversi getDay() (0=Minggu..6=Sabtu) ke indeks Senin=0..Minggu=6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7

    const cells = []
    for (let i = 0; i < startOffset; i++) {
      cells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(viewYear, viewMonth, day)
      const iso = toIsoDateStr(dateObj)
      const dow = dateObj.getDay()
      const isWeekend = dow === 0 || dow === 6
      cells.push({
        day,
        iso,
        isWeekend,
      })
    }

    return cells
  }, [viewYear, viewMonth])

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectDate = (iso) => {
    if (selectingStep === 'start' || !startDate) {
      // Jika memilih tanggal mulai baru
      if (endDate && iso <= endDate) {
        onChange({ startDate: iso, endDate })
      } else {
        onChange({ startDate: iso, endDate: iso })
      }
      setSelectingStep('end')
    } else {
      // Sedang memilih tanggal selesai
      if (iso < startDate) {
        // Jika klik tanggal sebelum startDate, jadikan itu startDate baru
        onChange({ startDate: iso, endDate: startDate })
        setSelectingStep('end')
      } else {
        onChange({ startDate, endDate: iso })
        setSelectingStep('start')
      }
    }
  }

  // Pintasan cepat ala KAI / Traveloka
  const applyPreset = (type) => {
    const base = new Date()
    if (type === 'besok') {
      const d1 = new Date(base)
      d1.setDate(d1.getDate() + 1)
      if (d1.getDay() === 6) d1.setDate(d1.getDate() + 2)
      if (d1.getDay() === 0) d1.setDate(d1.getDate() + 1)
      const s = toIsoDateStr(d1)
      onChange({ startDate: s, endDate: s })
      setViewYear(d1.getFullYear())
      setViewMonth(d1.getMonth())
    } else if (type === '3hari') {
      const d1 = new Date(base)
      // Cari hari Senin minggu depan
      const daysUntilNextMon = ((8 - d1.getDay()) % 7) || 7
      d1.setDate(d1.getDate() + daysUntilNextMon)
      const d2 = new Date(d1)
      d2.setDate(d1.getDate() + 2)
      onChange({ startDate: toIsoDateStr(d1), endDate: toIsoDateStr(d2) })
      setViewYear(d1.getFullYear())
      setViewMonth(d1.getMonth())
    } else if (type === '5hari') {
      const d1 = new Date(base)
      const daysUntilNextMon = ((8 - d1.getDay()) % 7) || 7
      d1.setDate(d1.getDate() + daysUntilNextMon)
      const d2 = new Date(d1)
      d2.setDate(d1.getDate() + 4)
      onChange({ startDate: toIsoDateStr(d1), endDate: toIsoDateStr(d2) })
      setViewYear(d1.getFullYear())
      setViewMonth(d1.getMonth())
    } else if (type === 'reset') {
      onChange({ startDate: '', endDate: '' })
      setSelectingStep('start')
    }
  }

  const { totalDays, workDays, weekendDays } = useMemo(
    () => calculateLeaveDays(startDate, endDate),
    [startDate, endDate]
  )

  const todayIso = toIsoDateStr(new Date())

  return (
    <div className="relative" ref={containerRef}>
      {/* =================================================================== */}
      {/* TRIGGER BOX ALA PEMESANAN TIKET KERETA API (BERANGKAT ⇄ PULANG)     */}
      {/* =================================================================== */}
      <div
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true)
            setSelectingStep('start')
          }
        }}
        className={`w-full bg-[#fbf9f4] border rounded-2xl p-3.5 transition cursor-pointer select-none ${
          isOpen
            ? 'border-[#c44d27] ring-2 ring-[#c44d27]/15 bg-white'
            : 'border-[#e8e4db] hover:border-[#c44d27]/60'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-2.5">
          {/* Kolom Kiri: Tanggal Mulai Cuti */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(true)
              setSelectingStep('start')
            }}
            className={`sm:col-span-5 p-2.5 rounded-xl border transition ${
              isOpen && selectingStep === 'start'
                ? 'bg-[#fef3eb] border-[#c44d27]'
                : 'bg-white border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              <span>📅</span>
              <span>Tanggal Mulai Cuti</span>
            </div>
            {startDate ? (
              <div className="text-sm font-extrabold text-stone-900">
                {formatKaiDate(startDate)}
              </div>
            ) : (
              <div className="text-xs font-semibold text-stone-400">
                Pilih tanggal mulai...
              </div>
            )}
          </div>

          {/* Tengah: Badge Durasi / Icon Kereta */}
          <div className="sm:col-span-1 flex sm:flex-col items-center justify-center py-0.5">
            <div className="w-7 h-7 rounded-full bg-[#fef3eb] border border-[#f5d0b8] text-[#c44d27] flex items-center justify-center text-xs font-bold shadow-2xs">
              ⇄
            </div>
          </div>

          {/* Kolom Kanan: Tanggal Selesai Cuti */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(true)
              setSelectingStep('end')
            }}
            className={`sm:col-span-5 p-2.5 rounded-xl border transition ${
              isOpen && selectingStep === 'end'
                ? 'bg-[#fef3eb] border-[#c44d27]'
                : 'bg-white border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              <span>🏁</span>
              <span>Tanggal Selesai Cuti</span>
            </div>
            {endDate ? (
              <div className="text-sm font-extrabold text-stone-900">
                {formatKaiDate(endDate)}
              </div>
            ) : (
              <div className="text-xs font-semibold text-stone-400">
                Pilih tanggal selesai...
              </div>
            )}
          </div>
        </div>

        {/* Bar Info Durasi di Bawah Box */}
        {startDate && endDate && (
          <div className="mt-2.5 pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-[#c44d27]" />
              <span>
                Total rentang: <strong className="text-stone-900">{totalDays} hari</strong>
                {weekendDays > 0 && (
                  <span className="text-stone-500"> (termasuk {weekendDays} hari Sabtu/Minggu)</span>
                )}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fef3eb] text-[#c44d27] font-extrabold">
              Potong Kuota: {workDays} Hari Kerja
            </span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* POPUP KALENDER INTERAKTIF GAYA PEMESANAN TIKET KERETA API INDONESIA */}
      {/* =================================================================== */}
      {isOpen && (
        <div className="mt-2 bg-white rounded-2xl border border-[#dcd7cb] shadow-xl p-4 sm:p-5 z-40 relative animate-in fade-in duration-150">
          {/* Step Indicator & Quick Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectingStep('start')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectingStep === 'start'
                    ? 'bg-[#c44d27] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                1. Pilih Mulai
              </button>
              <span className="text-stone-300 text-xs">→</span>
              <button
                type="button"
                onClick={() => setSelectingStep('end')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectingStep === 'end'
                    ? 'bg-[#c44d27] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                2. Pilih Selesai
              </button>
            </div>

            {/* Pintasan Cepat */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset('besok')}
                className="px-2 py-1 rounded-md bg-[#fbf9f4] hover:bg-[#fef3eb] border border-stone-200 text-[10px] font-bold text-stone-700 hover:text-[#c44d27] transition cursor-pointer"
              >
                Besok (1 hr)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('3hari')}
                className="px-2 py-1 rounded-md bg-[#fbf9f4] hover:bg-[#fef3eb] border border-stone-200 text-[10px] font-bold text-stone-700 hover:text-[#c44d27] transition cursor-pointer"
              >
                Minggu Depan (3 hr)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('5hari')}
                className="px-2 py-1 rounded-md bg-[#fbf9f4] hover:bg-[#fef3eb] border border-stone-200 text-[10px] font-bold text-stone-700 hover:text-[#c44d27] transition cursor-pointer"
              >
                1 Minggu (5 hr)
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => applyPreset('reset')}
                  className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-600 transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Header Navigasi Bulan & Tahun */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
              title="Bulan Sebelumnya"
            >
              ‹
            </button>
            <div className="text-sm font-extrabold text-stone-900 tracking-tight">
              {MONTHS_ID[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
              title="Bulan Berikutnya"
            >
              ›
            </button>
          </div>

          {/* Nama Hari (Sen - Min) */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {DAYS_HEADER.map((d) => (
              <div
                key={d.label}
                className={`text-[11px] font-extrabold py-1 ${
                  d.isWeekend ? 'text-rose-500' : 'text-stone-400'
                }`}
              >
                {d.label}
              </div>
            ))}
          </div>

          {/* Tanggal dalam Bulan */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-11" />
              }

              const isStart = startDate === cell.iso
              const isEnd = endDate === cell.iso
              const isSelectedEdge = isStart || isEnd

              // Preview rentang saat hover memilih tanggal selesai
              const effectiveEnd =
                selectingStep === 'end' && hoverDateStr && hoverDateStr >= startDate
                  ? hoverDateStr
                  : endDate

              const isInRange =
                startDate &&
                effectiveEnd &&
                cell.iso > startDate &&
                cell.iso < effectiveEnd

              const isToday = cell.iso === todayIso

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleSelectDate(cell.iso)}
                  onMouseEnter={() => setHoverDateStr(cell.iso)}
                  onMouseLeave={() => setHoverDateStr(null)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer select-none ${
                    isSelectedEdge
                      ? 'bg-[#c44d27] text-white font-extrabold shadow-xs scale-[1.02]'
                      : isInRange
                        ? 'bg-[#fef3eb] text-[#c44d27] font-bold border border-[#f5d0b8]'
                        : 'hover:bg-stone-100 text-stone-800 font-semibold'
                  }`}
                >
                  <span
                    className={`text-xs leading-none ${
                      !isSelectedEdge && !isInRange && cell.isWeekend
                        ? 'text-rose-500 font-bold'
                        : ''
                    }`}
                  >
                    {cell.day}
                  </span>

                  {/* Sub-label di bawah angka tanggal (Mulai / Selesai / Hari Ini) */}
                  {isStart && isEnd ? (
                    <span className="text-[8px] font-extrabold uppercase tracking-tighter text-orange-100 mt-0.5">
                      1 Hari
                    </span>
                  ) : isStart ? (
                    <span className="text-[8px] font-extrabold uppercase tracking-tighter text-orange-100 mt-0.5">
                      Mulai
                    </span>
                  ) : isEnd ? (
                    <span className="text-[8px] font-extrabold uppercase tracking-tighter text-orange-100 mt-0.5">
                      Selesai
                    </span>
                  ) : isToday ? (
                    <span className="text-[8px] font-bold text-[#c44d27] mt-0.5">
                      Hari ini
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Footer Kalender */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
              <span>Tanggal merah (Sabtu & Minggu) bebas potongan kuota cuti</span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-[#c44d27] hover:bg-[#b0421e] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              Selesai Pilih Tanggal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
