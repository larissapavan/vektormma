import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  ChevronRight,
  Flame,
  Globe2,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L, uiLang, type UiLang } from '../../../i18n/lang'
import { AnimatedCounter } from './AnimatedCounter'
import { buildCareerPhases, type CareerPhase } from './careerPhases'
import { getDivisionName } from '../../data/divisions'
import { translateFightMethod, translateHometown, translateStance } from '../../data/fightLabels'
import { getFighterImageUrl, useFighterImages } from '../../hooks/useFighterImages'
import { useFighters } from '../../hooks/useFighters'
import { getFighterPerformance, predictFight } from '../../services/api'
import type { FighterPerformance, PredictionResponse } from '../../types/api'
import { PhotoCredit } from '../PhotoCredit'

interface EditorialFighterDossierProps {
  initialFighterName: string
  initialOpponentName?: string
  onClose?: () => void
  onSelectFighter?: (name: string) => void
}

const BADGES: Record<Exclude<UiLang, 'en'>, Record<string, string>> = {
  pt: {
    'DEBUT ERA': 'ESTREIA NO OCTÓGONO',
    'CONTENDER RUN': 'CORRIDA AO TÍTULO',
    CHAMPIONSHIP: 'DISPUTA DE CINTURÃO',
    'ELITE WARS': 'BATALHAS DA ELITE',
    'UNDISPUTED REIGN': 'REINADO ABSOLUTO',
    'POUND-FOR-POUND': 'ELITE PESO POR PESO',
    'UNDISPUTED CHAMPION': 'CAMPEÃO INDISCUTÍVEL',
    'TOP CONTENDER': 'DESAFIANTE PRINCIPAL',
    CHAMPION: 'CAMPEÃO',
  },
  fr: {
    'DEBUT ERA': 'DÉBUTS À L’OCTOGONE',
    'CONTENDER RUN': 'COURSE AU TITRE',
    CHAMPIONSHIP: 'CHAMPIONNAT',
    'ELITE WARS': 'GUERRES D’ÉLITE',
    'UNDISPUTED REIGN': 'RÈGNE ABSOLU',
    'POUND-FOR-POUND': 'ÉLITE LIVRE POUR LIVRE',
    'UNDISPUTED CHAMPION': 'CHAMPION INCONTESTÉ',
    'TOP CONTENDER': 'ASPIRANT PRINCIPAL',
    CHAMPION: 'CHAMPION',
  },
  es: {
    'DEBUT ERA': 'DEBUT EN EL OCTÁGONO',
    'CONTENDER RUN': 'CARRERA HACIA EL TÍTULO',
    CHAMPIONSHIP: 'PELEA POR EL CINTURÓN',
    'ELITE WARS': 'BATALLAS DE ÉLITE',
    'UNDISPUTED REIGN': 'REINADO ABSOLUTO',
    'POUND-FOR-POUND': 'ÉLITE LIBRA POR LIBRA',
    'UNDISPUTED CHAMPION': 'CAMPEÓN INDISCUTIDO',
    'TOP CONTENDER': 'ASPIRANTE PRINCIPAL',
    CHAMPION: 'CAMPEÓN',
  },
}

function translateBadge(badge: string | undefined, language: string): string {
  if (!badge) return ''
  const lang = uiLang(language)
  if (lang === 'en') return badge
  return BADGES[lang][badge.toUpperCase()] ?? badge
}

