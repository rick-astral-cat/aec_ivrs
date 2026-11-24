// Utilidades compartidas por las vistas de proyectos de Migración TEAMS.

// Porcentaje de actividades completadas (0 si no hay actividades).
export function progressPercent(completed, total) {
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

// Etiquetas del rol de un usuario dentro de un proyecto.
export const PROJECT_ROLE_LABELS = Object.freeze({
  owner: 'Líder',
  member: 'Integrante',
})

// Iniciales para avatares: "Ricardo Ríos" -> "RR", "fernando" -> "F".
export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Mensaje legible a partir de un error de Axios del backend de proyectos.
export function apiErrorMessage(error, fallback) {
  const status = error?.response?.status
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 404) return 'El proyecto ya no existe o no tienes acceso.'
  if (status === 409) {
    const detail = error.response.data?.detail || ''
    if (detail.includes('owner')) return 'El proyecto debe conservar al menos un líder.'
    if (detail.includes('already')) return 'Ese usuario ya es integrante del proyecto.'
  }
  return fallback
}

// Clave para comparar un pill con las siglas de una agencia ("dhme " -> "DHME").
export function tagKey(tag) {
  return (tag || '').trim().toUpperCase()
}

// --- Fechas de actividades ---

// Fecha sin hora 'YYYY-MM-DD' -> Date local (evita el desfase de zona horaria de new Date('YYYY-MM-DD')).
export function parseDateOnly(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateOnly(value) {
  const date = parseDateOnly(value)
  return date ? date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

// El backend devuelve fechas con hora en UTC, a veces sin zona ('2026-11-24T18:00:00').
export function parseApiDateTime(iso) {
  if (!iso) return null
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`)
}

export function formatDateTime(iso) {
  const date = parseApiDateTime(iso)
  return date ? date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : ''
}

// Estado de la fecha propuesta de una actividad pendiente: 'overdue' | 'today' | 'upcoming' | null.
export function dueStatus(dueDate, isCompleted) {
  const due = parseDateOnly(dueDate)
  if (!due || isCompleted) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

// true si la actividad se completó (en hora local) después de su fecha propuesta.
export function completedLate(dueDate, completedAt) {
  const due = parseDateOnly(dueDate)
  const done = parseApiDateTime(completedAt)
  if (!due || !done) return false
  const doneDay = new Date(done.getFullYear(), done.getMonth(), done.getDate())
  return doneDay > due
}
