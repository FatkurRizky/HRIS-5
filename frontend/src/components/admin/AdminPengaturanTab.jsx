import { KAMPUS_2_UNP_OFFICE } from '../../lib/constants'

/**
 * Tab 3 Portal SuperAdmin: Pengaturan sistem & radius geofence Kampus 2 UNP Kediri (Page 16 desain_UI.pdf).
 */
export default function AdminPengaturanTab({
  systemSettings,
  setSystemSettings,
  onSaveSettings,
}) {
  return (
    <div className="max-w-2xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-6 lg:p-8 space-y-6">
      <div>
        <h3 className="text-base font-bold text-white">Pengaturan sistem</h3>
        <p className="text-[11px] text-stone-400 mt-1">
          Titik pusat geofence aktif: <strong className="text-purple-300">{KAMPUS_2_UNP_OFFICE.name}</strong> ({KAMPUS_2_UNP_OFFICE.latitude}, {KAMPUS_2_UNP_OFFICE.longitude})
        </p>
      </div>

      <div>
        <label className="text-xs text-stone-400 block mb-1.5 font-medium">
          Radius absensi (meter)
        </label>
        <input
          type="number"
          value={systemSettings.radius}
          onChange={(e) =>
            setSystemSettings({ ...systemSettings, radius: Number(e.target.value) })
          }
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-stone-400 block mb-1.5 font-medium">Jam masuk</label>
          <input
            type="text"
            value={systemSettings.jamMasuk}
            onChange={(e) =>
              setSystemSettings({ ...systemSettings, jamMasuk: e.target.value })
            }
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-stone-400 block mb-1.5 font-medium">Jam pulang</label>
          <input
            type="text"
            value={systemSettings.jamPulang}
            onChange={(e) =>
              setSystemSettings({ ...systemSettings, jamPulang: e.target.value })
            }
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-800 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white">Registrasi mandiri</div>
            <div className="text-stone-400 mt-0.5">
              Karyawan boleh membuat akun dengan ID karyawan otomatis
            </div>
          </div>
          <input
            type="checkbox"
            checked={systemSettings.registrasiMandiri}
            onChange={(e) =>
              setSystemSettings({ ...systemSettings, registrasiMandiri: e.target.checked })
            }
            className="w-4 h-4 accent-purple-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white">Verifikasi dua langkah wajib</div>
            <div className="text-stone-400 mt-0.5">Untuk HR dan SuperAdmin</div>
          </div>
          <input
            type="checkbox"
            checked={systemSettings.twoFactor}
            onChange={(e) =>
              setSystemSettings({ ...systemSettings, twoFactor: e.target.checked })
            }
            className="w-4 h-4 accent-purple-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white">Kunci absensi otomatis tanggal 25</div>
            <div className="text-stone-400 mt-0.5">Cut-off payroll</div>
          </div>
          <input
            type="checkbox"
            checked={systemSettings.kunciAbsensi}
            onChange={(e) =>
              setSystemSettings({ ...systemSettings, kunciAbsensi: e.target.checked })
            }
            className="w-4 h-4 accent-purple-500 cursor-pointer"
          />
        </div>
      </div>

      <button
        onClick={onSaveSettings}
        className="w-full py-3 bg-[#a78bfa] hover:bg-[#9370db] text-[#1e1b4b] font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
      >
        Simpan pengaturan
      </button>
    </div>
  )
}
