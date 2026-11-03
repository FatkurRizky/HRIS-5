/**
 * Utility functions for authentication, role determination, and portal routing.
 */

/**
 * Maps a role string to a standardized uppercase role identifier.
 * @param {string} [role]
 * @returns {'SUPER_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE'}
 */
export function normalizeRole(role) {
  const r = String(role || '').trim().toUpperCase()
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN') return 'SUPER_ADMIN'
  if (r === 'HR') return 'HR'
  if (r === 'MANAGER') return 'MANAGER'
  return 'EMPLOYEE'
}

/**
 * Returns human-readable label and portal title corresponding to user role.
 * @param {string} [role]
 * @returns {{ label: string, portal: string }}
 */
export function getRoleMetadata(role) {
  const normalized = normalizeRole(role)
  switch (normalized) {
    case 'HR':
      return {
        label: 'HR',
        portal: 'Portal HR Administrator',
      }
    case 'MANAGER':
      return {
        label: 'Manager',
        portal: 'Portal Manager & Team Lead',
      }
    case 'SUPER_ADMIN':
      return {
        label: 'SuperAdmin',
        portal: 'Portal Governance & System Control',
      }
    case 'EMPLOYEE':
    default:
      return {
        label: 'Employee',
        portal: 'Portal Karyawan',
      }
  }
}

/**
 * Constructs user session object upon successful login.
 * @param {object} [userFromApi]
 * @param {object|null} [matchedDemo]
 * @param {string} email
 * @returns {object}
 */
export function resolveUserSession(userFromApi, matchedDemo, email) {
  if (matchedDemo && !userFromApi) {
    return matchedDemo
  }

  const role = normalizeRole(
    userFromApi?.role || matchedDemo?.role || 'EMPLOYEE'
  )
  const { label, portal } = getRoleMetadata(role)
  const name = userFromApi?.name || matchedDemo?.name || email.split('@')[0]

  const session = {
    ...(matchedDemo || {}),
    id: userFromApi?.id || matchedDemo?.id,
    role,
    label: matchedDemo?.label || label,
    email: userFromApi?.email || matchedDemo?.email || email,
    name,
    portal: matchedDemo?.portal || portal,
  }

  if (matchedDemo?.backendEmail) {
    session.backendEmail = matchedDemo.backendEmail
  }

  return session
}

/**
 * Prepares the payload for self-registration with consistent role and department.
 * @param {object} regForm
 * @returns {{ name: string, email: string, password: string, department: string, role: string }}
 */
export function buildRegistrationPayload(regForm) {
  const dept = regForm.dept?.trim() || 'Engineering'
  const role =
    regForm.role || (dept.toUpperCase() === 'HR' ? 'HR' : 'EMPLOYEE')

  return {
    name: regForm.name.trim(),
    email: regForm.email.trim().toLowerCase(),
    password: regForm.password,
    department: dept,
    role,
  }
}
