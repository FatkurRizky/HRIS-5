import { formatRupiah } from '../../lib/formatters'

function getSlipStatusMeta(status, isEstimated) {
  if (isEstimated || status === 'ESTIMASI') {
    return {
      label: 'Estimasi berjalan',
      badgeClass: 'bg-[#fef3eb] text-[#b86d1a]',
    }
  }
  if (status === 'PAID') {
    return {
      label: 'Telah dicairkan',
      badgeClass: 'bg-[#e8f7ee] text-[#1b7a43]',
    }
  }
  if (status === 'APPROVED') {
    return {
      label: 'Disetujui HR',
      badgeClass: 'bg-[#ebf3fb] text-[#285a84]',
    }
  }
  return {
    label: 'Draft HR',
    badgeClass: 'bg-stone-100 text-stone-700',
  }
}

/**
 * Kartu rincian komponen Slip Gaji (digunakan di Portal Karyawan & Portal HR).
 */
export default function PayslipCard({
  employeeName,
  positionName,
  nik,
  departmentName,
  baseSalary = 0,
  allowance = 0,
  overtimeHours = 0,
  overtime = 0,
  bpjs = 0,
  lateCount = 0,
  lateDeduction = 0,
  alphaCount = 0,
  alphaDeduction = 0,
  pph21 = 0,
  total = 0,
  status = 'ESTIMASI',
  isEstimated = false,
  downloadingPdf = false,
  onDownloadPdf,
  dashed = true,
}) {
  const statusMeta = getSlipStatusMeta(status, isEstimated)

  return (
    <div>
      <div
        className={`rounded-2xl p-5 mb-5 ${
          dashed
            ? 'border border-dashed border-[#dcd7cb]'
            : 'border border-stone-100 bg-stone-50/40'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <div className="text-sm font-bold text-stone-900">
              {employeeName || 'Karyawan'}
            </div>
            <div className="text-xs text-stone-500">
              {positionName || 'Staff'}
              {departmentName ? ` · ${departmentName}` : ''}
              {nik && nik !== '-' ? ` · ${nik}` : ''}
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="divide-y divide-stone-100 text-xs">
          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>Gaji pokok</span>
            <span className="font-bold text-stone-900">
              {formatRupiah(baseSalary)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>Tunjangan tetap</span>
            <span className="font-bold text-stone-900">
              {formatRupiah(allowance)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>Lembur ({overtimeHours} jam)</span>
            <span className="font-bold text-stone-900">
              {formatRupiah(overtime)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>BPJS Kesehatan &amp; TK (3%)</span>
            <span className="font-bold text-[#c44d27]">
              − {formatRupiah(bpjs)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>Keterlambatan ({lateCount}x)</span>
            <span className="font-bold text-[#c44d27]">
              − {formatRupiah(lateDeduction)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>Alpa ({alphaCount} hari)</span>
            <span className="font-bold text-[#c44d27]">
              − {formatRupiah(alphaDeduction)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center text-stone-700">
            <span>PPh 21 (estimasi)</span>
            <span className="font-bold text-[#c44d27]">
              − {formatRupiah(pph21)}
            </span>
          </div>

          <div className="pt-4 flex flex-col items-start">
            <span className="text-[11px] text-stone-500 font-medium">
              Diterima (Take Home Pay)
            </span>
            <span className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight mt-0.5">
              {formatRupiah(total)}
            </span>
          </div>
        </div>
      </div>

      {onDownloadPdf && (
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={downloadingPdf}
          className="w-full py-3 rounded-xl border border-[#d0cac0] hover:bg-stone-50 active:bg-stone-100 text-stone-800 font-bold text-sm transition cursor-pointer shadow-xs text-center disabled:opacity-50"
        >
          {downloadingPdf ? 'Membuat PDF Resmi...' : 'Unduh Slip Gaji (PDF)'}
        </button>
      )}
    </div>
  )
}
