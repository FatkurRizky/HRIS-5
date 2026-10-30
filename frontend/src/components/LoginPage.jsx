import { useState, useRef } from 'react'
import api from '../lib/api'
import EmployeePortal from './EmployeePortal'
import ManagerPortal from './ManagerPortal'
import HRPortal from './HRPortal'
import SuperAdminPortal from './SuperAdminPortal'
import AuthHeroPanel from './auth/AuthHeroPanel'
import LoginFormView from './auth/LoginFormView'
import RegisterFormView from './auth/RegisterFormView'

// 4 User Personas according to desain_UI.pdf
const DEMO_ACCOUNTS = [
  {
    role: 'Employee',
    label: 'Employee',
    email: 'bima@kerabat.id',
    backendEmail: 'employee@kerabat.id',
    name: 'Bima Pratama',
    portal: 'Portal Karyawan',
    description:
      'Akses cepat absensi GPS radius kantor, jatah cuti, dan slip gaji mandiri.',
    features: [
      'Clock-in Geofence (Radius 200m)',
      'Pengajuan Cuti Online',
      'Unduh Slip Gaji PDF',
    ],
  },
  {
    role: 'Manager',
    label: 'Manager',
    email: 'sari@kerabat.id',
    backendEmail: 'manager@kerabat.id',
    name: 'Sari Utami',
    portal: 'Portal Manager & Team Lead',
    description:
      'Tinjau performa tim, kalender kehadiran, dan approval cuti berjenjang (Layer 1).',
    features: [
      'Approval Cuti Layer 1 (1-Click)',
      'Monitoring Tim Hari Ini',
      'Kalender Shift Tim',
    ],
  },
  {
    role: 'HR',
    label: 'HR',
    email: 'rina@kerabat.id',
    backendEmail: 'hr@kerabat.id',
    name: 'Rina Kusuma',
    portal: 'Portal HR Administrator',
    description:
      'Manajemen master data karyawan, approval cuti final (Layer 2), dan payroll engine.',
    features: [
      'Master Karyawan & Wizard Onboarding',
      'Approval Final Cuti L2',
      'Kalkulasi Payroll & Slip Gaji',
    ],
  },
  {
    role: 'SuperAdmin',
    label: 'SuperAdmin',
    email: 'admin@kerabat.id',
    backendEmail: 'admin@kerabat.id',
    name: 'Admin Kerabat',
    portal: 'Portal Governance & System Control',
    description:
      'Konfigurasi titik geofence kantor, hak akses role pengguna, dan audit logging.',
    features: [
      'Konfigurasi Titik GPS & Radius Kantor',
      'Manajemen Role & Akses',
      'System Audit Trail Log',
    ],
  },
]

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('nama@kerabat.id')
  const [password, setPassword] = useState('')
  const [activeRole, setActiveRole] = useState(null)
  const [regForm, setRegForm] = useState({
    name: '',
    dept: 'Engineering',
    email: '',
    password: '',
    confirmPassword: '',
    agree: true,
  })
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const toastTimerRef = useRef(null)

  const triggerToast = (type, title, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ type, title, message })
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
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

    const matchedDemo = DEMO_ACCOUNTS.find(
      (acc) =>
        acc.email.toLowerCase() === email.toLowerCase() ||
        acc.backendEmail.toLowerCase() === email.toLowerCase()
    )

    try {
      const emailToSend = matchedDemo?.backendEmail || email
      const response = await api.post('/auth/login', {
        email: emailToSend,
        password,
      })
      const token = response.data?.accessToken ?? response.data?.token
      if (token) localStorage.setItem('hris_token', token)

      const roleFound = matchedDemo || {
        role: response.data?.user?.role || 'Employee',
        label: response.data?.user?.role || 'Karyawan',
        email,
        name: response.data?.user?.name || email.split('@')[0],
        portal: 'Portal HRIS Terintegrasi',
      }

      setStatus('success')
      setCurrentUser(roleFound)
      triggerToast(
        'success',
        'Berhasil Masuk!',
        `Selamat datang kembali, ${roleFound.name}`
      )
    } catch (err) {
      if (matchedDemo && password === 'kerabat123') {
        setStatus('success')
        setCurrentUser(matchedDemo)
        triggerToast(
          'success',
          'Masuk Mode Demo',
          `Berhasil login sebagai ${matchedDemo.name} (${matchedDemo.role})`
        )
      } else {
        setStatus('error')
        const backendMsg = err?.response?.data?.message || err.message
        setErrorMessage(
          backendMsg && backendMsg !== 'Network Error'
            ? backendMsg
            : 'Email atau kata sandi tidak valid. Gunakan akun demo atau email terdaftar.'
        )
      }
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!regForm.name.trim() || regForm.name.trim().length < 3) {
      setErrorMessage('Nama lengkap minimal 3 karakter.')
      return
    }
    if (!regForm.email.trim() || regForm.email.trim() === 'nama@kerabat.id') {
      setErrorMessage('Mohon masukkan email kerja yang valid.')
      return
    }
    if (!regForm.password || regForm.password.length < 8) {
      setErrorMessage('Kata sandi minimal 8 karakter.')
      return
    }
    if (regForm.password !== regForm.confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.')
      return
    }
    if (!regForm.agree) {
      setErrorMessage('Anda harus menyetujui kebijakan privasi perusahaan.')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await api.post('/auth/register', {
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        password: regForm.password,
        department: regForm.dept,
      })
      const assignedNik = res.data?.user?.employee?.nik

      setStatus('idle')
      setEmail(regForm.email.trim().toLowerCase())
      setPassword(regForm.password)
      setIsRegistering(false)
      triggerToast(
        'success',
        'Akun Berhasil Tersimpan di Database!',
        `Akun ${regForm.email.trim().toLowerCase()}${assignedNik ? ` (${assignedNik})` : ''} telah terdaftar. Silakan klik Masuk.`
      )
    } catch (err) {
      setStatus('error')
      const backendMsg = err?.response?.data?.message
      const formattedMsg = Array.isArray(backendMsg)
        ? backendMsg.join(', ')
        : backendMsg
      setErrorMessage(
        formattedMsg ||
          'Gagal mendaftarkan akun ke database. Pastikan server backend aktif.'
      )
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hris_token')
    setCurrentUser(null)
    setPassword('')
    setActiveRole(null)
    triggerToast('info', 'Sesi Berakhir', 'Anda telah keluar dari sistem HRIS.')
  }

  // Multi-persona role-based portal dispatcher
  if (currentUser) {
    const r = String(currentUser.role || '').toUpperCase()
    if (r === 'MANAGER') {
      return <ManagerPortal currentUser={currentUser} onLogout={handleLogout} />
    }
    if (r === 'HR') {
      return <HRPortal currentUser={currentUser} onLogout={handleLogout} />
    }
    if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN') {
      return (
        <SuperAdminPortal currentUser={currentUser} onLogout={handleLogout} />
      )
    }
    return <EmployeePortal currentUser={currentUser} onLogout={handleLogout} />
  }

  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2 select-none overflow-x-hidden font-sans">
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full transition-all duration-300">
          <div className="p-4 rounded-xl shadow-2xl border flex items-start space-x-3 bg-white text-stone-800 border-stone-200">
            <span className="text-lg mt-0.5">
              {toast.type === 'success'
                ? '✅'
                : toast.type === 'error'
                  ? '⚠️'
                  : 'ℹ️'}
            </span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#112a27]">
                {toast.title}
              </h4>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-stone-400 hover:text-stone-600 text-sm font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <AuthHeroPanel />

      <div className="relative bg-[#f4f3ef] p-8 sm:p-14 lg:p-16 xl:p-24 flex items-center justify-center overflow-hidden min-h-screen">
        <div className="absolute -top-16 -left-16 w-96 h-96 bg-[#e7c7a5] opacity-25 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#ded9cf] opacity-40 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-[440px] relative z-10 flex flex-col justify-center">
          {!isRegistering ? (
            <LoginFormView
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              errorMessage={errorMessage}
              clearError={() => errorMessage && setErrorMessage('')}
              status={status}
              activeRole={activeRole}
              demoAccounts={DEMO_ACCOUNTS}
              onSelectDemo={handleSelectDemo}
              onSubmit={handleSubmit}
              onSwitchRegister={() => {
                setIsRegistering(true)
                setErrorMessage('')
              }}
              onForgotPassword={() =>
                triggerToast(
                  'info',
                  'Lupa Kata Sandi',
                  'Silakan hubungi administrator HR perusahaan Anda untuk reset kata sandi.'
                )
              }
            />
          ) : (
            <RegisterFormView
              regForm={regForm}
              setRegForm={setRegForm}
              errorMessage={errorMessage}
              status={status}
              onSubmit={handleRegisterSubmit}
              onSwitchLogin={() => {
                setIsRegistering(false)
                setErrorMessage('')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
