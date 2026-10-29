import { useState } from 'react'
import api from '../lib/api'
import KaryawanPortal from './KaryawanPortal'

// 4 User Personas according to RANCANGAN_UX_HRIS.md
const DEMO_ACCOUNTS = [
  {
    role: 'Employee',
    label: 'Employee',
    email: 'employee@kerabat.id',
    name: 'Budi Santoso',
    portal: 'Portal Karyawan',
    description: 'Akses cepat absensi GPS radius kantor, jatah cuti, dan slip gaji mandiri.',
    features: ['Clock-in Geofence (Radius 50m)', 'Pengajuan Cuti Online', 'Unduh Slip Gaji PDF'],
  },
  {
    role: 'Manager',
    label: 'Manager',
    email: 'manager@kerabat.id',
    name: 'Siti Rahmawati',
    portal: 'Portal Manager & Team Lead',
    description: 'Tinjau performa tim, kalender kehadiran, dan approval cuti berjenjang (Layer 1).',
    features: ['Approval Cuti Layer 1 (1-Click)', 'Monitoring Tim Hari Ini', 'Kalender Shift Tim'],
  },
  {
    role: 'HR',
    label: 'HR',
    email: 'hr@kerabat.id',
    name: 'Agus Purnomo',
    portal: 'Portal HR Administrator',
    description: 'Manajemen master data karyawan, approval cuti final (Layer 2), dan payroll engine.',
    features: ['Master Karyawan & Wizard Onboarding', 'Approval Final Cuti L2', 'Kalkulasi Payroll & Slip Gaji'],
  },
  {
    role: 'SuperAdmin',
    label: 'SuperAdmin',
    email: 'admin@kerabat.id',
    name: 'Fatkur Rizky (Admin)',
    portal: 'Portal Governance & System Control',
    description: 'Konfigurasi titik geofence kantor, hak akses role pengguna, dan audit logging.',
    features: ['Konfigurasi Titik GPS & Radius Kantor', 'Manajemen Role & Akses', 'System Audit Trail Log'],
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('nama@kerabat.id')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activeRole, setActiveRole] = useState(null)
  
  // UX States as per RANCANGAN_UX_HRIS.md Section 4.1
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Show floating toast
  const triggerToast = (type, title, message) => {
    setToast({ type, title, message })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Handle Demo Account autofill
  const handleSelectDemo = (account) => {
    setActiveRole(account.role)
    setEmail(account.email)
    setPassword('kerabat123')
    setErrorMessage('')
    triggerToast(
      'info',
      `Akun Demo: ${account.label}`,
      `Email ${account.email} diisikan otomatis.`
    )
  }

  // Handle Login submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Client-side instant validation
    if (!email || email === 'nama@kerabat.id') {
      setErrorMessage('Mohon masukkan email kerja Anda yang terdaftar di HR.')
      return
    }

    if (!password) {
      setErrorMessage('Kata sandi tidak boleh kosong.')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      // Attempt backend API call first
      const response = await api.post('/auth/login', { email, password })
      const token = response.data?.accessToken ?? response.data?.token
      if (token) {
        localStorage.setItem('hris_token', token)
      }
      
      const roleFound = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === email.toLowerCase()
      ) || {
        role: response.data?.user?.role || 'Employee',
        label: response.data?.user?.role || 'Karyawan',
        email,
        name: response.data?.user?.name || email.split('@')[0],
        portal: 'Portal HRIS Terintegrasi',
        description: 'Selamat datang di Human Resource Information System.',
        features: ['Presensi GPS', 'Pengajuan Cuti', 'Slip Gaji'],
      }

      setStatus('success')
      setCurrentUser(roleFound)
      triggerToast('success', 'Berhasil Masuk!', `Selamat datang kembali, ${roleFound.name}`)
    } catch (err) {
      // If backend is offline or credentials match demo account, gracefully allow demo login
      const matchedDemo = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === email.toLowerCase()
      )

      if (matchedDemo && password === 'kerabat123') {
        setStatus('success')
        setCurrentUser(matchedDemo)
        triggerToast('success', 'Masuk Mode Demo', `Berhasil login sebagai ${matchedDemo.name} (${matchedDemo.role})`)
      } else {
        setStatus('error')
        const backendMsg = err.response?.data?.message || err.message
        setErrorMessage(
          backendMsg && backendMsg !== 'Network Error'
            ? backendMsg
            : 'Email atau kata sandi tidak sesuai. Gunakan akun demo di bawah untuk mencoba.'
        )
        triggerToast('error', 'Gagal Masuk', 'Periksa kembali email dan kata sandi Anda.')
      }
    } finally {
      setStatus('idle')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hris_token')
    setCurrentUser(null)
    setPassword('')
    setActiveRole(null)
    triggerToast('info', 'Sesi Berakhir', 'Anda telah keluar dari sistem HRIS.')
  }

  // =========================================================================
  // LOGGED-IN VIEW: LANGSUNG TERKONEKSI KE PORTAL KARYAWAN (docs/hris/karyawan)
  // =========================================================================
  if (currentUser) {
    return <KaryawanPortal currentUser={currentUser} onLogout={handleLogout} />
  }

  // =========================================================================
  // MAIN LOGIN VIEW: FULL SCREEN EDGE-TO-EDGE (TANPA SPACE / GAP KOSONG)
  // =========================================================================
  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2 select-none overflow-x-hidden">
      
      {/* Floating Toast Notification (UX Success / Feedback State) */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full transition-all duration-300">
          <div className="p-4 rounded-xl shadow-2xl border flex items-start space-x-3 bg-white text-stone-800 border-stone-200">
            <span className="text-lg mt-0.5">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#112a27]">{toast.title}</h4>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-stone-400 hover:text-stone-600 text-sm font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LEFT PANEL: Hero & Branding (Full Height)                      */}
      {/* ============================================================== */}
      <div className="relative bg-gradient-to-br from-[#1b4642] via-[#163e3b] to-[#0f2e2c] p-8 sm:p-14 lg:p-16 xl:p-24 flex flex-col justify-between overflow-hidden text-white min-h-[500px] lg:min-h-screen">
        
        {/* Ambient Light Glow at top right corner */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[#c59858] opacity-20 blur-[120px] rounded-full pointer-events-none" />

        {/* Concentric Decorative Ripple Rings at bottom right corner */}
        <div className="absolute -bottom-48 -right-48 w-[800px] h-[800px] pointer-events-none">
          <div className="absolute w-[800px] h-[800px] rounded-full border border-[rgba(77,137,130,0.22)]" />
          <div className="absolute w-[640px] h-[640px] top-[80px] left-[80px] rounded-full border border-[rgba(77,137,130,0.22)]" />
          <div className="absolute w-[480px] h-[480px] top-[160px] left-[160px] rounded-full border border-[rgba(77,137,130,0.22)]" />
          <div className="absolute w-[320px] h-[320px] top-[240px] left-[240px] rounded-full border border-[rgba(77,137,130,0.22)]" />
        </div>

        {/* Top Branding */}
        <div className="relative z-10 flex items-center space-x-3.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#e68a35] shadow-sm flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-white opacity-95" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a2 2 0 00-2 2v1a2 2 0 002 2 2 2 0 002-2V4a2 2 0 00-2-2zM4 7a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"/>
            </svg>
          </div>
          <span className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight">
            Human Resource Information System
          </span>
        </div>

        {/* Bottom Headline & Feature Bullets */}
        <div className="relative z-10 mt-20 lg:mt-32 max-w-xl">
          <h1 className="text-4xl sm:text-5xl lg:text-[50px] xl:text-[54px] font-extrabold text-white leading-[1.15] tracking-tight mb-10">
            Absensi, cuti, dan<br />
            gaji di satu<br />
            tempat
          </h1>

          {/* Feature List with Amber Checkmarks */}
          <ul className="space-y-5 text-[15px] sm:text-[16px] text-[#9db7b2] font-medium leading-relaxed">
            <li className="flex items-start space-x-3.5">
              <svg className="w-5.5 h-5.5 text-[#e68a35] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Clock in dari radius kantor, tanpa mesin fingerprint</span>
            </li>
            <li className="flex items-start space-x-3.5">
              <svg className="w-5.5 h-5.5 text-[#e68a35] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Cuti disetujui Manager lalu HR, statusnya terlihat jelas</span>
            </li>
            <li className="flex items-start space-x-3.5">
              <svg className="w-5.5 h-5.5 text-[#e68a35] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Slip gaji dihitung otomatis dari absensi dan lembur</span>
            </li>
          </ul>
        </div>

      </div>

      {/* ============================================================== */}
      {/* RIGHT PANEL: Login Form (Full Height, Centered Content)        */}
      {/* ============================================================== */}
      <div className="relative bg-[#eae7e1] p-8 sm:p-14 lg:p-16 xl:p-24 flex items-center justify-center overflow-hidden min-h-screen">
        
        {/* Subtle warm ambient background blur */}
        <div className="absolute -top-16 -left-16 w-96 h-96 bg-[#e7c7a5] opacity-25 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#ded9cf] opacity-40 blur-[100px] rounded-full pointer-events-none" />

        {/* Form Content Wrapper */}
        <div className="w-full max-w-[440px] relative z-10 flex flex-col justify-center">
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#112a27] tracking-tight">Masuk</h2>
            <p className="text-[14px] sm:text-[15px] text-[#697472] mt-2 font-normal">
              Gunakan email kerja yang terdaftar di HR.
            </p>
          </div>

          {/* Inline Error State (UX Specification Section 4.1) */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-start space-x-2.5 animate-fadeIn">
              <span className="font-bold text-base leading-none mt-0.5">⚠️</span>
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form Element */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Input Field */}
            <div>
              <label htmlFor="email" className="block text-[14px] font-bold text-[#142d2a] mb-2">
                Email kerja
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  onFocus={() => {
                    if (email === 'nama@kerabat.id') setEmail('')
                  }}
                  required
                  placeholder="nama@kerabat.id"
                  className="w-full px-4 py-3 rounded-lg bg-[#ede9e2] border-2 border-[#d99748] text-[#16302c] placeholder-[#9c9689] text-[15px] font-medium outline-none transition-all shadow-sm focus:border-[#c58235] focus:bg-[#f2efe9]"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div>
              <label htmlFor="password" className="block text-[14px] font-bold text-[#142d2a] mb-2">
                Kata sandi
              </label>
              <div className="relative rounded-lg bg-[#ede9e2] border border-[#dedad1] focus-within:border-[#d99748] focus-within:border-2 transition-all shadow-sm">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  required
                  placeholder="••••••••"
                  className="w-full pl-4 pr-24 py-3 bg-transparent text-[#16302c] placeholder-[#9c9689] text-[15px] font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#173e3b] hover:text-[#102e2c] transition-colors py-1 px-2 focus:outline-none"
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end mt-2.5">
                <button
                  type="button"
                  onClick={() =>
                    triggerToast(
                      'info',
                      'Lupa Kata Sandi',
                      'Silakan hubungi administrator HR perusahaan Anda untuk permohonan reset password.'
                    )
                  }
                  className="text-[13px] sm:text-[14px] font-bold text-[#173e3b] underline hover:text-[#102e2c] transition-colors"
                >
                  Lupa kata sandi?
                </button>
              </div>
            </div>

            {/* Submit Button (with Loading State & Double-Click Protection) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 px-4 rounded-lg bg-[#173e3b] hover:bg-[#123330] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed text-white font-bold text-[16px] shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>
            </div>

            {/* Registration Notice */}
            <div className="text-center pt-2">
              <p className="text-[14px] text-[#697472]">
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() =>
                    triggerToast(
                      'info',
                      'Pendaftaran Akun Baru',
                      'Pembuatan akun karyawan baru dilakukan oleh HR Admin melalui Wizard Onboarding.'
                    )
                  }
                  className="font-bold text-[#173e3b] underline hover:text-[#102e2c] transition-colors ml-1"
                >
                  Daftar
                </button>
              </p>
            </div>

          </form>

          {/* Akun Demo Card (According to RANCANGAN_UX_HRIS.md 4 Roles) */}
          <div className="mt-8 pt-4 pb-4 px-4 sm:px-5 rounded-xl border border-dashed border-[#ccc7bc] bg-[#e3dfd7]/70">
            <p className="text-[12px] sm:text-[13px] font-medium text-[#646e6b] mb-3">
              Akun demo, kata sandi semuanya <span className="font-bold text-[#354340]">kerabat123</span>
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DEMO_ACCOUNTS.map((account) => {
                const isSelected = activeRole === account.role
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleSelectDemo(account)}
                    className={`py-2 px-2.5 bg-white hover:bg-stone-50 active:bg-amber-50 text-[12px] sm:text-[13px] font-semibold text-[#293c39] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-[#d6d2c8] text-center transition-all ${
                      isSelected ? 'ring-2 ring-[#173e3b] bg-[#f4f7f6]' : ''
                    }`}
                  >
                    {account.label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
