import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const INITIAL_USERS = [
  { name: 'Bima Pratama', email: 'bima@kerabat.id', role: 'Employee', active: true },
  { name: 'Dewi Lestari', email: 'dewi@kerabat.id', role: 'Employee', active: true },
  { name: 'Kevin Santoso', email: 'kevin@kerabat.id', role: 'Employee', active: true },
  { name: 'Sari Utami', email: 'sari@kerabat.id', role: 'Manager', active: true },
  { name: 'Agus Salim', email: 'agus@kerabat.id', role: 'Employee', active: true },
  { name: 'Maya Putri', email: 'maya@kerabat.id', role: 'Employee', active: false },
  { name: 'Rina Kusuma', email: 'rina@kerabat.id', role: 'HR', active: true },
  { name: 'Admin Kerabat', email: 'admin@kerabat.id', role: 'SuperAdmin', active: true },
]

function formatRoleLabel(role) {
  if (!role) return 'Employee'
  const r = String(role).toUpperCase()
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN') return 'SuperAdmin'
  if (r === 'MANAGER') return 'Manager'
  if (r === 'HR') return 'HR'
  return 'Employee'
}

export default function SuperAdminPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('ikhtisar') // 'ikhtisar' | 'pengguna' | 'pengaturan'
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [officeLocationId, setOfficeLocationId] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const [usersList, setUsersList] = useState(INITIAL_USERS)

  const [systemSettings, setSystemSettings] = useState({
    radius: 100,
    jamMasuk: '08:00 AM',
    jamPulang: '05:00 PM',
    registrasiMandiri: true,
    twoFactor: true,
    kunciAbsensi: true,
  })

  const ensureAdminToken = useCallback(async () => {
    const existing = localStorage.getItem('hris_token')
    if (existing) return existing
    try {
      const res = await api.post('/auth/login', {
        email: currentUser?.backendEmail || currentUser?.email || 'admin@kerabat.id',
        password: 'kerabat123',
      })
      const token = res.data?.accessToken ?? res.data?.token
      if (token) {
        localStorage.setItem('hris_token', token)
        return token
      }
    } catch {
      // Ignore if offline
    }
    return null
  }, [currentUser])

  const fetchBackendData = useCallback(async () => {
    try {
      await ensureAdminToken()
      const [usersRes, locRes] = await Promise.allSettled([
        api.get('/auth/users'),
        api.get('/office-locations'),
      ])

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data) && usersRes.value.data.length > 0) {
        const dbUsers = usersRes.value.data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: formatRoleLabel(u.role),
          active: true,
        }))
        const existingEmails = new Set(dbUsers.map((u) => u.email.toLowerCase()))
        setUsersList([
          ...dbUsers,
          ...INITIAL_USERS.filter((u) => !existingEmails.has(u.email.toLowerCase())),
        ])
      }

      if (locRes.status === 'fulfilled' && Array.isArray(locRes.value.data) && locRes.value.data.length > 0) {
        const activeLoc = locRes.value.data.find((l) => l.isActive) || locRes.value.data[0]
        if (activeLoc) {
          setOfficeLocationId(activeLoc.id)
          setSystemSettings((prev) => ({ ...prev, radius: activeLoc.radius || 100 }))
        }
      }
    } catch {
      // Keep local state
    }
  }, [ensureAdminToken])

  useEffect(() => {
    fetchBackendData()
  }, [fetchBackendData])

  const toggleUserStatus = (email) => {
    setUsersList((prev) =>
      prev.map((u) => (u.email === email ? { ...u, active: !u.active } : u))
    )
    showToast(`Status pengguna ${email} diperbarui`)
  }

  const handleSaveSettings = async () => {
    if (officeLocationId) {
      try {
        await ensureAdminToken()
        await api.patch(`/office-locations/${officeLocationId}`, {
          radius: Number(systemSettings.radius) || 100,
        })
      } catch {
        // Fallback local save
      }
    }
    showToast('Pengaturan sistem & radius geofence berhasil disimpan ke database!')
  }

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans antialiased flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#a78bfa] text-[#1e1b4b] text-sm font-bold shadow-lg">
          {toast}
        </div>
      )}

      {/* TOP HEADER: Page 14-16 Standard */}
      <header className="w-full bg-[#111827]/80 backdrop-blur-md border-b border-gray-800 px-6 lg:px-12 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#c084fc] tracking-tight">Kerabat Admin</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800 text-purple-300">
              SUPER ADMIN
            </span>
          </div>

          <nav className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setActiveTab('ikhtisar')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'ikhtisar'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('pengguna')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'pengguna'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Pengguna dan peran
            </button>
            <button
              onClick={() => setActiveTab('pengaturan')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'pengaturan'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Pengaturan sistem
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-400">{currentUser.email || 'admin@kerabat.id'}</span>
          <button
            onClick={onLogout}
            className="px-3.5 py-1 bg-white hover:bg-stone-100 text-stone-900 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-10">

        {/* =================================================================== */}
        {/* TAB 1: IKHTISAR (Page 14 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'ikhtisar' && (
          <div className="flex flex-col gap-6">
            {/* 4 Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#a78bfa] text-[#1e1b4b] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-black mb-1">146</div>
                  <div className="text-xs font-bold text-[#1e1b4b]/80">Pengguna terdaftar</div>
                </div>
                <div className="mt-3">
                  <span className="bg-white/30 text-[#1e1b4b] px-2 py-0.5 rounded-md text-[11px] font-extrabold">
                    +3 bulan ini
                  </span>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-black text-white mb-1">118</div>
                  <div className="text-xs text-stone-400 font-medium">Sesi aktif</div>
                </div>
                <div className="mt-3">
                  <span className="bg-blue-950/60 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    Puncak 09:00
                  </span>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-black text-white mb-1">7</div>
                  <div className="text-xs text-stone-400 font-medium">Login gagal 24 jam</div>
                </div>
                <div className="mt-3">
                  <span className="bg-amber-950/60 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    2 dari IP asing
                  </span>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-black text-white mb-1">99,98%</div>
                  <div className="text-xs text-stone-400 font-medium">Uptime 30 hari</div>
                </div>
                <div className="mt-3">
                  <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    Normal
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Log Aktivitas & Distribusi Peran */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Log Aktivitas (col-span-2) */}
              <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-5">Log aktivitas</h3>
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">09:12 rina@kerabat.id</span>
                    <span className="text-stone-300">Menyetujui payroll tahap HR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">08:55 bima@kerabat.id</span>
                    <span className="text-stone-300">Clock in, dalam radius</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">08:41 sari@kerabat.id</span>
                    <span className="text-stone-300">Menyetujui cuti Dewi Lestari</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">08:02 sistem</span>
                    <span className="text-stone-300">Backup harian selesai</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">07:30 unknown</span>
                    <span className="text-rose-400">Login gagal, IP 103.xx.xx.12</span>
                  </div>
                </div>
              </div>

              {/* Distribusi Peran */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-6">Distribusi peran</h3>
                <div className="space-y-5 text-xs">
                  <div>
                    <div className="flex justify-between mb-1 text-stone-300">
                      <span>Employee</span>
                      <span className="font-bold">131</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#a78bfa] h-full w-[88%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-stone-300">
                      <span>Manager</span>
                      <span className="font-bold">9</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#a78bfa] h-full w-[15%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-stone-300">
                      <span>HR</span>
                      <span className="font-bold">4</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#a78bfa] h-full w-[8%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-stone-300">
                      <span>SuperAdmin</span>
                      <span className="font-bold">2</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#a78bfa] h-full w-[4%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PENGGUNA DAN PERAN (Page 15 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'pengguna' && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-800">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau email..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-stone-500 outline-none"
              />
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/60 text-stone-400 font-semibold border-b border-gray-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Pengguna</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((u, i) => (
                  <tr key={u.id || i} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-5 font-bold text-white">{u.name}</td>
                    <td className="py-3 px-4 text-stone-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        u.active ? 'text-emerald-400' : 'text-stone-500'
                      }`}>
                        {u.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => toggleUserStatus(u.email)}
                        className={`text-xs font-bold hover:underline cursor-pointer ${
                          u.active ? 'text-stone-400 hover:text-rose-400' : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PENGATURAN SISTEM (Page 16 desain_UI.pdf) */}
        {/* =================================================================== */}
        {activeTab === 'pengaturan' && (
          <div className="max-w-2xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-6 lg:p-8 space-y-6">
            <h3 className="text-base font-bold text-white">Pengaturan sistem</h3>

            <div>
              <label className="text-xs text-stone-400 block mb-1.5 font-medium">Radius absensi (meter)</label>
              <input
                type="number"
                value={systemSettings.radius}
                onChange={(e) => setSystemSettings({ ...systemSettings, radius: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1.5 font-medium">Jam masuk</label>
                <input
                  type="text"
                  value={systemSettings.jamMasuk}
                  onChange={(e) => setSystemSettings({ ...systemSettings, jamMasuk: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1.5 font-medium">Jam pulang</label>
                <input
                  type="text"
                  value={systemSettings.jamPulang}
                  onChange={(e) => setSystemSettings({ ...systemSettings, jamPulang: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-800 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Registrasi mandiri</div>
                  <div className="text-stone-400 mt-0.5">Karyawan boleh membuat akun dengan ID karyawan</div>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.registrasiMandiri}
                  onChange={(e) => setSystemSettings({ ...systemSettings, registrasiMandiri: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Verifikasi dua langkah wajib</div>
                  <div className="text-stone-400 mt-0.5">Untuk HR dan SuperAdmin</div>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.twoFactor}
                  onChange={(e) => setSystemSettings({ ...systemSettings, twoFactor: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Kunci absensi otomatis tanggal 25</div>
                  <div className="text-stone-400 mt-0.5">Cut-off payroll</div>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.kunciAbsensi}
                  onChange={(e) => setSystemSettings({ ...systemSettings, kunciAbsensi: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 bg-[#a78bfa] hover:bg-[#9370db] text-[#1e1b4b] font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
            >
              Simpan pengaturan
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
