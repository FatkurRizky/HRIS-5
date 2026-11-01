import { describe, expect, it } from 'vitest'
import {
  formatRupiah,
  formatStatusLabel,
  formatTime,
  getInitials,
  getStatusBadgeStyle,
  shiftMonthPeriod,
} from './formatters.js'

describe('frontend formatters', () => {
  describe('formatRupiah', () => {
    it('formats numbers to Indonesian Rupiah representation', () => {
      const formatted = formatRupiah(10000000)
      expect(formatted).toContain('10.000.000')
      expect(formatted).toContain('Rp')
    })

    it('returns Rp 0 for zero, null, undefined, or invalid inputs', () => {
      expect(formatRupiah(0)).toContain('0')
      expect(formatRupiah(null)).toContain('0')
      expect(formatRupiah(undefined)).toContain('0')
      expect(formatRupiah('invalid')).toContain('0')
    })
  })

  describe('formatTime', () => {
    it('formats ISO date strings to HH:MM format', () => {
      const date = new Date('2026-10-31T08:15:00.000Z')
      const formatted = formatTime(date.toISOString())
      expect(formatted).toMatch(/^\d{2}:\d{2}$/)
    })

    it('returns dash for null or undefined input', () => {
      expect(formatTime(null)).toBe('-')
      expect(formatTime(undefined)).toBe('-')
      expect(formatTime('')).toBe('-')
    })
  })

  describe('getInitials', () => {
    it('extracts initials for single and multi-word names', () => {
      expect(getInitials('Budi')).toBe('BU')
      expect(getInitials('Budi Santoso')).toBe('BS')
      expect(getInitials('Muhammad Fatkur Rizky')).toBe('MR')
    })

    it('returns fallback KR for null or empty strings', () => {
      expect(getInitials('')).toBe('KR')
      expect(getInitials(null)).toBe('KR')
      expect(getInitials(undefined)).toBe('KR')
    })
  })

  describe('formatStatusLabel and getStatusBadgeStyle', () => {
    it('correctly maps employee status enums', () => {
      expect(formatStatusLabel('TETAP')).toBe('Tetap')
      expect(formatStatusLabel('KONTRAK')).toBe('Kontrak')
      expect(formatStatusLabel('PROBATION')).toBe('Probation')
      expect(formatStatusLabel(null)).toBe('Probation')
    })

    it('assigns expected badge CSS color classes', () => {
      expect(getStatusBadgeStyle('Tetap')).toContain('text-[#1b7a43]')
      expect(getStatusBadgeStyle('Kontrak')).toContain('text-[#285a84]')
      expect(getStatusBadgeStyle('Probation')).toContain('text-[#b86d1a]')
    })
  })

  describe('shiftMonthPeriod', () => {
    it('shifts forward and backward within same year', () => {
      expect(shiftMonthPeriod(5, 2026, 1)).toEqual({ month: 6, year: 2026 })
      expect(shiftMonthPeriod(5, 2026, -1)).toEqual({ month: 4, year: 2026 })
    })

    it('correctly wraps across year boundary', () => {
      expect(shiftMonthPeriod(12, 2026, 1)).toEqual({ month: 1, year: 2027 })
      expect(shiftMonthPeriod(1, 2026, -1)).toEqual({ month: 12, year: 2025 })
    })
  })
})
