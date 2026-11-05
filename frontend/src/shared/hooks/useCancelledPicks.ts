import { useCallback, useState } from 'react'

export const CANCELLED_PICKS_KEY = 'ufc-predictor:cancelled-picks'

export type PickMethod = 'ko' | 'sub' | 'dec'
export const PICK_METHODS: PickMethod[] = ['ko', 'sub', 'dec']

/** What a visitor predicted for one cancelled fight: who wins and, if they want, how. */
export interface CancelledPick {
  winner: string
  method: PickMethod | null
}

type Picks = Record<string, CancelledPick>

function isPick(value: unknown): value is CancelledPick {
  if (!value || typeof value !== 'object') return false
  const pick = value as Partial<CancelledPick>
  return typeof pick.winner === 'string' && (pick.method === null || PICK_METHODS.includes(pick.method as PickMethod))
}

function read(): Picks {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CANCELLED_PICKS_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isPick(value)))
  } catch {
    return {}
  }
}

function write(picks: Picks) {
  try {
    window.localStorage.setItem(CANCELLED_PICKS_KEY, JSON.stringify(picks))
  } catch {
    // Private mode or blocked storage: the picks last until the page is closed.
  }
}

/**
 * The visitor's predictions for the cancelled fights. There is no account and no server for them: they live in this
 * browser only, so they survive a reload but do not follow the visitor to another device.
 */
export function useCancelledPicks() {
  const [picks, setPicks] = useState<Picks>(read)

  const update = useCallback((change: (current: Picks) => Picks) => {
    setPicks((current) => {
      const next = change(current)
      write(next)
      return next
    })
  }, [])

  const chooseWinner = useCallback(
    (fightId: string, winner: string) =>
      update((current) => ({ ...current, [fightId]: { winner, method: current[fightId]?.winner === winner ? current[fightId].method : null } })),
    [update],
  )

  const chooseMethod = useCallback(
    (fightId: string, method: PickMethod) =>
      update((current) => {
        const pick = current[fightId]
        if (!pick) return current
        return { ...current, [fightId]: { ...pick, method: pick.method === method ? null : method } }
      }),
    [update],
  )

  const clear = useCallback(
    (fightId: string) =>
      update((current) => {
        const { [fightId]: _removed, ...rest } = current
        void _removed
        return rest
      }),
    [update],
  )

  const clearAll = useCallback(() => update(() => ({})), [update])

  return { picks, chooseWinner, chooseMethod, clear, clearAll }
}
