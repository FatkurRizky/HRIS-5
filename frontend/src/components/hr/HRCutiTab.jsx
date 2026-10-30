import { useState } from 'react'
import api from '../../lib/api'

/**
 * Tab 4 Portal HR: Antrean Persetujuan Cuti Layer 2 & Pengajuan Cuti Pribadi HR (Page 12 desain_UI.pdf).
 */
export default function HRCutiTab({
  hrLeaveQueue,
  ensureToken,
  onRefreshQueue,
  showToast,
}) {
  const [processingLeaveId, setProcessingLeaveId] = useState(null)
  const [leaveForm, setLeaveForm] = useState({
    type: 'Cuti tahunan',
    dateRange: '3 sampai 5 November 2026',
    reason: '',
  })
  const [myLeaves, setMyLeaves] = useState([
    {
      id: 1,
      type: 'Cuti tahunan',
      dates: '22 sampai 24 Okt',
      status: 'Disetujui',
    },
    { id: 2, type: 'Izin', dates: '9 Okt', status: 'Disetujui' },
  ])

  const handleHrLeaveAction = async (leave, action) => {
    setProcessingLeaveId(leave.id)
    try {
      await ensureToken()
      if (action === 'APPROVE') {
        await api.patch(`/leaves/${leave.id}/hr-approve`)
        showToast('success', 'Cuti disetujui final oleh HR')
      } else {
        await api.patch(`/leaves/${leave.id}/reject`, {
          reason: 'Ditolak oleh HR',
        })
        showToast('info', 'Pengajuan cuti ditolak')
      }
      await onRefreshQueue()
    } catch (err) {
      const msg = err?.response?.data?.message
      showToast(
        'error',
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Gagal memproses pengajuan cuti'
      )
    } finally {
      setProcessingLeaveId(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Cuti dan izin</h2>
        <p className="text-xs text-stone-500 mt-1">
          Persetujuan berjenjang: Manager, lalu HR
        </p>
      </div>

      {/* Antrean Persetujuan HR (Layer 2) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs mb-6">
        <h3 className="text-sm font-bold text-stone-900 mb-1">
          Antrean persetujuan HR (Layer 2)
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Hanya pengajuan yang sudah disetujui Manager yang muncul di sini.
        </p>
        {hrLeaveQueue.length === 0 ? (
          <div className="text-xs text-stone-400 py-2">
            Tidak ada pengajuan yang menunggu persetujuan HR.
          </div>
        ) : (
          <div className="space-y-3">
            {hrLeaveQueue.map((lv) => (
              <div
                key={lv.id}
                className="flex items-center justify-between gap-4 border border-stone-100 rounded-xl px-4 py-3 flex-wrap"
              >
                <div>
                  <div className="text-sm font-bold text-stone-900">
                    {lv.employee?.user?.name || 'Karyawan'}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {lv.type === 'CUTI'
                      ? 'Cuti tahunan'
                      : lv.type === 'SAKIT'
                        ? 'Sakit'
                        : 'Izin'}
                    , {lv.workDays} hari kerja ({(lv.startDate || '').slice(0, 10)}{' '}
                    s/d {(lv.endDate || '').slice(0, 10)})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#ebf3fb] text-[#285a84]">
                    Disetujui Manager
                  </span>
                  <button
                    disabled={processingLeaveId === lv.id}
                    onClick={() => handleHrLeaveAction(lv, 'REJECT')}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    disabled={processingLeaveId === lv.id}
                    onClick={() => handleHrLeaveAction(lv, 'APPROVE')}
                    className="px-3 py-1.5 rounded-lg bg-[#0f3832] hover:bg-[#14473f] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Setujui final
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Ajukan Cuti */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-4">Ajukan cuti</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setMyLeaves((prev) => [
                {
                  id: Date.now(),
                  type: leaveForm.type,
                  dates: leaveForm.dateRange || '3 sampai 5 Nov',
                  status: 'Disetujui',
                },
                ...prev,
              ])
              setLeaveForm({ ...leaveForm, reason: '' })
              showToast('success', 'Pengajuan cuti berhasil dikirim!')
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="font-bold text-stone-700 block mb-1.5">
                Jenis
              </label>
              <select
                value={leaveForm.type}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, type: e.target.value })
                }
                className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none"
              >
                <option value="Cuti tahunan">Cuti tahunan</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1.5">
                Tanggal
              </label>
              <input
                type="text"
                value={leaveForm.dateRange}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, dateRange: e.target.value })
                }
                className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1.5">
                Alasan
              </label>
              <textarea
                rows="3"
                placeholder="Tulis alasan singkat"
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                className="w-full bg-[#f4f3ef] border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#0f3832] hover:bg-[#14473f] text-white font-bold text-xs transition cursor-pointer"
            >
              Kirim pengajuan
            </button>
          </form>
        </div>

        {/* Right Card: Pengajuan Saya */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-5">
            Pengajuan saya
          </h3>
          <div className="space-y-6">
            {myLeaves.map((lv, idx) => (
              <div
                key={lv.id}
                className={idx > 0 ? 'pt-5 border-t border-stone-100' : ''}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {lv.type}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {lv.dates}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#e8f7ee] text-[#1b7a43]">
                    {lv.status}
                  </span>
                </div>

                <div className="relative flex items-center justify-between px-6 pt-2">
                  <div className="absolute left-8 right-8 top-[14px] h-[2px] bg-[#1b7a43] z-0" />
                  {['Diajukan', 'Manager', 'HR'].map((step) => (
                    <div
                      key={step}
                      className="flex flex-col items-center relative z-10"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1b7a43] border-2 border-white shadow-xs" />
                      <span className="text-[11px] font-bold text-stone-800 mt-2">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
