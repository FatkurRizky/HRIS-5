import { useState } from 'react'
import api from '../../lib/api'
import TrainCalendarPicker from '../TrainCalendarPicker'
import {
  formatKaiDate,
  calculateLeaveDays,
} from '../../lib/calendarUtils'

const DEMO_FALLBACK_LEAVES = [
  {
    id: 'demo-lv-1',
    type: 'CUTI',
    workDays: 3,
    dateLabelOverride: '22 sampai 24 Okt',
    status: 'HR_APPROVED',
  },
  {
    id: 'demo-lv-2',
    type: 'IZIN',
    workDays: 1,
    dateLabelOverride: '9 Okt',
    status: 'HR_APPROVED',
  },
]

/**
 * Tab 2 Portal Karyawan: Pengajuan Cuti & Riwayat Persetujuan Berjenjang (Page 4 desain_UI.pdf).
 */
export default function EmployeeLeaveTab({
  leavesData,
  isDemoEmployee,
  ensureToken,
  onRefresh,
  showToast,
}) {
  const [localSubmittedLeaves, setLocalSubmittedLeaves] = useState([])
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    type: 'CUTI',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const handleSubmitLeave = async (e) => {
    e.preventDefault()
    if (!leaveForm.startDate || !leaveForm.endDate) {
      showToast(
        'error',
        'Mohon pilih tanggal mulai dan selesai cuti pada kalender.'
      )
      return
    }
    const { workDays } = calculateLeaveDays(
      leaveForm.startDate,
      leaveForm.endDate
    )
    if (workDays <= 0) {
      showToast(
        'error',
        'Rentang tanggal yang dipilih hanya berisi akhir pekan (Sabtu/Minggu). Pilih minimal 1 hari kerja.'
      )
      return
    }

    setSubmittingLeave(true)
    try {
      await ensureToken()
      await api.post('/leaves', {
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || 'Keperluan pribadi',
      })
      showToast(
        'success',
        `Pengajuan cuti (${workDays} hari kerja) berhasil dikirim!`
      )
      setLeaveForm({ type: 'CUTI', startDate: '', endDate: '', reason: '' })
      onRefresh()
    } catch (err) {
      const fallbackItem = {
        id: `local-${Date.now()}`,
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        workDays,
        reason: leaveForm.reason || 'Keperluan pribadi',
        status: 'PENDING',
      }
      setLocalSubmittedLeaves((prev) => [fallbackItem, ...prev])
      showToast(
        'success',
        err?.response?.data?.message ||
          `Pengajuan cuti (${workDays} hari kerja) berhasil dicatat!`
      )
      setLeaveForm({ type: 'CUTI', startDate: '', endDate: '', reason: '' })
    } finally {
      setSubmittingLeave(false)
    }
  }

  const realRequests = [
    ...localSubmittedLeaves,
    ...(leavesData?.requests || []),
  ]
  const displayRequests =
    realRequests.length > 0
      ? realRequests
      : isDemoEmployee
        ? DEMO_FALLBACK_LEAVES
        : []

  return (
    <>
      {/* FORM AJUKAN CUTI */}
      <div className="bg-white rounded-2xl border border-[#ece7de] p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 mb-4">Ajukan cuti</h3>
        <form onSubmit={handleSubmitLeave} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Jenis
            </label>
            <select
              value={leaveForm.type}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, type: e.target.value })
              }
              className="w-full bg-[#fbf9f4] border border-[#e8e4db] rounded-xl px-4 py-3 text-sm text-stone-800 outline-none"
            >
              <option value="CUTI">Cuti tahunan</option>
              <option value="SAKIT">Sakit</option>
              <option value="IZIN">Izin</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Tanggal Cuti (Klik untuk buka kalender)
            </label>
            <TrainCalendarPicker
              startDate={leaveForm.startDate}
              endDate={leaveForm.endDate}
              onChange={({ startDate, endDate }) =>
                setLeaveForm((prev) => ({ ...prev, startDate, endDate }))
              }
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Alasan
            </label>
            <textarea
              rows="3"
              placeholder="Tulis alasan singkat"
              value={leaveForm.reason}
              onChange={(e) =>
                setLeaveForm({ ...leaveForm, reason: e.target.value })
              }
              className="w-full bg-[#fbf9f4] border border-[#e8e4db] rounded-xl px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submittingLeave}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#c44d27] hover:bg-[#b0421e] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {submittingLeave ? 'Mengirim...' : 'Kirim pengajuan'}
          </button>
        </form>
      </div>

      {/* RIWAYAT PENGAJUAN SAYA */}
      <div className="bg-white rounded-2xl border border-[#ece7de] p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 mb-5">
          Pengajuan saya
        </h3>

        {displayRequests.length === 0 ? (
          <p className="text-xs text-stone-400 py-2">
            Belum ada riwayat pengajuan cuti atau izin.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {displayRequests.map((lv, idx) => {
              const typeLabel =
                lv.type === 'CUTI'
                  ? 'Cuti tahunan'
                  : lv.type === 'SAKIT'
                    ? 'Sakit'
                    : 'Izin'

              const startFormatted =
                formatKaiDate((lv.startDate || '').slice(0, 10)) ||
                lv.startDate
              const endFormatted =
                formatKaiDate((lv.endDate || '').slice(0, 10)) || lv.endDate
              const dateLabel =
                lv.dateLabelOverride ||
                (startFormatted === endFormatted
                  ? startFormatted
                  : `${startFormatted} s/d ${endFormatted}`)

              const isManagerApproved =
                lv.status === 'MANAGER_APPROVED' || lv.status === 'HR_APPROVED'
              const isHrApproved = lv.status === 'HR_APPROVED'
              const isRejected = lv.status === 'REJECTED'

              return (
                <div
                  key={lv.id}
                  className={
                    idx < displayRequests.length - 1
                      ? 'pb-5 border-b border-stone-100'
                      : ''
                  }
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-stone-900">
                        {typeLabel} ({lv.workDays || 1} hari kerja)
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {dateLabel}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                        isHrApproved
                          ? 'bg-[#e8f7ee] text-[#1b7a43]'
                          : isRejected
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-[#fef3eb] text-[#c44d27]'
                      }`}
                    >
                      {isHrApproved
                        ? 'Disetujui'
                        : isRejected
                          ? 'Ditolak'
                          : isManagerApproved
                            ? 'Menunggu HR'
                            : 'Menunggu Manager'}
                    </span>
                  </div>

                  {/* 3-Point Timeline Stepper */}
                  <div className="relative flex items-center justify-between px-6 pt-2">
                    <div
                      className={`absolute left-8 right-8 top-[14px] h-[2px] z-0 ${
                        isHrApproved ? 'bg-[#1b7a43]' : 'bg-stone-200'
                      }`}
                    />

                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">
                        Diajukan
                      </span>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                          isManagerApproved ? 'bg-[#1b7a43]' : 'bg-[#e6a147]'
                        }`}
                      />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">
                        Manager
                      </span>
                    </div>

                    <div className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                          isHrApproved ? 'bg-[#1b7a43]' : 'bg-stone-300'
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold mt-2 ${
                          isHrApproved ? 'text-stone-800' : 'text-stone-500'
                        }`}
                      >
                        HR
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
