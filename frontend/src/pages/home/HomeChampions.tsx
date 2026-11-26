import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { ChampionBelt } from '../../shared/components/ChampionBelt'
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton'
import { Section, sectionActionClass } from '../../shared/components/ui/Section'
import { divisionOrder, getDivisionName } from '../../shared/data/divisions'
import { useChampions } from '../../shared/hooks/useChampions'
import { getFighterImageUrl, useFighterImages } from '../../shared/hooks/useFighterImages'
import { useFighterLookup } from '../../shared/hooks/useFighterLookup'
import { usePhotoCredit, photoRightsText } from '../../shared/hooks/usePhotoCredit'
import type { TitleReign } from '../../shared/types/api'

/** Every current belt as a photo card: division, champion, days with the belt and title defenses. */
export function HomeChampions({ onOpenProfile }: { onOpenProfile: (name: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { data, loading, error } = useChampions()
  const reigns = useMemo(
    () =>
      [...(data?.current_champions ?? [])].sort(
        (a, b) => divisionOrder(a.division) - divisionOrder(b.division) || (a.title_type === 'interim' ? 1 : 0) - (b.title_type === 'interim' ? 1 : 0),
      ),
    [data],
  )

  if (error) return null

  return (
    <Section
      title={L(lang, 'Campeões atuais', 'Current champions', 'Champions actuels', 'Campeones actuales')}
      action={
        <Link to="/champions" className={sectionActionClass}>
          {L(lang, 'Ver todos os campeões', 'See every champion', 'Voir tous les champions', 'Ver todos los campeones')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <li key={index}>
                <LoadingSkeleton className="aspect-[4/5] w-full" />
              </li>
            ))
          : reigns.map((reign) => <ChampionTile key={`${reign.division}-${reign.title_type}`} reign={reign} onOpen={() => onOpenProfile(reign.champion)} />)}
      </ul>
    </Section>
  )
}

function ChampionTile({ reign, onOpen }: { reign: TitleReign; onOpen: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const lookup = useFighterLookup()
  const { imageByName } = useFighterImages()
  const imageUrl = getFighterImageUrl(reign.champion, imageByName, lookup(reign.champion)?.image_url)
  const credit = usePhotoCredit(imageUrl ?? undefined)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl
  const division = getDivisionName(reign.division, lang)
  const interim = reign.title_type === 'interim'
  const initials = reign.champion
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const days = reign.days_held

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={L(lang, `${reign.champion}, ${division}. Ver perfil`, `${reign.champion}, ${division}. View profile`, `${reign.champion}, ${division}. Voir le profil`, `${reign.champion}, ${division}. Ver perfil`)}
        className="group flex h-full w-full cursor-pointer flex-col bg-[var(--panel)] text-left hover:bg-[var(--panel-hover)]"
      >
        <span title={credit && showImage ? photoRightsText(credit, lang) : undefined} className="relative block aspect-[4/5] w-full overflow-hidden bg-[var(--track)]">
          {showImage ? (
            <img
              src={imageUrl ?? undefined}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedUrl(imageUrl ?? null)}
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center font-display text-4xl font-black text-[var(--muted)]">{initials}</span>
          )}
          <span className="absolute right-1.5 top-1.5">
            <ChampionBelt />
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3">
          <span className="text-sm font-bold text-[var(--gold)]">
            {division}
            {interim ? ` · ${L(lang, 'interino', 'interim', 'intérimaire', 'interino')}` : ''}
          </span>
          <span className="break-words font-display text-lg font-black leading-[1.05] [hyphens:auto]">{reign.champion}</span>
          <span className="text-sm tabular-nums text-[var(--muted)]">
            {days != null ? `${days.toLocaleString(localeTag(lang))} ${L(lang, 'dias de reinado', 'days as champion', 'jours de règne', 'días de reinado')}` : null}
            {days != null && reign.defenses_count ? ' · ' : null}
            {reign.defenses_count
              ? L(
                  lang,
                  `${reign.defenses_count} ${reign.defenses_count === 1 ? 'defesa' : 'defesas'}`,
                  `${reign.defenses_count} ${reign.defenses_count === 1 ? 'defense' : 'defenses'}`,
                  `${reign.defenses_count} ${reign.defenses_count === 1 ? 'défense' : 'défenses'}`,
                  `${reign.defenses_count} ${reign.defenses_count === 1 ? 'defensa' : 'defensas'}`,
                )
              : null}
          </span>
        </span>
      </button>
    </li>
  )
}
