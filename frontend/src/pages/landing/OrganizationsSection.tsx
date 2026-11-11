import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { historyRange } from '../../shared/data/history'
import { ORGS, orgPath, type OrgId } from '../../shared/data/orgs'

type StatusKind = 'ai' | 'archive' | 'results'

interface OrgCardInfo {
  id: OrgId
  shortName: string
  fullName: string
  glove: string
  status: StatusKind
  /** Snapshot of the data-info counts (events, fighters, bouts): rounded down when shown, so "790+" stays true as data grows. */
  counts: { events: number; fighters: number; fights: number }
}

const STATUS_LABELS: Record<StatusKind, { pt: string; en: string; fr: string; es: string }> = {
  ai: { pt: 'Previsões', en: 'Predictions', fr: 'Pronostics', es: 'Pronósticos' },
  archive: { pt: 'Arquivo histórico', en: 'Historical archive', fr: 'Archives', es: 'Archivo histórico' },
  results: { pt: 'Eventos e resultados', en: 'Events and results', fr: 'Événements et résultats', es: 'Eventos y resultados' },
}

const ORG_CARDS: OrgCardInfo[] = [
  { id: 'ufc', shortName: 'UFC', fullName: 'Ultimate Fighting Championship', glove: '/mma-glove-ufc.webp', status: 'ai', counts: { events: 797, fighters: 2796, fights: 8985 } },
  { id: 'pfl', shortName: 'PFL', fullName: 'Professional Fighters League', glove: '/mma-glove-pfl.webp', status: 'ai', counts: { events: 141, fighters: 1054, fights: 1380 } },
  { id: 'one', shortName: 'ONE', fullName: 'ONE Championship', glove: '/mma-glove-one.webp', status: 'ai', counts: { events: 453, fighters: 3637, fights: 4817 } },
  { id: 'bellator', shortName: 'Bellator', fullName: 'Bellator MMA', glove: '/mma-glove-bellator.webp', status: 'archive', counts: { events: 311, fighters: 2283, fights: 3004 } },
  { id: 'rizin', shortName: 'RIZIN', fullName: 'RIZIN Fighting Federation', glove: '/mma-glove-rizin.webp', status: 'results', counts: { events: 87, fighters: 598, fights: 884 } },
  { id: 'ksw', shortName: 'KSW', fullName: 'Konfrontacja Sztuk Walki', glove: '/mma-glove-ksw.webp', status: 'results', counts: { events: 131, fighters: 668, fights: 1118 } },
  { id: 'lfa', shortName: 'LFA', fullName: 'Legacy Fighting Alliance', glove: '/mma-glove-lfa.webp', status: 'results', counts: { events: 250, fighters: 2984, fights: 2751 } },
  { id: 'cage-warriors', shortName: 'Cage Warriors', fullName: 'Cage Warriors', glove: '/mma-glove-cage-warriors.webp', status: 'results', counts: { events: 202, fighters: 978, fights: 1186 } },
  { id: 'oktagon', shortName: 'OKTAGON', fullName: 'OKTAGON MMA', glove: '/mma-glove-oktagon.webp', status: 'results', counts: { events: 114, fighters: 846, fights: 1220 } },
  { id: 'jungle-fight', shortName: 'Jungle Fight', fullName: 'Jungle Fight', glove: '/mma-glove-jungle-fight.webp', status: 'results', counts: { events: 158, fighters: 1813, fights: 1688 } },
  { id: 'invicta', shortName: 'Invicta FC', fullName: 'Invicta Fighting Championships', glove: '/mma-glove-invicta.webp', status: 'results', counts: { events: 67, fighters: 409, fights: 534 } },
]

/**
 * Three levels, by what each organization has: the UFC is where the prediction model is, so its row carries a
 * description and three counts; PFL, ONE and Bellator are the ones with champions pages, so they get a row each with
 * their bouts; the other seven have fighters, events and gyms only (see ORGS), so they are one outlined link each.
 */
const ROWS: OrgId[] = ['ufc', 'pfl', 'one', 'bellator']
const COMPACT: OrgId[] = ['rizin', 'ksw', 'lfa', 'cage-warriors', 'oktagon', 'jungle-fight', 'invicta']

const cardOf = (id: OrgId): OrgCardInfo => ORG_CARDS.find((card) => card.id === id)!

/** 797 -> "790+", 8985 -> "8.900+" (the grouping follows the language, like the exact figures in the strip above). */
function approximately(count: number, lang: string): string {
  const floor = count >= 1000 ? 100 : 10
  return `${new Intl.NumberFormat(localeTag(lang)).format(Math.floor(count / floor) * floor)}+`
}

