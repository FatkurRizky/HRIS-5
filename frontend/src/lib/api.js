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

export default api

