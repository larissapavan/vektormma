import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { MMAGlove } from '../../shared/components/MMAGlove'
import { ORGS, orgPath, type OrgId } from '../../shared/data/orgs'

type StatusKind = 'ai' | 'tournament' | 'archive' | 'results'

interface OrgCardInfo {
  id: OrgId
  index: string
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
  tournament: { pt: 'Liga & Torneio', en: 'Tournament', fr: 'Tournoi Actif', es: 'Torneo', pulse: false },
  archive: { pt: 'Arquivo Histórico', en: 'Historical Archive', fr: 'Archives', es: 'Archivo histórico', pulse: false },
  results: { pt: 'Eventos & Resultados', en: 'Events & Results', fr: 'Événements & Résultats', es: 'Eventos y resultados', pulse: false },
}

const ORG_CARDS: OrgCardInfo[] = [
  { id: 'ufc', index: '01', shortName: 'UFC', fullName: 'Ultimate Fighting Championship', accentColor: '#E11D48', glove: { src: '/mma-glove-ufc.webp', duration: '5.2s', delay: '0s' }, status: 'ai', counts: { events: 797, fighters: 2796, fights: 8985 } },
  { id: 'pfl', index: '02', shortName: 'PFL', fullName: 'Professional Fighters League', accentColor: '#2563EB', glove: { src: '/mma-glove-pfl.webp', duration: '4.6s', delay: '-1.4s' }, status: 'tournament', counts: { events: 141, fighters: 1054, fights: 1380 } },
  { id: 'one', index: '03', shortName: 'ONE', fullName: 'ONE Championship', accentColor: '#F59E0B', glove: { src: '/mma-glove-one.webp', duration: '5.8s', delay: '-2.7s' }, status: 'ai', counts: { events: 453, fighters: 3637, fights: 4817 } },
  { id: 'bellator', index: '04', shortName: 'BELLATOR', fullName: 'Bellator MMA', accentColor: '#10B981', glove: { src: '/mma-glove-bellator.webp', duration: '4.9s', delay: '-0.8s' }, status: 'archive', counts: { events: 311, fighters: 2283, fights: 3004 } },
  { id: 'rizin', index: '05', shortName: 'RIZIN', fullName: 'RIZIN Fighting Federation', accentColor: '#A855F7', glove: { src: '/mma-glove-rizin.webp', duration: '5.4s', delay: '-1.9s' }, status: 'results', counts: { events: 83, fighters: 464, fights: 609 } },
  { id: 'ksw', index: '06', shortName: 'KSW', fullName: 'Konfrontacja Sztuk Walki', accentColor: '#06B6D4', glove: { src: '/mma-glove-ksw.webp', duration: '5.0s', delay: '-3.1s' }, status: 'results', counts: { events: 125, fighters: 527, fights: 804 } },
  { id: 'lfa', index: '07', shortName: 'LFA', fullName: 'Legacy Fighting Alliance', accentColor: '#EC4899', glove: { src: '/mma-glove-lfa.webp', duration: '4.7s', delay: '-2.2s' }, status: 'results', counts: { events: 236, fighters: 1527, fights: 1429 } },
  { id: 'cage-warriors', index: '08', shortName: 'CAGE WARRIORS', fullName: 'Cage Warriors', accentColor: '#F97316', glove: { src: '/mma-glove-cage-warriors.webp', duration: '5.6s', delay: '-0.4s' }, status: 'results', counts: { events: 202, fighters: 978, fights: 1186 } },
  { id: 'oktagon', index: '09', shortName: 'OKTAGON', fullName: 'OKTAGON MMA', accentColor: '#84CC16', glove: { src: '/mma-glove-oktagon.webp', duration: '5.1s', delay: '-1.1s' }, status: 'results', counts: { events: 114, fighters: 846, fights: 1220 } },
  { id: 'jungle-fight', index: '10', shortName: 'JUNGLE FIGHT', fullName: 'Jungle Fight', accentColor: '#6366F1', glove: { src: '/mma-glove-jungle-fight.webp', duration: '5.5s', delay: '-2.5s' }, status: 'results', counts: { events: 158, fighters: 1813, fights: 1688 } },
  { id: 'invicta', index: '11', shortName: 'INVICTA FC', fullName: 'Invicta Fighting Championships', accentColor: '#14B8A6', glove: { src: '/mma-glove-invicta.webp', duration: '4.8s', delay: '-3.3s' }, status: 'results', counts: { events: 67, fighters: 409, fights: 534 } },
]

