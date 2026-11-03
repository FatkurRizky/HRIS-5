import { describe, expect, it } from 'vitest'
import {
  normalizeRole,
  getRoleMetadata,
  resolveUserSession,
  buildRegistrationPayload,
} from './authUtils.js'

describe('authUtils', () => {
  describe('normalizeRole', () => {
    it('normalizes HR roles', () => {
      expect(normalizeRole('hr')).toBe('HR')
      expect(normalizeRole('HR')).toBe('HR')
    })

    it('normalizes MANAGER roles', () => {
      expect(normalizeRole('manager')).toBe('MANAGER')
      expect(normalizeRole('MANAGER')).toBe('MANAGER')
    })

    it('normalizes SUPER_ADMIN and SUPERADMIN roles', () => {
      expect(normalizeRole('super_admin')).toBe('SUPER_ADMIN')
      expect(normalizeRole('SUPER_ADMIN')).toBe('SUPER_ADMIN')
      expect(normalizeRole('superadmin')).toBe('SUPER_ADMIN')
    })

    it('defaults to EMPLOYEE for undefined, empty or employee roles', () => {
      expect(normalizeRole('employee')).toBe('EMPLOYEE')
      expect(normalizeRole('EMPLOYEE')).toBe('EMPLOYEE')
      expect(normalizeRole('')).toBe('EMPLOYEE')
      expect(normalizeRole(undefined)).toBe('EMPLOYEE')
      expect(normalizeRole(null)).toBe('EMPLOYEE')
    })
    it('normalizes roles with whitespace and lowercase', () => {
      expect(normalizeRole('  hr  ')).toBe('HR')
      expect(normalizeRole('\tmanager\n')).toBe('MANAGER')
    })
  })

  describe('getRoleMetadata', () => {
    it('returns HR portal metadata for HR role', () => {
      const meta = getRoleMetadata('HR')
      expect(meta.label).toBe('HR')
      expect(meta.portal).toBe('Portal HR Administrator')
    })

    it('returns Manager portal metadata for MANAGER role', () => {
      const meta = getRoleMetadata('MANAGER')
      expect(meta.label).toBe('Manager')
      expect(meta.portal).toBe('Portal Manager & Team Lead')
    })

    it('returns SuperAdmin portal metadata for SUPER_ADMIN role', () => {
      const meta = getRoleMetadata('SUPER_ADMIN')
      expect(meta.label).toBe('SuperAdmin')
      expect(meta.portal).toBe('Portal Governance & System Control')
    })

    it('returns Employee portal metadata for EMPLOYEE role', () => {
      const meta = getRoleMetadata('EMPLOYEE')
      expect(meta.label).toBe('Employee')
      expect(meta.portal).toBe('Portal Karyawan')
    })
  })

  describe('resolveUserSession', () => {
    it('returns matched demo account directly if provided without API user', () => {
      const demoAccount = {
        role: 'HR',
        name: 'Rina Kusuma',
        email: 'rina@kerabat.id',
      }
      const session = resolveUserSession(null, demoAccount, 'rina@kerabat.id')
      expect(session).toEqual(demoAccount)
    })

    it('constructs correct session for API user with HR role', () => {
      const apiUser = {
        id: 'u-topik',
        name: 'Topik',
        email: 'topik@gmail.com',
        role: 'HR',
      }
      const session = resolveUserSession(apiUser, null, 'topik@gmail.com')
      expect(session).toEqual({
        id: 'u-topik',
        role: 'HR',
        label: 'HR',
        email: 'topik@gmail.com',
        name: 'Topik',
        portal: 'Portal HR Administrator',
      })
    })

    it('constructs correct session for API user with default EMPLOYEE role', () => {
      const apiUser = {
        id: 'u-budi',
        name: 'Budi',
        email: 'budi@kerabat.id',
      }
      const session = resolveUserSession(apiUser, null, 'budi@kerabat.id')
      expect(session.role).toBe('EMPLOYEE')
      expect(session.portal).toBe('Portal Karyawan')
    })

    it('merges API user and demo metadata when both are present', () => {
      const apiUser = {
        id: 'u-agus',
        name: 'Agus Purnomo',
        email: 'hr@kerabat.id',
        role: 'HR',
      }
      const demoAccount = {
        role: 'HR',
        name: 'Rina Kusuma',
        email: 'rina@kerabat.id',
        backendEmail: 'hr@kerabat.id',
        portal: 'Portal HR Administrator',
        features: ['Master Karyawan'],
      }
      const session = resolveUserSession(apiUser, demoAccount, 'rina@kerabat.id')
      expect(session.id).toBe('u-agus')
      expect(session.name).toBe('Agus Purnomo')
      expect(session.role).toBe('HR')
      expect(session.backendEmail).toBe('hr@kerabat.id')
      expect(session.features).toEqual(['Master Karyawan'])
    })
  })

  describe('buildRegistrationPayload', () => {
    it('builds payload preserving explicitly selected HR role', () => {
      const payload = buildRegistrationPayload({
        name: '  Topik  ',
        email: '  Topik@Gmail.com  ',
        password: 'password123',
        dept: 'HR',
        role: 'HR',
      })
      expect(payload).toEqual({
        name: 'Topik',
        email: 'topik@gmail.com',
        password: 'password123',
        department: 'HR',
        role: 'HR',
      })
    })

    it('builds payload preserving MANAGER role', () => {
      const payload = buildRegistrationPayload({
        name: 'Manager Baru',
        email: 'manager@kerabat.id',
        password: 'password123',
        dept: 'Engineering',
        role: 'MANAGER',
      })
      expect(payload.role).toBe('MANAGER')
      expect(payload.department).toBe('Engineering')
    })

    it('infers HR role if department is HR but role was not explicitly set', () => {
      const payload = buildRegistrationPayload({
        name: 'Topik',
        email: 'topik@gmail.com',
        password: 'password123',
        dept: 'HR',
        role: '',
      })
      expect(payload.role).toBe('HR')
      expect(payload.department).toBe('HR')
    })

    it('defaults to Engineering department and EMPLOYEE role if not specified', () => {
      const payload = buildRegistrationPayload({
        name: 'Staff Baru',
        email: 'staff@kerabat.id',
        password: 'password123',
      })
      expect(payload.department).toBe('Engineering')
      expect(payload.role).toBe('EMPLOYEE')
    })
  })
})
