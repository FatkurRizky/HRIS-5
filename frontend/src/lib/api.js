import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Otomatis kirim JWT token jika user sudah login
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hris_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Tangani pencabutan sesi / penonaktifan akun secara langsung tanpa mengganggu halaman login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const reqUrl = String(error?.config?.url || '')
    const isAuthFormRequest =
      reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register')

    if (!isAuthFormRequest && typeof window !== 'undefined') {
      const status = error?.response?.status
      const rawMsg = error?.response?.data?.message
      const message = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg
      const isDeactivatedForbidden =
        status === 403 &&
        typeof message === 'string' &&
        message.toLowerCase().includes('dinonaktifkan')

      if (
        (status === 401 || isDeactivatedForbidden) &&
        localStorage.getItem('hris_token')
      ) {
        localStorage.removeItem('hris_token')
        localStorage.removeItem('hris_user')
        window.dispatchEvent(
          new CustomEvent('hris:force-logout', {
            detail: {
              message:
                message ||
                'Sesi Anda telah berakhir atau akun dinonaktifkan oleh Administrator.',
            },
          })
        )
      }
    }

    return Promise.reject(error)
  }
)

export default api

