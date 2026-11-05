/**
 * Utilitas murni untuk Portal SuperAdmin: pemetaan role RBAC, parser stream SSE,
 * pemformatan waktu WIB, dan aturan fallback login offline.
 */

export const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'HR', label: 'HR' },
  { value: 'SUPER_ADMIN', label: 'SuperAdmin' },
]

/**
 * Mengubah nilai enum Role backend menjadi label tampilan UI.
 * @param {string} [role]
 * @returns {'SuperAdmin' | 'HR' | 'Manager' | 'Employee'}
 */
export function apiRoleToLabel(role) {
  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN') {
    return 'SuperAdmin'
  }
  if (normalized === 'MANAGER') return 'Manager'
  if (normalized === 'HR') return 'HR'
  return 'Employee'
}

/**
 * Mengubah label peran UI atau string role menjadi enum Role backend.
 * @param {string} [labelOrRole]
 * @returns {'SUPER_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE'}
 */
export function roleLabelToApiRole(labelOrRole) {
  const normalized = String(labelOrRole || '').trim().toUpperCase()
  if (normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN') {
    return 'SUPER_ADMIN'
  }
  if (normalized === 'MANAGER') return 'MANAGER'
  if (normalized === 'HR') return 'HR'
  return 'EMPLOYEE'
}

/**
 * Menentukan apakah fallback Mode Demo diizinkan saat request login gagal.
 * Fallback HANYA diizinkan jika server benar-benar tidak dapat dijangkau (!error.response),
 * TIDAK PERNAH saat backend mengembalikan 401/403/429 (salah sandi atau akun dinonaktifkan).
 *
 * @param {any} error
 * @param {object|null|undefined} matchedDemo
 * @param {string} password
 * @returns {boolean}
 */
export function shouldUseOfflineDemoFallback(error, matchedDemo, password) {
  if (!matchedDemo || password !== 'kerabat123') return false
  if (error?.response) return false
  return true
}

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function toWibParts(dateInput, nowInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return null

  const wibDate = new Date(d.getTime() + 7 * 3600000)
  const nowDate = nowInput instanceof Date ? nowInput : new Date(nowInput)
  const wibNow = new Date(nowDate.getTime() + 7 * 3600000)

  const sameDay =
    wibDate.getUTCFullYear() === wibNow.getUTCFullYear() &&
    wibDate.getUTCMonth() === wibNow.getUTCMonth() &&
    wibDate.getUTCDate() === wibNow.getUTCDate()

  return {
    sameDay,
    day: String(wibDate.getUTCDate()).padStart(2, '0'),
    monthShort: MONTH_SHORT_ID[wibDate.getUTCMonth()] || '',
    hours: String(wibDate.getUTCHours()).padStart(2, '0'),
    minutes: String(wibDate.getUTCMinutes()).padStart(2, '0'),
  }
}

/**
 * Memformat timestamp aktivitas ke zona waktu WIB (UTC+7).
 * Menampilkan HH:mm jika terjadi hari ini, atau "DD MMM HH:mm" jika hari sebelumnya.
 *
 * @param {string | Date} isoOrDate
 * @param {Date} [referenceNow]
 * @returns {string}
 */
export function formatActivityTimeWib(isoOrDate, referenceNow = new Date()) {
  if (!isoOrDate) return '--:--'
  const parts = toWibParts(isoOrDate, referenceNow)
  if (!parts) return '--:--'
  if (parts.sameDay) {
    return `${parts.hours}:${parts.minutes}`
  }
  return `${parts.day} ${parts.monthShort} ${parts.hours}:${parts.minutes}`
}

/**
 * Memformat durasi uptime server (detik) menjadi teks ringkas Bahasa Indonesia.
 *
 * @param {number | null | undefined} uptimeSeconds
 * @returns {string}
 */
export function formatUptimeLabel(uptimeSeconds) {
  if (uptimeSeconds === null || uptimeSeconds === undefined) return '-'
  const total = Math.max(0, Math.floor(Number(uptimeSeconds) || 0))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  if (days > 0) return `${days}h ${hours}j`
  if (hours > 0) return `${hours}j ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}d`
  return `${seconds} detik`
}

/**
 * Mem-parsing buffer teks Server-Sent Events (SSE) secara aman terhadap potongan chunk TCP.
 *
 * @param {string} rawBuffer
 * @returns {{ events: Array<any>, remainder: string }}
 */
export function parseSseBuffer(rawBuffer) {
  if (!rawBuffer) return { events: [], remainder: '' }

  const normalized = rawBuffer.replace(/\r\n/g, '\n')
  const blocks = normalized.split('\n\n')
  const remainder = blocks.pop() ?? ''
  const events = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const dataLines = []
    for (const line of trimmed.split('\n')) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }

    if (dataLines.length === 0) continue
    const jsonPayload = dataLines.join('\n')
    try {
      events.push(JSON.parse(jsonPayload))
    } catch {
      // Abaikan frame non-JSON (mis. komentar keep-alive)
    }
  }

  return { events, remainder }
}
