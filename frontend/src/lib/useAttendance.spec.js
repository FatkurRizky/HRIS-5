import { describe, expect, it } from 'vitest'
import { KAMPUS_2_UNP_OFFICE } from './constants.js'
import { calculateHaversineDistance } from './useAttendance.js'

describe('frontend useAttendance utilities', () => {
  describe('calculateHaversineDistance', () => {
    it('returns 0 meters for identical coordinates', () => {
      const dist = calculateHaversineDistance(
        KAMPUS_2_UNP_OFFICE.latitude,
        KAMPUS_2_UNP_OFFICE.longitude,
        KAMPUS_2_UNP_OFFICE.latitude,
        KAMPUS_2_UNP_OFFICE.longitude
      )
      expect(dist).toBe(0)
    })

    it('accurately calculates small distance within Kampus 2 UNP radius', () => {
      // Offset by ~50 meters north
      const offsetLat = KAMPUS_2_UNP_OFFICE.latitude + 0.00045
      const dist = calculateHaversineDistance(
        offsetLat,
        KAMPUS_2_UNP_OFFICE.longitude,
        KAMPUS_2_UNP_OFFICE.latitude,
        KAMPUS_2_UNP_OFFICE.longitude
      )
      expect(dist).toBeGreaterThan(40)
      expect(dist).toBeLessThan(60)
      expect(dist <= KAMPUS_2_UNP_OFFICE.radius).toBe(true)
    })

    it('identifies coordinates outside geofence radius', () => {
      // Offset by ~5 km away
      const farLat = KAMPUS_2_UNP_OFFICE.latitude + 0.05
      const dist = calculateHaversineDistance(
        farLat,
        KAMPUS_2_UNP_OFFICE.longitude,
        KAMPUS_2_UNP_OFFICE.latitude,
        KAMPUS_2_UNP_OFFICE.longitude
      )
      expect(dist).toBeGreaterThan(5000)
      expect(dist <= KAMPUS_2_UNP_OFFICE.radius).toBe(false)
    })
  })
})
