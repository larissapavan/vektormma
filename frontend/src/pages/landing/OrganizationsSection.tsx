import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { MMAGlove } from '../../shared/components/MMAGlove'
import { ORGS, orgPath, type OrgId } from '../../shared/data/orgs'

type StatusKind = 'ai' | 'archive' | 'results'

interface OrgCardInfo {
  id: OrgId
  shortName: string
  fullName: string
  accentColor: string
  glove: { src: string; duration: string; delay: string }
  status: StatusKind
  /** Snapshot of the data-info counts (events, fighters, bouts): rounded down when shown, so "790+" stays true as data grows. */
  counts: { events: number; fighters: number; fights: number }
}

const STATUS_LABELS: Record<StatusKind, { pt: string; en: string; fr: string; es: string; pulse: boolean }> = {
  ai: { pt: 'Previsões IA', en: 'AI Predictions', fr: 'Pronostics IA', es: 'Pronósticos IA', pulse: true },
  archive: { pt: 'Arquivo Histórico', en: 'Historical Archive', fr: 'Archives', es: 'Archivo histórico', pulse: false },
  results: { pt: 'Eventos & Resultados', en: 'Events & Results', fr: 'Événements & résultats', es: 'Eventos y resultados', pulse: false },
}

const ORG_CARDS: OrgCardInfo[] = [
  { id: 'ufc', shortName: 'UFC', fullName: 'Ultimate Fighting Championship', accentColor: '#E11D48', glove: { src: '/mma-glove-ufc.webp', duration: '5.2s', delay: '0s' }, status: 'ai', counts: { events: 797, fighters: 2796, fights: 8985 } },
  { id: 'pfl', shortName: 'PFL', fullName: 'Professional Fighters League', accentColor: '#2563EB', glove: { src: '/mma-glove-pfl.webp', duration: '4.6s', delay: '-1.4s' }, status: 'ai', counts: { events: 141, fighters: 1054, fights: 1380 } },
  { id: 'one', shortName: 'ONE', fullName: 'ONE Championship', accentColor: '#F59E0B', glove: { src: '/mma-glove-one.webp', duration: '5.8s', delay: '-2.7s' }, status: 'ai', counts: { events: 453, fighters: 3637, fights: 4817 } },
  { id: 'bellator', shortName: 'BELLATOR', fullName: 'Bellator MMA', accentColor: '#10B981', glove: { src: '/mma-glove-bellator.webp', duration: '4.9s', delay: '-0.8s' }, status: 'archive', counts: { events: 311, fighters: 2283, fights: 3004 } },
  { id: 'rizin', shortName: 'RIZIN', fullName: 'RIZIN Fighting Federation', accentColor: '#A855F7', glove: { src: '/mma-glove-rizin.webp', duration: '5.4s', delay: '-1.9s' }, status: 'results', counts: { events: 83, fighters: 464, fights: 609 } },
  { id: 'ksw', shortName: 'KSW', fullName: 'Konfrontacja Sztuk Walki', accentColor: '#06B6D4', glove: { src: '/mma-glove-ksw.webp', duration: '5.0s', delay: '-3.1s' }, status: 'results', counts: { events: 125, fighters: 527, fights: 804 } },
  { id: 'lfa', shortName: 'LFA', fullName: 'Legacy Fighting Alliance', accentColor: '#EC4899', glove: { src: '/mma-glove-lfa.webp', duration: '4.7s', delay: '-2.2s' }, status: 'results', counts: { events: 236, fighters: 1527, fights: 1429 } },
  { id: 'cage-warriors', shortName: 'CAGE WARRIORS', fullName: 'Cage Warriors', accentColor: '#F97316', glove: { src: '/mma-glove-cage-warriors.webp', duration: '5.6s', delay: '-0.4s' }, status: 'results', counts: { events: 202, fighters: 978, fights: 1186 } },
  { id: 'oktagon', shortName: 'OKTAGON', fullName: 'OKTAGON MMA', accentColor: '#84CC16', glove: { src: '/mma-glove-oktagon.webp', duration: '5.1s', delay: '-1.1s' }, status: 'results', counts: { events: 114, fighters: 846, fights: 1220 } },
  { id: 'jungle-fight', shortName: 'JUNGLE FIGHT', fullName: 'Jungle Fight', accentColor: '#6366F1', glove: { src: '/mma-glove-jungle-fight.webp', duration: '5.5s', delay: '-2.5s' }, status: 'results', counts: { events: 158, fighters: 1813, fights: 1688 } },
  { id: 'invicta', shortName: 'INVICTA FC', fullName: 'Invicta Fighting Championships', accentColor: '#14B8A6', glove: { src: '/mma-glove-invicta.webp', duration: '4.8s', delay: '-3.3s' }, status: 'results', counts: { events: 67, fighters: 409, fights: 534 } },
]

/**
 * Three levels, by what each organization has: the UFC is where the prediction model is, so it gets a big card; PFL, ONE
 * and Bellator are the ones with champions pages, so they get a card each; the other seven have fighters, events and
 * gyms only (see ORGS), so they are one line each.
 */
