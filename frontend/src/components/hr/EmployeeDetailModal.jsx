import {
  formatRupiah,
  formatShortDate,
  getStatusBadgeStyle,
} from '../../lib/formatters'
import { IconX } from '../shared/Icons'

/**
 * Modal Detail Profil Karyawan (Read Profile tanpa field Kartu Keluarga / KK).
 */
export default function EmployeeDetailModal({ employee, onClose, onEdit }) {
  if (!employee) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md overflow-hidden text-xs">
        <div className="px-6 py-4 bg-[#0f3832] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt={employee.name}
                width="40"
                height="40"
                className="w-10 h-10 rounded-full object-cover border border-white/30"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full ${employee.bg || 'bg-white/20'} text-white font-bold flex items-center justify-center text-sm`}
              >
                {employee.init}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold">{employee.name}</h3>
              <p className="text-[11px] text-stone-300">
                {employee.role} · {employee.dept}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Tutup detail"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#f8f7f3] border border-stone-200">
            <div>
              <div className="text-stone-400 text-[11px]">NIK / ID Karyawan</div>
              <div className="font-bold text-stone-900 mt-0.5">
                {employee.nik || '-'}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">Status Kontrak</div>
              <div className="mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeStyle(employee.status)}`}
                >
                  {employee.status}
                </span>
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">Email Kerja</div>
              <div className="font-semibold text-stone-800 mt-0.5 break-all">
                {employee.email || '-'}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">Kontak / Telepon</div>
              <div className="font-semibold text-stone-800 mt-0.5">
                {employee.phone || '-'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-stone-400 text-[11px]">Alamat Domisili</div>
              <div className="font-semibold text-stone-800 mt-0.5">
                {employee.address || '-'}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">Atasan Langsung</div>
              <div className="font-semibold text-stone-800 mt-0.5">
                {employee.managerName || 'Direktur / Kepala Divisi'}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">
                Masa Berlaku Kontrak
              </div>
              <div className="font-semibold text-stone-800 mt-0.5">
                {employee.status === 'Tetap'
                  ? 'Permanen (PKWTT)'
                  : formatShortDate(employee.contractEndDate)}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">Gaji Pokok</div>
              <div className="font-bold text-stone-900 mt-0.5">
                {formatRupiah(employee.baseSalary ?? 10000000)}
              </div>
            </div>
            <div>
              <div className="text-stone-400 text-[11px]">Tunjangan Tetap</div>
              <div className="font-bold text-stone-900 mt-0.5">
                {formatRupiah(employee.allowance ?? 2000000)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit?.(employee)
              }}
              className="px-4 py-2 rounded-xl bg-[#0f3832] hover:bg-[#14473f] text-white font-bold cursor-pointer"
            >
              Edit Profil Karyawan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
