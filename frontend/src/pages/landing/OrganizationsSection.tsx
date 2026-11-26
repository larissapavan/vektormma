import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { historyRange } from '../../shared/data/history'
import { ORGS, orgPath, type OrgConfig, type OrgId } from '../../shared/data/orgs'
import { useOrgUpcomingEvents } from '../../shared/hooks/useOrgData'
import { useUpcomingEvents } from '../../shared/hooks/useUpcomingEvents'

interface OrgCardInfo {
  id: OrgId
  fullName: string
  glove: string
  /** Snapshot of the data-info bout count: rounded down when shown, so "8.900+" stays true as data grows. */
  fights: number
}

/** Every organization the project has data for, in one list of equal cards. None is picked for the visitor. */
const ORG_CARDS: OrgCardInfo[] = [
  { id: 'ufc', fullName: 'Ultimate Fighting Championship', glove: '/mma-glove-ufc.webp', fights: 8985 },
  { id: 'pfl', fullName: 'Professional Fighters League', glove: '/mma-glove-pfl.webp', fights: 1380 },
  { id: 'one', fullName: 'ONE Championship', glove: '/mma-glove-one.webp', fights: 4817 },
  { id: 'bellator', fullName: 'Bellator MMA', glove: '/mma-glove-bellator.webp', fights: 3004 },
  { id: 'rizin', fullName: 'RIZIN Fighting Federation', glove: '/mma-glove-rizin.webp', fights: 884 },
  { id: 'ksw', fullName: 'Konfrontacja Sztuk Walki', glove: '/mma-glove-ksw.webp', fights: 1118 },
  { id: 'lfa', fullName: 'Legacy Fighting Alliance', glove: '/mma-glove-lfa.webp', fights: 2751 },
  { id: 'cage-warriors', fullName: 'Cage Warriors', glove: '/mma-glove-cage-warriors.webp', fights: 1186 },
  { id: 'oktagon', fullName: 'OKTAGON MMA', glove: '/mma-glove-oktagon.webp', fights: 1220 },
  { id: 'jungle-fight', fullName: 'Jungle Fight', glove: '/mma-glove-jungle-fight.webp', fights: 1688 },
  { id: 'invicta', fullName: 'Invicta Fighting Championships', glove: '/mma-glove-invicta.webp', fights: 534 },
]

/** 797 -> "790+", 8985 -> "8.900+" (the grouping follows the language). */
function approximately(count: number, lang: string): string {
  const floor = count >= 1000 ? 100 : 10
  return `${new Intl.NumberFormat(localeTag(lang)).format(Math.floor(count / floor) * floor)}+`
}

