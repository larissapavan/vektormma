import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { fightPath } from '../../seo/athletes'
import { cardPositionLabel } from '../data/cardPosition'
import { useFeaturedPick } from '../hooks/useFeaturedPick'
import { useFighterLookup } from '../hooks/useFighterLookup'
import { getFighterImageUrl, useFighterImages } from '../hooks/useFighterImages'
import { FighterAvatar } from './FighterAvatar'
import { CornerSplit, cornerPhotoClass } from './ui/CornerSplit'
import { predictionSentence, ProbabilityBand } from './ui/ProbabilityBand'
import { sectionActionClass } from './ui/Section'

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

/**
 * The next card's headline fight: the two corners side by side, the model's estimate in a band under them, and links to
 * the factors behind it and to the comparison of the two fighters. Renders nothing without a fight.
 */
export function FeaturedMatchup() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const pick = useFeaturedPick()
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  if (!pick) return null

  const probabilityA = pick.fighter_1_probability
  const href = headToHeadPath(pick.fighter_1, pick.fighter_2)
  // The fight's own page: the matchup analysis with the factors behind the pick, at an address that can be shared.
  const factorsHref = fightPath(pick.fighter_1, pick.fighter_2)
  const day = eventDay(pick.event_date, lang)
  const photo = (name: string) => (
    <FighterAvatar name={name} imageUrl={getFighterImageUrl(name, imageByName, lookup(name)?.image_url)} className={cornerPhotoClass} />
  )

  return (
    <div data-testid="featured-matchup">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-[17px] font-bold text-[var(--ink)]">
          {L(lang, 'Próxima luta em destaque', 'Next featured fight', 'Prochain combat à l’affiche', 'Próxima pelea destacada')}
          {': '}
          {cardPositionLabel(pick.card_position, lang)}
          {pick.title_fight ? `, ${L(lang, 'luta pelo cinturão', 'title fight', 'combat de titre', 'pelea por el título')}` : ''}
        </p>
        <p className="text-base text-[var(--muted)]">
          {pick.event_name}
          {day ? ` · ${day}` : ''}
        </p>
      </div>

      <CornerSplit
        testId="featured-faceoff"
        headingLevel="h2"
        red={{ name: pick.fighter_1, label: L(lang, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja'), photo: photo(pick.fighter_1) }}
        blue={{ name: pick.fighter_2, label: L(lang, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul'), photo: photo(pick.fighter_2) }}
      />
      <ProbabilityBand nameA={pick.fighter_1} nameB={pick.fighter_2} probabilityA={probabilityA} />

      <p className="mt-4 max-w-[70ch] text-base text-[var(--ink)] sm:text-lg">{predictionSentence(lang, pick.predicted_winner, Math.max(probabilityA, 1 - probabilityA))}</p>
      <div className="mt-1 flex flex-wrap gap-x-7">
        <Link to={factorsHref} className={sectionActionClass}>
          {L(lang, 'Ver o que pesa nesta previsão', 'See what weighs on this prediction', 'Voir ce qui pèse dans ce pronostic', 'Ver qué pesa en este pronóstico')}
        </Link>
        <Link to={href} className={sectionActionClass}>
          {L(lang, 'Comparar lutadores', 'Compare fighters', 'Comparer les combattants', 'Comparar peleadores')}
        </Link>
      </div>
    </div>
  )
}