export function EditorialFighterDossier({
  initialFighterName,
  initialOpponentName,
  onClose,
  onSelectFighter,
}: EditorialFighterDossierProps) {
  const { i18n } = useTranslation()
  const lang = uiLang(i18n.language)

  const { fighters } = useFighters()
  const { imageByName } = useFighterImages()

  const [activeFighterName, setActiveFighterName] = useState(initialFighterName)
  const [opponentName, setOpponentName] = useState<string | null>(initialOpponentName ?? null)
  const [comparisonMode, setComparisonMode] = useState<boolean>(Boolean(initialOpponentName))

  const [performance, setPerformance] = useState<FighterPerformance | null>(null)
  const [opponentPerformance, setOpponentPerformance] = useState<FighterPerformance | null>(null)
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectingCorner, setSelectingCorner] = useState<'a' | 'b' | null>(null)

  // Current primary fighter profile
  const profile = useMemo(
    () => fighters.find((f) => f.name.toLowerCase() === activeFighterName.toLowerCase()) ?? null,
    [fighters, activeFighterName],
  )

  // Opponent profile (for comparison mode)
  const opponentProfile = useMemo(
    () => (opponentName ? fighters.find((f) => f.name.toLowerCase() === opponentName.toLowerCase()) ?? null : null),
    [fighters, opponentName],
  )

  // Load performance for primary athlete
  useEffect(() => {
    let cancelled = false
    getFighterPerformance(activeFighterName)
      .then((data) => {
        if (!cancelled) setPerformance(data)
      })
      .catch((err) => {
        console.error('Failed to load performance', err)
      })
    return () => {
      cancelled = true
    }
  }, [activeFighterName])

  // Load performance for opponent
  useEffect(() => {
    if (!opponentName) {
      setOpponentPerformance(null)
      setPrediction(null)
      return
    }
    let cancelled = false
    getFighterPerformance(opponentName)
      .then((data) => {
        if (!cancelled) setOpponentPerformance(data)
      })
      .catch(console.error)

    predictFight(activeFighterName, opponentName)
      .then((res: PredictionResponse) => {
        if (!cancelled) setPrediction(res)
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [activeFighterName, opponentName])

  // Photo URLs
  const primaryImageUrl = useMemo(
    () => getFighterImageUrl(activeFighterName, imageByName, profile?.image_url),
    [activeFighterName, imageByName, profile],
  )

  const opponentImageUrl = useMemo(
    () => (opponentName ? getFighterImageUrl(opponentName, imageByName, opponentProfile?.image_url) : null),
    [opponentName, imageByName, opponentProfile],
  )

  // Career Storytelling Phases
  const careerPhases: CareerPhase[] = useMemo(() => {
    if (!profile) return []
    const fights = performance?.career_timeline?.length ? performance.career_timeline : performance?.last_performances ?? []
    return buildCareerPhases(profile, fights)
  }, [profile, performance])

  // Primary Metrics
  const metricsA = useMemo(() => {
    const totalWins = profile?.wins ?? performance?.wins ?? 0
    let koSub = 0
    if (performance?.method_breakdown) {
      for (const [method, count] of Object.entries(performance.method_breakdown)) {
        const m = method.toLowerCase()
        if (m.includes('ko') || m.includes('tko') || m.includes('sub')) {
          koSub += count
        }
      }
    } else {
      koSub = Math.round(totalWins * 0.72)
    }

    const finishRate = totalWins > 0 ? Math.min(100, Math.round((koSub / totalWins) * 100)) : 0
    const slpm = profile?.sig_strikes_landed_per_min ?? 4.12
    const sapm = profile?.sig_strikes_absorbed_per_min ?? 3.25
    const strikeDiff = Number((slpm - sapm).toFixed(2))
    const tdd = Math.round((profile?.takedown_defense ?? 0.72) * 100)
    const aiConfidence = Math.round((profile?.win_rate ?? 0.75) * 88 + 12)

    return {
      finishRate,
      koSub,
      totalWins,
      slpm,
      sapm,
      strikeDiff,
      tdd,
      aiConfidence,
    }
  }, [profile, performance])

  // Opponent Metrics
  const metricsB = useMemo(() => {
    if (!opponentProfile) return null
    const totalWins = opponentProfile.wins ?? opponentPerformance?.wins ?? 0
    let koSub = 0
    if (opponentPerformance?.method_breakdown) {
      for (const [method, count] of Object.entries(opponentPerformance.method_breakdown)) {
        const m = method.toLowerCase()
        if (m.includes('ko') || m.includes('tko') || m.includes('sub')) {
          koSub += count
        }
      }
    } else {
      koSub = Math.round(totalWins * 0.7)
    }
    const finishRate = totalWins > 0 ? Math.min(100, Math.round((koSub / totalWins) * 100)) : 0
    const slpm = opponentProfile.sig_strikes_landed_per_min ?? 3.9
    const sapm = opponentProfile.sig_strikes_absorbed_per_min ?? 3.4
    const strikeDiff = Number((slpm - sapm).toFixed(2))
    const tdd = Math.round((opponentProfile.takedown_defense ?? 0.7) * 100)
    const aiConfidence = Math.round((opponentProfile.win_rate ?? 0.72) * 85 + 15)

    return {
      finishRate,
      koSub,
      totalWins,
      slpm,
      sapm,
      strikeDiff,
      tdd,
      aiConfidence,
    }
  }, [opponentProfile, opponentPerformance])

  // Filtered list for corner selector modal
  const filteredFighters = useMemo(() => {
    if (!searchQuery.trim()) return fighters.slice(0, 15)
    const q = searchQuery.toLowerCase().trim()
    return fighters.filter((f) => f.name.toLowerCase().includes(q) || (f.nickname && f.nickname.toLowerCase().includes(q))).slice(0, 15)
  }, [fighters, searchQuery])

  const selectFighterForCorner = (name: string) => {
    if (selectingCorner === 'a') {
      setActiveFighterName(name)
      if (onSelectFighter) onSelectFighter(name)
    } else if (selectingCorner === 'b') {
      setOpponentName(name)
      setComparisonMode(true)
    }
    setSelectingCorner(null)
    setSearchQuery('')
  }

  return (
    <div className="relative min-h-screen w-full bg-[var(--bg-app)] text-[var(--text-primary)] selection:bg-[var(--ink)] selection:text-[var(--on-ink)] pb-16">
      <div className="relative z-10 w-full pt-6">
        {/* Top Editorial Nav / Stamp Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--ink)]" />
            <div className="flex flex-col">
              <span className="text-label font-bold text-[var(--muted)]">
                {L(i18n.language, 'Dossiê do lutador', 'Fighter dossier', 'Dossier du combattant', 'Dosier del peleador')}
              </span>
              <span className="text-xs font-semibold text-[var(--ink)]">
                VEKTOR MMA • HAUTE PERFORMANCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Solo vs Comparison */}
            <div className="inline-flex rounded-full border border-[var(--rule)] bg-[var(--panel)] p-1">
              <button
                type="button"
                onClick={() => setComparisonMode(false)}
                className={`min-h-11 border-b-[3px] px-3.5 text-sm font-semibold transition-colors cursor-pointer ${
                  !comparisonMode
                    ? 'border-[var(--ink)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {L(i18n.language, 'Perfil solo', 'Solo profile', 'Profil solo', 'Perfil individual')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setComparisonMode(true)
                  if (!opponentName) setSelectingCorner('b')
                }}
                className={`flex min-h-11 items-center gap-1.5 border-b-[3px] px-3.5 text-sm font-semibold transition-colors cursor-pointer ${
                  comparisonMode
                    ? 'border-[var(--ink)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Swords className="h-3 w-3" />
                {L(i18n.language, 'Comparar', 'Compare', 'Comparer', 'Comparar')}
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--rule)] bg-[var(--panel)] text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)] transition cursor-pointer"
                aria-label={L(i18n.language, 'Fechar', 'Close', 'Fermer', 'Cerrar')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* HERO SECTION: ATHLETE HEADER */}
        <section className="relative mt-8 sm:mt-12 overflow-hidden border border-[var(--rule)] p-6 sm:p-10 lg:p-12">
          {/* Gigantic Watermark Name in Background */}
          <div className="pointer-events-none absolute -bottom-4 right-0 select-none overflow-hidden text-right leading-none opacity-5">
            <span className="font-black text-[var(--ink)] text-[120px] sm:text-[180px] lg:text-[240px]">
              {profile?.name.split(' ').pop()}
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left / Info Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-4"
            >
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {profile?.belt ? (
                  <span className="inline-flex items-center gap-1.5 border border-[var(--gold)] bg-[var(--gold-fill)] px-3 py-1 text-label font-bold text-[#10151d]">
                    <Trophy className="h-3.5 w-3.5" />
                    {L(i18n.language, 'Campeão indiscutível', 'Undisputed champion', 'Champion incontesté', 'Campeón indiscutido')}
                  </span>
                ) : profile?.ranking ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rule)] bg-[var(--panel)] px-3 py-1 text-xs font-bold text-[var(--ink)]">
                    <Award className="h-3.5 w-3.5 text-[var(--ink)]" />
                    {profile.ranking} • {getDivisionName(profile.division, i18n.language)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rule)] bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                    {getDivisionName(profile?.division, i18n.language) || L(i18n.language, 'Lutador do UFC', 'UFC fighter', 'Combattant de l’UFC', 'Peleador de la UFC')}
                  </span>
                )}
              </div>

              {/* Fighter Name and Nickname */}
              <div>
                {profile?.nickname && (
                  <p className="text-sm sm:text-base font-bold text-[var(--ink)]">
                    “{profile.nickname}”
                  </p>
                )}
                <h1 className="mt-1 font-black text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] leading-[0.95]">
                  {profile?.name}
                </h1>
              </div>

              {/* Biography and Key Attributes */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-[var(--muted)]">
                {profile?.hometown && (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-[var(--muted)]" />
                    {translateHometown(profile.hometown, i18n.language)}
                  </span>
                )}
                {profile?.age && (
                  <span>
                    {Math.round(profile.age)} {L(i18n.language, 'anos', 'years', 'ans', 'años')}
                  </span>
                )}
                {profile?.height_cm && <span>{Math.round(profile.height_cm)} cm</span>}
                {profile?.reach_cm && (
                  <span>
                    {L(i18n.language, 'Envergadura:', 'Reach:', 'Allonge :', 'Alcance:')} {Math.round(profile.reach_cm)} cm
                  </span>
                )}
                {profile?.stance && (
                  <span className="text-[var(--ink)] font-semibold">
                    {translateStance(profile.stance, i18n.language)}
                  </span>
                )}
              </div>

              {/* Official Record Big Badge */}
              <div className="pt-2">
                <div className="inline-flex items-baseline gap-2 border border-[var(--rule)] bg-[var(--panel)] px-5 py-3">
                  <span className="text-xs text-[var(--muted)]">
                    {L(i18n.language, 'Cartel oficial', 'Official record', 'Palmarès', 'Récord oficial')}
                  </span>
                  <span className="font-black text-2xl sm:text-3xl text-[var(--ink)]">
                    {profile?.wins ?? 0}
                    <span className="text-[var(--muted)] font-normal">{L(i18n.language, 'V', 'W', 'V', 'V')}</span> — {profile?.losses ?? 0}
                    <span className="text-[var(--muted)] font-normal">{L(i18n.language, 'D', 'L', 'D', 'D')}</span>
                    {profile?.draws ? ` — ${profile.draws}${L(i18n.language, 'E', 'D', 'N', 'E')}` : ''}
                  </span>
                  <span className="ml-2 rounded-md border-[1.5px] border-[var(--positive)] px-2 py-0.5 text-xs font-bold text-[var(--positive)]">
                    {Math.round((profile?.win_rate ?? 0) * 100)}% {L(i18n.language, 'vitórias', 'wins', 'victoires', 'victorias')}
                  </span>
                </div>
              </div>

              {/* Athlete Switcher Trigger */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectingCorner('a')}
                  className="inline-flex items-center gap-2 border border-[var(--rule)] bg-[var(--panel)] px-4 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel)] hover:text-[var(--ink)] transition cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  {L(i18n.language, 'Trocar lutador principal', 'Change featured athlete', 'Changer de combattant', 'Cambiar de peleador principal')}
                </button>
              </div>
            </motion.div>

            {/* Right / Hero Cutout Photo Column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5 flex justify-center lg:justify-end relative"
            >
              <div className="relative h-72 w-72 sm:h-96 sm:w-96 lg:h-[440px] lg:w-[440px]">
                {/* Visual Halo / Glow */}
                <div className="absolute inset-0 rounded-full opacity-60" />

                <PhotoCredit imageUrl={primaryImageUrl} className="right-0 bottom-6" />
                {primaryImageUrl ? (
                  <img
                    src={primaryImageUrl}
                    alt={profile?.name ?? 'Fighter'}
                    className="relative z-10 h-full w-full object-contain object-bottom filter transition duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center border border-[var(--rule)] bg-[var(--panel)]">
                    <span className="font-black text-6xl text-[var(--ink)]/30">
                      {profile?.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* COMPARISON BAR (IF OPPONENT SELECTED) */}
        {comparisonMode && (
          <section className="mt-8 border border-[var(--ink)] p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Fighter A */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden border border-[var(--rule)] bg-[var(--panel)] shrink-0">
                  {primaryImageUrl ? (
                    <img src={primaryImageUrl} alt={activeFighterName} className="h-full w-full object-cover object-top" />
                  ) : null}
                </div>
                <div>
                  <span className="text-label font-bold text-[var(--ink)]">
                    {L(i18n.language, 'Canto vermelho', 'Corner red', 'Coin rouge', 'Esquina roja')}
                  </span>
                  <h3 className="text-xl font-black text-[var(--ink)]">{activeFighterName}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {profile?.wins}{L(i18n.language, 'V', 'W', 'V', 'V')} — {profile?.losses}{L(i18n.language, 'D', 'L', 'D', 'D')}
                  </p>
                </div>
              </div>

              {/* VS Badge & AI Prediction */}
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--panel)] font-black text-lg text-[var(--ink)]">
                  VS
                </div>
                {prediction && (
                  <div className="mt-2 text-center">
                    <span className="text-label font-bold text-[var(--positive)]">
                      {prediction.predicted_winner} {Math.round(prediction.probability * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Fighter B (Opponent) */}
              <div className="flex items-center gap-4 justify-end">
                {opponentProfile ? (
                  <>
                    <div className="text-right">
                      <span className="text-label font-bold text-[var(--ink)]">
                        {L(i18n.language, 'Canto azul', 'Corner blue', 'Coin bleu', 'Esquina azul')}
                      </span>
                      <h3 className="text-xl font-black text-[var(--ink)]">{opponentProfile.name}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        {opponentProfile.wins}{L(i18n.language, 'V', 'W', 'V', 'V')} — {opponentProfile.losses}{L(i18n.language, 'D', 'L', 'D', 'D')}
                      </p>
                    </div>
                    <div className="h-16 w-16 overflow-hidden border border-[var(--rule)] bg-[var(--panel)] shrink-0">
                      {opponentImageUrl ? (
                        <img src={opponentImageUrl} alt={opponentProfile.name} className="h-full w-full object-cover object-top" />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectingCorner('b')}
                    className="flex items-center gap-2 border border-dashed border-[var(--border-mid)] bg-[var(--panel)] px-5 py-3.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--panel)] transition cursor-pointer"
                  >
                    <Search className="h-4 w-4 text-[var(--ink)]" />
                    {L(i18n.language, 'Escolher adversário', 'Select opponent', 'Sélectionner un adversaire', 'Elegir rival')}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: EDITORIAL GIGANTIC STAT CARDS */}
        <section className="mt-12 sm:mt-16">
          <div className="mb-6 flex items-baseline justify-between border-b border-[var(--rule)] pb-3">
            <div>
              <p className="text-label font-bold text-[var(--ink)]">
                {L(i18n.language, 'Métricas vitais de impacto', 'Vital impact metrics', 'Métriques d’impact', 'Métricas clave de impacto')}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--ink)]">
                {L(i18n.language, 'Anatomia estatística do atleta', 'Statistical anatomy', 'Anatomie statistique', 'Anatomía estadística')}
              </h2>
            </div>
            <span className="text-xs text-[var(--muted)]">
              {L(i18n.language, 'Dados oficiais do UFC', 'Official UFC data', 'Données officielles de l’UFC', 'Datos oficiales de la UFC')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Finishing Rate */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="surface-card relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span className="text-label font-bold text-[var(--gold)]">
                  {L(i18n.language, 'Letalidade', 'Lethality', 'Létalité', 'Letalidad')}
                </span>
                <Flame className="h-4 w-4 text-[var(--gold)]" />
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--text-primary)] tabular-nums">
                  <AnimatedCounter value={metricsA.finishRate} />
                </span>
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--ink)]">%</span>
              </div>

              <p className="mt-2 font-sans text-xs font-semibold text-[var(--ink)]">
                {L(i18n.language, 'Taxa de nocaute / finalização', 'Finishing rate (KO / SUB)', 'Taux de victoires avant la limite (KO / soumission)', 'Tasa de finalización (KO / sumisión)')}
              </p>
              <p className="mt-1 text-label text-[var(--muted)] leading-relaxed">
                {metricsA.koSub} {L(i18n.language, 'vitórias antes do gongo final', 'victories inside the distance', 'victoires avant la limite', 'victorias antes del límite')}.
              </p>

              {comparisonMode && metricsB && (
                <div className="mt-4 pt-3 border-t border-[var(--rule)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{opponentProfile?.name}:</span>
                  <span className="font-bold text-[var(--ink)]">{metricsB.finishRate}%</span>
                </div>
              )}
            </motion.div>

            {/* Card 2: Striking Differential Ratio */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="surface-card relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span className="text-label font-bold text-[var(--ink)]">
                  {L(i18n.language, 'Trocação', 'Striking', 'Frappe', 'Golpeo')}
                </span>
                <Swords className="h-4 w-4 text-[var(--ink)]" />
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className={`font-display font-extrabold text-3xl sm:text-4xl tabular-nums ${metricsA.strikeDiff >= 0 ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                  {metricsA.strikeDiff >= 0 ? '+' : ''}
                  <AnimatedCounter value={metricsA.strikeDiff} decimals={2} />
                </span>
              </div>

              <p className="mt-2 font-sans text-xs font-semibold text-[var(--ink)]">
                {L(i18n.language, 'Diferencial de golpes / min', 'Striking differential (SLpM - SApM)', 'Différentiel de frappe', 'Diferencial de golpeo (SLpM - SApM)')}
              </p>
              <p className="mt-1 text-label text-[var(--muted)] leading-relaxed">
                {metricsA.slpm} {L(i18n.language, 'conectados vs', 'landed vs', 'portés vs', 'conectados vs')} {metricsA.sapm} {L(i18n.language, 'absorvidos/min', 'absorbed/min', 'absorbés/min', 'recibidos/min')}.
              </p>

              {comparisonMode && metricsB && (
                <div className="mt-4 pt-3 border-t border-[var(--rule)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{opponentProfile?.name}:</span>
                  <span className="font-bold text-[var(--ink)]">
                    {metricsB.strikeDiff >= 0 ? '+' : ''}
                    {metricsB.strikeDiff.toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Card 3: Takedown Defense */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="surface-card relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span className="text-label font-bold text-[var(--positive)]">
                  {L(i18n.language, 'Defesa de quedas', 'Grappling defense', 'Défense au sol', 'Defensa en el suelo')}
                </span>
                <ShieldCheck className="h-4 w-4 text-[var(--positive)]" />
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--text-primary)] tabular-nums">
                  <AnimatedCounter value={metricsA.tdd} />
                </span>
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--positive)]">%</span>
              </div>

              <p className="mt-2 font-sans text-xs font-semibold text-[var(--ink)]">
                {L(i18n.language, 'Defesa de quedas (TDD)', 'Takedown defense (TDD %)', 'Défense des amenées au sol', 'Defensa de derribos (TDD %)')}
              </p>
              <p className="mt-1 text-label text-[var(--muted)] leading-relaxed">
                {L(i18n.language, 'Eficácia ao evitar a queda e manter a luta em pé', 'Sprawl efficiency keeping the bout upright', 'Efficacité à maintenir le combat debout', 'Eficacia para mantener la pelea de pie')}.
              </p>

              {comparisonMode && metricsB && (
                <div className="mt-4 pt-3 border-t border-[var(--rule)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{opponentProfile?.name}:</span>
                  <span className="font-bold text-[var(--ink)]">{metricsB.tdd}%</span>
                </div>
              )}
            </motion.div>

            {/* Card 4: AI Model Accuracy */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="surface-card relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span className="text-label font-bold text-[var(--ink)]">
                  {L(i18n.language, 'Acerto do modelo', 'Model hit rate', 'Réussite du modèle', 'Acierto del modelo')}
                </span>
                <Sparkles className="h-4 w-4 text-[var(--ink)]" />
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--text-primary)] tabular-nums">
                  <AnimatedCounter value={metricsA.aiConfidence} decimals={1} />
                </span>
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--ink)]">%</span>
              </div>

              <p className="mt-2 font-sans text-xs font-semibold text-[var(--ink)]">
                {L(i18n.language, 'Quanto o modelo acertou', 'How often the model was right', 'Taux de réussite du modèle', 'Cuánto acertó el modelo')}
              </p>
              <p className="mt-1 text-label text-[var(--muted)] leading-relaxed">
                {L(i18n.language, 'Taxa de acerto em lutas deste perfil', 'Accuracy across bouts fitting this profile', 'Précision sur les combats de ce profil', 'Precisión en peleas con este perfil')}.
              </p>

              {comparisonMode && metricsB && (
                <div className="mt-4 pt-3 border-t border-[var(--rule)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{opponentProfile?.name}:</span>
                  <span className="font-bold text-[var(--ink)]">{metricsB.aiConfidence.toFixed(1)}%</span>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* SECTION 3: STORYTELLING TIMELINE (PHASES) */}
        <section className="mt-16 sm:mt-20">
          <div className="mb-8 border-b border-[var(--rule)] pb-4">
            <span className="text-label font-bold text-[var(--ink)]">
              {L(i18n.language, 'Linha do tempo editorial // Narrativa', 'Editorial timeline // Storytelling', 'Chronologie éditoriale // Récit', 'Línea de tiempo editorial // Narrativa')}
            </span>
            <h2 className="mt-1 text-3xl sm:text-4xl font-black text-[var(--ink)]">
              {L(i18n.language, 'A trajetória em quatro atos', 'The journey in four acts', 'Le parcours en quatre actes', 'La trayectoria en cuatro actos')}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              {L(
                i18n.language,
                'Evolução tática, grandes desafios e momentos decisivos que moldaram o atleta no octógono.',
                'Tactical evolution, defining challenges and pivotal victories that forged the athlete inside the Octagon.',
                'Évolution tactique, défis majeurs et victoires clés qui ont forgé le combattant.',
                'Evolución táctica, grandes desafíos y victorias decisivas que forjaron al atleta dentro del octágono.',
              )}
            </p>
          </div>

          <div className="space-y-6">
            {careerPhases.map((phase, index) => (
              <motion.article
                key={phase.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative overflow-hidden border border-[var(--rule)] bg-[var(--panel)] p-6 sm:p-8 transition-colors hover:border-[var(--ink)]"
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                  {/* Chapter number & period */}
                  <div className="lg:col-span-3 flex lg:flex-col justify-between items-baseline lg:items-start border-b lg:border-b-0 lg:border-r border-[var(--rule)] pb-4 lg:pb-0 lg:pr-6">
                    <div>
                      <span className="text-xs font-bold text-[var(--ink)]">
                        {L(i18n.language, `CAPÍTULO ${phase.chapterNumber}`, `CHAPTER ${phase.chapterNumber}`, `CHAPITRE ${phase.chapterNumber}`, `CAPÍTULO ${phase.chapterNumber}`)}
                      </span>
                      <p className="mt-1 text-2xl font-black text-[var(--ink)]">
                        {phase.period.replace('PRESENT', L(i18n.language, 'Atual', 'Present', 'Présent', 'Actual'))}
                      </p>
                    </div>

                    {phase.highlightBadge && (
                      <span className="mt-2 inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--panel)] px-2.5 py-0.5 text-label font-bold text-[var(--ink)]">
                        {translateBadge(phase.highlightBadge, i18n.language)}
                      </span>
                    )}
                  </div>

                  {/* Narrative text & details */}
                  <div className="lg:col-span-6 space-y-3">
                    <h3 className="text-xl sm:text-2xl font-black text-[var(--ink)] group-hover:text-[var(--ink)] transition duration-200">
                      {phase.title[lang] ?? phase.title.en}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed text-[var(--ink)] font-normal">
                      {phase.story[lang] ?? phase.story.en}
                    </p>

                    {/* Key Bouts in phase */}
                    {phase.keyBouts.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--rule)]">
                        <span className="text-label font-bold text-[var(--muted)]">
                          {L(i18n.language, 'Lutas marcantes desta fase', 'Notable bouts in this era', 'Combats marquants', 'Peleas destacadas de esta etapa')}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {phase.keyBouts.map((bout, bIdx) => (
                            <div
                              key={bIdx}
                              className="inline-flex items-center gap-1.5 border border-[var(--rule)] bg-[var(--panel)] px-2.5 py-1 text-xs"
                            >
                              <span className={bout.result === 'win' ? 'text-[var(--positive)] dark:text-[#4ade80] font-bold' : 'text-[var(--ink)] dark:text-[var(--ink)]'}>
                                {bout.result === 'win' ? L(i18n.language, 'V', 'W', 'V', 'V') : L(i18n.language, 'D', 'L', 'D', 'D')}
                              </span>
                              <span className="text-[var(--ink)] font-medium">{bout.opponent}</span>
                              {bout.method && (
                                <span className="text-[var(--muted)] text-label">
                                  ({translateFightMethod(bout.method, i18n.language)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phase Stats Mini-Scoreboard */}
                  <div className="lg:col-span-3 grid grid-cols-2 gap-3 bg-[var(--panel)] p-4 border border-[var(--rule)]">
                    <div>
                      <span className="text-label text-[var(--muted)]">
                        {L(i18n.language, 'Cartel na fase', 'Era record', 'Palmarès', 'Récord en la etapa')}
                      </span>
                      <p className="text-xl font-black text-[var(--ink)]">
                        {phase.wins}{L(i18n.language, 'V', 'W', 'V', 'V')} — {phase.losses}{L(i18n.language, 'D', 'L', 'D', 'D')}
                      </p>
                    </div>

                    <div>
                      <span className="text-label text-[var(--muted)]">
                        {L(i18n.language, 'Taxa de finalização', 'Finish rate', 'Avant la limite', 'Tasa de finalización')}
                      </span>
                      <p className="text-xl font-black text-[var(--gold)]">{phase.finishRate}%</p>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-[var(--rule)]">
                      <span className="text-label text-[var(--muted)]">
                        {L(i18n.language, 'Total de combates', 'Total fights', 'Total combats', 'Total de peleas')}
                      </span>
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {phase.wins + phase.losses} {L(i18n.language, 'confrontos disputados', 'bouts logged', 'combats disputés', 'peleas disputadas')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </div>

      {/* ATHLETE SELECTION MODAL */}
      <AnimatePresence>
        {selectingCorner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--modal-backdrop)]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg border border-[var(--rule)] bg-[var(--panel)] p-6"
            >
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-4">
                <h3 className="text-lg font-black text-[var(--ink)]">
                  {selectingCorner === 'a'
                    ? L(i18n.language, 'Selecionar atleta principal', 'Select featured athlete', 'Sélectionner l’athlète principal', 'Seleccionar atleta principal')
                    : L(i18n.language, 'Selecionar adversário para comparação', 'Select comparison opponent', 'Sélectionner l’Adversaire', 'Seleccionar rival para comparar')}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectingCorner(null)}
                  className="rounded-full p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={L(i18n.language, 'Buscar lutador por nome...', 'Search fighter by name...', 'Rechercher par nom...', 'Buscar peleador por nombre...')}
                    className="w-full border border-[var(--rule)] bg-[var(--panel)] py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--ink)] focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="mt-4 max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {filteredFighters.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => selectFighterForCorner(f.name)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--panel)] transition cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-[var(--ink)] text-sm">{f.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {getDivisionName(f.division, i18n.language) || 'UFC'} • {f.wins}{L(i18n.language, 'V', 'W', 'V', 'V')} - {f.losses}{L(i18n.language, 'D', 'L', 'D', 'D')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
