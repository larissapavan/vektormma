import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { athletePath, athleteSlug } from '../seo/athletes'
import { EditorialFighterDossier } from '../shared/components/editorial/EditorialFighterDossier'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { useFighters } from '../shared/hooks/useFighters'

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * /athlete/jon-jones: the address of an athlete is the name written as a slug. An old address with the name in it
 * (/athlete/Jon%20Jones) opens the same page and is rewritten to the slug, so there is one address per athlete.
 */
export function AthleteDossier() {
  const { name } = useParams<{ name?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const { fighters, loading } = useFighters()

  const addressed = name ? decode(name) : null
  const fighter = useMemo(() => {
    if (!addressed) return null
    const slug = athleteSlug(addressed)
    return fighters.find((candidate) => candidate.name === addressed) ?? fighters.find((candidate) => athleteSlug(candidate.name) === slug) ?? null
  }, [fighters, addressed])

  const fighterName = useMemo(() => {
    if (fighter) return fighter.name
    if (addressed) return loading ? null : addressed
    const param = searchParams.get('name') || searchParams.get('a')
    return param || 'Alex Pereira'
  }, [fighter, addressed, loading, searchParams])

  // One address per athlete: the slug.
  useEffect(() => {
    if (fighter && name !== athleteSlug(fighter.name)) navigate({ pathname: athletePath(fighter.name), search: window.location.search }, { replace: true })
  }, [fighter, name, navigate])

  // The tab title names the athlete even for one the static pages do not cover (a retired fighter).
  useEffect(() => {
    if (fighter) document.title = `${fighter.name} · Vektor MMA`
  }, [fighter, i18n.language])

  const opponentName = useMemo(() => searchParams.get('b') || searchParams.get('vs') || undefined, [searchParams])

  if (fighterName === null) return <LoadingSkeleton className="h-96 w-full" label="Loading" />

  return (
    <EditorialFighterDossier
      key={fighterName}
      initialFighterName={fighterName}
      initialOpponentName={opponentName}
      onSelectFighter={(selectedName) => navigate(athletePath(selectedName))}
      onClose={() => navigate(-1)}
    />
  )
}
