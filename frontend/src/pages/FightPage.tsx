import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { athleteSlug, splitFightSlug } from '../seo/athletes'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { useFighters } from '../shared/hooks/useFighters'
import { Predictor } from './Predictor'
import { NotFound } from './NotFound'

/**
 * /fight/jon-jones-vs-tom-aspinall: a fight with an address of its own, so it can be linked, shared and found. It is the
 * predictor with the two corners already chosen from the slugs.
 */
export function FightPage() {
  const { pair } = useParams<{ pair: string }>()
  const { fighters, loading } = useFighters()
  const names = useMemo(() => {
    const slugs = pair ? splitFightSlug(pair) : null
    if (!slugs) return null
    const bySlug = new Map(fighters.map((fighter) => [athleteSlug(fighter.name), fighter.name]))
    const [a, b] = [bySlug.get(slugs[0]), bySlug.get(slugs[1])]
    return a && b ? { a, b } : null
  }, [fighters, pair])

  if (names) return <Predictor preset={names} />
  if (loading) return <LoadingSkeleton className="h-96 w-full" label="Loading" />
  return <NotFound />
}
