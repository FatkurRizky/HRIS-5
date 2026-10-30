import { MONTH_NAMES } from '../../lib/constants'
import { shiftMonthPeriod } from '../../lib/formatters'

const BASE_YEAR = new Date().getFullYear()

/**
 * Pemilih periode Bulan & Tahun lengkap dengan navigasi cepat ke bulan sebelumnya / bulan selanjutnya.
 */
export default function PeriodSelector({
  month,
  year,
  onChange,
  variant = 'warm', // 'warm' | 'emerald'
}) {
  const yearOptions = [BASE_YEAR - 1, BASE_YEAR, BASE_YEAR + 1, BASE_YEAR + 2]
  if (!yearOptions.includes(year)) {
    yearOptions.push(year)
    yearOptions.sort((a, b) => a - b)
  }

  const isEmerald = variant === 'emerald'
  const inputBg = isEmerald
    ? 'bg-[#f4f3ef] border-stone-200 focus:border-[#0f3832]'
    : 'bg-[#fbf9f4] border-[#e8e4db] focus:border-[#c44d27]'

  const handleShift = (delta) => {
    const next = shiftMonthPeriod(month, year, delta)
    onChange(next)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      <button
        type="button"
        onClick={() => handleShift(-1)}
        title="Lihat bulan sebelumnya"
        className={`px-2.5 py-2 rounded-lg border font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer ${inputBg}`}
      >
        ◀
      </button>

      <select
        value={month}
        onChange={(e) => onChange({ month: Number(e.target.value), year })}
        className={`border rounded-lg px-3 py-2 font-semibold text-stone-800 outline-none cursor-pointer ${inputBg}`}
      >
        {MONTH_NAMES.map((label, idx) => (
          <option key={label} value={idx + 1}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onChange({ month, year: Number(e.target.value) })}
        className={`border rounded-lg px-3 py-2 font-semibold text-stone-800 outline-none cursor-pointer ${inputBg}`}
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => handleShift(1)}
        title="Lihat gaji bulan selanjutnya"
        className={`px-3 py-2 rounded-lg border font-bold transition cursor-pointer ${
          isEmerald
            ? 'bg-[#0f3832]/10 border-[#0f3832]/20 text-[#0f3832] hover:bg-[#0f3832]/15'
            : 'bg-[#fef3eb] border-[#f0d8c4] text-[#c44d27] hover:bg-[#fce8d8]'
        }`}
      >
        Bulan depan ▶
      </button>
    </div>
  )
}
