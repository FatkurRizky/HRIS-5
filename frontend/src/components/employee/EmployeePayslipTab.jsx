import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { MONTH_NAMES } from '../../lib/constants'
import { downloadBlob } from '../../lib/formatters'
import PeriodSelector from '../shared/PeriodSelector'
import PayslipCard from '../shared/PayslipCard'

function buildFallbackSlip(employeeProfile, currentUser, month, year) {
  const baseSalary =
    employeeProfile?.salary?.baseSalary ??
    employeeProfile?.position?.baseSalary ??
    10000000
  const allowance = employeeProfile?.salary?.allowance ?? 2000000
  const bpjs = Math.round((baseSalary + allowance) * 0.03)
  const taxable = Math.max(0, baseSalary + allowance - 4500000)
  const pph21 = Math.round(taxable * 0.05)

  return {
    id: null,
    periodMonth: month,
    periodYear: year,
    periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
    isEstimated: true,
    status: 'ESTIMASI',
    baseSalary,
    allowance,
    overtimeHours: 0,
    overtime: 0,
    lateCount: 0,
    lateDeduction: 0,
    alphaCount: 0,
    alphaDeduction: 0,
    bpjs,
    pph21,
    total: Math.max(0, baseSalary + allowance - bpjs - pph21),
    employee: {
      name: employeeProfile?.user?.name || currentUser?.name || 'Karyawan',
      position: employeeProfile?.position?.name || 'Staff',
      department: employeeProfile?.department?.name || 'Engineering',
      nik: employeeProfile?.nik || '-',
    },
  }
}

/**
 * Tab 3 Portal Karyawan: Slip Gaji Dinamis per Periode (termasuk bulan selanjutnya) & Unduh PDF Resmi.
 */
export default function EmployeePayslipTab({
  currentUser,
  employeeProfile,
  ensureToken,
  showToast,
}) {
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [slip, setSlip] = useState(null)
  const [loadingSlip, setLoadingSlip] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const fetchPeriodSlip = useCallback(async () => {
    setLoadingSlip(true)
    try {
      await ensureToken()
      const res = await api.get('/payroll/my/period', {
        params: { month: period.month, year: period.year },
      })
      setSlip(res.data)
    } catch {
      setSlip(
        buildFallbackSlip(
          employeeProfile,
          currentUser,
          period.month,
          period.year
        )
      )
    } finally {
      setLoadingSlip(false)
    }
  }, [ensureToken, period.month, period.year, employeeProfile, currentUser])

  useEffect(() => {
    fetchPeriodSlip()
  }, [fetchPeriodSlip])

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      await ensureToken()
      const res = await api.get('/payroll/my/payslip-pdf', {
        params: { month: period.month, year: period.year },
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const safeName = (
        slip?.employee?.name ||
        employeeProfile?.user?.name ||
        currentUser?.name ||
        'karyawan'
      )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')

      downloadBlob(
        blob,
        `slip-gaji-${safeName}-${period.month}-${period.year}.pdf`
      )
      showToast('success', 'Slip gaji PDF resmi berhasil diunduh!')
    } catch (err) {
      const msg = err?.response?.data?.message || err.message
      showToast('error', `Gagal mengunduh slip PDF: ${msg}`)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const activeSlip =
    slip ||
    buildFallbackSlip(employeeProfile, currentUser, period.month, period.year)

  return (
    <div className="bg-white rounded-2xl border border-[#ece7de] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-stone-900">
            Slip gaji {MONTH_NAMES[period.month - 1]} {period.year}
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Pilih bulan atau klik &ldquo;Bulan depan ▶&rdquo; untuk melihat
            gaji periode berikutnya
          </p>
        </div>

        <PeriodSelector
          month={period.month}
          year={period.year}
          onChange={setPeriod}
          variant="warm"
        />
      </div>

      {activeSlip.isEstimated && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#fef8ef] border border-[#f2dfc4] text-[11px] text-[#8f5314]">
          Periode <strong>{activeSlip.periodLabel}</strong> belum difinalisasi
          HR. Angka di bawah adalah perhitungan otomatis dari gaji pokok,
          tunjangan, dan absensi berjalan Anda.
        </div>
      )}

      {loadingSlip ? (
        <div className="py-12 text-center text-xs text-stone-400">
          Memuat rincian slip gaji...
        </div>
      ) : (
        <PayslipCard
          employeeName={activeSlip.employee?.name}
          positionName={activeSlip.employee?.position}
          departmentName={activeSlip.employee?.department}
          nik={activeSlip.employee?.nik}
          baseSalary={activeSlip.baseSalary}
          allowance={activeSlip.allowance}
          overtimeHours={activeSlip.overtimeHours}
          overtime={activeSlip.overtime}
          bpjs={activeSlip.bpjs}
          lateCount={activeSlip.lateCount}
          lateDeduction={activeSlip.lateDeduction}
          alphaCount={activeSlip.alphaCount}
          alphaDeduction={activeSlip.alphaDeduction}
          pph21={activeSlip.pph21}
          total={activeSlip.total}
          status={activeSlip.status}
          isEstimated={activeSlip.isEstimated}
          downloadingPdf={downloadingPdf}
          onDownloadPdf={handleDownloadPdf}
          dashed
        />
      )}
    </div>
  )
}
