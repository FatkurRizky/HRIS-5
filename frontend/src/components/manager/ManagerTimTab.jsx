/**
 * Tab 3 Portal Manager: Daftar anggota tim & sisa kuota cuti (Page 8 desain_UI.pdf).
 */
export default function ManagerTimTab({
  managerName,
  teamList,
  onLogout,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Tim saya</h2>
          <p className="text-xs text-stone-500 mt-1">{managerName} · Manager Engineering</p>
        </div>
        <button
          onClick={onLogout}
          className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold text-stone-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
        >
          Keluar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-5">Nama</th>
              <th className="py-3.5 px-4">Jabatan</th>
              <th className="py-3.5 px-4">Hari ini</th>
              <th className="py-3.5 px-4">Terlambat</th>
              <th className="py-3.5 px-4">Lembur</th>
              <th className="py-3.5 px-5">Sisa cuti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {teamList.map((member) => (
              <tr key={member.id} className="hover:bg-stone-50/50 transition">
                <td className="py-3.5 px-5 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${member.bg} text-white font-bold flex items-center justify-center text-xs`}
                  >
                    {member.initials}
                  </div>
                  <span className="font-bold text-stone-900">{member.name}</span>
                </td>
                <td className="py-3.5 px-4 text-stone-600">{member.role}</td>
                <td
                  className={`py-3.5 px-4 font-semibold ${
                    member.today === 'Sakit' ? 'text-[#c44d27]' : 'text-stone-800'
                  }`}
                >
                  {member.today}
                </td>
                <td className="py-3.5 px-4 text-stone-600">{member.late}</td>
                <td className="py-3.5 px-4 text-stone-600">{member.overtime}</td>
                <td className="py-3.5 px-5 text-stone-900 font-bold">
                  {member.leaveQuota} hari
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
