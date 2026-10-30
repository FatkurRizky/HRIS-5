import { DAYS_HEADER } from '../../lib/calendarUtils'
import { MONTH_NAMES } from '../../lib/constants'

/**
 * Popup kalender interaktif gaya pemesanan tiket KAI untuk memilih rentang tanggal cuti.
 */
export default function CalendarPopupGrid({
  startDate,
  endDate,
  selectingStep,
  setSelectingStep,
  hoverDateStr,
  setHoverDateStr,
  viewMonth,
  viewYear,
  calendarCells,
  todayIso,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onApplyPreset,
  onClose,
}) {
  return (
    <div className="mt-2 bg-white rounded-2xl border border-[#dcd7cb] shadow-xl p-4 sm:p-5 z-40 relative animate-in fade-in duration-150">
      {/* Step Indicator & Quick Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectingStep('start')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              selectingStep === 'start'
                ? 'bg-[#c44d27] text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            1. Pilih Mulai
          </button>
          <span className="text-stone-300 text-xs">→</span>
          <button
            type="button"
            onClick={() => setSelectingStep('end')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              selectingStep === 'end'
                ? 'bg-[#c44d27] text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            2. Pilih Selesai
          </button>
        </div>

        {/* Pintasan Cepat */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onApplyPreset('besok')}
            className="px-2 py-1 rounded-md bg-[#fbf9f4] hover:bg-[#fef3eb] border border-stone-200 text-[10px] font-bold text-stone-700 hover:text-[#c44d27] transition cursor-pointer"
          >
            Besok (1 hr)
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('3hari')}
            className="px-2 py-1 rounded-md bg-[#fbf9f4] hover:bg-[#fef3eb] border border-stone-200 text-[10px] font-bold text-stone-700 hover:text-[#c44d27] transition cursor-pointer"
          >
            Minggu Depan (3 hr)
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('5hari')}
            className="px-2 py-1 rounded-md bg-[#fbf9f4] hover:bg-[#fef3eb] border border-stone-200 text-[10px] font-bold text-stone-700 hover:text-[#c44d27] transition cursor-pointer"
          >
            1 Minggu (5 hr)
          </button>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => onApplyPreset('reset')}
              className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-600 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Header Navigasi Bulan & Tahun */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
          title="Bulan Sebelumnya"
        >
          ‹
        </button>
        <div className="text-sm font-extrabold text-stone-900 tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
          title="Bulan Berikutnya"
        >
          ›
        </button>
      </div>

      {/* Nama Hari (Sen - Min) */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
        {DAYS_HEADER.map((d) => (
          <div
            key={d.label}
            className={`text-[11px] font-extrabold py-1 ${
              d.isWeekend ? 'text-rose-500' : 'text-stone-400'
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* Tanggal dalam Bulan */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-11" />
          }

          const isStart = startDate === cell.iso
          const isEnd = endDate === cell.iso
          const isSelectedEdge = isStart || isEnd

          const effectiveEnd =
            selectingStep === 'end' && hoverDateStr && hoverDateStr >= startDate
              ? hoverDateStr
              : endDate

          const isInRange =
            startDate &&
            effectiveEnd &&
            cell.iso > startDate &&
            cell.iso < effectiveEnd

          const isToday = cell.iso === todayIso

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              onMouseEnter={() => setHoverDateStr(cell.iso)}
              onMouseLeave={() => setHoverDateStr(null)}
              className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer select-none ${
                isSelectedEdge
                  ? 'bg-[#c44d27] text-white font-extrabold shadow-xs scale-[1.02]'
                  : isInRange
                    ? 'bg-[#fef3eb] text-[#c44d27] font-bold border border-[#f5d0b8]'
                    : 'hover:bg-stone-100 text-stone-800 font-semibold'
              }`}
            >
              <span
                className={`text-xs leading-none ${
                  !isSelectedEdge && !isInRange && cell.isWeekend
                    ? 'text-rose-500 font-bold'
                    : ''
                }`}
              >
                {cell.day}
              </span>

              {isStart && isEnd ? (
                <span className="text-[8px] font-extrabold uppercase tracking-tighter text-orange-100 mt-0.5">
                  1 Hari
                </span>
              ) : isStart ? (
                <span className="text-[8px] font-extrabold uppercase tracking-tighter text-orange-100 mt-0.5">
                  Mulai
                </span>
              ) : isEnd ? (
                <span className="text-[8px] font-extrabold uppercase tracking-tighter text-orange-100 mt-0.5">
                  Selesai
                </span>
              ) : isToday ? (
                <span className="text-[8px] font-bold text-[#c44d27] mt-0.5">
                  Hari ini
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Footer Kalender */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
          <span>Tanggal merah (Sabtu & Minggu) bebas potongan kuota cuti</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-[#c44d27] hover:bg-[#b0421e] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
        >
          Selesai Pilih Tanggal
        </button>
      </div>
    </div>
  )
}
