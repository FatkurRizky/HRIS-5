import { useState, useEffect, useCallback, useMemo } from 'react'
import api from './api'
import { KAMPUS_2_UNP_OFFICE } from './constants'

const EARTH_RADIUS_METERS = 6371000
const METERS_PER_DEGREE_LAT = (EARTH_RADIUS_METERS * Math.PI) / 180 // ~111194.93m
const CURRENT_MONTH_PREFIX = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(EARTH_RADIUS_METERS * c)
}

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function extractApiError(err, fallback) {
  const msg = err?.response?.data?.message
  return (Array.isArray(msg) ? msg.join(', ') : msg) || fallback
}

/**
 * Logika absensi bersama untuk semua portal (Karyawan, HR, Manager).
 * Lokasi default & aktif: Kampus 2 UNP Kediri (-7.8036003, 112.005465) dengan radius 200 meter.
 *
 * @param {{ ensureToken: () => Promise<any>, notify: (type: 'success'|'error'|'info', message: string) => void }} opts
 */
export default function useAttendance({ ensureToken, notify }) {
  const [officeLocation, setOfficeLocation] = useState(KAMPUS_2_UNP_OFFICE)
  const [attendances, setAttendances] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simulatedDistance, setSimulatedDistanceState] = useState(80)
  const [realCoords, setRealCoords] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  const radius = officeLocation?.radius || KAMPUS_2_UNP_OFFICE.radius
  const isWithinGeofence = simulatedDistance <= radius

  const setSimulatedDistance = useCallback((val) => {
    setRealCoords(null)
    setSimulatedDistanceState(Number(val))
  }, [])

  const refresh = useCallback(async () => {
    await ensureToken()
    try {
      const locRes = await api.get('/office-locations')
      if (Array.isArray(locRes.data) && locRes.data.length > 0) {
        const active = locRes.data.find((l) => l.isActive) || locRes.data[0]
        setOfficeLocation({
          ...KAMPUS_2_UNP_OFFICE,
          ...active,
        })
      }
    } catch {
      // Gunakan konfigurasi Kampus 2 UNP Kediri jika offline
    }

    try {
      const res = await api.get('/attendance/my-records')
      const records = Array.isArray(res.data) ? res.data : []
      setAttendances(records)
      const today = localDateKey()
      setTodayAttendance(
        records.find((r) => r.date && r.date.startsWith(today)) || null
      )
    } catch (e) {
      console.warn('Gagal memuat absensi:', e)
    }
  }, [ensureToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  const detectRealGps = useCallback(() => {
    if (!navigator.geolocation) {
      notify('error', 'Browser Anda tidak mendukung fitur GPS Geolocation.')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const dist = calculateHaversineDistance(
          latitude,
          longitude,
          officeLocation.latitude,
          officeLocation.longitude
        )
        setRealCoords({ latitude, longitude })
        setSimulatedDistanceState(dist)
        setGpsLoading(false)
        if (dist <= radius) {
          notify(
            'success',
            `GPS terdeteksi: ${dist}m dari ${officeLocation.name} (Dalam radius <= ${radius}m).`
          )
        } else {
          notify(
            'error',
            `GPS terdeteksi: ${dist}m dari ${officeLocation.name} (Di luar radius ${radius}m, tidak bisa absen).`
          )
        }
      },
      () => {
        setGpsLoading(false)
        notify(
          'error',
          'Gagal mengambil lokasi GPS perangkat. Pastikan izin lokasi browser aktif.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [notify, officeLocation.latitude, officeLocation.longitude, officeLocation.name, radius])

  const buildCoords = () => {
    if (realCoords) {
      return realCoords
    }
    return {
      latitude:
        officeLocation.latitude + simulatedDistance / METERS_PER_DEGREE_LAT,
      longitude: officeLocation.longitude,
    }
  }

  const clockIn = async () => {
    if (!isWithinGeofence) {
      notify(
        'error',
        `Tidak bisa absen! Anda berada ${simulatedDistance}m dari ${officeLocation.name} (maksimal radius ${radius}m).`
      )
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
        err?.response?.status === 409
          ? 'Anda sudah clock in hari ini.'
          : extractApiError(
              err,
              'Clock in gagal. Pastikan server berjalan dan coba lagi.'
            )
      )
    } finally {
      await refresh()
      setLoading(false)
    }
  }

  const clockOut = async () => {
    if (!isWithinGeofence) {
      notify(
        'error',
        `Tidak bisa clock out! Anda berada ${simulatedDistance}m dari ${officeLocation.name} (maksimal radius ${radius}m).`
      )
      return
    }
    setLoading(true)
    try {
      await ensureToken()
      const res = await api.post('/attendance/clock-out', buildCoords())
      notify('success', res.data?.message || 'Clock out berhasil dicatat!')
    } catch (err) {
      notify('error', extractApiError(err, 'Clock out gagal. Coba lagi.'))
    } finally {
      await refresh()
      setLoading(false)
    }
  }

  const resetToday = async () => {
    setLoading(true)
    try {
      await api.delete('/attendance/today')
      notify('info', 'Absen hari ini di-reset. Silakan Clock in kembali.')
    } catch (err) {
      notify('error', extractApiError(err, 'Reset absen gagal.'))
    } finally {
      await refresh()
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const monthRecords = attendances.filter(
      (a) => a.date && a.date.startsWith(CURRENT_MONTH_PREFIX)
    )
    const lateCount = monthRecords.filter((a) => a.status === 'LATE').length
    const workedMs = monthRecords.reduce((sum, a) => {
      if (!a.clockIn || !a.clockOut) return sum
      return sum + Math.max(0, new Date(a.clockOut) - new Date(a.clockIn))
    }, 0)
    return { lateCount, workedHours: Math.round(workedMs / 36e5) }
  }, [attendances])

  return {
    officeLocation,
    radius,
    attendances,
    todayAttendance,
    loading,
    simulatedDistance,
    setSimulatedDistance,
    realCoords,
    gpsLoading,
    detectRealGps,
    isWithinGeofence,
    clockIn,
    clockOut,
    resetToday,
    refresh,
    stats,
  }
}
