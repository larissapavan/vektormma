import { useEffect, useState } from 'react'

import { getUpcomingPicks } from '../services/api'
import type { UpcomingPick } from '../types/api'

/**
 * The model's pick for the headline fight of the next UFC card, or null while loading, when nothing is announced or
 * when the request fails (the page then simply shows no featured fight). The API lists the soonest card first and each
 * card's main event first, so the first pick is the one to show.
 */
export function useFeaturedPick(): UpcomingPick | null {
  const [pick, setPick] = useState<UpcomingPick | null>(null)

  useEffect(() => {
    let cancelled = false
    getUpcomingPicks()
      .then((picks) => {
        if (!cancelled) setPick(picks[0] ?? null)
      })
      .catch(() => {
        // A sleeping or unreachable API just means no featured fight.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return pick
}