const MAIN: OrgId[] = ['pfl', 'one', 'bellator']
const COMPACT: OrgId[] = ['rizin', 'ksw', 'lfa', 'cage-warriors', 'oktagon', 'jungle-fight', 'invicta']

const cardOf = (id: OrgId): OrgCardInfo => ORG_CARDS.find((card) => card.id === id)!

/** 797 -> "790+", 8985 -> "8.900+" (the grouping follows the language, like the exact figures in the strip above). */
function approximately(count: number, lang: string): string {
  const floor = count >= 1000 ? 100 : 10
  return `${new Intl.NumberFormat(localeTag(lang)).format(Math.floor(count / floor) * floor)}+`
}

function accentStyle(card: OrgCardInfo): CSSProperties {
  return { '--accent-color': card.accentColor, '--glove-duration': card.glove.duration, '--glove-delay': card.glove.delay } as CSSProperties
}

function StatusBadge({ card, lang }: { card: OrgCardInfo; lang: string }) {
  const status = STATUS_LABELS[card.status]
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: card.accentColor }} />
      <span className="truncate">{L(lang, status.pt, status.en, status.fr, status.es)}</span>
    </span>
  )
}

/** Events, fighters and bouts: the same three counts for every organization. */
function useMetrics(card: OrgCardInfo) {
  const { i18n } = useTranslation()
  return [
    { value: approximately(card.counts.events, i18n.language), label: L(i18n.language, 'Eventos', 'Events', 'Événements', 'Eventos') },
    { value: approximately(card.counts.fighters, i18n.language), label: L(i18n.language, 'Lutadores', 'Fighters', 'Combattants', 'Peleadores') },
    { value: approximately(card.counts.fights, i18n.language), label: L(i18n.language, 'Lutas', 'Bouts', 'Combats', 'Peleas') },
  ]
}

