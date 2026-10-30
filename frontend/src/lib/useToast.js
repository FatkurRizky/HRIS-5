import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Hook notifikasi toast bebas race-condition (membersihkan timer sebelumnya saat toast baru muncul).
 */
export default function useToast(durationMs = 3500) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback(
    (type, message) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      setToast({ type, message })
      timerRef.current = setTimeout(() => {
        setToast(null)
        timerRef.current = null
      }, durationMs)
    },
    [durationMs]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { toast, showToast }
}
