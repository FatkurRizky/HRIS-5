/**
 * Tab 2 Portal Manager: Persetujuan pengajuan cuti/izin tahap Manager (Page 7 desain_UI.pdf).
 */
export default function ManagerPersetujuanTab({
  approvalList,
  onAction,
  onLogout,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Persetujuan</h2>
          <p className="text-xs text-stone-500 mt-1">
            Keputusan Anda diteruskan ke HR sebagai tahap akhir
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold text-stone-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
        >
          Keluar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100">
        {approvalList.map((item) => (
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
      </div>
    </div>
  )
}