function Stats({ card, large = false, className = '' }: { card: OrgCardInfo; large?: boolean; className?: string }) {
  const metrics = useMetrics(card)
  return (
    <dl className={`grid grid-cols-3 gap-2 border-y border-[var(--border-subtle)] py-3 dark:border-white/10 ${className}`}>
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <dd className={`font-display font-bold tabular-nums text-[var(--text-primary)] dark:text-white ${large ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>{metric.value}</dd>
          <dt className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wide text-[var(--text-secondary)] dark:text-neutral-400">{metric.label}</dt>
        </div>
      ))}
    </dl>
  )
}

const CARD_SURFACE =
  'group relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] transition-all duration-200 hover:border-[var(--accent-color)] hover:shadow-[var(--elevated-shadow)] dark:border-white/10 dark:bg-[#0c0f17]/90 dark:hover:border-[var(--accent-color)]'

/** The UFC: the organization with the prediction model, in a card of its own. */
function FeaturedCard({ card }: { card: OrgCardInfo }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <Link
      to={orgPath(ORGS[card.id])}
      aria-label={`${L(lang, 'Abrir', 'Open', 'Ouvrir', 'Abrir')} ${card.fullName}`}
      style={accentStyle(card)}
      className={`${CARD_SURFACE} grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 rounded-3xl p-5 pt-6 sm:p-7 sm:pt-8 lg:grid-cols-[1fr_340px] lg:gap-x-10 hover:-translate-y-0.5`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: card.accentColor }} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,color-mix(in_srgb,var(--accent-color)_20%,transparent),transparent_60%)]"
      />

      <div className="relative col-start-1 min-w-0">
        <StatusBadge card={card} lang={lang} />
        <h3 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-[var(--text-primary)] dark:text-white sm:text-5xl">{card.shortName}</h3>
        <p className="mt-1.5 text-xs font-medium leading-snug text-[var(--text-secondary)] dark:text-neutral-400 sm:text-sm">{card.fullName}</p>
      </div>

      {/* Decorative glove: small beside the title on a phone, large beside the whole card on a wide screen */}
      <div aria-hidden="true" className="relative col-start-2 row-start-1 flex items-center justify-center lg:row-span-4">
        <div className="glove-lift">
          <div className="glove-float">
            <MMAGlove src={card.glove.src} glow={card.accentColor} className="h-24 w-auto sm:h-32 lg:h-64" />
          </div>
        </div>
      </div>

      <p className="relative col-span-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)] dark:text-neutral-300 lg:col-span-1">
        {L(
          lang,
          'Probabilidade de vitória de cada luta com os fatores por trás da previsão, além de rankings, campeões e histórico.',
          'Win probability for every fight with the factors behind the pick, plus rankings, champions and history.',
          'Probabilité de victoire de chaque combat avec les facteurs du pronostic, plus classements, champions et historique.',
          'Probabilidad de victoria de cada pelea con los factores del pronóstico, además de rankings, campeones e historial.',
        )}
      </p>

      <Stats card={card} large className="relative col-span-2 max-w-lg lg:col-span-1" />

      <span className="relative col-span-2 mt-1 inline-flex min-h-11 w-fit items-center gap-3 rounded-full bg-[#E11D48] px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-white shadow-md transition-colors duration-200 group-hover:bg-[#BE123C] lg:col-span-1">
        {L(lang, 'Entrar no UFC', 'Enter the UFC', 'Entrer dans l’UFC', 'Entrar a la UFC')}
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </Link>
  )
}

/** PFL, ONE and Bellator: a glove, the name, the badge and the three counts, in half the height of the old card. */
function MainCard({ card }: { card: OrgCardInfo }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <Link
      to={orgPath(ORGS[card.id])}
      aria-label={`${L(lang, 'Abrir', 'Open', 'Ouvrir', 'Abrir')} ${card.fullName}`}
      style={accentStyle(card)}
      className={`${CARD_SURFACE} flex min-w-0 flex-col rounded-2xl p-4 pt-5 hover:-translate-y-0.5`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: card.accentColor }} />
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="glove-lift shrink-0">
          <div className="glove-float">
            <MMAGlove src={card.glove.src} glow={card.accentColor} className="h-16 w-auto" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-extrabold uppercase leading-none tracking-tight text-[var(--text-primary)] dark:text-white">{card.shortName}</h3>
          <p className="mt-1 truncate text-xs font-medium text-[var(--text-secondary)] dark:text-neutral-400">{card.fullName}</p>
          <div className="mt-2 flex">
            <StatusBadge card={card} lang={lang} />
          </div>
        </div>
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 self-start text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-1 dark:text-neutral-400" />
      </div>
      <Stats card={card} className="mt-3" />
    </Link>
  )
}

/** One line per organization: a dot in its colour, its name and its counts. */
function CompactRow({ card }: { card: OrgCardInfo }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const metrics = useMetrics(card)
  return (
    <li className="border-b border-[var(--border-subtle)] last:border-b-0 dark:border-white/10 md:[&:nth-child(4)]:border-b">
      <Link
        to={orgPath(ORGS[card.id])}
        aria-label={`${L(lang, 'Abrir', 'Open', 'Ouvrir', 'Abrir')} ${card.fullName}`}
        style={accentStyle(card)}
        className="group relative flex min-h-12 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg py-2.5 pl-2 pr-9 transition-colors duration-200 hover:bg-[var(--bg-surface-hover)] dark:hover:bg-white/5"
      >
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: card.accentColor }} />
        <span className="font-display text-sm font-bold uppercase tracking-tight text-[var(--text-primary)] dark:text-white">{card.shortName}</span>
        <span className="basis-full pl-5 text-xs text-balance tabular-nums text-[var(--text-secondary)] dark:text-neutral-400 md:ml-auto md:basis-auto md:pl-0">
          {metrics.map((metric) => `${metric.value} ${metric.label.toLowerCase()}`).join(' · ')}
        </span>
        <ArrowRight aria-hidden="true" className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-1 dark:text-neutral-400" />
      </Link>
    </li>
  )
}

export function OrganizationsSection() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <section id="organizations-grid" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-6 sm:pt-8 pb-3 sm:pb-4 w-full">
      <div className="mb-4 sm:mb-5">
        <span className="font-mono text-xs uppercase tracking-widest text-[#BE123C] dark:text-[#FB7185] font-bold">
          {L(lang, 'LIGAS & ORGANIZAÇÕES', 'LEAGUES & ORGANIZATIONS', 'LIGUES & ORGANISATIONS', 'LIGAS Y ORGANIZACIONES')}
        </span>
        <h2 className="mt-1 font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text-primary)] dark:text-white">
          {L(lang, 'Escolha uma Organização', 'Pick an Organization', 'Choisir une organisation', 'Elige una organización')}
        </h2>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <FeaturedCard card={cardOf('ufc')} />

        <ul aria-label={L(lang, 'Organizações principais', 'Main organizations', 'Organisations principales', 'Organizaciones principales')} className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {MAIN.map((id) => (
            <li key={id} className="min-w-0">
              <MainCard card={cardOf(id)} />
            </li>
          ))}
        </ul>

        <div>
          <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-[var(--text-primary)] dark:text-white">
            {L(lang, 'Outras ligas', 'More leagues', 'Autres ligues', 'Otras ligas')}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] dark:text-neutral-400">
            {L(lang, 'Eventos, resultados e lutadores de cada liga.', 'Events, results and fighters of each league.', 'Événements, résultats et combattants de chaque ligue.', 'Eventos, resultados y peleadores de cada liga.')}
          </p>
          <ul className="mt-3 grid rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 shadow-[var(--card-shadow)] dark:border-white/10 dark:bg-[#0c0f17]/90 sm:px-3 md:grid-flow-col md:grid-cols-2 md:grid-rows-4 md:gap-x-6">
            {COMPACT.map((id) => (
              <CompactRow key={id} card={cardOf(id)} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
