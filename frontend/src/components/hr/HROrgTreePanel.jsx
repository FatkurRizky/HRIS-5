import { useState, useMemo } from 'react'
import api from '../../lib/api'
import {
  buildHierarchyGroups,
  getValidManagerCandidates,
  isLocalEmployeeId,
  wouldCreateCircularHierarchy,
} from '../../lib/employeeUtils'
import { getStatusBadgeStyle } from '../../lib/formatters'

/**
 * Panel Struktur Organisasi (Manager → Subordinates).
 * Memetakan relasi hirarki atasan-bawahan secara dinamis dan mendukung pemetaan ulang manager langsung.
 */
export default function HROrgTreePanel({
  employees = [],
  departments = [],
  ensureToken,
  onAssignManager,
  showToast,
}) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [savingId, setSavingId] = useState(null)

  const deptList = useMemo(() => {
    const names = new Set([
      ...departments.map((d) => d.name).filter(Boolean),
      ...employees.map((e) => e.dept).filter(Boolean),
    ])
    return Array.from(names)
  }, [departments, employees])

  const { filteredEmployees, leaders, unassigned } = useMemo(
    () => buildHierarchyGroups(employees, selectedDept),
    [employees, selectedDept]
  )

  const handleManagerChange = async (emp, newManagerId) => {
    if (wouldCreateCircularHierarchy(employees, emp.id, newManagerId)) {
      showToast(
        'error',
        'Relasi manager melingkar (circular hierarchy) tidak diizinkan.'
      )
      return
    }

    setSavingId(emp.id)
    try {
      await ensureToken()
      if (
        !isLocalEmployeeId(emp.id) &&
        (!newManagerId || !isLocalEmployeeId(newManagerId))
      ) {
        await api.patch(`/employees/${emp.id}`, {
          managerId: newManagerId || null,
        })
      }
      const targetMgr = employees.find((m) => m.id === newManagerId)
      onAssignManager?.(emp.id, newManagerId || null, targetMgr?.name || null)
      showToast(
        'success',
        `Atasan langsung ${emp.name} diperbarui menjadi ${targetMgr?.name || 'Tanpa Atasan'}.`
      )
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message || 'Gagal memperbarui relasi atasan.'
      )
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Peta Struktur Organisasi (Manager → Subordinates)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Relasi hirarki atasan-bawahan yang digunakan pada alur persetujuan
              cuti berjenjang (Layer 1 Manager → Layer 2 HR)
            </p>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#f4f3ef] border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-800 outline-none"
          >
            <option value="ALL">Semua Departemen</option>
            {deptList.map((d) => (
              <option key={d} value={d}>
                Departemen {d}
              </option>
            ))}
          </select>
        </div>

        {/* Daftar Node Manager -> Subordinates */}
        {leaders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {leaders.map(({ manager, subordinates }) => (
              <div
                key={manager.id}
                className="rounded-2xl border border-stone-200 bg-[#faf9f6] p-5"
              >
                <div className="flex items-center gap-3 pb-3.5 border-b border-stone-200">
                  <div
                    className={`w-10 h-10 rounded-full ${manager.bg || 'bg-[#0f3832]'} text-white font-bold flex items-center justify-center text-xs shrink-0`}
                  >
                    {manager.init}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900 truncate">
                        {manager.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0f3832] text-white">
                        Atasan / Manager
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {manager.role} · {manager.dept}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pl-4 border-l-2 border-[#0f3832]/30 space-y-2.5">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Bawahan Langsung ({subordinates.length})
                  </div>
                  {subordinates.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">
                      Belum ada bawahan langsung yang dipetakan.
                    </p>
                  ) : (
                    subordinates.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-white rounded-xl border border-stone-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">
                            {sub.name}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {sub.role} · {sub.dept}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeStyle(sub.status)}`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Anggota Tanpa Atasan Langsung / Lintas Divisi */}
        {unassigned.length > 0 && (
          <div className={leaders.length > 0 ? 'mt-5' : ''}>
            <div className="rounded-2xl border border-stone-200 bg-[#faf9f6] p-5">
              <div className="text-xs font-bold text-stone-700 mb-3">
                Karyawan Tanpa Atasan Langsung Terpetakan ({unassigned.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {unassigned.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-white rounded-xl border border-stone-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 truncate">
                        {emp.name}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">
                        {emp.role} · {emp.dept}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getStatusBadgeStyle(emp.status)}`}
                    >
                      {emp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabel Pemetaan Cepat Relasi Atasan-Bawahan */}
        <div className="mt-6 pt-6 border-t border-stone-200">
          <h4 className="text-xs font-bold text-stone-800 mb-3">
            Atur Pemetaan Atasan Langsung (Manager → Subordinate)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-stone-500 border-b border-stone-200 text-[11px]">
                <tr>
                  <th className="py-2.5 pr-3">Karyawan</th>
                  <th className="py-2.5 px-3">Jabatan &amp; Divisi</th>
                  <th className="py-2.5 pl-3">Atasan Langsung (Manager)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredEmployees.map((emp) => {
                  const validCandidates = getValidManagerCandidates(
                    employees,
                    emp.id,
                    !isLocalEmployeeId(emp.id)
                  )
                  return (
                    <tr key={emp.id}>
                      <td className="py-2.5 pr-3 font-bold text-stone-900">
                        {emp.name}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {emp.role} · {emp.dept}
                      </td>
                      <td className="py-2.5 pl-3">
                        <select
                          disabled={savingId === emp.id}
                          value={emp.managerId || ''}
                          onChange={(e) =>
                            handleManagerChange(emp, e.target.value)
                          }
                          className="bg-[#f4f3ef] border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 outline-none focus:border-[#0f3832] disabled:opacity-50"
                        >
                          <option value="">— Tanpa Atasan Langsung —</option>
                          {validCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name} ({candidate.role})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
