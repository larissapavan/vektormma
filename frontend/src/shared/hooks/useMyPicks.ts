import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  findPick,
  fromArchive,
  fromOldPicks,
  fromResults,
  localDay,
  MY_CARD_KEY,
  OLD_PICKS_PREFIX,
  parsePicks,
  RECENT_DAYS,
  settle,
  togglePick,
  waiting,
  type MyPick,
  type MyPicks,
} from '../data/myCard'
import { getEvents, getRecentResults } from '../services/api'
import type { EventSummary } from '../types/api'

function read(): MyPicks {
  try {
    return parsePicks(window.localStorage.getItem(MY_CARD_KEY))
  } catch {
    return []
  }
}

function write(picks: MyPicks) {
  try {
    window.localStorage.setItem(MY_CARD_KEY, JSON.stringify(picks))
  } catch {
    // Private mode or blocked storage: the picks last until the page is closed.
  }
}

/** Takes the picks the earlier window kept for the announced cards, and removes what it took. */
function takeOldPicks(events: EventSummary[]): MyPicks {
  try {
    const names = Object.keys(window.localStorage).filter((key) => key.startsWith(OLD_PICKS_PREFIX))
    return names.flatMap((key) => {
      const found = fromOldPicks(key.slice(OLD_PICKS_PREFIX.length), window.localStorage.getItem(key), events)
      if (found.length) window.localStorage.removeItem(key)
      return found
    })
  } catch {
    return []
  }
}

/**
 * The visitor's picks, kept in this browser only: no account, no server. Once a card has come, its results are asked for (only
 * then, and the whole archive only when a pick is older than the recent results) and kept with the picks.
 */
export function useMyPicks(upcoming: EventSummary[]) {
  const [picks, setPicks] = useState<MyPicks>(read)
  const [settling, setSettling] = useState(false)
  const [failed, setFailed] = useState(false)
  const today = localDay()

  const update = useCallback((change: (current: MyPicks) => MyPicks) => {
    setPicks((current) => {
      const next = change(current)
      if (next !== current) write(next)
      return next
    })
  }, [])

  // A pick made in another tab shows here too, instead of being written over by the next one made here.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === MY_CARD_KEY || event.key === null) setPicks(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!upcoming.length) return
    const old = takeOldPicks(upcoming)
    if (old.length) update((current) => [...current, ...old.filter((pick) => !findPick(current, pick.date, pick.a, pick.b))])
  }, [upcoming, update])

  const { due, old } = useMemo(() => waiting(picks, today), [picks, today])
  useEffect(() => {
    if (!due) return
    let cancelled = false
    setSettling(true)
    setFailed(false)
    const load = async () => {
      const recent = fromResults((await getRecentResults(RECENT_DAYS)).events)
      const archive = old ? fromArchive(await getEvents()) : []
      // The recent results first: they carry the model's saved picks, the archive does not.
      if (!cancelled) update((current) => settle(current, [...recent, ...archive], today))
    }
    load()
      .catch((error) => {
        console.error(error)
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setSettling(false)
      })
    return () => {
      cancelled = true
    }
  }, [due, old, today, update])

  const toggle = useCallback((pick: Omit<MyPick, 'result'>) => update((current) => togglePick(current, pick)), [update])
  const remove = useCallback((unwanted: (pick: MyPick) => boolean) => update((current) => current.filter((pick) => !unwanted(pick))), [update])
  return { picks, today, settling, failed, toggle, remove }
}
