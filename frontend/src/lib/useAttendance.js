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

  const applyDetectedCoords = useCallback(
    (latitude, longitude, sourceLabel) => {
      const lat = Number(latitude)
      const lon = Number(longitude)
      const dist = calculateHaversineDistance(
        lat,
        lon,
        officeLocation.latitude,
        officeLocation.longitude
      )
      setRealCoords({
        latitude: lat,
        longitude: lon,
        source: sourceLabel,
      })
      setSimulatedDistanceState(dist)
      setGpsLoading(false)
      if (dist <= radius) {
        notify(
          'success',
          `GPS (${sourceLabel}) aktif: ${dist}m dari ${officeLocation.name} (Dalam radius <= ${radius}m).`
        )
      } else {
        notify(
          'info',
          `GPS (${sourceLabel}) terdeteksi: ${(dist / 1000).toFixed(2)} km (${dist}m) dari ${officeLocation.name}. Klik "Set Titik Kantor ke GPS Saya" jika ingin tes absen di lokasi Anda saat ini.`
        )
      }
    },
    [notify, officeLocation.latitude, officeLocation.longitude, officeLocation.name, radius]
  )

  const fetchNetworkGeoFallback = useCallback(
    async (reasonMsg) => {
      try {
        const res = await fetch('https://ipwho.is/')
        const data = await res.json()
        if (data && data.success !== false && data.latitude && data.longitude) {
          const label = data.city
            ? `Jaringan ISP · ${data.city}`
            : 'Jaringan ISP'
          applyDetectedCoords(data.latitude, data.longitude, label)
          return
        }
      } catch {
        // Lanjut ke fallback ke-2
      }

      try {
        const res2 = await fetch('https://get.geojs.io/v1/ip/geo.json')
        const data2 = await res2.json()
        if (data2 && data2.latitude && data2.longitude) {
          const label = data2.city
            ? `Jaringan ISP · ${data2.city}`
            : 'Jaringan ISP'
          applyDetectedCoords(
            Number(data2.latitude),
            Number(data2.longitude),
            label
          )
          return
        }
      } catch {
        // Gagal semua
      }

      setGpsLoading(false)
      notify(
        'error',
        reasonMsg ||
          'Gagal mengambil lokasi GPS perangkat maupun jaringan. Pastikan koneksi internet & izin lokasi browser aktif.'
      )
    },
    [applyDetectedCoords, notify]
  )

  const detectRealGps = useCallback(() => {
    setGpsLoading(true)

    if (!navigator.geolocation) {
      fetchNetworkGeoFallback(
        'Browser tidak mendukung Geolocation API, gagal mengambil lokasi jaringan.'
      )
      return
    }

    // Tahap 1: Coba High Accuracy (GPS perangkat / Wi-Fi positioning)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyDetectedCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          'GPS Perangkat'
        )
      },
      (errHigh) => {
        // Tahap 2: Di Linux Desktop tanpa modul GPS, enableHighAccuracy sering gagal (code 2/3). Coba mode standar:
        navigator.geolocation.getCurrentPosition(
          (posLow) => {
            applyDetectedCoords(
              posLow.coords.latitude,
              posLow.coords.longitude,
              'GPS Browser'
            )
          },
          () => {
            // Tahap 3: Fallback otomatis ke Real Network/ISP Geolocation agar di PC Linux tetap jalan
            const msg =
              errHigh?.code === 1
                ? 'Izin lokasi browser ditolak (Blocked).'
                : 'Sensor GPS perangkat tidak tersedia di OS/Browser ini.'
            fetchNetworkGeoFallback(msg)
          },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 }
    )
  }, [applyDetectedCoords, fetchNetworkGeoFallback])

  const calibrateOfficeToMyGps = useCallback(async () => {
    if (!realCoords) return
    const updatedLoc = {
      ...officeLocation,
      name: `Lokasi GPS Saya (${realCoords.source || 'Aktif'})`,
      latitude: Number(realCoords.latitude.toFixed(6)),
      longitude: Number(realCoords.longitude.toFixed(6)),
      mapsUrl: `https://www.google.com/maps?q=${realCoords.latitude},${realCoords.longitude}`,
    }
    setOfficeLocation(updatedLoc)
    setSimulatedDistanceState(0)

    if (officeLocation?.id) {
      try {
        await ensureToken()
        await api.patch(`/office-locations/${officeLocation.id}`, {
          latitude: updatedLoc.latitude,
          longitude: updatedLoc.longitude,
        })
      } catch (e) {
        console.warn('Kalibrasi lokal diterapkan:', e)
      }
    }
    notify(
      'success',
      'Titik kantor berhasil disinkronkan ke koordinat GPS Anda saat ini (Jarak: 0m). Silakan Clock in!'
    )
  }, [ensureToken, notify, officeLocation, realCoords])

  const resetOfficeToKampusUnp = useCallback(async () => {
    const restored = {
      ...officeLocation,
      name: KAMPUS_2_UNP_OFFICE.name,
      latitude: KAMPUS_2_UNP_OFFICE.latitude,
      longitude: KAMPUS_2_UNP_OFFICE.longitude,
      radius: KAMPUS_2_UNP_OFFICE.radius,
      mapsUrl: KAMPUS_2_UNP_OFFICE.mapsUrl,
    }
    setOfficeLocation(restored)

    if (realCoords) {
      const dist = calculateHaversineDistance(
        realCoords.latitude,
        realCoords.longitude,
        KAMPUS_2_UNP_OFFICE.latitude,
        KAMPUS_2_UNP_OFFICE.longitude
      )
      setSimulatedDistanceState(dist)
    } else {
      setSimulatedDistanceState(80)
    }

    if (officeLocation?.id) {
      try {
        await ensureToken()
        await api.patch(`/office-locations/${officeLocation.id}`, {
          name: KAMPUS_2_UNP_OFFICE.name,
          latitude: KAMPUS_2_UNP_OFFICE.latitude,
          longitude: KAMPUS_2_UNP_OFFICE.longitude,
          radius: KAMPUS_2_UNP_OFFICE.radius,
        })
      } catch (e) {
        console.warn('Reset lokasi lokal diterapkan:', e)
      }
    }
    notify('info', 'Titik kantor dikembalikan ke Kampus 2 UNP Kediri.')
  }, [ensureToken, notify, officeLocation, realCoords])

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
    calibrateOfficeToMyGps,
    resetOfficeToKampusUnp,
    isWithinGeofence,
    clockIn,
    clockOut,
    resetToday,
    refresh,
    stats,
  }
}
