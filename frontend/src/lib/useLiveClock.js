import { useState, useEffect } from 'react'

function readClockSnapshot() {
  const now = new Date()
  return {
    currentTime: now
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      .replace(/\./g, ':'),
    currentDateStr: new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now),
  }
}

/**
 * Jam & tanggal real-time berbahasa Indonesia untuk kartu absensi dan beranda.
 */
export default function useLiveClock() {
  const [clock, setClock] = useState(readClockSnapshot)

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(readClockSnapshot())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return clock
}
