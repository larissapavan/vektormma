import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Sparkles, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { ORGS, orgPath, type OrgId } from '../shared/data/orgs'
import { AnimatedCounter } from '../shared/components/editorial/AnimatedCounter'
import { SocialLinks } from '../shared/components/SocialLinks'
import { SiteLinks } from '../shared/components/SiteLinks'
import { MMAGlove } from '../shared/components/MMAGlove'
import { FeaturedMatchup } from '../shared/components/FeaturedMatchup'
import { useDataInfo } from '../shared/hooks/useDataInfo'
import { useModelInfo } from '../shared/hooks/useModelInfo'

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

/** 797 -> "790+", 8985 -> "8.9k+" (decimal mark follows the language). */
function approximately(count: number, lang: string): string {
  if (count >= 1000) return `${(Math.floor(count / 100) / 10).toLocaleString(lang)}k+`
  return `${Math.floor(count / 10) * 10}+`
}

// Shown until the API answers (or if it never does): the last figures checked by hand.
const FALLBACK_FIGHTS = 8985
const FALLBACK_FIGHTERS = 2796
const FALLBACK_FEATURES = 46

export function Landing() {
  const { i18n } = useTranslation()
  const { dataInfo } = useDataInfo()
  const { modelInfo } = useModelInfo()
  const fightsCount = dataInfo?.fights_count ?? FALLBACK_FIGHTS
  const fightersCount = dataInfo?.fighters_count ?? FALLBACK_FIGHTERS
  const featureCount = modelInfo?.feature_count ?? FALLBACK_FEATURES

  return (
    <div className="w-full bg-[var(--bg-app)] text-[var(--text-primary)] dark:bg-[#0B0C10] dark:text-white selection:bg-[#E11D48] selection:text-white relative scroll-smooth flex flex-col justify-between">
      {/* Cinematic Ambient Background Lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30 dark:opacity-100">
        <div className="absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[#E11D48]/[0.07] blur-[150px]" />
        <div className="absolute right-0 top-1/2 h-[380px] w-[500px] rounded-full bg-[#F59E0B]/[0.04] blur-[160px]" />
        <div className="absolute left-0 bottom-0 h-[380px] w-[500px] rounded-full bg-[#2563EB]/[0.04] blur-[160px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* =========================================================================
            1. HERO SECTION (Com Iluminação de Arena e Grelha Analítica - Espaçamento Compacto)
            ========================================================================= */}
        <section className="relative px-4 sm:px-8 lg:px-16 pt-2 sm:pt-3 lg:pt-4 pb-4 sm:pb-5 lg:pb-6 flex items-center overflow-hidden">
          {/* Refletores de Arena do Topo e Grelha Milimétrica Esportiva */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {/* Refletor Esquerdo: Tom Vermelho Volumétrico */}
            <div className="absolute -top-12 left-0 sm:left-10 w-72 sm:w-[420px] h-[400px] bg-gradient-to-br from-[#FF2E54]/20 via-[#FF2E54]/5 to-transparent blur-3xl transform -rotate-12 pointer-events-none" />
            {/* Refletor Direito: Tom Azul Cobalto Volumétrico */}
            <div className="absolute -top-12 right-0 sm:right-10 w-72 sm:w-[420px] h-[400px] bg-gradient-to-bl from-[#2563EB]/20 via-[#2563EB]/5 to-transparent blur-3xl transform rotate-12 pointer-events-none" />
            {/* Grade Milimétrica Esportiva de Alta Precisão */}
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.055]"
              style={{
                backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
          </div>

          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* Lado Esquerdo: Tipografia de Impacto & Conteúdo Editorial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 space-y-5 text-left"
            >
              {/* Título com VEKTOR MMA */}
              <h1 className="font-display font-black uppercase tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-6xl text-[var(--text-primary)] dark:text-white leading-[0.92] drop-shadow-sm">
                <span className="block">VEKTOR <span className="text-[#FF2E54]">MMA</span></span>
              </h1>

              {/* Subtítulo Editorial em Plus Jakarta Sans */}
              <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] dark:text-neutral-400 font-normal max-w-lg leading-relaxed">
                {L(
                  i18n.language,
                  'A ciência de dados aplicada ao combate. Previsões por aprendizado de máquina, cartéis históricos e telemetria analítica com a inteligência da Vektor MMA.',
                  'Data science applied to combat sports. Machine learning predictions, official records, and analytical telemetry with Vektor MMA intelligence.',
                  "La science des données appliquée au combat. Prévisions par apprentissage automatique, historiques et télémétrie analytique avec l'intelligence Vektor MMA.",
                  'La ciencia de datos aplicada al combate. Pronósticos con aprendizaje automático, récords históricos y telemetría analítica con la inteligencia de Vektor MMA.',
                )}
              </p>

              {/* Botões de Ação: Scroll Suave para a Grade e Sobre o Projeto */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/head-to-head"
                  className="group inline-flex items-center gap-3 rounded-full bg-[#FF2E54] text-white hover:bg-[#E11D48] px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all duration-300 shadow-md"
                >
                  <Swords className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {L(i18n.language, 'COMPARAR LUTADORES', 'COMPARE FIGHTERS', 'COMPARER LES COMBATTANTS', 'COMPARAR PELEADORES')}
                  </span>
                </Link>

                <a
                  href="#organizations-grid"
                  className="group inline-flex items-center gap-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[#0E0E0E] hover:text-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white dark:hover:text-black px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all duration-300 shadow-md cursor-pointer"
                >
                  <span>
                    {L(
                      i18n.language,
                      'EXPLORAR ORGANIZAÇÕES',
                      'EXPLORE ORGANIZATIONS',
                      'EXPLORER LES ORGANISATIONS',
                      'EXPLORAR ORGANIZACIONES',
                    )}
                  </span>
                  <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
                </a>

                <Link
                  to="/model"
                  className="group inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] hover:border-[#FF2E54]/40 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-all duration-300 shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#FF2E54] transition-transform duration-300 group-hover:scale-110" />
                  <span>
                    {L(
                      i18n.language,
                      'VER MODELO PREDITIVO',
                      'EXPLORE AI MODEL',
                      'VOIR LE MODÈLE PRÉDICTIF',
                      'VER EL MODELO PREDICTIVO',
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              <FeaturedMatchup />
            </motion.div>

            {/* Lado Direito: Cinturão de Campeonato Flutuante */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-6 relative flex flex-col items-center justify-center"
            >
              <div className="relative w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[360px] aspect-square flex items-center justify-center p-2">
                {/* Brilho radial ambiente sutil atrás do cinturão */}
                <div className="absolute inset-0 rounded-full bg-[#E11D48]/[0.1] blur-3xl pointer-events-none" />

                {/* Levitação suave via Framer Motion */}
                <motion.div
                  animate={{ y: [-8, 8, -8], rotate: [-0.4, 0.4, -0.4] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="relative z-10 w-full h-full flex items-center justify-center"
                >
                  <img
                    src="/vektor_mma_championship_belt.png"
                    alt={L(i18n.language, 'Cinturão de campeão da Vektor MMA', 'Vektor MMA championship belt', 'Ceinture de champion Vektor MMA', 'Cinturón de campeón de Vektor MMA')}
                    className="h-auto w-full object-contain filter drop-shadow-[0_20px_35px_rgba(225,29,72,0.25)] select-none pointer-events-none"
                  />
                </motion.div>

                {/* Sombra difusa dinâmica que responde à distância de flutuação */}
                <motion.div
                  animate={{
                    scale: [0.95, 1.15, 0.95],
                    opacity: [0.35, 0.55, 0.35],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute -bottom-2 h-6 w-48 rounded-full bg-gradient-to-r from-transparent via-[#E11D48]/40 to-transparent blur-xl pointer-events-none"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================================
            2. BARRA DE MÉTRICAS GLOBAIS (Editorial Big Numbers - Espaçamento Otimizado)
            ========================================================================= */}
        <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 dark:border-white/10 dark:bg-[#0c0e14]/90 backdrop-blur-md py-3.5 sm:py-4 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] dark:divide-white/10">
            {/* Métrica 1: Lutas */}
            <div className="pt-4 lg:pt-0 lg:px-6 first:pl-0 text-left">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] dark:text-white tracking-tight tabular-nums">
                  <AnimatedCounter value={fightsCount} />
                </span>
                <span className="text-[#E11D48] font-display font-extrabold text-2xl sm:text-3xl">+</span>
              </div>
              <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400 font-medium">
                {L(i18n.language, 'Lutas Catalogadas', 'Bouts Cataloged', 'Combats catalogués', 'Peleas catalogadas')}
              </p>
            </div>

            {/* Métrica 2: Atletas */}
            <div className="pt-4 lg:pt-0 lg:px-6 text-left">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] dark:text-white tracking-tight tabular-nums">
                  <AnimatedCounter value={fightersCount} />
                </span>
                <span className="text-[#2563EB] font-display font-extrabold text-2xl sm:text-3xl">+</span>
              </div>
              <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400 font-medium">
                {L(i18n.language, 'Atletas Monitorados', 'Athletes Profiled', 'Combattants répertoriés', 'Peleadores registrados')}
              </p>
            </div>

            {/* Métrica 3: Features ML */}
            <div className="pt-4 lg:pt-0 lg:px-6 text-left">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] dark:text-white tracking-tight tabular-nums">
                  <AnimatedCounter value={featureCount} />
                </span>
              </div>
              <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400 font-medium">
                {L(i18n.language, 'Variáveis Preditivas por Combate', 'ML Features Computed', 'Variables prédictives par combat', 'Variables predictivas por pelea')}
              </p>
            </div>

            {/* Métrica 4: Anos */}
            <div className="pt-4 lg:pt-0 lg:px-6 text-left">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] dark:text-white tracking-tight tabular-nums">
                  30
                </span>
                <span className="text-[#F59E0B] font-display font-extrabold text-2xl sm:text-3xl">+</span>
              </div>
              <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400 font-medium">
                {L(i18n.language, 'Anos de Histórico (1993–2026)', 'Years of History (1993–2026)', 'Années d’Histoire (1993–2026)', 'Años de historia (1993–2026)')}
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. GRID DE ORGANIZAÇÕES (Cards Limpos e sem Truncamento)
            ========================================================================= */}
        <section id="organizations-grid" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-6 sm:pt-8 pb-3 sm:pb-4 w-full">
          <div className="mb-4 sm:mb-5">
            <span className="font-mono text-xs uppercase tracking-widest text-[#E11D48] font-bold">
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
                  aria-label={`Open ${card.fullName}`}
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
        
        {/* =========================================================================
            4. FOOTER EDITORIAL (Sobre o Projeto & Links Rápidos - Compacto e Elegante)
            ========================================================================= */}
        <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/75 dark:border-white/10 dark:bg-[#0B0C10] py-2 sm:py-2.5 px-4 sm:px-8 lg:px-16 mt-2">
          <div className="max-w-7xl mx-auto space-y-1.5 sm:space-y-2">
            {/* Linha Superior: Marca à esquerda, Navegação e Redes à direita */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] dark:text-white tracking-tight">
                  Vektor MMA
                </span>
                <span className="text-[var(--text-muted)] dark:text-neutral-500">•</span>
                <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] dark:text-neutral-400">
                  {L(
                    i18n.language,
                    'Telemetria e previsões em esportes de combate',
                    'Combat sports analytics & AI predictions',
                    'Télémétrie et prévisions en sports de combat',
                    'Telemetría y pronósticos en deportes de combate',
                  )}
                </span>
              </div>

              {/* Links de navegação + Redes Sociais */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                <nav
                  aria-label={L(i18n.language, 'Links do rodapé', 'Footer links', 'Liens de bas de page', 'Enlaces del pie de página')}
                  className="flex items-center gap-3 sm:gap-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400"
                >
                  <Link to="/about" className="hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Sobre', 'About', 'À propos', 'Acerca de')}
                  </Link>
                  <Link to="/data" className="hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Dados', 'Data', 'Données', 'Datos')}
                  </Link>
                  <Link to="/model" className="hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Sistema de IA', 'ML System', 'Système d’IA', 'Sistema de IA')}
                  </Link>
                  <Link to="/track-record" className="hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Acurácia', 'Track Record', 'Historique', 'Historial')}
                  </Link>
                </nav>

                <div className="hidden sm:block h-3 w-px bg-[var(--border-subtle)] dark:bg-white/15" />

                <SocialLinks />
              </div>
            </div>

            {/* Linha Inferior: Disclaimer editorial sutil */}
            <div className="border-t border-[var(--border-subtle)]/50 dark:border-white/5 pt-1 sm:pt-1.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] text-[var(--text-muted)] dark:text-neutral-500 font-sans">
              <p>
                {L(
                  i18n.language,
                  'Projeto analítico independente. Não afiliado ao UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight ou Invicta FC.',
                  'Independent analytics project. Not affiliated with UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight, or Invicta FC.',
                  'Projet analytique indépendant. Non affilié à l’UFC, au PFL, au Bellator, au ONE Championship, à RIZIN, à KSW, à la LFA, à Cage Warriors, à OKTAGON, au Jungle Fight ou à Invicta FC.',
                  'Proyecto analítico independiente. No afiliado a la UFC, la PFL, Bellator, ONE Championship, RIZIN, KSW, la LFA, Cage Warriors, OKTAGON, Jungle Fight ni Invicta FC.',
                )}
              </p>
              <Link
                to="/about"
                className="hover:text-[var(--text-primary)] dark:hover:text-neutral-300 underline underline-offset-2 transition whitespace-nowrap"
              >
                {L(
                  i18n.language,
                  'Metodologia do projeto →',
                  'Project methodology →',
                  'Méthodologie du projet →',
                  'Metodología del proyecto →',
                )}
              </Link>
            </div>
            <SiteLinks className="mt-1.5 text-[11px] text-[var(--text-muted)] dark:text-neutral-400" />
          </div>
        </footer>
      </div>
    </div>
  )
}
