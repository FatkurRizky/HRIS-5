import { useState, useEffect } from 'react'
import api from '../../lib/api'
import {
  buildEmployeeViewFromForm,
  getValidManagerCandidates,
  isLocalEmployeeId,
} from '../../lib/employeeUtils'
import { getInitials } from '../../lib/formatters'
import { IconX } from '../shared/Icons'

const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'HR',
  'Operasional',
  'Finance',
  'Product',
]

const INITIAL_FORM = {
  name: '',
  email: '',
  password: 'kerabat123',
  nik: '',
  phone: '',
  address: '',
  photoUrl: '',
  positionName: 'Frontend Developer',
  departmentName: 'Engineering',
  managerId: '',
  status: 'TETAP',
  contractEndDate: '',
  role: 'EMPLOYEE',
  baseSalary: 10000000,
  allowance: 2000000,
}

function mapEmployeeToForm(emp) {
  if (!emp) return INITIAL_FORM
  return {
    name: emp.name || '',
    email: emp.email || '',
    password: '',
    nik: emp.nik || '',
    phone: emp.phone || '',
    address: emp.address || '',
    photoUrl: emp.photoUrl || '',
    positionName: emp.role || 'Staff',
    departmentName: emp.dept || 'Engineering',
    managerId: emp.managerId || '',
    status:
      emp.statusRaw ||
      (emp.status === 'Tetap'
        ? 'TETAP'
        : emp.status === 'Kontrak'
          ? 'KONTRAK'
          : 'PROBATION'),
    contractEndDate: emp.contractEndDate
      ? String(emp.contractEndDate).slice(0, 10)
      : '',
    role: emp.userRole || 'EMPLOYEE',
    baseSalary: emp.baseSalary ?? 10000000,
    allowance: emp.allowance ?? 2000000,
  }
}

/**
 * Modal Tambah & Edit Profil Karyawan (Portal HR).
 * Mencakup nama, NIK, kontak, alamat, foto profil, jabatan, departemen,
 * atasan langsung (manager), status & masa berlaku kontrak, serta master gaji.
 * Catatan privasi: Tidak menggunakan field Kartu Keluarga (KK).
 */