/** 797 -> "790+", 8985 -> "8.900+" (the grouping follows the language, like the exact figures in the strip above). */
function approximately(count: number, lang: string): string {
  const floor = count >= 1000 ? 100 : 10
  return `${new Intl.NumberFormat(localeTag(lang)).format(Math.floor(count / floor) * floor)}+`
}

export function OrganizationsSection() {
  const { i18n } = useTranslation()
  return (
  <section id="organizations-grid" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-6 sm:pt-8 pb-3 sm:pb-4 w-full">
    <div className="mb-4 sm:mb-5">
      <span className="font-mono text-xs uppercase tracking-widest text-[#BE123C] dark:text-[#FB7185] font-bold">
        {L(i18n.language, 'LIGAS & ORGANIZAÇÕES', 'LEAGUES & ORGANIZATIONS', 'LIGUES & ORGANISATIONS', 'LIGAS Y ORGANIZACIONES')}
      </span>
      <h2 className="mt-1 font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text-primary)] dark:text-white">
        {L(i18n.language, 'Escolha uma Organização', 'Pick an Organization', 'Choisir une Organisation', 'Elige una organización')}
      </h2>
    </div>

    {/* One card per organization: same surface, accent strip and three counts for all of them */}
    <div
      role="list"
      aria-label={L(i18n.language, 'Organizações', 'Organizations', 'Organisations', 'Organizaciones')}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
    >
      {ORG_CARDS.map((card) => {
        const orgConfig = ORGS[card.id]
        const status = STATUS_LABELS[card.status]
        const metrics = [
          { value: card.counts.events, label: L(i18n.language, 'Eventos', 'Events', 'Événements', 'Eventos') },
          { value: card.counts.fighters, label: L(i18n.language, 'Lutadores', 'Fighters', 'Combattants', 'Peleadores') },
          { value: card.counts.fights, label: L(i18n.language, 'Lutas', 'Bouts', 'Combats', 'Peleas') },
        ]
        return (
          <Link
            key={card.id}
            to={orgPath(orgConfig)}
            aria-label={`${L(i18n.language, 'Abrir', 'Open', 'Ouvrir', 'Abrir')} ${card.fullName}`}
            style={
              {
                '--accent-color': card.accentColor,
                '--glove-duration': card.glove.duration,
                '--glove-delay': card.glove.delay,
              } as React.CSSProperties
            }
            className="group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 pt-6 shadow-[var(--card-shadow)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-color)] hover:shadow-[var(--elevated-shadow)] dark:border-white/10 dark:bg-[#0c0f17]/90 dark:hover:border-[var(--accent-color)]"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: card.accentColor }} />

            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider text-[var(--text-muted)] dark:text-neutral-400">{card.index}</span>
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.pulse ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: card.accentColor }}
                />
                <span className="truncate">{L(i18n.language, status.pt, status.en, status.fr, status.es)}</span>
              </span>
            </div>

            <h3 className="mt-4 font-display text-xl font-extrabold uppercase leading-none tracking-tight text-[var(--text-primary)] dark:text-white sm:text-2xl">
              {card.shortName}
            </h3>
            <p className="mt-1 text-xs font-medium leading-snug text-[var(--text-secondary)] dark:text-neutral-400">{card.fullName}</p>

            {/* Decorative glove: floats, tinted in the organization's colour */}
            <div aria-hidden="true" className="flex min-h-28 flex-1 items-center justify-center">
              <div className="glove-lift">
                <div className="glove-float">
                  <MMAGlove src={card.glove.src} glow={card.accentColor} className="h-24 w-auto" />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 border-y border-[var(--border-subtle)] py-3 dark:border-white/10">
              {metrics.map((metric) => (
                <div key={metric.label} className="min-w-0">
                  <dd className="font-display text-base font-bold tabular-nums text-[var(--text-primary)] dark:text-white sm:text-lg">
                    {approximately(metric.value, i18n.language)}
                  </dd>
                  <dt className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wide text-[var(--text-secondary)] dark:text-neutral-400">{metric.label}</dt>
                </div>
              ))}
            </dl>

            <span className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] transition-colors duration-200 group-hover:border-[var(--accent-color)] dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:group-hover:border-[var(--accent-color)]">
              <span>{L(i18n.language, 'Entrar', 'Enter', 'Entrer', 'Entrar')}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </Link>
        )
      })}
    </div>
  </section>
  )
}
