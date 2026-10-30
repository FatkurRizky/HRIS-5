const SHORT_MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export const DAYS_HEADER = [
  { label: 'Sen', isWeekend: false },
  { label: 'Sel', isWeekend: false },
  { label: 'Rab', isWeekend: false },
  { label: 'Kam', isWeekend: false },
  { label: 'Jum', isWeekend: false },
  { label: 'Sab', isWeekend: true },
  { label: 'Min', isWeekend: true },
]

const SHORT_DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/**
 * Konversi Date object ke string ISO lokal "YYYY-MM-DD".
 */
export function toIsoDateStr(dateObj) {
  if (!dateObj) return ''
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Konversi string "YYYY-MM-DD" ke Date object (midnight lokal).
 */
export function parseIsoDateStr(str) {
  if (!str) return null
  const parts = str.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

/**
 * Format tanggal ala tiket KAI: "Sel, 03 Nov 2026".
 */
export function formatKaiDate(str) {
  const d = parseIsoDateStr(str)
  if (!d) return null
  const dayName = SHORT_DAYS_ID[d.getDay()]
  const dateNum = String(d.getDate()).padStart(2, '0')
  const monthName = SHORT_MONTHS_ID[d.getMonth()]
  const yearNum = d.getFullYear()
  return `${dayName}, ${dateNum} ${monthName} ${yearNum}`
}

/**
 * Hitung jumlah hari kerja (Senin-Jumat), akhir pekan, & total hari kalender.
 */
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

/**
 * Bangun grid kalender (Senin s/d Minggu) untuk bulan & tahun aktif.
 */
export function buildCalendarCells(viewYear, viewMonth) {
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7

  const cells = []
  for (let i = 0; i < startOffset; i++) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(viewYear, viewMonth, day)
    const iso = toIsoDateStr(dateObj)
    const dow = dateObj.getDay()
    cells.push({
      day,
      iso,
      isWeekend: dow === 0 || dow === 6,
    })
  }

  return cells
}

/**
 * Kalkulasi pintasan cepat rentang tanggal cuti ('besok' | '3hari' | '5hari').
 */
export function computeCalendarPreset(type, baseDate = new Date()) {
  if (type === 'besok') {
    const d1 = new Date(baseDate)
    d1.setDate(d1.getDate() + 1)
    if (d1.getDay() === 6) d1.setDate(d1.getDate() + 2)
    if (d1.getDay() === 0) d1.setDate(d1.getDate() + 1)
    const iso = toIsoDateStr(d1)
    return { startDate: iso, endDate: iso, year: d1.getFullYear(), month: d1.getMonth() }
  }

  const extraDays = type === '5hari' ? 4 : 2
  const d1 = new Date(baseDate)
  const daysUntilNextMon = ((8 - d1.getDay()) % 7) || 7
  d1.setDate(d1.getDate() + daysUntilNextMon)
  const d2 = new Date(d1)
  d2.setDate(d1.getDate() + extraDays)

  return {
    startDate: toIsoDateStr(d1),
    endDate: toIsoDateStr(d2),
    year: d1.getFullYear(),
    month: d1.getMonth(),
  }
}
