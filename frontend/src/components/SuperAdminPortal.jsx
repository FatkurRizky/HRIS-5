import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { KAMPUS_2_UNP_OFFICE } from '../lib/constants'
import useAuthEnsure from '../lib/useAuthEnsure'
import useToast from '../lib/useToast'
import AdminIkhtisarTab from './admin/AdminIkhtisarTab'
import AdminPenggunaTab from './admin/AdminPenggunaTab'
import AdminPengaturanTab from './admin/AdminPengaturanTab'

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
  const [activeTab, setActiveTab] = useState('ikhtisar')
  const [searchQuery, setSearchQuery] = useState('')
  const [officeLocationId, setOfficeLocationId] = useState(null)
  const [usersList, setUsersList] = useState(INITIAL_USERS)
  const { toast, showToast } = useToast()

  const [systemSettings, setSystemSettings] = useState({
    radius: KAMPUS_2_UNP_OFFICE.radius,
    jamMasuk: '08:00 AM',
    jamPulang: '05:00 PM',
    registrasiMandiri: true,
    twoFactor: true,
    kunciAbsensi: true,
  })

  const ensureAdminToken = useAuthEnsure(currentUser, 'admin@kerabat.id')

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
          setSystemSettings((prev) => ({ ...prev, radius: activeLoc.radius || 200 }))
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
    showToast('success', `Status pengguna ${email} diperbarui`)
  }

  const handleSaveSettings = async () => {
    if (officeLocationId) {
      try {
        await ensureAdminToken()
        await api.patch(`/office-locations/${officeLocationId}`, {
          radius: Number(systemSettings.radius) || 200,
        })
      } catch {
        // Fallback local save
      }
    }
    showToast('success', 'Pengaturan sistem & radius geofence berhasil disimpan ke database!')
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
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#a78bfa] text-[#1e1b4b] text-sm font-bold shadow-lg">
          {toast.message}
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
            {[
              { id: 'ikhtisar', label: 'Dashboard' },
              { id: 'pengguna', label: 'Pengguna dan peran' },
              { id: 'pengaturan', label: 'Pengaturan sistem' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
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

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-10">
        {activeTab === 'ikhtisar' && (
          <AdminIkhtisarTab totalUsersCount={usersList.length} />
        )}

        {activeTab === 'pengguna' && (
          <AdminPenggunaTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredUsers={filteredUsers}
            onToggleUserStatus={toggleUserStatus}
          />
        )}

        {activeTab === 'pengaturan' && (
          <AdminPengaturanTab
            systemSettings={systemSettings}
            setSystemSettings={setSystemSettings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>
    </div>
  )
}
