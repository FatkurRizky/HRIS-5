import { AVATAR_COLORS } from './constants'
import { formatStatusLabel, getInitials } from './formatters'

export const INITIAL_EMPLOYEES = [
  {
    id: 'emp-1',
    nik: 'EMP-2026-101',
    init: 'BP',
    name: 'Bima Pratama',
    email: 'bima@kerabat.id',
    phone: '081234560101',
    address: 'Jl. Dhoho No. 12, Kediri',
    role: 'Backend Developer',
    dept: 'Engineering',
    status: 'Tetap',
    statusRaw: 'TETAP',
    userRole: 'EMPLOYEE',
    baseSalary: 10000000,
    allowance: 2000000,
    bg: 'bg-[#0f3832]',
  },
  {
    id: 'emp-2',
    nik: 'EMP-2026-102',
    init: 'DL',
    name: 'Dewi Lestari',
    email: 'dewi@kerabat.id',
    phone: '081234560102',
    address: 'Jl. Soekarno Hatta No. 8, Kediri',
    role: 'UI Designer',
    dept: 'Engineering',
    status: 'Kontrak',
    statusRaw: 'KONTRAK',
    contractEndDate: '2026-12-31',
    daysUntilContractEnd: 25,
    contractExpiringWarning: true,
    userRole: 'EMPLOYEE',
    baseSalary: 9000000,
    allowance: 1500000,
    bg: 'bg-[#285a84]',
  },
  {
    id: 'emp-3',
    nik: 'EMP-2026-103',
    init: 'KS',
    name: 'Kevin Santoso',
    email: 'kevin@kerabat.id',
    phone: '081234560103',
    address: 'Jl. Veteran No. 21, Kediri',
    role: 'QA Engineer',
    dept: 'Engineering',
    status: 'Probation',
    statusRaw: 'PROBATION',
    contractEndDate: '2026-11-30',
    daysUntilContractEnd: 18,
    contractExpiringWarning: true,
    userRole: 'EMPLOYEE',
    baseSalary: 8500000,
    allowance: 1200000,
    bg: 'bg-[#c57b1b]',
  },
  {
    id: 'emp-4',
    nik: 'EMP-2026-104',
    init: 'AS',
    name: 'Agus Salim',
    email: 'agus@kerabat.id',
    phone: '081234560104',
    address: 'Jl. Brawijaya No. 45, Kediri',
    role: 'Payroll Specialist',
    dept: 'HR',
    status: 'Tetap',
    statusRaw: 'TETAP',
    userRole: 'EMPLOYEE',
    baseSalary: 9500000,
    allowance: 1800000,
    bg: 'bg-[#7c3aed]',
  },
  {
    id: 'emp-5',
    nik: 'EMP-2026-105',
    init: 'MP',
    name: 'Maya Putri',
    email: 'maya@kerabat.id',
    phone: '081234560105',
    address: 'Jl. Pahlawan No. 3, Kediri',
    role: 'Recruiter',
    dept: 'HR',
    status: 'Kontrak',
    statusRaw: 'KONTRAK',
    contractEndDate: '2027-03-31',
    daysUntilContractEnd: 140,
    contractExpiringWarning: false,
    userRole: 'EMPLOYEE',
    baseSalary: 8800000,
    allowance: 1500000,
    bg: 'bg-[#d94826]',
  },
]

export function isLocalEmployeeId(id) {
  return Boolean(id && String(id).startsWith('emp-'))
}

export function mapApiEmployeeToView(emp, idx = 0) {
  return {
    id: emp.id,
    nik: emp.nik || '',
    init: getInitials(emp.user?.name),
    name: emp.user?.name || 'Karyawan',
    email: emp.user?.email || '',
    phone: emp.phone || '',
    address: emp.address || '',
    photoUrl: emp.photoUrl || '',
    role:
      emp.position?.name ||
      (emp.user?.role === 'HR'
        ? 'HR Specialist'
        : emp.user?.role === 'MANAGER'
          ? 'Manager'
          : 'Staff'),
    dept: emp.department?.name || 'Engineering',
    status: formatStatusLabel(emp.status),
    statusRaw: emp.status || 'PROBATION',
    contractEndDate: emp.contractEndDate || null,
    daysUntilContractEnd: emp.daysUntilContractEnd ?? null,
    contractExpiringWarning: emp.contractExpiringWarning ?? false,
    departmentId: emp.departmentId || null,
    positionId: emp.positionId || null,
    managerId: emp.managerId || null,
    managerName: emp.manager?.user?.name || null,
    userRole: emp.user?.role || 'EMPLOYEE',
    baseSalary: emp.salary?.baseSalary ?? emp.position?.baseSalary ?? 10000000,
    allowance: emp.salary?.allowance ?? 2000000,
    overtimeRate: emp.salary?.overtimeRate ?? 0,
    bg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
  }
}

