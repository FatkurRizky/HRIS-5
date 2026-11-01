import { useState } from 'react'
import { IconSearch } from '../shared/Icons'

/**
 * Tab 2 Portal Manager: Persetujuan pengajuan cuti/izin tahap Manager (Page 7 desain_UI.pdf).
 */
export default function ManagerPersetujuanTab({
  approvalList,
  onAction,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredApprovals = approvalList.filter((item) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const statusLabel =
      item.status === 'PENDING'
        ? 'menunggu pending'
        : item.status === 'APPROVED'
          ? 'disetujui approved'
          : 'ditolak rejected'
    return (
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      statusLabel.includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Persetujuan</h2>
          <p className="text-xs text-stone-500 mt-1">
            Keputusan Anda diteruskan ke HR sebagai tahap akhir
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="relative">
            <IconSearch className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama anggota tim, jenis pengajuan (cuti/sakit/izin), atau status..."
              className="w-full bg-[#f3f6fa] border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-800 outline-none focus:border-[#285a84] transition"
            />
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {filteredApprovals.map((item) => (
            <div key={item.id} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-full ${item.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-xs`}
                >
                  {item.initials}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{item.name}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">{item.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {item.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => onAction(item, 'REJECTED')}
                      className="px-4 py-1.5 rounded-lg border border-[#e53e3e] text-[#e53e3e] hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => onAction(item, 'APPROVED')}
                      className="px-4 py-1.5 rounded-lg bg-[#1b7a43] hover:bg-[#156034] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Setujui
                    </button>
                  </>
                ) : (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'APPROVED'
                        ? 'bg-[#e8f7ee] text-[#1b7a43]'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredApprovals.length === 0 && (
            <div className="py-8 text-center text-xs text-stone-400">
              Tidak ada pengajuan yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
