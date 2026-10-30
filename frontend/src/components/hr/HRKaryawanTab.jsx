import { useState } from 'react'
import { getStatusBadgeStyle } from '../../lib/formatters'

/**
 * Tab 2 Portal HR: Master Data Karyawan & Struktur Organisasi (Page 10 desain_UI.pdf).
 */
export default function HRKaryawanTab({ employees, onOpenAddModal }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.dept.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Karyawan</h2>
          <p className="text-xs text-stone-500 mt-1">
            Profil, jabatan, status kontrak, dan struktur tim
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="bg-[#0f3832] hover:bg-[#134941] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
        >
          Tambah karyawan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, jabatan, atau departemen"
              className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 outline-none focus:border-[#0f3832]"
            />
          </div>

          <table className="w-full text-left text-xs">
            <thead className="text-stone-500 font-semibold text-[11px] border-b border-stone-100">
              <tr>
                <th className="py-3 px-4">Nama</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredEmployees.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/60 transition">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full ${row.bg} text-white font-bold flex items-center justify-center text-xs shrink-0`}
                    >
                      {row.init}
                    </div>
                    <div>
                      <div className="font-bold text-stone-900">{row.name}</div>
                      {row.nik && (
                        <div className="text-[10px] text-stone-400">
                          {row.nik}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">{row.role}</td>
                  <td className="py-3.5 px-4 text-stone-600">{row.dept}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-stone-400">
                    Tidak ada karyawan yang cocok dengan pencarian &ldquo;
                    {searchQuery}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Struktur Organisasi Tree */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-4">
            Struktur organisasi
          </h3>
          <div className="space-y-4 text-xs border-l border-stone-200 pl-4">
            <div>
              <div className="font-bold text-stone-900">Hendra Wijaya</div>
              <div className="text-[11px] text-stone-500">
                Direktur Operasional
              </div>
            </div>

            <div className="pl-3 border-l border-stone-200 space-y-4">
              <div>
                <div className="font-bold text-stone-900">Sari Utami</div>
                <div className="text-[11px] text-stone-500">
                  Manager Engineering
                </div>
                <div className="pl-3 mt-2 border-l border-stone-200 space-y-1.5 text-stone-700 text-[11px]">
                  {employees
                    .filter((e) => e.dept === 'Engineering')
                    .map((e) => (
                      <div key={e.id}>{e.name}</div>
                    ))}
                </div>
              </div>

              <div>
                <div className="font-bold text-stone-900">Rina Kusuma</div>
                <div className="text-[11px] text-stone-500">Kepala HR</div>
                <div className="pl-3 mt-2 border-l border-stone-200 space-y-1.5 text-stone-700 text-[11px]">
                  {employees
                    .filter((e) => e.dept !== 'Engineering')
                    .map((e) => (
                      <div key={e.id}>{e.name}</div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
