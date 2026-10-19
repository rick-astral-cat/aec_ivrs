// Utilidades para manejar horarios de atención por día con múltiples segmentos.
//
// FORMATO NUEVO (serializado como JSON dentro del string business_hours):
//   {"L":[["08:00","14:00"],["16:00","19:00"]], "S":[["09:00","13:00"]]}
//   - Clave: día (L, M, X, J, V, S, D)
//   - Valor: lista de segmentos [inicio, fin]
//
// FORMATO VIEJO (compatibilidad): "07:00-19:00"
//   Se interpreta como un único rango aplicado a Lunes–Viernes.

export const DAYS = [
  { key: 'L', label: 'Lunes' },
  { key: 'M', label: 'Martes' },
  { key: 'X', label: 'Miércoles' },
  { key: 'J', label: 'Jueves' },
  { key: 'V', label: 'Viernes' },
  { key: 'S', label: 'Sábado' },
  { key: 'D', label: 'Domingo' },
]

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V']

/** Devuelve un objeto schedule vacío: cada día con lista de segmentos vacía. */
export function emptySchedule() {
  return Object.fromEntries(DAYS.map(d => [d.key, []]))
}

/**
 * Parsea el valor almacenado en business_hours a un objeto schedule.
 * Soporta:
 *  - JSON nuevo: {"L":[["08:00","14:00"]], ...}
 *  - Formato viejo "07:00-19:00" → aplica ese rango a Lunes–Viernes (rango default)
 *  - Vacío/null → schedule vacío
 */
export function parseSchedule(value) {
  const schedule = emptySchedule()
  if (!value || typeof value !== 'string') return schedule

  const trimmed = value.trim()

  // Intentar formato nuevo (JSON)
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      for (const { key } of DAYS) {
        const segs = parsed[key]
        if (Array.isArray(segs)) {
          schedule[key] = segs
            .filter(s => Array.isArray(s) && s.length === 2)
            .map(([start, end]) => [String(start), String(end)])
        }
      }
      return schedule
    } catch {
      // Si falla el JSON, cae al parser de formato viejo
    }
  }

  // Formato viejo "HH:MM-HH:MM" → rango default Lun–Vie
  const [start = '', end = ''] = trimmed.split('-').map(s => s.trim())
  if (start || end) {
    WEEKDAYS.forEach(key => { schedule[key] = [[start, end]] })
  }
  return schedule
}

/**
 * Serializa un objeto schedule a JSON string para guardar en business_hours.
 * Omite días sin segmentos y segmentos vacíos. Si no hay nada, devuelve ''.
 */
export function serializeSchedule(schedule) {
  const out = {}
  for (const { key } of DAYS) {
    const segs = (schedule[key] || [])
      .filter(([s, e]) => s || e)
      .map(([s, e]) => [s, e])
    if (segs.length) out[key] = segs
  }
  return Object.keys(out).length ? JSON.stringify(out) : ''
}

/**
 * Devuelve un resumen legible y compacto del horario, para la tabla principal.
 * Ej: "L–V 08:00-14:00, 16:00-19:00 · S 09:00-13:00"
 * Agrupa días consecutivos con el mismo horario cuando es posible (versión simple:
 * lista por día, uniendo rangos iguales contiguos).
 */
export function summarizeSchedule(value) {
  const schedule = parseSchedule(value)
  const parts = []

  // Agrupar días contiguos con exactamente el mismo conjunto de segmentos
  let i = 0
  while (i < DAYS.length) {
    const { key } = DAYS[i]
    const segs = schedule[key]
    if (!segs || segs.length === 0) { i++; continue }

    const segStr = segs.map(([s, e]) => `${s}-${e}`).join(', ')

    // Buscar cuántos días contiguos comparten el mismo segStr
    let j = i
    while (
      j + 1 < DAYS.length &&
      schedule[DAYS[j + 1].key]?.length &&
      schedule[DAYS[j + 1].key].map(([s, e]) => `${s}-${e}`).join(', ') === segStr
    ) {
      j++
    }

    const dayLabel = i === j
      ? DAYS[i].key
      : `${DAYS[i].key}–${DAYS[j].key}`

    parts.push(`${dayLabel} ${segStr}`)
    i = j + 1
  }

  return parts.join(' · ')
}


// Nombres abreviados legibles para documentos (PDF).
const DAY_SHORT = {
  L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom',
}

/**
 * Devuelve el horario como un arreglo de líneas legibles para usuario final,
 * una por cada grupo de días contiguos con el mismo horario.
 * Ej: ["Lun–Vie: 08:00-14:00, 16:00-19:00", "Sáb: 09:00-13:00"]
 *
 * Pensado para el PDF (ficha técnica), donde el JSON crudo es ilegible.
 */
export function scheduleToLines(value) {
  const schedule = parseSchedule(value)
  const lines = []

  let i = 0
  while (i < DAYS.length) {
    const { key } = DAYS[i]
    const segs = schedule[key]
    if (!segs || segs.length === 0) { i++; continue }

    const segStr = segs.map(([s, e]) => `${s}-${e}`).join(', ')

    // Agrupar días contiguos con el mismo horario
    let j = i
    while (
      j + 1 < DAYS.length &&
      schedule[DAYS[j + 1].key]?.length &&
      schedule[DAYS[j + 1].key].map(([s, e]) => `${s}-${e}`).join(', ') === segStr
    ) {
      j++
    }

    const dayLabel = i === j
      ? DAY_SHORT[DAYS[i].key]
      : `${DAY_SHORT[DAYS[i].key]}–${DAY_SHORT[DAYS[j].key]}`

    lines.push(`${dayLabel}: ${segStr}`)
    i = j + 1
  }

  return lines
}
