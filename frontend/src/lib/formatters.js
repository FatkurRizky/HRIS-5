/**
 * Utilitas pemformatan mata uang, waktu, status karyawan, periode bulan, dan unduhan file.
 */

export function formatRupiah(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function formatTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(date)
    .replace('.', ':')
}

export function getInitials(name) {
  if (!name) return 'KR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatStatusLabel(status) {
  if (!status) return 'Probation'
  const upper = status.toUpperCase()
  if (upper === 'TETAP') return 'Tetap'
  if (upper === 'KONTRAK') return 'Kontrak'
  if (upper === 'PROBATION') return 'Probation'
  return status
}

export function getStatusBadgeStyle(statusLabel) {
  if (statusLabel === 'Tetap') return 'bg-[#e8f7ee] text-[#1b7a43]'
  if (statusLabel === 'Kontrak') return 'bg-[#ebf3fb] text-[#285a84]'
  return 'bg-[#fef3eb] text-[#b86d1a]'
}

export function shiftMonthPeriod(month, year, deltaMonths) {
  const zeroIndexed = month - 1 + deltaMonths
  const nextYear = year + Math.floor(zeroIndexed / 12)
  const nextMonth = (((zeroIndexed % 12) + 12) % 12) + 1
  return { month: nextMonth, year: nextYear }
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
