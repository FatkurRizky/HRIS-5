import { useState, useEffect, useCallback } from 'react'
import api from './api'

const DEFAULT_OFFICE = {
  name: 'Kantor Pusat',
  latitude: -7.8166,
  longitude: 112.0114,
  radius: 50,
}

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Logika absensi bersama untuk semua portal (Karyawan, HR, Manager).
 * Semua data berasal dari backend; tidak ada status "berhasil" palsu.
 *
 * @param {{ ensureToken: () => Promise<any>, notify: (type: 'success'|'error'|'info', message: string) => void }} opts
 */
export default function useAttendance({ ensureToken, notify }) {
  const [officeLocation, setOfficeLocation] = useState(DEFAULT_OFFICE)
  const [attendances, setAttendances] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simulatedDistance, setSimulatedDistance] = useState(40)

  const radius = officeLocation?.radius || 50
  const isWithinGeofence = simulatedDistance <= radius

  const refresh = useCallback(async () => {
    await ensureToken()
    try {
      const locRes = await api.get('/office-locations')
      if (Array.isArray(locRes.data) && locRes.data.length > 0) {
        setOfficeLocation(locRes.data.find((l) => l.isActive) || locRes.data[0])
      }
    } catch {
      // pakai lokasi kantor default
    }
    try {
      const res = await api.get('/attendance/my-records')
      const records = Array.isArray(res.data) ? res.data : []
      setAttendances(records)
      const today = localDateKey()
      setTodayAttendance(records.find((r) => r.date && r.date.startsWith(today)) || null)
    } catch (e) {
      console.warn('Gagal memuat absensi:', e)
    }
  }, [ensureToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  const buildCoords = () => ({
    latitude: officeLocation.latitude + (simulatedDistance * 0.9) / 111320,
    longitude: officeLocation.longitude,
  })

  const errorMessage = (err, fallback) => {
    const msg = err.response?.data?.message
    return (Array.isArray(msg) ? msg.join(', ') : msg) || fallback
  }

  const clockIn = async () => {
    if (!isWithinGeofence) {
      notify('error', `Di luar radius kantor (${simulatedDistance}m > ${radius}m). Dekati kantor untuk Clock in.`)
      return
    }
    setLoading(true)
    try {
      await ensureToken()
      const res = await api.post('/attendance/clock-in', buildCoords())
      notify('success', res.data?.message || 'Clock in berhasil dicatat!')
    } catch (err) {
      notify(
        'error',
        err.response?.status === 409
          ? 'Anda sudah clock in hari ini.'
          : errorMessage(err, 'Clock in gagal. Pastikan server berjalan dan coba lagi.')
      )
    } finally {
      await refresh()
      setLoading(false)
    }
  }

  const clockOut = async () => {
    if (!isWithinGeofence) {
      notify('error', `Di luar radius kantor (${simulatedDistance}m > ${radius}m). Dekati kantor untuk Clock out.`)
      return
    }
    setLoading(true)
    try {
      await ensureToken()
      const res = await api.post('/attendance/clock-out', buildCoords())
      notify('success', res.data?.message || 'Clock out berhasil dicatat!')
    } catch (err) {
      notify('error', errorMessage(err, 'Clock out gagal. Coba lagi.'))
    } finally {
      await refresh()
      setLoading(false)
    }
  }

  // Hapus absen hari ini (untuk demo berulang)
  const resetToday = async () => {
    setLoading(true)
    try {
      await api.delete('/attendance/today')
      notify('info', 'Absen hari ini di-reset. Silakan Clock in kembali.')
    } catch (err) {
      notify('error', errorMessage(err, 'Reset absen gagal.'))
    } finally {
      await refresh()
      setLoading(false)
    }
  }

  // Statistik bulan berjalan dari data asli
  const stats = (() => {
    const now = new Date()
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const month = attendances.filter((a) => a.date && a.date.startsWith(prefix))
    const lateCount = month.filter((a) => a.status === 'LATE').length
    const workedMs = month.reduce((sum, a) => {
      if (!a.clockIn || !a.clockOut) return sum
      return sum + Math.max(0, new Date(a.clockOut) - new Date(a.clockIn))
    }, 0)
    return { lateCount, workedHours: Math.round(workedMs / 36e5) }
  })()

  return {
    officeLocation,
    attendances,
    todayAttendance,
    loading,
    simulatedDistance,
    setSimulatedDistance,
    isWithinGeofence,
    clockIn,
    clockOut,
    resetToday,
    refresh,
    stats,
  }
}