export default function AddEmployeeModal({
  isOpen,
  onClose,
  mode = 'create',
  initialData = null,
  departments = [],
  positions = [],
  employees = [],
  employeeCount = 0,
  ensureToken,
  onCreated,
  onUpdated,
  showToast,
}) {
  const isEdit = mode === 'edit' && Boolean(initialData)
  const [form, setForm] = useState(() =>
    isEdit ? mapEmployeeToForm(initialData) : INITIAL_FORM
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setError('')
      setForm(isEdit ? mapEmployeeToForm(initialData) : INITIAL_FORM)
    }
  }, [isOpen, isEdit, initialData])

  if (!isOpen) return null

  const departmentOptions = Array.from(
    new Set([
      ...departments.map((d) => d.name).filter(Boolean),
      ...DEFAULT_DEPARTMENTS,
      ...(form.departmentName ? [form.departmentName] : []),
    ])
  )

  const isLocalTarget = isEdit && isLocalEmployeeId(initialData?.id)
  const managerCandidates = getValidManagerCandidates(
    employees,
    isEdit ? initialData?.id : null,
    !isLocalTarget
  )

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Ukuran file foto maksimal 1.5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, photoUrl: reader.result }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Nama lengkap karyawan wajib diisi.')
      return
    }
    if (!form.email.trim()) {
      setError('Email kerja wajib diisi.')
      return
    }
    if (!isEdit && (!form.password || form.password.length < 6)) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }

    setSubmitting(true)
    const selectedManager = employees.find((m) => m.id === form.managerId)
    const safeBackendManagerId =
      form.managerId && !isLocalEmployeeId(form.managerId)
        ? form.managerId
        : null

    try {
      await ensureToken()
      const matchedDept = departments.find(
        (d) => d.name.toLowerCase() === form.departmentName.trim().toLowerCase()
      )
      const matchedPos = positions.find(
        (p) => p.name.toLowerCase() === form.positionName.trim().toLowerCase()
      )

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        status: form.status,
        phone: form.phone.trim() || (isEdit ? null : undefined),
        address: form.address.trim() || (isEdit ? null : undefined),
        photoUrl: form.photoUrl.trim() || (isEdit ? null : undefined),
        contractEndDate:
          form.status === 'TETAP'
            ? isEdit
              ? null
              : undefined
            : form.contractEndDate || (isEdit ? null : undefined),
        departmentName: form.departmentName.trim() || 'Engineering',
        positionName: form.positionName.trim() || 'Staff',
        ...(form.nik.trim()
          ? { nik: form.nik.trim() }
          : isEdit
            ? { nik: null }
            : {}),
        ...(matchedDept ? { departmentId: matchedDept.id } : {}),
        ...(matchedPos ? { positionId: matchedPos.id } : {}),
        ...(isEdit || safeBackendManagerId
          ? { managerId: safeBackendManagerId }
          : {}),
        baseSalary: Number(form.baseSalary) || 10000000,
        allowance: Number(form.allowance) || 0,
      }

      if (isEdit) {
        let updatedEmp = null
        if (!isLocalTarget) {
          const res = await api.patch(`/employees/${initialData.id}`, payload)
          updatedEmp = res.data
        }
        const mergedItem = buildEmployeeViewFromForm(form, {
          initialData,
          apiRecord: updatedEmp,
          selectedManager,
          index: employeeCount,
        })
        onUpdated?.(mergedItem)
        onClose()
        showToast(
          'success',
          `Data karyawan ${mergedItem.name} berhasil diperbarui!`
        )
        return
      }

      const res = await api.post('/employees', {
        ...payload,
        password: form.password,
      })
      const addedItem = buildEmployeeViewFromForm(form, {
        apiRecord: res.data,
        selectedManager,
        index: employeeCount,
      })
      onCreated?.(addedItem)
      setForm(INITIAL_FORM)
      onClose()
      showToast(
        'success',
        `Karyawan ${addedItem.name} berhasil ditambahkan ke database!`
      )
    } catch (err) {
      if (err?.response) {
        const backendMsg = err.response.data?.message
        setError(
          Array.isArray(backendMsg)
            ? backendMsg.join(', ')
            : backendMsg || 'Gagal menyimpan data karyawan.'
        )
      } else {
        const fallbackItem = buildEmployeeViewFromForm(form, {
          initialData: isEdit ? initialData : null,
          selectedManager,
          index: employeeCount,
        })
        if (isEdit) {
          onUpdated?.(fallbackItem)
          showToast(
            'success',
            `Data karyawan ${fallbackItem.name} berhasil diperbarui!`
          )
        } else {
          onCreated?.(fallbackItem)
          showToast(
            'success',
            `Karyawan ${fallbackItem.name} berhasil ditambahkan!`
          )
        }
        setForm(INITIAL_FORM)
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0f3832] text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">
              {isEdit ? 'Ubah Profil Karyawan' : 'Tambah Karyawan Baru'}
            </h3>
            <p className="text-[11px] text-stone-300 mt-0.5">
              {isEdit
                ? 'Perbarui data profil, kontak, kontrak kerja, struktur atasan, dan komponen gaji'
                : 'Buat akun login dan profil kepegawaian secara langsung'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <IconX className="w-5 h-5" />
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

          {/* Foto Profil */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-[#f8f7f3] border border-stone-200">
            {form.photoUrl ? (
              <img
                src={form.photoUrl}
                alt={form.name || 'Foto karyawan'}
                width="48"
                height="48"
                className="w-12 h-12 rounded-full object-cover border border-stone-300 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#0f3832] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {getInitials(form.name || 'KR')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label className="font-bold text-stone-700 block mb-1">
                Foto Profil (URL atau Unggah Gambar)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://contoh.id/foto.jpg"
                  value={
                    form.photoUrl.startsWith('data:') ? '' : form.photoUrl
                  }
                  onChange={(e) =>
                    setForm({ ...form, photoUrl: e.target.value })
                  }
                  className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-stone-900 outline-none focus:border-[#0f3832]"
                />
                <label className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold cursor-pointer shrink-0">
                  Pilih File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </label>
                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, photoUrl: '' })}
                    className="text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Nama lengkap *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Raka Pratama"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                NIK / ID Karyawan
              </label>
              <input
                type="text"
                placeholder="Otomatis jika dikosongkan"
                value={form.nik}
                onChange={(e) => setForm({ ...form, nik: e.target.value })}
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Password awal *
                </label>
                <input
                  type="text"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Kontak / No. Telepon
              </label>
              <input
                type="tel"
                placeholder="0812xxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>

            <div className={isEdit ? 'sm:col-span-2' : ''}>
              <label className="font-bold text-stone-700 block mb-1">
                Alamat Domisili
              </label>
              <input
                type="text"
                placeholder="Jl. Brawijaya No. 15, Kediri"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>
          </div>

          {/* Jabatan & Departemen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Jabatan / Posisi *
              </label>
              <input
                type="text"
                required
                list="hr-positions-list"
                placeholder="Frontend Developer"
                value={form.positionName}
                onChange={(e) => {
                  const val = e.target.value
                  const matched = positions.find(
                    (p) => p.name.toLowerCase() === val.trim().toLowerCase()
                  )
                  setForm((prev) => ({
                    ...prev,
                    positionName: val,
                    ...(matched && matched.baseSalary > 0
                      ? { baseSalary: matched.baseSalary }
                      : {}),
                  }))
                }}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              />
              <datalist id="hr-positions-list">
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Departemen *
              </label>
              <select
                value={form.departmentName}
                onChange={(e) =>
                  setForm({ ...form, departmentName: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                {departmentOptions.map((deptName) => (
                  <option key={deptName} value={deptName}>
                    {deptName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Struktur Organisasi (Atasan) & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Atasan Langsung (Manager)
              </label>
              <select
                value={form.managerId}
                onChange={(e) =>
                  setForm({ ...form, managerId: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                <option value="">— Tanpa Atasan Langsung / Otomatis —</option>
                {managerCandidates.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Role Akses Sistem
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                <option value="EMPLOYEE">Employee (Karyawan)</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
              </select>
            </div>
          </div>

          {/* Manajemen Kontrak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Status Kontrak Kerja
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832]"
              >
                <option value="TETAP">Tetap</option>
                <option value="KONTRAK">Kontrak</option>
                <option value="PROBATION">Probation</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Masa Berlaku Kontrak
              </label>
              <input
                type="date"
                disabled={form.status === 'TETAP'}
                value={form.status === 'TETAP' ? '' : form.contractEndDate}
                onChange={(e) =>
                  setForm({ ...form, contractEndDate: e.target.value })
                }
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-900 outline-none focus:border-[#0f3832] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Master Gaji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Gaji Pokok (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={form.baseSalary}
                onChange={(e) =>
                  setForm({ ...form, baseSalary: e.target.value })
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
                value={form.allowance}
                onChange={(e) =>
                  setForm({ ...form, allowance: e.target.value })
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
              {submitting
                ? 'Menyimpan...'
                : isEdit
                  ? 'Simpan Perubahan'
                  : 'Simpan Karyawan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