function formatDate(date: string | null, lang: string) {
  if (!date) return null
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat(localeTag(lang), { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

type NextEvent = { name: string; date: string | null; fight_count: number } | null
type NextState = { loading: boolean; event: NextEvent }

/** The UFC's next card comes from its own endpoint (asked once by the section); every other one from the generic /orgs one. */
function useNextEvent(org: OrgConfig, ufc: NextState): NextState {
  const isUfc = org.id === 'ufc'
  const other = useOrgUpcomingEvents(isUfc || org.archived ? null : org.id)
  if (org.archived) return { loading: false, event: null }
  if (isUfc) return ufc
  return { loading: other.loading, event: other.events[0] ?? null }
}

function OrgCard({ card, ufc }: { card: OrgCardInfo; ufc: NextState }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const org = ORGS[card.id]
  const { loading, event } = useNextEvent(org, ufc)
  const date = event ? formatDate(event.date, lang) : null

  const offer = org.archived
    ? L(lang, 'Arquivo histórico', 'Historical archive', 'Archives', 'Archivo histórico')
    : org.hasPredictions
      ? L(lang, 'Eventos e previsões', 'Events and predictions', 'Événements et pronostics', 'Eventos y pronósticos')
      : L(lang, 'Eventos e resultados', 'Events and results', 'Événements et résultats', 'Eventos y resultados')

  return (
    <li className="flex">
      <Link
        to={orgPath(org)}
        aria-label={`${L(lang, 'Acompanhar', 'Follow', 'Suivre', 'Seguir')} ${card.fullName}`}
        className="group flex w-full flex-col border-t-4 border-[var(--ink)] bg-[var(--panel)] p-5 text-[var(--ink)] hover:bg-[var(--panel-hover)] sm:p-6"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-display text-[44px] font-black leading-[0.9] sm:text-5xl">{org.shortName}</span>
            {card.fullName !== org.shortName ? <span className="mt-1.5 block text-[15px] text-[var(--muted)]">{card.fullName}</span> : null}
          </span>
          <img src={card.glove} alt="" aria-hidden="true" loading="lazy" draggable={false} className="h-12 w-auto shrink-0 select-none opacity-90" />
        </span>

        <span className="mt-4 flex flex-wrap gap-2">
          <span className={`border-[1.5px] px-2.5 py-1 text-[13px] font-bold ${org.hasPredictions && !org.archived ? 'border-[var(--ink)]' : 'border-[var(--muted)] text-[var(--muted)]'}`}>{offer}</span>
          <span className="px-0.5 py-1 text-[13px] tabular-nums text-[var(--muted)]">
            {approximately(card.fights, lang)} {L(lang, 'lutas no arquivo', 'fights on file', 'combats répertoriés', 'peleas registradas')}
          </span>
        </span>

        {/* The next card, only as the data has it: nothing is filled in when there is no event. */}
        <span className="mt-5 block flex-1 border-t border-[var(--rule)] pt-4" aria-live="polite">
          <span className="block text-sm font-bold text-[var(--muted)]">
            {org.archived ? L(lang, 'Sem eventos futuros', 'No future events', 'Aucun événement à venir', 'Sin eventos futuros') : L(lang, 'Próximo evento', 'Next event', 'Prochain événement', 'Próximo evento')}
          </span>
          {org.archived ? (
            <span className="mt-1 block text-[15px] leading-snug">
              {L(lang, 'O último evento foi em 2023. O acervo segue disponível.', 'Its last event was in 2023. The archive stays open.', 'Le dernier événement a eu lieu en 2023. Les archives restent consultables.', 'El último evento fue en 2023. El archivo sigue disponible.')}
            </span>
          ) : loading ? (
            <span className="mt-2 block h-5 w-3/4 animate-pulse bg-[var(--track)]" role="status" aria-label={L(lang, 'Carregando o próximo evento', 'Loading the next event', 'Chargement du prochain événement', 'Cargando el próximo evento')} />
          ) : event ? (
            <>
              <span className="mt-1 block font-display text-xl font-extrabold leading-tight">{event.name}</span>
              <span className="mt-0.5 block text-sm tabular-nums text-[var(--muted)]">
                {[date, event.fight_count
                  ? `${event.fight_count} ${event.fight_count === 1 ? L(lang, 'luta', 'fight', 'combat', 'pelea') : L(lang, 'lutas', 'fights', 'combats', 'peleas')}`
                  : null].filter(Boolean).join(' · ')}
              </span>
            </>
          ) : (
            <span className="mt-1 block text-[15px] text-[var(--muted)]">
              {L(lang, 'Nenhum evento confirmado no momento.', 'No event confirmed right now.', 'Aucun événement confirmé pour le moment.', 'Ningún evento confirmado por ahora.')}
            </span>
          )}
        </span>

        <span className="mt-5 inline-flex items-center gap-2 text-base font-bold underline decoration-2 underline-offset-[5px] group-hover:decoration-[3px]">
          {org.archived
            ? L(lang, 'Ver o arquivo', 'See the archive', 'Voir les archives', 'Ver el archivo')
            : org.hasPredictions
              ? L(lang, 'Ver eventos e previsões', 'See events and predictions', 'Voir événements et pronostics', 'Ver eventos y pronósticos')
              : L(lang, 'Ver eventos e resultados', 'See events and results', 'Voir événements et résultats', 'Ver eventos y resultados')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

export function OrganizationsSection() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const range = historyRange()
  const ufcEvents = useUpcomingEvents()
  const ufc = useMemo<NextState>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { loading: ufcEvents.loading, event: ufcEvents.events.find((item) => item.date && item.date >= today) ?? null }
  }, [ufcEvents.events, ufcEvents.loading])
  const withPredictions = Object.values(ORGS)
    .filter((org) => org.hasPredictions && !org.archived)
    .map((org) => org.shortName)
  const list = new Intl.ListFormat(localeTag(lang), { style: 'long', type: 'conjunction' }).format(withPredictions)

  return (
    <section id="organizations-grid" className="scroll-mt-28" aria-labelledby="organizations-title">
      <h2 id="organizations-title" className="font-display text-[40px] font-extrabold leading-none sm:text-5xl">
        {L(lang, 'Escolha uma organização', 'Choose an organization', 'Choisissez une organisation', 'Elige una organización')}
      </h2>
      <p className="mt-2 max-w-[62ch] text-base text-[var(--muted)]">
        {L(
          lang,
          `Cada uma tem seus eventos, lutadores e resultados (dados de ${range}). As previsões do modelo existem para ${list}.`,
          `Each one has its own events, fighters and results (data from ${range}). The model's predictions cover ${list}.`,
          `Chacune a ses événements, combattants et résultats (données de ${range}). Les pronostics du modèle couvrent ${list}.`,
          `Cada una tiene sus eventos, peleadores y resultados (datos de ${range}). Los pronósticos del modelo cubren ${list}.`,
        )}
      </p>

      <ul aria-label={L(lang, 'Organizações', 'Organizations', 'Organisations', 'Organizaciones')} className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {ORG_CARDS.map((card) => (
          <OrgCard key={card.id} card={card} ufc={ufc} />
        ))}
      </ul>
    </section>
  )
}
