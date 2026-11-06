import { describe, expect, it } from 'vitest'
import {
  buildCalendarCells,
  calculateLeaveDays,
  computeCalendarPreset,
  formatKaiDate,
  parseIsoDateStr,
  toIsoDateStr,
} from './calendarUtils.js'

describe('frontend calendarUtils', () => {
  describe('toIsoDateStr and parseIsoDateStr', () => {
    it('converts between Date object and YYYY-MM-DD string', () => {
      const date = new Date(2026, 10, 1) // 1 Nov 2026
      const iso = toIsoDateStr(date)
      expect(iso).toBe('2026-11-01')

      const parsed = parseIsoDateStr('2026-11-01')
      expect(parsed).toBeInstanceOf(Date)
      expect(parsed?.getFullYear()).toBe(2026)
      expect(parsed?.getMonth()).toBe(10)
      expect(parsed?.getDate()).toBe(1)
    })

    it('returns empty string or null for invalid inputs', () => {
      expect(toIsoDateStr(null)).toBe('')
      expect(parseIsoDateStr(null)).toBeNull()
      expect(parseIsoDateStr('')).toBeNull()
      expect(parseIsoDateStr('invalid-date')).toBeNull()
    })
  })

  describe('formatKaiDate', () => {
    it('formats date into ticket format: DayName, DD Mon YYYY', () => {
      const res = formatKaiDate('2026-11-03')
      expect(res).toBe('Sel, 03 Nov 2026')
    })

    it('returns null for invalid date string', () => {
      expect(formatKaiDate('invalid')).toBeNull()
    })
  })

  describe('calculateLeaveDays', () => {
    it('accurately separates workdays and weekend days', () => {
      // 2026-10-23 (Fri) to 2026-10-26 (Mon): Fri, Sat, Sun, Mon = 4 total, 2 workDays, 2 weekendDays
      const res = calculateLeaveDays('2026-10-23', '2026-10-26')
      expect(res.totalDays).toBe(4)
      expect(res.workDays).toBe(2)
      expect(res.weekendDays).toBe(2)
    })

    it('returns zeroes if end is before start or inputs invalid', () => {
      const res = calculateLeaveDays('2026-10-26', '2026-10-23')
      expect(res.totalDays).toBe(0)
      expect(res.workDays).toBe(0)
      expect(res.weekendDays).toBe(0)
    })

    it('returns zero workDays for weekend-only range (Saturday to Sunday)', () => {
      const res = calculateLeaveDays('2026-10-24', '2026-10-25')
      expect(res.totalDays).toBe(2)
      expect(res.workDays).toBe(0)
      expect(res.weekendDays).toBe(2)
    })

    it('calculates single workday when startDate equals endDate on a weekday', () => {
      const res = calculateLeaveDays('2026-11-03', '2026-11-03')
      expect(res.totalDays).toBe(1)
      expect(res.workDays).toBe(1)
      expect(res.weekendDays).toBe(0)
    })
  })

  describe('buildCalendarCells', () => {
    it('generates non-null cells for all days of the month', () => {
      // November 2026 has 30 days
      const cells = buildCalendarCells(2026, 10)
      const validCells = cells.filter(Boolean)
      expect(validCells.length).toBe(30)
      expect(validCells[0]?.iso).toBe('2026-11-01')
      expect(validCells[29]?.iso).toBe('2026-11-30')
    })
  })

  describe('computeCalendarPreset', () => {
    it('computes next weekday for "besok" preset when base is Friday', () => {
      // Friday: 2026-10-23 -> next workday should be Monday: 2026-10-26
      const baseFriday = new Date(2026, 9, 23)
      const preset = computeCalendarPreset('besok', baseFriday)
      expect(preset.startDate).toBe('2026-10-26')
      expect(preset.endDate).toBe('2026-10-26')
    })

    it('computes 5 days preset starting next Monday', () => {
      const baseMidWeek = new Date(2026, 9, 21) // Wednesday
      const preset = computeCalendarPreset('5hari', baseMidWeek)
      expect(preset.startDate).toBe('2026-10-26') // Monday
      expect(preset.endDate).toBe('2026-10-30') // Friday
    })
  })
})
