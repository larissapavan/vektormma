import { ArrowRight, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { fightPath } from '../../seo/athletes'
import { cardPositionLabel } from '../data/cardPosition'
import { useFeaturedPick } from '../hooks/useFeaturedPick'
import { useFighterLookup } from '../hooks/useFighterLookup'
import { getFighterImageUrl, useFighterImages } from '../hooks/useFighterImages'
import { FighterAvatar } from './FighterAvatar'
import { WinProbabilityBar } from './WinProbabilityBar'

/** Address of the head-to-head page for two fighters (the page reads ?a= and ?b=). */
export function headToHeadPath(fighterA: string, fighterB: string) {
  const params = new URLSearchParams({ a: fighterA, b: fighterB })
  return `/head-to-head?${params.toString()}`
}

/** "7 nov 2026" in the language on screen; the API sends the day as 2026-11-07, which names the same day everywhere. */
function eventDay(date: string | null, language: string): string | null {
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null
  if (!parsed || Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString(localeTag(language), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** The two headliners face to face: their photos, as the fight cards show them (initials where a fighter has none). */
function FaceOff({ nameA, nameB }: { nameA: string; nameB: string }) {
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  const photo = (name: string) => getFighterImageUrl(name, imageByName, lookup(name)?.image_url)
  return (
    <div className="mt-3 flex items-center justify-center gap-3" data-testid="featured-faceoff">
      <FighterAvatar name={nameA} imageUrl={photo(nameA)} className="h-24 w-20" />
      <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] dark:text-neutral-400">vs</span>
      <FighterAvatar name={nameB} imageUrl={photo(nameB)} className="h-24 w-20" />
    </div>
  )
}

/** The next card's headline fight with the model's odds, and a link to compare the two fighters. Renders nothing without one. */
export function FeaturedMatchup() {
  const { i18n } = useTranslation()
  const pick = useFeaturedPick()
  if (!pick) return null

  const probabilityA = pick.fighter_1_probability
  const href = headToHeadPath(pick.fighter_1, pick.fighter_2)
  // The fight's own page: the matchup analysis with the factors behind the pick, at an address that can be shared.
  const factorsHref = fightPath(pick.fighter_1, pick.fighter_2)
  const day = eventDay(pick.event_date, i18n.language)

  return (
    <div
      data-testid="featured-matchup"
      className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-4 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
    >
      <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#BE123C] dark:text-[#FF2E54]">
        <Swords className="h-3.5 w-3.5" aria-hidden="true" />
        {L(i18n.language, 'Próxima luta em destaque', 'Next featured fight', 'Prochain combat à l’affiche', 'Próxima pelea destacada')}
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--text-primary)] dark:text-white">
        {cardPositionLabel(pick.card_position, i18n.language)}
        {pick.title_fight ? ` · ${L(i18n.language, 'Luta pelo cinturão', 'Title fight', 'Combat de titre', 'Pelea por el título')}` : ''}
      </p>
      <p className="truncate text-xs text-[var(--text-secondary)] dark:text-neutral-400">
        {pick.event_name}
        {day ? ` · ${day}` : ''}
      </p>
      <FaceOff nameA={pick.fighter_1} nameB={pick.fighter_2} />
      <div className="mt-3">
        <WinProbabilityBar
          nameA={pick.fighter_1}
          nameB={pick.fighter_2}
          probabilityA={probabilityA}
          probabilityB={1 - probabilityA}
          predictedWinner={pick.predicted_winner}
          compact
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link
          to={factorsHref}
          className="group inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] hover:text-[#FF2E54] dark:text-white"
        >
          {L(i18n.language, 'Ver fatores da previsão', 'See what drives the pick', 'Voir les facteurs du pronostic', 'Ver los factores del pronóstico')}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
        <Link
          to={href}
          className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] underline-offset-4 hover:text-[#FF2E54] hover:underline dark:text-neutral-300"
        >
          {L(i18n.language, 'Comparar lutadores', 'Compare fighters', 'Comparer les combattants', 'Comparar peleadores')}
        </Link>
      </div>
    </div>
  )
}