export function buildEmployeeViewFromForm(
  form,
  { initialData = null, apiRecord = null, selectedManager = null, index = 0 } = {}
) {
  const isTetap = form.status === 'TETAP'
  const contractEndDate = isTetap ? null : form.contractEndDate || null

  let daysUntilContractEnd = apiRecord?.daysUntilContractEnd ?? null
  let contractExpiringWarning = apiRecord?.contractExpiringWarning ?? false

  if (!apiRecord && contractEndDate) {
    const diffMs = new Date(contractEndDate).getTime() - Date.now()
    if (!Number.isNaN(diffMs)) {
      daysUntilContractEnd = Math.ceil(diffMs / 86400000)
      contractExpiringWarning = daysUntilContractEnd <= 30
    }
  } else if (isTetap || !contractEndDate) {
    daysUntilContractEnd = null
    contractExpiringWarning = false
  }

  return {
    ...(initialData || {}),
    id: apiRecord?.id || initialData?.id || `emp-${Date.now()}`,
    nik:
      apiRecord?.nik ??
      (form.nik.trim() ||
        initialData?.nik ||
        `KRB-${Date.now().toString().slice(-4)}`),
    init: getInitials(form.name),
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    photoUrl: form.photoUrl.trim(),
    role: form.positionName.trim() || 'Staff',
    dept: form.departmentName.trim() || 'Engineering',
    status: formatStatusLabel(form.status),
    statusRaw: form.status,
    contractEndDate,
    daysUntilContractEnd,
    contractExpiringWarning,
    managerId: apiRecord?.managerId ?? (form.managerId || null),
    managerName:
      apiRecord?.manager?.user?.name ||
      (form.managerId ? selectedManager?.name || null : null),
    userRole: form.role,
    baseSalary: Number(form.baseSalary) || 10000000,
    allowance: Number(form.allowance) || 0,
    bg: initialData?.bg || AVATAR_COLORS[index % AVATAR_COLORS.length],
  }
}

export function wouldCreateCircularHierarchy(
  employees,
  employeeId,
  targetManagerId
) {
  if (!employeeId || !targetManagerId) return false
  if (employeeId === targetManagerId) return true

  const byId = new Map(employees.map((e) => [e.id, e]))
  const visited = new Set([employeeId])
  let currentId = targetManagerId

  while (currentId) {
    if (visited.has(currentId)) return true
    visited.add(currentId)
    const nextEmp = byId.get(currentId)
    currentId = nextEmp?.managerId || null
  }

  return false
}

export function getValidManagerCandidates(
  employees,
  currentEmployeeId = null,
  requireBackendId = false
) {
  return employees.filter((candidate) => {
    if (currentEmployeeId && candidate.id === currentEmployeeId) return false
    if (requireBackendId && isLocalEmployeeId(candidate.id)) return false
    if (
      currentEmployeeId &&
      wouldCreateCircularHierarchy(employees, currentEmployeeId, candidate.id)
    ) {
      return false
    }
    return true
  })
}

export function buildHierarchyGroups(employees, selectedDept = 'ALL') {
  const filteredEmployees =
    selectedDept === 'ALL'
      ? employees
      : employees.filter((e) => e.dept === selectedDept)

  const byId = new Map(employees.map((e) => [e.id, e]))
  const managersMap = new Map()
  const unassigned = []

  for (const emp of filteredEmployees) {
    const isLeader =
      emp.userRole === 'MANAGER' ||
      emp.userRole === 'SUPER_ADMIN' ||
      employees.some((sub) => sub.managerId === emp.id)

    if (isLeader && !managersMap.has(emp.id)) {
      managersMap.set(emp.id, { manager: emp, subordinates: [] })
    }
  }

  for (const emp of filteredEmployees) {
    if (emp.managerId && byId.has(emp.managerId)) {
      const mgr = byId.get(emp.managerId)
      if (!managersMap.has(mgr.id)) {
        managersMap.set(mgr.id, { manager: mgr, subordinates: [] })
      }
      if (emp.id !== mgr.id) {
        managersMap.get(mgr.id).subordinates.push(emp)
      }
    } else if (!managersMap.has(emp.id)) {
      unassigned.push(emp)
    }
  }

  return {
    filteredEmployees,
    leaders: Array.from(managersMap.values()),
    unassigned,
  }
}
