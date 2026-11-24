// Lógica pura del grid de agencias (sin React), para poder probarla aislada.

import { summarizeSchedule } from '../scheduleUtils'

export const SCHEDULE_STATUS = {
  CONFIGURED: 'Con horario',
  INCOMPLETE: 'Horario incompleto',
  NONE: 'Sin horario',
}

export const IVR_STATUS = {
  CONFIGURED: 'Configurado',
  NONE: 'Sin IVR',
}

/**
 * Estado del horario de una agencia, tal como lo muestra la columna "Horario":
 * sin horario, horario marcado pero sin segmentos, o con segmentos.
 */
export function scheduleStatus(agency) {
  if (!agency?.has_schedule) return SCHEDULE_STATUS.NONE
  return summarizeSchedule(agency.business_hours)
    ? SCHEDULE_STATUS.CONFIGURED
    : SCHEDULE_STATUS.INCOMPLETE
}

/** Grupos del resumen de horario ("L–V 08:00-14:00", "S 09:00-13:00", …) para pintarlos como chips. */
export function scheduleParts(agency) {
  if (!agency?.has_schedule) return []
  const summary = summarizeSchedule(agency.business_hours)
  return summary ? summary.split(' · ') : []
}

/** true si la agencia tiene un IVR con al menos un nodo. */
export function hasIvr(agency) {
  // El listado trae has_ivr; si falta (backend anterior que devolvía el árbol
  // completo), se deduce del propio árbol.
  if (typeof agency?.has_ivr === 'boolean') return agency.has_ivr
  return Array.isArray(agency?.ivr) && agency.ivr.length > 0
}

export function ivrStatus(agency) {
  return hasIvr(agency) ? IVR_STATUS.CONFIGURED : IVR_STATUS.NONE
}

/** Regiones distintas, ordenadas, para el filtro de la columna "Región". */
export function regionOptions(agencies) {
  return [...new Set(agencies.map(a => a.region).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'))
}

/**
 * Payload para crear la copia de una agencia a partir de su detalle completo
 * (GET /agencies/:id). El listado no incluye el árbol IVR, por eso la copia
 * debe construirse desde el detalle y no desde la fila del grid.
 */
export function buildAgencyCopy(agency) {
  const copy = {
    ...agency,
    name: `${agency.name} - Copia`,
    abbreviation: `${agency.abbreviation}_C`,
  }
  delete copy.id
  return copy
}

// --- Persistencia del estado del grid (filtros, orden, paginación) ---
//
// Se guarda en sessionStorage para que, al volver del detalle de una agencia,
// el grid conserve la búsqueda y la página. Cualquier fallo (modo privado,
// almacenamiento bloqueado, JSON corrupto) se ignora y el grid arranca limpio.

export const GRID_STATE_KEY = 'agenciesGridState'

export function loadGridState(storage = globalThis.sessionStorage) {
  try {
    const raw = storage?.getItem(GRID_STATE_KEY)
    const state = raw ? JSON.parse(raw) : null
    return state && typeof state === 'object' ? state : null
  } catch {
    return null
  }
}

export function saveGridState(state, storage = globalThis.sessionStorage) {
  try {
    storage?.setItem(GRID_STATE_KEY, JSON.stringify(state))
  } catch {
    // Sin almacenamiento disponible: el estado simplemente no se conserva.
  }
}
