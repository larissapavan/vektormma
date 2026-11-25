import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * A filter kept in the address (?age=26-30), so that a filtered list can be shared, reloaded and left with the back button.
 * The fallback is not written: an unfiltered list keeps its plain address. A value that is not allowed reads as the fallback.
 */
export function useUrlParam(key: string, fallback = '', allowed?: readonly string[]): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(key)
  const value = raw == null || (allowed && !allowed.includes(raw)) ? fallback : raw
  const set = useCallback(
    (next: string) =>
      setParams(
        (current) => {
          const copy = new URLSearchParams(current)
          if (next === fallback) copy.delete(key)
          else copy.set(key, next)
          return copy
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams, key, fallback],
  )
  return [value, set]
}

/** Removes several filters at once: one call per filter would each start from the address before the others changed it. */
export function useClearUrlParams(keys: readonly string[]): () => void {
  const [, setParams] = useSearchParams()
  return () =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        for (const key of keys) copy.delete(key)
        return copy
      },
      { replace: true, preventScrollReset: true },
    )
}
