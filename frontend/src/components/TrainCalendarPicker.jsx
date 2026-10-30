import { useState, useMemo, useRef, useEffect } from 'react'
import {
  buildCalendarCells,
  calculateLeaveDays,
  computeCalendarPreset,
  formatKaiDate,
  parseIsoDateStr,
  toIsoDateStr,
} from '../lib/calendarUtils'
import CalendarPopupGrid from './shared/CalendarPopupGrid'

/**
 * Pemilih rentang tanggal cuti interaktif bergaya pemesanan tiket KAI (Mulai ⇄ Selesai).
 */
export default function TrainCalendarPicker({
  startDate,
  endDate,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectingStep, setSelectingStep] = useState('start')
  const [hoverDateStr, setHoverDateStr] = useState(null)
  const [todayIso] = useState(() => toIsoDateStr(new Date()))

  const [viewYear, setViewYear] = useState(() => {
    const parsed = parseIsoDateStr(startDate)
    return (parsed || new Date()).getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = parseIsoDateStr(startDate)
    return (parsed || new Date()).getMonth()
  })

  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const calendarCells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectDate = (iso) => {
    if (selectingStep === 'start' || !startDate) {
      if (endDate && iso <= endDate) {
        onChange({ startDate: iso, endDate })
      } else {
        onChange({ startDate: iso, endDate: iso })
      }
      setSelectingStep('end')
    } else if (iso < startDate) {
      onChange({ startDate: iso, endDate: startDate })
      setSelectingStep('end')
    } else {
      onChange({ startDate, endDate: iso })
      setSelectingStep('start')
    }
  }

  const applyPreset = (type) => {
    if (type === 'reset') {
      onChange({ startDate: '', endDate: '' })
      setSelectingStep('start')
      return
    }
    const preset = computeCalendarPreset(type)
    onChange({ startDate: preset.startDate, endDate: preset.endDate })
    setViewYear(preset.year)
    setViewMonth(preset.month)
  }

  const { totalDays, workDays, weekendDays } = useMemo(
    () => calculateLeaveDays(startDate, endDate),
    [startDate, endDate]
  )

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Box Ala Pemesanan Tiket Kereta Api (Mulai ⇄ Selesai) */}
      <div
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true)
            setSelectingStep('start')
          }
        }}
        className={`w-full bg-[#fbf9f4] border rounded-2xl p-3.5 transition cursor-pointer select-none ${
          isOpen
            ? 'border-[#c44d27] ring-2 ring-[#c44d27]/15 bg-white'
            : 'border-[#e8e4db] hover:border-[#c44d27]/60'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-2.5">
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(true)
              setSelectingStep('start')
            }}
            className={`sm:col-span-5 p-2.5 rounded-xl border transition ${
              isOpen && selectingStep === 'start'
                ? 'bg-[#fef3eb] border-[#c44d27]'
                : 'bg-white border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              <span>📅</span>
              <span>Tanggal Mulai Cuti</span>
            </div>
            {startDate ? (
              <div className="text-sm font-extrabold text-stone-900">
                {formatKaiDate(startDate)}
              </div>
            ) : (
              <div className="text-xs font-semibold text-stone-400">
                Pilih tanggal mulai...
              </div>
            )}
          </div>

          <div className="sm:col-span-1 flex sm:flex-col items-center justify-center py-0.5">
            <div className="w-7 h-7 rounded-full bg-[#fef3eb] border border-[#f5d0b8] text-[#c44d27] flex items-center justify-center text-xs font-bold shadow-2xs">
              ⇄
            </div>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(true)
              setSelectingStep('end')
            }}
            className={`sm:col-span-5 p-2.5 rounded-xl border transition ${
              isOpen && selectingStep === 'end'
                ? 'bg-[#fef3eb] border-[#c44d27]'
                : 'bg-white border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              <span>🏁</span>
              <span>Tanggal Selesai Cuti</span>
            </div>
            {endDate ? (
              <div className="text-sm font-extrabold text-stone-900">
                {formatKaiDate(endDate)}
              </div>
            ) : (
              <div className="text-xs font-semibold text-stone-400">
                Pilih tanggal selesai...
              </div>
            )}
          </div>
        </div>

        {startDate && endDate && (
          <div className="mt-2.5 pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-[#c44d27]" />
              <span>
                Total rentang: <strong className="text-stone-900">{totalDays} hari</strong>
                {weekendDays > 0 && (
                  <span className="text-stone-500"> (termasuk {weekendDays} hari Sabtu/Minggu)</span>
                )}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fef3eb] text-[#c44d27] font-extrabold">
              Potong Kuota: {workDays} Hari Kerja
            </span>
          </div>
        )}
      </div>

      {isOpen && (
        <CalendarPopupGrid
          startDate={startDate}
          endDate={endDate}
          selectingStep={selectingStep}
          setSelectingStep={setSelectingStep}
          hoverDateStr={hoverDateStr}
          setHoverDateStr={setHoverDateStr}
          viewMonth={viewMonth}
          viewYear={viewYear}
          calendarCells={calendarCells}
          todayIso={todayIso}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectDate={handleSelectDate}
          onApplyPreset={applyPreset}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
