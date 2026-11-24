import { displayName } from '../../api/users'
import { dueStatus } from './projectUtils'

// Estados de una actividad para las gráficas de avance, en orden fijo de dibujo.
// Paleta validada (contraste ≥ 3:1 y separación para daltonismo); el color nunca
// va solo: siempre hay leyenda, tooltip y conteos en texto.
export const STATUS_SERIES = Object.freeze([
  { key: 'done', label: 'Completadas', color: '#0ca30c' },
  { key: 'pending', label: 'Pendientes', color: '#2a78d6' },
  { key: 'overdue', label: 'Vencidas', color: '#d03b3b' },
])

const UNASSIGNED_KEY = 'unassigned'

// Resume las actividades por integrante: completadas, pendientes y vencidas
// (pendientes con fecha propuesta pasada). Incluye a integrantes sin actividades
// y una fila "Sin encargado" si hay actividades sin asignar.
// Orden: más actividades primero; empates por nombre.
export function buildMemberStats(members, activities) {
  const rows = new Map(
    members.map((m) => [m.user.id, { key: m.user.id, name: displayName(m.user), done: 0, pending: 0, overdue: 0 }]),
  )

  for (const activity of activities) {
    const key = activity.assignee?.id ?? UNASSIGNED_KEY
    if (!rows.has(key)) {
      // Encargado que ya no es integrante (no debería pasar) o actividad sin asignar.
      const name = activity.assignee ? displayName(activity.assignee) : 'Sin encargado'
      rows.set(key, { key, name, done: 0, pending: 0, overdue: 0, unassigned: !activity.assignee })
    }
    const row = rows.get(key)
    if (activity.is_completed) row.done += 1
    else if (dueStatus(activity.due_date, false) === 'overdue') row.overdue += 1
    else row.pending += 1
  }

  return [...rows.values()]
    .map((row) => ({ ...row, total: row.done + row.pending + row.overdue }))
    .sort((a, b) => {
      if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1 // "Sin encargado" al final
      return b.total - a.total || a.name.localeCompare(b.name, 'es')
    })
}

export function completionPercent(row) {
  return row.total ? Math.round((row.done / row.total) * 100) : 0
}

// Texto accesible con los conteos de una fila: "5 completadas · 2 pendientes · 1 vencida".
export function describeRow(row) {
  if (!row.total) return 'Sin actividades'
  const parts = [
    [row.done, 'completada', 'completadas'],
    [row.pending, 'pendiente', 'pendientes'],
    [row.overdue, 'vencida', 'vencidas'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
  return parts.join(' · ')
}
