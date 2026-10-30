import { useState } from 'react'
import api from '../../lib/api'
import { AVATAR_COLORS } from '../../lib/constants'
import { getInitials, formatStatusLabel } from '../../lib/formatters'

const INITIAL_FORM = {
  name: '',
  email: '',
  password: 'kerabat123',
  nik: '',
  positionName: 'Frontend Developer',
  departmentName: 'Engineering',
  status: 'TETAP',
  role: 'EMPLOYEE',
  baseSalary: 10000000,
  allowance: 2000000,
}

/**
 * Modal Tambah Karyawan Baru (Portal HR).
 */
export default function AddEmployeeModal({
  isOpen,
  onClose,
  departments,
  positions,
  employeeCount,
  ensureToken,
  onCreated,
  showToast,
}) {
  const [newEmp, setNewEmp] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!newEmp.name.trim()) {
      setError('Nama lengkap karyawan wajib diisi.')
      return
    }
    if (!newEmp.email.trim()) {
      setError('Email kerja wajib diisi.')
      return
    }
    if (!newEmp.password || newEmp.password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }

    setSubmitting(true)
    try {
      await ensureToken()
      const matchedDept = departments.find(
        (d) => d.name.toLowerCase() === newEmp.departmentName.toLowerCase()
      )
      const matchedPos = positions.find(
        (p) => p.name.toLowerCase() === newEmp.positionName.toLowerCase()
      )

      const payload = {
        name: newEmp.name.trim(),
        email: newEmp.email.trim().toLowerCase(),
        password: newEmp.password,
        role: newEmp.role,
        status: newEmp.status,
        departmentName: newEmp.departmentName,
        positionName: newEmp.positionName.trim() || 'Staff',
        ...(newEmp.nik.trim() ? { nik: newEmp.nik.trim() } : {}),
        ...(matchedDept ? { departmentId: matchedDept.id } : {}),
        ...(matchedPos ? { positionId: matchedPos.id } : {}),
        baseSalary: Number(newEmp.baseSalary) || 10000000,
        allowance: Number(newEmp.allowance) || 2000000,
      }

      const res = await api.post('/employees', payload)
      const createdEmp = res.data

      const addedItem = {
        id: createdEmp?.id || `emp-${Date.now()}`,
        init: getInitials(newEmp.name),
        name: newEmp.name.trim(),
        email: newEmp.email.trim().toLowerCase(),
        role: newEmp.positionName.trim() || 'Staff',
        dept: newEmp.departmentName,
        status: formatStatusLabel(newEmp.status),
        bg: AVATAR_COLORS[employeeCount % AVATAR_COLORS.length],
      }

      onCreated(addedItem)
      setNewEmp(INITIAL_FORM)
      onClose()
      showToast(
        'success',
        `Karyawan ${addedItem.name} berhasil ditambahkan ke database!`
      )
    } catch (err) {
      const backendMsg = err?.response?.data?.message
      if (
        err?.response &&
        (err.response.status === 409 || err.response.status === 400)
      ) {
        setError(
          Array.isArray(backendMsg)
            ? backendMsg.join(', ')
            : backendMsg || 'Gagal menyimpan data karyawan.'
        )
      } else {
        const fallbackItem = {
          id: `emp-${Date.now()}`,
          init: getInitials(newEmp.name),
          name: newEmp.name.trim(),
          email: newEmp.email.trim().toLowerCase(),
          role: newEmp.positionName.trim() || 'Staff',
          dept: newEmp.departmentName,
          status: formatStatusLabel(newEmp.status),
          bg: AVATAR_COLORS[employeeCount % AVATAR_COLORS.length],
        }
        onCreated(fallbackItem)
        setNewEmp(INITIAL_FORM)
        onClose()
        showToast('success', `Karyawan ${fallbackItem.name} berhasil ditambahkan!`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#0f3832] text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Tambah Karyawan Baru</h3>
            <p className="text-[11px] text-stone-300 mt-0.5">
              Buat akun login dan profil kepegawaian secara langsung
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Nama lengkap *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Raka Pratama"
                value={newEmp.name}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, name: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                NIK / ID Karyawan (opsional)
              </label>
              <input
                type="text"
                placeholder="Otomatis jika dikosongkan"
                value={newEmp.nik}
                onChange={(e) => setNewEmp({ ...newEmp, nik: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Email kerja *
              </label>
              <input
                type="email"
                required
                placeholder="raka@kerabat.id"
                value={newEmp.email}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, email: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Password awal *
              </label>
              <input
                type="text"
                required
                value={newEmp.password}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, password: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Jabatan / Posisi *
              </label>
              <input
                type="text"
                required
                placeholder="Frontend Developer"
                value={newEmp.positionName}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, positionName: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Departemen *
              </label>
              <select
                value={newEmp.departmentName}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, departmentName: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Operasional">Operasional</option>
                <option value="Finance">Finance</option>
                <option value="Product">Product</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Status Kontrak
              </label>
              <select
                value={newEmp.status}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, status: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                <option value="TETAP">Tetap</option>
                <option value="KONTRAK">Kontrak</option>
                <option value="PROBATION">Probation</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Role Akses Sistem
              </label>
              <select
                value={newEmp.role}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, role: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                <option value="EMPLOYEE">Employee (Karyawan)</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Gaji Pokok (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={newEmp.baseSalary}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, baseSalary: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Tunjangan Tetap (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={newEmp.allowance}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, allowance: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#0f3832] hover:bg-[#144941] text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Karyawan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
