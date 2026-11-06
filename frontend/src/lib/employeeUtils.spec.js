import { describe, it, expect } from 'vitest'
import {
  isLocalEmployeeId,
  mapApiEmployeeToView,
  buildEmployeeViewFromForm,
  wouldCreateCircularHierarchy,
  getValidManagerCandidates,
  buildHierarchyGroups,
} from './employeeUtils'

describe('employeeUtils', () => {
  it('detects local demo employee IDs vs backend UUIDs', () => {
    expect(isLocalEmployeeId('emp-1')).toBe(true)
    expect(isLocalEmployeeId('emp-999')).toBe(true)
    expect(isLocalEmployeeId('550e8400-e29b-41d4-a716-446655440000')).toBe(
      false
    )
  })

  it('maps API employee object without KK field', () => {
    const view = mapApiEmployeeToView(
      {
        id: 'uuid-1',
        nik: 'KRB-0001',
        phone: '0812345678',
        address: 'Jl. Kediri',
        status: 'KONTRAK',
        contractEndDate: '2026-12-31',
        daysUntilContractEnd: 20,
        contractExpiringWarning: true,
        user: { name: 'Raka Pratama', email: 'raka@kerabat.id', role: 'EMPLOYEE' },
        department: { name: 'Engineering' },
        position: { name: 'Frontend Developer', baseSalary: 9000000 },
        salary: { baseSalary: 9500000, allowance: 1500000, overtimeRate: 50000 },
      },
      0
    )

    expect(view.name).toBe('Raka Pratama')
    expect(view.status).toBe('Kontrak')
    expect(view.baseSalary).toBe(9500000)
    expect(view.contractExpiringWarning).toBe(true)
    expect('noKk' in view).toBe(false)
    expect('kk' in view).toBe(false)
  })

  it('clears contractEndDate when form status is TETAP', () => {
    const built = buildEmployeeViewFromForm({
      name: 'Dewi Lestari',
      email: 'dewi@kerabat.id',
      nik: 'EMP-102',
      phone: '',
      address: '',
      photoUrl: '',
      positionName: 'UI Designer',
      departmentName: 'Engineering',
      managerId: '',
      status: 'TETAP',
      contractEndDate: '2026-12-31',
      role: 'EMPLOYEE',
      baseSalary: 9000000,
      allowance: 1500000,
    })

    expect(built.status).toBe('Tetap')
    expect(built.contractEndDate).toBeNull()
    expect(built.contractExpiringWarning).toBe(false)
  })

  it('detects direct and transitive circular hierarchy', () => {
    const employees = [
      { id: 'mgr-1', name: 'A', managerId: null },
      { id: 'mgr-2', name: 'B', managerId: 'mgr-1' },
      { id: 'staff-1', name: 'C', managerId: 'mgr-2' },
    ]

    expect(wouldCreateCircularHierarchy(employees, 'mgr-1', 'mgr-1')).toBe(true)
    expect(wouldCreateCircularHierarchy(employees, 'mgr-1', 'mgr-2')).toBe(true)
    expect(wouldCreateCircularHierarchy(employees, 'mgr-1', 'staff-1')).toBe(
      true
    )
    expect(wouldCreateCircularHierarchy(employees, 'staff-1', 'mgr-1')).toBe(
      false
    )
  })

  it('filters out circular subordinates and local mock IDs when requireBackendId is true', () => {
    const employees = [
      { id: 'uuid-mgr', name: 'Sari', managerId: null },
      { id: 'uuid-sub', name: 'Raka', managerId: 'uuid-mgr' },
      { id: 'emp-1', name: 'Bima (Demo)', managerId: null },
    ]

    const candidatesForMgr = getValidManagerCandidates(
      employees,
      'uuid-mgr',
      true
    )
    expect(candidatesForMgr).toHaveLength(0)

    const candidatesForSub = getValidManagerCandidates(
      employees,
      'uuid-sub',
      true
    )
    expect(candidatesForSub.map((c) => c.id)).toEqual(['uuid-mgr'])
  })

  it('groups leaders and unassigned employees accurately', () => {
    const employees = [
      { id: 'm1', name: 'Sari', dept: 'Engineering', userRole: 'MANAGER', managerId: null },
      { id: 'e1', name: 'Bima', dept: 'Engineering', userRole: 'EMPLOYEE', managerId: 'm1' },
      { id: 'e2', name: 'Dewi', dept: 'Engineering', userRole: 'EMPLOYEE', managerId: null },
    ]

    const groups = buildHierarchyGroups(employees, 'Engineering')
    expect(groups.leaders).toHaveLength(1)
    expect(groups.leaders[0].subordinates.map((s) => s.id)).toEqual(['e1'])
    expect(groups.unassigned.map((u) => u.id)).toEqual(['e2'])
  })
})