function Arrow() {
  return (
    <svg className="row-arrow h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  )
}

function Count({ value, label }: { value: string; label: string }) {
  return (
    <span>
      <span className="block font-display text-4xl font-extrabold leading-none tabular-nums">{value}</span>
      <span className="text-[15px] text-[var(--muted)]">{label}</span>
    </span>
  )
}

/** One organization as a row: its name large, what it offers, its size, and an arrow that moves on hover. */
function OrgRow({ card }: { card: OrgCardInfo }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const status = STATUS_LABELS[card.status]
  const featured = card.id === 'ufc'

  return (
    <li className="border-b border-[var(--rule)]">
      <Link
        to={orgPath(ORGS[card.id])}
        aria-label={`${L(lang, 'Abrir', 'Open', 'Ouvrir', 'Abrir')} ${card.fullName}`}
        className="row-link flex flex-wrap items-center gap-x-8 gap-y-3 px-3 py-7 text-[var(--ink)] hover:bg-[var(--panel)]"
      >
        <h3 className="flex-[1_1_200px] font-display text-[56px] font-black leading-[0.9] sm:text-[72px]">{card.shortName}</h3>
        <span className="flex flex-[2_1_280px] flex-col items-start gap-2.5">
          <span className={`rounded-sm border-[1.5px] px-2.5 py-1 text-[13px] font-bold ${card.status === 'ai' ? 'border-[var(--ink)]' : 'border-[var(--muted)] text-[var(--muted)]'}`}>
            {L(lang, status.pt, status.en, status.fr, status.es)}
          </span>
          <span className="max-w-[46ch] text-[17px] leading-[1.4]">
            {featured
              ? L(
                  lang,
                  'A chance de vitória estimada pelo modelo em cada luta e o que pesa nela, além de rankings, campeões e histórico.',
                  'The model’s estimated win chance for every fight and what weighs on it, plus rankings, champions and history.',
                  'La chance de victoire estimée par le modèle pour chaque combat et ce qui pèse dessus, plus les classements, les champions et l’historique.',
                  'La probabilidad de victoria estimada por el modelo en cada pelea y lo que pesa en ella, además de rankings, campeones e historial.',
                )
              : card.fullName}
          </span>
        </span>
        <span className="flex flex-[1.6_1_300px] flex-wrap gap-x-7 gap-y-3">
          {featured ? (
            <>
              <Count value={approximately(card.counts.events, lang)} label={L(lang, 'eventos', 'events', 'événements', 'eventos')} />
              <Count value={approximately(card.counts.fighters, lang)} label={L(lang, 'lutadores', 'fighters', 'combattants', 'peleadores')} />
            </>
          ) : null}
          <Count value={approximately(card.counts.fights, lang)} label={L(lang, 'lutas', 'fights', 'combats', 'peleas')} />
        </span>
        {/* The league's glove, kept as a small still picture beside the arrow. */}
        <img src={card.glove} alt="" aria-hidden="true" loading="lazy" className="hidden h-16 w-auto shrink-0 select-none lg:block" draggable={false} />
        <Arrow />
      </Link>
    </li>
  )
}

export function OrganizationsSection() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const range = historyRange()

  return (
    <section id="organizations-grid" className="scroll-mt-28">
      <h2 className="font-display text-[40px] font-extrabold leading-none sm:text-5xl">
        {L(lang, 'Escolha uma organização', 'Choose an organization', 'Choisissez une organisation', 'Elige una organización')}
      </h2>
      <p className="mt-2 text-base text-[var(--muted)]">{L(lang, `Dados de ${range}.`, `Data from ${range}.`, `Données de ${range}.`, `Datos de ${range}.`)}</p>

      <ul
        aria-label={L(lang, 'Organizações principais', 'Main organizations', 'Organisations principales', 'Organizaciones principales')}
        className="mt-7 border-t-[3px] border-[var(--ink)]"
      >
        {ROWS.map((id) => (
          <OrgRow key={id} card={cardOf(id)} />
        ))}
      </ul>

      <div className="px-3 pt-10">
        <h3 className="font-display text-3xl font-extrabold leading-none">{L(lang, 'Outras ligas', 'Other leagues', 'Autres ligues', 'Otras ligas')}</h3>
        <p className="mb-4 mt-1.5 text-base text-[var(--muted)]">
          {L(lang, 'Eventos, resultados e lutadores de cada liga.', 'Events, results and fighters of each league.', 'Événements, résultats et combattants de chaque ligue.', 'Eventos, resultados y peleadores de cada liga.')}
        </p>
        <ul className="flex flex-wrap gap-3">
          {COMPACT.map((id) => {
            const card = cardOf(id)
            return (
              <li key={id}>
                <Link
                  to={orgPath(ORGS[card.id])}
                  aria-label={`${L(lang, 'Abrir', 'Open', 'Ouvrir', 'Abrir')} ${card.fullName}`}
                  className="ghost-action inline-flex items-center px-[18px] !text-base"
                >
                  {card.shortName}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
