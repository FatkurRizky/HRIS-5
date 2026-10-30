import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { AVATAR_COLORS, MONTH_NAMES } from '../../lib/constants'
import {
  downloadBlob,
  formatRupiah,
  getInitials,
} from '../../lib/formatters'
import PeriodSelector from '../shared/PeriodSelector'
import PayslipCard from '../shared/PayslipCard'

function getStatusPill(status) {
  if (status === 'PAID') {
    return { label: 'Dicairkan', cls: 'bg-[#e8f7ee] text-[#1b7a43]' }
  }
  if (status === 'APPROVED') {
    return { label: 'Disetujui', cls: 'bg-[#ebf3fb] text-[#285a84]' }
  }
  return { label: 'Draft', cls: 'bg-[#fef3eb] text-[#b86d1a]' }
}

/**
 * Tab 5 Portal HR: Kalkulasi Payroll Bulanan Nyata & Unduh PDF Resmi (Page 13 desain_UI.pdf).
 * Mendukung pemilihan bulan selanjutnya, hitung otomatis seluruh karyawan (termasuk karyawan baru),
 * persetujuan massal/individual, dan unduhan slip PDF.
 */
export default function HRPayrollTab({ ensureToken, showToast }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [records, setRecords] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const loadPeriodPayroll = useCallback(async () => {
    setLoading(true)
    try {
      await ensureToken()
      const res = await api.get('/payroll', {
        params: { month: period.month, year: period.year },
      })
      let list = Array.isArray(res.data) ? res.data : []

      // Jika periode tersebut belum pernah dihitung, otomatis kalkulasi draft awal dari data karyawan aktif
      if (list.length === 0) {
        const genRes = await api.post('/payroll/generate', {
          month: period.month,
          year: period.year,
        })
        list = Array.isArray(genRes.data?.records) ? genRes.data.records : []
      }

      setRecords(list)
      setSelectedId((prev) =>
        list.some((item) => item.id === prev) ? prev : list[0]?.id || null
      )
    } catch (err) {
      console.warn('Gagal memuat data payroll:', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [ensureToken, period.month, period.year])

  useEffect(() => {
    loadPeriodPayroll()
  }, [loadPeriodPayroll])

  const handleRecalculate = async () => {
    setActionLoading(true)
    try {
      await ensureToken()
      const res = await api.post('/payroll/generate', {
        month: period.month,
        year: period.year,
      })
      const list = Array.isArray(res.data?.records) ? res.data.records : []
      setRecords(list)
      if (list.length > 0 && !list.some((r) => r.id === selectedId)) {
        setSelectedId(list[0].id)
      }
      showToast(
        'success',
        res.data?.message || 'Kalkulasi payroll berhasil diperbarui!'
      )
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message || 'Gagal menghitung ulang payroll.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprovePeriod = async () => {
    setActionLoading(true)
    try {
      await ensureToken()
      const res = await api.post('/payroll/approve-period', {
        month: period.month,
        year: period.year,
      })
      const list = Array.isArray(res.data?.records) ? res.data.records : []
      if (list.length > 0) setRecords(list)
      showToast(
        'success',
        res.data?.message || 'Batch payroll berhasil disetujui HR!'
      )
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message || 'Gagal menyetujui batch payroll.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkPaid = async (record) => {
    if (!record?.id) return
    setActionLoading(true)
    try {
      await ensureToken()
      if (record.status === 'DRAFT') {
        await api.patch(`/payroll/${record.id}/approve`)
      }
      await api.patch(`/payroll/${record.id}/mark-paid`)
      await loadPeriodPayroll()
      showToast(
        'success',
        `Slip gaji ${record.employee?.user?.name || 'karyawan'} ditandai telah dicairkan!`
      )
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message || 'Gagal menandai pencairan gaji.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPdf = async (record) => {
    if (!record?.id) return
    setDownloadingPdf(true)
    try {
      await ensureToken()
      const res = await api.get(`/payroll/${record.id}/payslip-pdf`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const safeName = (record.employee?.user?.name || 'karyawan')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
      downloadBlob(
        blob,
        `slip-gaji-${safeName}-${record.periodMonth}-${record.periodYear}.pdf`
      )
      showToast(
        'success',
        `Slip gaji PDF ${record.employee?.user?.name || ''} berhasil diunduh!`
      )
    } catch (err) {
      showToast(
        'error',
        err?.response?.data?.message || 'Gagal mengunduh PDF slip gaji.'
      )
    } finally {
      setDownloadingPdf(false)
    }
  }

  const selectedRecord =
    records.find((r) => r.id === selectedId) || records[0] || null

  const allApproved =
    records.length > 0 &&
    records.every((r) => r.status === 'APPROVED' || r.status === 'PAID')
  const allPaid =
    records.length > 0 && records.every((r) => r.status === 'PAID')

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">
            Payroll {MONTH_NAMES[period.month - 1]} {period.year}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Kalkulasi otomatis dari gaji pokok, absensi, lembur, dan potongan
            seluruh karyawan terdaftar
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector
            month={period.month}
            year={period.year}
            onChange={setPeriod}
            variant="emerald"
          />

          <button
            type="button"
            onClick={handleRecalculate}
            disabled={actionLoading || loading}
            className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            Hitung ulang
          </button>

          <button
            type="button"
            onClick={handleApprovePeriod}
            disabled={actionLoading || loading || allPaid}
            className="bg-[#0f3832] hover:bg-[#134941] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {allApproved ? 'Sudah disetujui' : 'Setujui payroll'}
          </button>
        </div>
      </div>

      {/* Stepper Status */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs mb-6 flex items-center justify-between text-xs font-semibold px-6 sm:px-8 flex-wrap gap-2">
        <span className="text-[#1b7a43] font-bold">✓ Draft dihitung</span>
        <span
          className={
            !allApproved
              ? 'text-[#0f3832] font-bold'
              : 'text-[#1b7a43] font-bold'
          }
        >
          {allApproved ? '✓ Ditinjau HR' : '● Ditinjau HR'}
        </span>
        <span
          className={
            allApproved
              ? 'text-[#1b7a43] font-bold'
              : 'text-stone-400'
          }
        >
          {allApproved ? '✓ Disetujui HR' : '○ Disetujui HR'}
        </span>
        <span
          className={allPaid ? 'text-[#1b7a43] font-bold' : 'text-stone-400'}
        >
          {allPaid ? '✓ Dicairkan' : '○ Dicairkan'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Pendapatan</th>
                <th className="py-3 px-4">Potongan</th>
                <th className="py-3 px-4">Diterima</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-stone-400">
                    Menghitung &amp; memuat data payroll...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-stone-400">
                    Belum ada data karyawan untuk periode ini.
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => {
                  const empName = rec.employee?.user?.name || 'Karyawan'
                  const gross =
                    (rec.baseSalary || 0) +
                    (rec.allowance || 0) +
                    (rec.overtime || 0)
                  const totalOut =
                    (rec.deductions || 0) + (rec.bpjs || 0) + (rec.pph21 || 0)
                  const pill = getStatusPill(rec.status)
                  const isSelected = selectedRecord?.id === rec.id

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => setSelectedId(rec.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-[#f3f7f4]' : 'hover:bg-stone-50'
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-white font-bold flex items-center justify-center text-xs shrink-0`}
                        >
                          {getInitials(empName)}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">
                            {empName}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {rec.employee?.position?.name || 'Staff'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {formatRupiah(gross)}
                      </td>
                      <td className="py-3 px-4 text-[#c44d27]">
                        − {formatRupiah(totalOut)}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {formatRupiah(rec.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pill.cls}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Slip Gaji Preview (Right Side) */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900">
              Rincian slip gaji
            </h3>
            {selectedRecord && selectedRecord.status !== 'PAID' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleMarkPaid(selectedRecord)}
                className="text-[11px] font-bold text-[#1b7a43] hover:underline cursor-pointer disabled:opacity-50"
              >
                Tandai Cair ✓
              </button>
            )}
          </div>

          {selectedRecord ? (
            <PayslipCard
              employeeName={selectedRecord.employee?.user?.name}
              positionName={selectedRecord.employee?.position?.name}
              departmentName={selectedRecord.employee?.department?.name}
              nik={selectedRecord.employee?.nik}
              baseSalary={selectedRecord.baseSalary}
              allowance={selectedRecord.allowance}
              overtimeHours={selectedRecord.overtimeHours ?? 0}
              overtime={selectedRecord.overtime}
              bpjs={selectedRecord.bpjs}
              lateCount={selectedRecord.lateCount ?? 0}
              lateDeduction={
                selectedRecord.lateDeduction ?? selectedRecord.deductions ?? 0
              }
              alphaCount={selectedRecord.alphaCount ?? 0}
              alphaDeduction={selectedRecord.alphaDeduction ?? 0}
              pph21={selectedRecord.pph21}
              total={selectedRecord.total}
              status={selectedRecord.status}
              isEstimated={false}
              downloadingPdf={downloadingPdf}
              onDownloadPdf={() => handleDownloadPdf(selectedRecord)}
              dashed={false}
            />
          ) : (
            <p className="text-xs text-stone-400 py-8 text-center">
              Pilih baris karyawan untuk meninjau &amp; mengunduh slip gaji PDF.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
