import { useState, useMemo } from 'react'
import api from '../../lib/api'
import { isLocalEmployeeId } from '../../lib/employeeUtils'
import { formatShortDate, getStatusBadgeStyle } from '../../lib/formatters'
import { IconSearch } from '../shared/Icons'
import EmployeeDetailModal from './EmployeeDetailModal'
import HRMasterOrgPanel from './HRMasterOrgPanel'
import HROrgTreePanel from './HROrgTreePanel'

const SUB_TABS = [
  { id: 'direktori', label: 'Direktori & Kontrak' },
  { id: 'master-org', label: 'Jabatan & Departemen' },
  { id: 'struktur', label: 'Struktur Organisasi' },
]

/**
 * Tab 2 Portal HR: Master Data Karyawan (CRUD Profil), Manajemen Jabatan,
 * Manajemen Departemen, Manajemen Kontrak, dan Struktur Organisasi (Manager → Subordinates).
 * Catatan privasi: Tidak menggunakan field Kartu Keluarga (KK).
 */
export default function HRKaryawanTab({
  employees = [],
  departments = [],
  positions = [],
  ensureToken,
  onOpenAddModal,
  onEditEmployee,
  onDeleteEmployee,
  onAssignManager,
  onRefreshMaster,
  showToast,
}) {
  const [subTab, setSubTab] = useState('direktori')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [detailEmp, setDetailEmp] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const deptOptions = useMemo(() => {
    const set = new Set([
      ...departments.map((d) => d.name).filter(Boolean),
      ...employees.map((e) => e.dept).filter(Boolean),
    ])
    return Array.from(set)
  }, [departments, employees])

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (deptFilter !== 'ALL' && emp.dept !== deptFilter) return false
      if (statusFilter !== 'ALL' && emp.status !== statusFilter) return false

      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.dept.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        (emp.nik && emp.nik.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.phone && emp.phone.toLowerCase().includes(q))
      )
    })
  }, [employees, deptFilter, statusFilter, searchQuery])

  const contractStats = useMemo(() => {
    let tetap = 0
    let kontrak = 0
    let probation = 0
    let expiring = 0
    for (const e of employees) {
      if (e.status === 'Tetap') tetap++
      else if (e.status === 'Kontrak') kontrak++
      else probation++
      if (e.contractExpiringWarning) expiring++
    }
    return { tetap, kontrak, probation, expiring }
  }, [employees])

  const orgSummaryBranches = useMemo(() => {
    const byDept = new Map()
    for (const emp of employees) {
      const deptName = emp.dept || 'Umum'
      if (!byDept.has(deptName)) {
        const defaultLead = deptName.toLowerCase().includes('engineering')
          ? { name: 'Sari Utami', role: 'Manager Engineering' }
          : deptName.toLowerCase().includes('hr')
            ? { name: 'Rina Kusuma', role: 'Kepala HR' }
            : { name: `Kepala Divisi ${deptName}`, role: `Lead ${deptName}` }
        byDept.set(deptName, { deptName, lead: defaultLead, members: [] })
      }
      const group = byDept.get(deptName)
      if (emp.userRole === 'MANAGER') {
        group.lead = { name: emp.name, role: emp.role }
      } else if (emp.name !== group.lead.name) {
        group.members.push(emp)
      }
    }
    return Array.from(byDept.values())
  }, [employees])

  const handleConfirmDelete = async (emp) => {
    setDeletingId(emp.id)
    try {
      await ensureToken?.()
      if (!isLocalEmployeeId(emp.id)) {
        await api.delete(`/employees/${emp.id}`)
      }
      onDeleteEmployee?.(emp.id)
      if (detailEmp?.id === emp.id) setDetailEmp(null)
      showToast?.('info', `Data karyawan ${emp.name} berhasil dihapus.`)
    } catch (err) {
      showToast?.(
        'error',
        err?.response?.data?.message || 'Gagal menghapus data karyawan.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {/* Header & Sub-Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Karyawan</h2>
          <p className="text-xs text-stone-500 mt-1">
            CRUD profil karyawan, manajemen jabatan, departemen, kontrak kerja,
            dan struktur organisasi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#eae8e1] p-1 rounded-xl flex items-center gap-1 text-xs">
            {SUB_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  subTab === t.id
                    ? 'bg-white text-[#0f3832] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="bg-[#0f3832] hover:bg-[#134941] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            Tambah karyawan
          </button>
        </div>
      </div>

      {/* SUB-TAB 2: MANAJEMEN JABATAN & DEPARTEMEN */}
      {subTab === 'master-org' && (
        <HRMasterOrgPanel
          positions={positions}
          departments={departments}
          ensureToken={ensureToken}
          onRefreshMaster={onRefreshMaster}
          showToast={showToast}
        />
      )}

      {/* SUB-TAB 3: STRUKTUR ORGANISASI (MANAGER -> SUBORDINATES) */}
      {subTab === 'struktur' && (
        <HROrgTreePanel
          employees={employees}
          departments={departments}
          ensureToken={ensureToken}
          onAssignManager={onAssignManager}
          showToast={showToast}
        />
      )}

      {/* SUB-TAB 1: DIREKTORI KARYAWAN & MANAJEMEN KONTRAK */}
      {subTab === 'direktori' && (
        <>
          {/* Ringkasan Status Kontrak Kerja */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
            <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3.5 shadow-2xs">
              <div className="text-stone-500">Karyawan Tetap</div>
              <div className="text-xl font-extrabold text-[#1b7a43] mt-0.5">
                {contractStats.tetap}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3.5 shadow-2xs">
              <div className="text-stone-500">Status Kontrak (PKWT)</div>
              <div className="text-xl font-extrabold text-[#285a84] mt-0.5">
                {contractStats.kontrak}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3.5 shadow-2xs">
              <div className="text-stone-500">Masa Probation</div>
              <div className="text-xl font-extrabold text-[#b86d1a] mt-0.5">
                {contractStats.probation}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3.5 shadow-2xs">
              <div className="text-stone-500">Kontrak Akan Habis (≤30hr)</div>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">
                {contractStats.expiring}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabel CRUD Karyawan (col-span-2) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <IconSearch className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NIK, email, telepon, jabatan, atau departemen"
                    className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-800 outline-none focus:border-[#0f3832]"
                  />
                </div>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-[#f4f3ef] border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 outline-none"
                >
                  <option value="ALL">Semua Divisi</option>
                  {deptOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#f4f3ef] border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 outline-none"
                >
                  <option value="ALL">Semua Kontrak</option>
                  <option value="Tetap">Tetap</option>
                  <option value="Kontrak">Kontrak</option>
                  <option value="Probation">Probation</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-stone-500 font-semibold text-[11px] border-b border-stone-100">
                    <tr>
                      <th className="py-3 px-4">Nama &amp; NIK</th>
                      <th className="py-3 px-3">Jabatan &amp; Divisi</th>
                      <th className="py-3 px-3">Kontrak Kerja</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredEmployees.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-stone-50/60 transition"
                      >
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          {row.photoUrl ? (
                            <img
                              src={row.photoUrl}
                              alt={row.name}
                              width="32"
                              height="32"
                              className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full ${row.bg} text-white font-bold flex items-center justify-center text-xs shrink-0`}
                            >
                              {row.init}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-stone-900">
                              {row.name}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {row.nik ? `${row.nik} · ` : ''}
                              {row.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-stone-800">
                            {row.role}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {row.dept}
                            {row.managerName
                              ? ` · Atasan: ${row.managerName}`
                              : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(row.status)}`}
                          >
                            {row.status}
                          </span>
                          {row.status !== 'Tetap' && row.contractEndDate && (
                            <div
                              className={`text-[10px] mt-1 font-medium ${
                                row.contractExpiringWarning
                                  ? 'text-rose-600 font-bold'
                                  : 'text-stone-500'
                              }`}
                            >
                              s/d {formatShortDate(row.contractEndDate)}
                              {row.daysUntilContractEnd !== null &&
                                row.daysUntilContractEnd !== undefined &&
                                ` (${row.daysUntilContractEnd} hr)`}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailEmp(row)}
                              className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditEmployee?.(row)}
                              className="px-2.5 py-1 rounded-lg bg-[#f0f5f3] hover:bg-[#e1ece8] text-[#0f3832] font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => handleConfirmDelete(row)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td
                          colSpan="4"
                          className="py-8 text-center text-stone-400"
                        >
                          Tidak ada karyawan yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Struktur Organisasi Tree Ringkas */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-900">
                  Struktur organisasi
                </h3>
                <button
                  type="button"
                  onClick={() => setSubTab('struktur')}
                  className="text-[11px] font-bold text-[#0f3832] hover:underline cursor-pointer"
                >
                  Kelola relasi →
                </button>
              </div>
              <div className="space-y-4 text-xs border-l border-stone-200 pl-4">
                <div>
                  <div className="font-bold text-stone-900">Hendra Wijaya</div>
                  <div className="text-[11px] text-stone-500">
                    Direktur Operasional
                  </div>
                </div>

                <div className="pl-3 border-l border-stone-200 space-y-4">
                  {orgSummaryBranches.map(({ deptName, lead, members }) => (
                    <div key={deptName}>
                      <div className="font-bold text-stone-900">
                        {lead.name}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {lead.role}
                      </div>
                      <div className="pl-3 mt-2 border-l border-stone-200 space-y-1.5 text-stone-700 text-[11px]">
                        {members.map((e) => (
                          <div key={e.id}>
                            {e.name}
                            {e.managerName && e.managerName !== lead.name
                              ? ` → ${e.managerName}`
                              : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <EmployeeDetailModal
        employee={detailEmp}
        onClose={() => setDetailEmp(null)}
        onEdit={onEditEmployee}
      />
    </div>
  )
}
