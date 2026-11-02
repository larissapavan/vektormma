import { ArrowRight, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { useFeaturedPick } from '../hooks/useFeaturedPick'
import { WinProbabilityBar } from './WinProbabilityBar'

/** Address of the head-to-head page for two fighters (the page reads ?a= and ?b=). */
export function headToHeadPath(fighterA: string, fighterB: string) {
  const params = new URLSearchParams({ a: fighterA, b: fighterB })
  return `/head-to-head?${params.toString()}`
}

/** "Main event", "Co-main" or a plain "fight on the card", named the way the MMA community does in each language. */
function positionLabel(position: number | null | undefined, language: string): string {
  if (position === 1) return L(language, 'Main event', 'Main event', 'Main event', 'Pelea estelar')
  if (position === 2) return L(language, 'Co-main', 'Co-main event', 'Co-main event', 'Co-estelar')
  return L(language, 'Luta do card', 'Fight on the card', 'Combat du card', 'Pelea de la cartelera')
}

/** "7 nov 2026" in the language on screen; the API sends the day as 2026-11-07, which names the same day everywhere. */
function eventDay(date: string | null, language: string): string | null {
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null
  if (!parsed || Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString(localeTag(language), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** The next card's headline fight with the model's odds, and a link to compare the two fighters. Renders nothing without one. */
export function FeaturedMatchup() {
  const { i18n } = useTranslation()
  const pick = useFeaturedPick()
  if (!pick) return null

  const probabilityA = pick.fighter_1_probability
  const href = headToHeadPath(pick.fighter_1, pick.fighter_2)
  const factorsHref = `/matchup-intelligence?${new URLSearchParams({ a: pick.fighter_1, b: pick.fighter_2, event: pick.event_name }).toString()}`
  const day = eventDay(pick.event_date, i18n.language)

  return (
    <div
      data-testid="featured-matchup"
      className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 p-4 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
    >
      <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#FF2E54]">
        <Swords className="h-3.5 w-3.5" aria-hidden="true" />
        {L(i18n.language, 'Próxima luta em destaque', 'Next featured fight', 'Prochain combat à l’affiche', 'Próxima pelea destacada')}
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--text-primary)] dark:text-white">
        {positionLabel(pick.card_position, i18n.language)}
        {pick.title_fight ? ` · ${L(i18n.language, 'Luta pelo cinturão', 'Title fight', 'Combat de titre', 'Pelea por el título')}` : ''}
      </p>
      <p className="truncate text-xs text-[var(--text-secondary)] dark:text-neutral-400">
        {pick.event_name}
        {day ? ` · ${day}` : ''}
      </p>
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
