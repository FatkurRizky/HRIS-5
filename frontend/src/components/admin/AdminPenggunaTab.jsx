/**
 * Tab 2 Portal SuperAdmin: Manajemen pengguna & peran RBAC (Page 15 desain_UI.pdf).
 */
export default function AdminPenggunaTab({
  searchQuery,
  setSearchQuery,
  filteredUsers,
  onToggleUserStatus,
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-gray-800">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau email..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-stone-500 outline-none"
        />
      </div>

      <table className="w-full text-left text-xs">
        <thead className="bg-gray-900/60 text-stone-400 font-semibold border-b border-gray-800 text-[11px] uppercase tracking-wider">
          <tr>
            <th className="py-3 px-5">Pengguna</th>
            <th className="py-3 px-4">Email</th>
            <th className="py-3 px-4">Peran</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {filteredUsers.map((u, i) => (
            <tr key={u.id || i} className="hover:bg-gray-800/40 transition">
              <td className="py-3 px-5 font-bold text-white">{u.name}</td>
              <td className="py-3 px-4 text-stone-400">{u.email}</td>
              <td className="py-3 px-4">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800">
                  {u.role}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    u.active ? 'text-emerald-400' : 'text-stone-500'
                  }`}
                >
                  {u.active ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td className="py-3 px-5 text-right">
                <button
                  onClick={() => onToggleUserStatus(u.email)}
                  className={`text-xs font-bold hover:underline cursor-pointer ${
                    u.active
                      ? 'text-stone-400 hover:text-rose-400'
                      : 'text-purple-400 hover:text-purple-300'
                  }`}
                >
                  {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
