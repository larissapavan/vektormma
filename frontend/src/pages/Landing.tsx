import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { AnimatedCounter } from '../shared/components/editorial/AnimatedCounter'
import { historyDecades, historyRange } from '../shared/data/history'
import { SocialLinks } from '../shared/components/SocialLinks'
import { SiteLinks } from '../shared/components/SiteLinks'
import { FeaturedMatchup } from '../shared/components/FeaturedMatchup'
import { useDataInfo } from '../shared/hooks/useDataInfo'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { OrganizationsSection } from './landing/OrganizationsSection'

// Shown until the API answers (or if it never does): the last figures checked by hand.
const FALLBACK_FIGHTS = 8985
const FALLBACK_FIGHTERS = 2796
const FALLBACK_FEATURES = 46
const HISTORY_RANGE = historyRange()

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
                  'Compare lutadores e veja a probabilidade de vitória de cada luta do UFC, com os fatores que mais pesam no resultado.',
                  'Compare fighters and see the win probability for every UFC fight, with the factors that weigh most on the result.',
                  "Comparez les combattants et découvrez la probabilité de victoire de chaque combat de l’UFC, avec les facteurs qui pèsent le plus dans le résultat.",
                  'Compara peleadores y mira la probabilidad de victoria de cada pelea de la UFC, con los factores que más pesan en el resultado.',
                )}
              </p>

              {/* Botões de Ação: Scroll Suave para a Grade e Sobre o Projeto */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/head-to-head"
                  className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-[#E11D48] text-white hover:bg-[#BE123C] px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all duration-300 shadow-md"
                >
                  <Swords className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {L(i18n.language, 'COMPARAR LUTADORES', 'COMPARE FIGHTERS', 'COMPARER LES COMBATTANTS', 'COMPARAR PELEADORES')}
                  </span>
                </Link>

                <a
                  href="#organizations-grid"
                  className="group inline-flex min-h-11 items-center gap-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[#0E0E0E] hover:text-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white dark:hover:text-black px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-all duration-300 shadow-md cursor-pointer"
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
                  <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" aria-hidden="true" />
                </a>

                {/* Third call: a text link, so the hero keeps one primary and one secondary button */}
                <Link
                  to="/model"
                  className="group inline-flex min-h-11 items-center gap-1.5 rounded-sm px-1 font-mono text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] underline decoration-[#FF2E54]/60 decoration-2 underline-offset-[6px] transition-colors duration-200 hover:text-[var(--text-primary)] hover:decoration-[#FF2E54] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF2E54] dark:text-neutral-300 dark:hover:text-white"
                >
                  <span>
                    {L(
                      i18n.language,
                      'VER MODELO PREDITIVO',
                      'EXPLORE AI MODEL',
                      'VOIR LE MODÈLE PRÉDICTIF',
                      'VER EL MODELO PREDICTIVO',
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
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
                    src="/vektor_mma_championship_belt.webp"
                    width={720}
                    height={537}
                    decoding="async"
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
                  {historyDecades()}
                </span>
                <span className="text-[#B45309] dark:text-[#F59E0B] font-display font-extrabold text-2xl sm:text-3xl">+</span>
              </div>
              <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400 font-medium">
                {L(i18n.language, `Anos de Histórico (${HISTORY_RANGE})`, `Years of History (${HISTORY_RANGE})`, `Années d’histoire (${HISTORY_RANGE})`, `Años de historia (${HISTORY_RANGE})`)}
              </p>
            </div>
          </div>
        </section>

        <OrganizationsSection />
        
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
                <span aria-hidden="true" className="text-[var(--text-muted)] dark:text-neutral-400">•</span>
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
                  className="flex items-center gap-3 sm:gap-4 font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-400"
                >
                  <Link to="/about" className="inline-flex min-h-6 items-center hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Sobre', 'About', 'À propos', 'Acerca de')}
                  </Link>
                  <Link to="/data" className="inline-flex min-h-6 items-center hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Dados', 'Data', 'Données', 'Datos')}
                  </Link>
                  <Link to="/model" className="inline-flex min-h-6 items-center hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Sistema de IA', 'ML System', 'Système d’IA', 'Sistema de IA')}
                  </Link>
                  <Link to="/track-record" className="inline-flex min-h-6 items-center hover:text-[var(--text-primary)] dark:hover:text-white transition">
                    {L(i18n.language, 'Desempenho', 'Track Record', 'Bilan', 'Historial')}
                  </Link>
                </nav>

                <div className="hidden sm:block h-3 w-px bg-[var(--border-subtle)] dark:bg-white/15" />

                <SocialLinks />
              </div>
            </div>

            {/* Linha Inferior: Disclaimer editorial sutil */}
            <div className="border-t border-[var(--border-subtle)]/50 dark:border-white/5 pt-1 sm:pt-1.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--text-muted)] dark:text-neutral-400 font-sans">
              <p>
                {L(
                  i18n.language,
                  'Projeto analítico independente. Não afiliado ao UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight ou Invicta FC.',
                  'Independent analytics project. Not affiliated with UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight, or Invicta FC.',
                  'Projet analytique indépendant. Non affilié à l’UFC, à la PFL, au Bellator, à ONE Championship, à RIZIN, à KSW, à la LFA, à Cage Warriors, à OKTAGON, au Jungle Fight ou à Invicta FC.',
                  'Proyecto analítico independiente. No afiliado a la UFC, la PFL, Bellator, ONE Championship, RIZIN, KSW, la LFA, Cage Warriors, OKTAGON, Jungle Fight ni Invicta FC.',
                )}
              </p>
              <Link
                to="/about"
                className="inline-flex min-h-6 items-center text-[var(--text-secondary)] dark:text-neutral-300 hover:text-[var(--text-primary)] dark:hover:text-white underline underline-offset-2 transition whitespace-nowrap"
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
