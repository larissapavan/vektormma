/**
 * Long lists travel as columns (backend/app/utils/columns.py): one array per field. These rebuild the rows. An API from before
 * the column form ignores the request for it and sends the plain list, which is taken as it is.
 */

export interface Columns {
  count: number
  columns: Record<string, unknown[]>
}

export interface EventColumns {
  events: Columns
  fights: Columns
}

export function rowsFrom<T>(data: T[] | Columns): T[] {
  if (Array.isArray(data)) return data
  const entries = Object.entries(data.columns)
  return Array.from({ length: data.count }, (_, index) => {
    const row: Record<string, unknown> = {}
    for (const [field, values] of entries) row[field] = values[index]
    return row as T
  })
}

type Fight = Record<string, unknown>

/** The events with their fights put back: `listed` says how many of the fights, which follow one another, are of each event. */
export function eventsFrom<T>(data: T[] | EventColumns): T[] {
  if (Array.isArray(data)) return data
  const fights = rowsFrom<Fight>(data.fights).map((fight) => ({
    ...fight,
    winner: fight.winner === 1 ? fight.fighter_1 : fight.winner === 2 ? fight.fighter_2 : fight.winner,
    fight_url: null,
  }))
  let next = 0
  return rowsFrom<Record<string, unknown> & { listed: number }>(data.events).map(({ listed, ...event }) => {
    const own = fights.slice(next, next + listed)
    next += listed
    return { ...event, fights: own } as T
  })
}
