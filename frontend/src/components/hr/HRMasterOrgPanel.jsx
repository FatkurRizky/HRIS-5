import { useState } from 'react'
import api from '../../lib/api'
import { formatRupiah } from '../../lib/formatters'

/**
 * Panel Manajemen Jabatan (Position) & Manajemen Departemen (Department).
 * Mendukung CRUD jabatan beserta gaji pokok standar serta CRUD departemen/divisi.
 */
export default function HRMasterOrgPanel({
  positions = [],
  departments = [],
  ensureToken,
  onRefreshMaster,
  showToast,
}) {
  // State Jabatan
  const [posForm, setPosForm] = useState({
    id: null,
    name: '',
    baseSalary: 10000000,
  })
  const [posLoading, setPosLoading] = useState(false)

  // State Departemen
  const [deptForm, setDeptForm] = useState({
    id: null,
    name: '',
    description: '',
  })
  const [deptLoading, setDeptLoading] = useState(false)

  const handleSavePosition = async (e) => {
    e.preventDefault()
    if (!posForm.name.trim()) return
    setPosLoading(true)
    try {
      await ensureToken()
      const payload = {
        name: posForm.name.trim(),
        baseSalary: Number(posForm.baseSalary) || 0,
      }
      if (posForm.id) {
        await api.patch(`/positions/${posForm.id}`, payload)
        showToast('success', `Jabatan "${payload.name}" berhasil diperbarui!`)
      } else {
        await api.post('/positions', payload)
        showToast('success', `Jabatan "${payload.name}" berhasil ditambahkan!`)
      }
      setPosForm({ id: null, name: '', baseSalary: 10000000 })
      await onRefreshMaster?.()
    } catch (err) {
      const msg = err?.response?.data?.message
      showToast(
        'error',
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Gagal menyimpan data jabatan.'
      )
    } finally {
      setPosLoading(false)
    }
  }

  const handleDeletePosition = async (pos) => {
    setPosLoading(true)
    try {
      await ensureToken()
      await api.delete(`/positions/${pos.id}`)
      showToast('info', `Jabatan "${pos.name}" berhasil dihapus.`)
      if (posForm.id === pos.id) {
        setPosForm({ id: null, name: '', baseSalary: 10000000 })
      }
      await onRefreshMaster?.()
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message ||
          'Jabatan tidak dapat dihapus karena masih digunakan karyawan.'
      )
    } finally {
      setPosLoading(false)
    }
  }

  const handleSaveDepartment = async (e) => {
    e.preventDefault()
    if (!deptForm.name.trim()) return
    setDeptLoading(true)
    try {
      await ensureToken()
      const payload = {
        name: deptForm.name.trim(),
        description: deptForm.description.trim() || undefined,
      }
      if (deptForm.id) {
        await api.patch(`/departments/${deptForm.id}`, payload)
        showToast(
          'success',
          `Departemen "${payload.name}" berhasil diperbarui!`
        )
      } else {
        await api.post('/departments', payload)
        showToast(
          'success',
          `Departemen "${payload.name}" berhasil ditambahkan!`
        )
      }
      setDeptForm({ id: null, name: '', description: '' })
      await onRefreshMaster?.()
    } catch (err) {
      const msg = err?.response?.data?.message
      showToast(
        'error',
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Gagal menyimpan data departemen.'
      )
    } finally {
      setDeptLoading(false)
    }
  }

  const handleDeleteDepartment = async (dept) => {
    setDeptLoading(true)
    try {
      await ensureToken()
      await api.delete(`/departments/${dept.id}`)
      showToast('info', `Departemen "${dept.name}" berhasil dihapus.`)
      if (deptForm.id === dept.id) {
        setDeptForm({ id: null, name: '', description: '' })
      }
      await onRefreshMaster?.()
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message ||
          'Departemen tidak dapat dihapus karena masih memiliki karyawan aktif.'
      )
    } finally {
      setDeptLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Kolom 1: Manajemen Jabatan (Position) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col gap-5">
        <div>
          <h3 className="text-base font-bold text-stone-900">
            Manajemen Jabatan (Position)
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Kelola daftar jabatan perusahaan beserta standar gaji pokoknya
          </p>
        </div>

        <form
          onSubmit={handleSavePosition}
          className="p-4 rounded-xl bg-[#f8f7f3] border border-stone-200 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Nama Jabatan *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Senior Backend Engineer"
                value={posForm.name}
                onChange={(e) =>
                  setPosForm({ ...posForm, name: e.target.value })
                }
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Gaji Pokok Standar (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={posForm.baseSalary}
                onChange={(e) =>
                  setPosForm({ ...posForm, baseSalary: e.target.value })
                }
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-900 outline-none focus:border-[#0f3832]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {posForm.id && (
              <button
                type="button"
                onClick={() =>
                  setPosForm({ id: null, name: '', baseSalary: 10000000 })
                }
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 font-bold cursor-pointer"
              >
                Batal Edit
              </button>
            )}
            <button
              type="submit"
              disabled={posLoading}
              className="px-4 py-2 rounded-xl bg-[#0f3832] hover:bg-[#14473f] text-white font-bold transition cursor-pointer disabled:opacity-50"
            >
              {posForm.id ? 'Simpan Perubahan Jabatan' : 'Tambah Jabatan'}
            </button>
          </div>
        </form>

        <div className="divide-y divide-stone-100 text-xs">
          {positions.length === 0 ? (
            <p className="py-6 text-center text-stone-400">
              Belum ada data master jabatan terdaftar.
            </p>
          ) : (
            positions.map((pos) => (
              <div
                key={pos.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-stone-900">{pos.name}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Gaji Pokok: {formatRupiah(pos.baseSalary || 0)} ·{' '}
                    {pos._count?.employees ?? 0} karyawan
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPosForm({
                        id: pos.id,
                        name: pos.name,
                        baseSalary: pos.baseSalary ?? 0,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold cursor-pointer"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    disabled={posLoading}
                    onClick={() => handleDeletePosition(pos)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kolom 2: Manajemen Departemen (Department) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col gap-5">
        <div>
          <h3 className="text-base font-bold text-stone-900">
            Manajemen Departemen (Divisi)
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Kelola struktur divisi perusahaan beserta deskripsi fungsinya
          </p>
        </div>

        <form
          onSubmit={handleSaveDepartment}
          className="p-4 rounded-xl bg-[#f8f7f3] border border-stone-200 space-y-3 text-xs"
        >
          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Nama Departemen / Divisi *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Product & Design"
              value={deptForm.name}
              onChange={(e) =>
                setDeptForm({ ...deptForm, name: e.target.value })
              }
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-900 outline-none focus:border-[#0f3832]"
            />
          </div>
          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Deskripsi Divisi
            </label>
            <input
              type="text"
              placeholder="Divisi perancangan produk dan riset pengguna"
              value={deptForm.description}
              onChange={(e) =>
                setDeptForm({ ...deptForm, description: e.target.value })
              }
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-900 outline-none focus:border-[#0f3832]"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            {deptForm.id && (
              <button
                type="button"
                onClick={() =>
                  setDeptForm({ id: null, name: '', description: '' })
                }
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 font-bold cursor-pointer"
              >
                Batal Edit
              </button>
            )}
            <button
              type="submit"
              disabled={deptLoading}
              className="px-4 py-2 rounded-xl bg-[#0f3832] hover:bg-[#14473f] text-white font-bold transition cursor-pointer disabled:opacity-50"
            >
              {deptForm.id ? 'Simpan Perubahan Departemen' : 'Tambah Departemen'}
            </button>
          </div>
        </form>

        <div className="divide-y divide-stone-100 text-xs">
          {departments.length === 0 ? (
            <p className="py-6 text-center text-stone-400">
              Belum ada data master departemen terdaftar.
            </p>
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-stone-900">{dept.name}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {dept.description || 'Divisi operasional perusahaan'} ·{' '}
                    {dept._count?.employees ?? 0} karyawan
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setDeptForm({
                        id: dept.id,
                        name: dept.name,
                        description: dept.description || '',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold cursor-pointer"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    disabled={deptLoading}
                    onClick={() => handleDeleteDepartment(dept)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
