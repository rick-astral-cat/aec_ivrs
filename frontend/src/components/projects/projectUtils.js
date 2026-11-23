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
