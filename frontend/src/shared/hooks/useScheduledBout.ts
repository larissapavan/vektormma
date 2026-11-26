import { useMemo } from 'react'

import type { EventSummary, OrgEvent } from '../types/api'
import { useOrgUpcomingEvents } from './useOrgData'
import { useUpcomingEvents } from './useUpcomingEvents'

type Upcoming = Pick<EventSummary | OrgEvent, 'name' | 'date' | 'fights'>

const key = (a: string, b: string) => [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join('|')

/** The card a pair of fighters is booked on, in either corner order, or null when the pair is not on an upcoming card. */
export function scheduledEventFor(events: Upcoming[], a: string, b: string): { name: string; date: string | null } | null {
  if (!a || !b) return null
  const wanted = key(a, b)
  const today = new Date().toISOString().slice(0, 10)
  for (const event of events) {
    if (event.date && event.date < today) continue
    if (event.fights.some((fight) => key(fight.fighter_1, fight.fighter_2) === wanted)) return { name: event.name, date: event.date }
  }
  return null
}

/** Whether the predictor is showing a booked fight (and on which card) or a simulation of two fighters chosen freely. */
export function useScheduledBout(org: string, a: string, b: string) {
  const ufc = useUpcomingEvents()
  const other = useOrgUpcomingEvents(org === 'ufc' ? null : org)
  const events = org === 'ufc' ? ufc.events : other.events
  return useMemo(() => scheduledEventFor(events, a, b), [events, a, b])
}
