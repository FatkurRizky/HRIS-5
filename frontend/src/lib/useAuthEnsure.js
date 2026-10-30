import { useCallback } from 'react'
import api from './api'

/**
 * Memastikan JWT token tersedia di localStorage untuk sesi aktif maupun mode demo.
 */
export default function useAuthEnsure(currentUser, fallbackEmail) {
  return useCallback(async () => {
    const existing = localStorage.getItem('hris_token')
    if (existing) return existing
    try {
      const email =
        currentUser?.backendEmail || currentUser?.email || fallbackEmail
      const res = await api.post('/auth/login', {
        email,
        password: 'kerabat123',
      })
      const token = res.data?.accessToken ?? res.data?.token
      if (token) {
        localStorage.setItem('hris_token', token)
        return token
      }
    } catch {
      // Abaikan jika backend belum berjalan (mode offline)
    }
    return null
  }, [currentUser, fallbackEmail])
}
