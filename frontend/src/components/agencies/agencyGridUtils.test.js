import { describe, expect, it } from 'vitest'
import {
  GRID_STATE_KEY, IVR_STATUS, SCHEDULE_STATUS, buildAgencyCopy, ivrStatus,
  loadGridState, regionOptions, saveGridState, scheduleParts, scheduleStatus,
} from './agencyGridUtils'

const SCHEDULE = JSON.stringify({
  L: [['08:00', '14:00']], M: [['08:00', '14:00']], S: [['09:00', '13:00']],
})

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
  }
}

describe('scheduleStatus', () => {
  it('reports no schedule when has_schedule is false, even with hours stored', () => {
    expect(scheduleStatus({ has_schedule: false, business_hours: SCHEDULE })).toBe(SCHEDULE_STATUS.NONE)
  })

  it('reports an incomplete schedule when it is enabled but has no segments', () => {
    expect(scheduleStatus({ has_schedule: true, business_hours: '' })).toBe(SCHEDULE_STATUS.INCOMPLETE)
    expect(scheduleStatus({ has_schedule: true, business_hours: null })).toBe(SCHEDULE_STATUS.INCOMPLETE)
  })

  it('reports a configured schedule for the JSON and the legacy formats', () => {
    expect(scheduleStatus({ has_schedule: true, business_hours: SCHEDULE })).toBe(SCHEDULE_STATUS.CONFIGURED)
    expect(scheduleStatus({ has_schedule: true, business_hours: '07:00-19:00' })).toBe(SCHEDULE_STATUS.CONFIGURED)
  })
})

describe('scheduleParts', () => {
  it('splits the summary into one chip per group of days', () => {
    expect(scheduleParts({ has_schedule: true, business_hours: SCHEDULE }))
      .toEqual(['L–M 08:00-14:00', 'S 09:00-13:00'])
  })

  it('returns no parts without a usable schedule', () => {
    expect(scheduleParts({ has_schedule: false, business_hours: SCHEDULE })).toEqual([])
    expect(scheduleParts({ has_schedule: true, business_hours: '' })).toEqual([])
  })
})

describe('ivrStatus', () => {
  it('uses the has_ivr flag from the list endpoint', () => {
    expect(ivrStatus({ has_ivr: true })).toBe(IVR_STATUS.CONFIGURED)
    expect(ivrStatus({ has_ivr: false })).toBe(IVR_STATUS.NONE)
  })

  it('falls back to the IVR tree when has_ivr is missing (older backend)', () => {
    expect(ivrStatus({ ivr: [{ id: 'root', type: 'menu' }] })).toBe(IVR_STATUS.CONFIGURED)
    expect(ivrStatus({ ivr: [] })).toBe(IVR_STATUS.NONE)
    expect(ivrStatus({ ivr: null })).toBe(IVR_STATUS.NONE)
  })
})

describe('regionOptions', () => {
  it('returns distinct, sorted, non-empty regions', () => {
    const agencies = [{ region: 'MTY' }, { region: 'GDL' }, { region: 'MTY' }, { region: '' }]
    expect(regionOptions(agencies)).toEqual(['GDL', 'MTY'])
  })
})

describe('buildAgencyCopy', () => {
  it('keeps every field including the IVR tree, drops the id and renames', () => {
    const ivr = [{ id: 'root', type: 'menu', children: [] }]
    const agency = {
      id: 7, name: 'Dalton Honda', abbreviation: 'DH', region: 'GDL', phone_ranges: '1-2',
      has_schedule: true, business_hours: SCHEDULE, after_hours_mailbox: 'a@b.mx', ivr,
    }

    const copy = buildAgencyCopy(agency)

    expect(copy).not.toHaveProperty('id')
    expect(copy).toMatchObject({ name: 'Dalton Honda - Copia', abbreviation: 'DH_C', ivr })
    expect(agency.id).toBe(7) // the original is not mutated
  })
})

describe('grid state persistence', () => {
  it('round-trips the state through storage', () => {
    const storage = memoryStorage()
    const state = { pagination: { paginationModel: { page: 2, pageSize: 10 } } }

    saveGridState(state, storage)

    expect(JSON.parse(storage.data[GRID_STATE_KEY])).toEqual(state)
    expect(loadGridState(storage)).toEqual(state)
  })

  it('returns null for missing or corrupted state', () => {
    expect(loadGridState(memoryStorage())).toBeNull()
    expect(loadGridState(memoryStorage({ [GRID_STATE_KEY]: '{not json' }))).toBeNull()
    expect(loadGridState(memoryStorage({ [GRID_STATE_KEY]: '42' }))).toBeNull()
  })

  it('ignores storage errors', () => {
    const broken = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    }
    expect(loadGridState(broken)).toBeNull()
    expect(() => saveGridState({}, broken)).not.toThrow()
  })
})
