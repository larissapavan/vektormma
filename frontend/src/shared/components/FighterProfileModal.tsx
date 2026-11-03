import axios from 'axios'
import { motion } from 'framer-motion'
import { Sparkles, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { OtherOrganizationsPanel } from './OtherOrganizationsPanel'
import { getDivisionName } from '../data/divisions'
import { translateFightMethod, translateHometown, translateStance } from '../data/fightLabels'
import { athletePath } from '../../seo/athletes'
import { getFighterImageUrl, normalizeFighterName, useFighterImages } from '../hooks/useFighterImages'
import { useFighters } from '../hooks/useFighters'
import { useUpcomingPicks } from '../hooks/useUpcomingPicks'
import { getFighterPerformance } from '../services/api'
import type { FighterPerformance, FightRecord, UpcomingBout } from '../types/api'
import { PhotoCredit } from './PhotoCredit'
import { SeasonFightsPanel } from './SeasonFightsPanel'
import { SeasonTimeline, type TimelineEra } from './SeasonTimeline'

export function FighterProfileModal({
  name,
  onClose,
  onSelectFighter,
}: {
  name: string
  onClose: () => void
  onSelectFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  const { fighters: allFighters } = useFighters()
  const { imageByName: headerImages } = useFighterImages()
  const profile = useMemo(() => {
    if (!name) return null
    const norm = normalizeFighterName(name)
    return allFighters.find((f) => normalizeFighterName(f.name) === norm) ?? null
  }, [allFighters, name])

  // Detecção de Títulos e Campeonatos
  const isCurrentDivisionChamp = useMemo(() => {
    return Boolean(
      profile?.belt ||
      (profile?.current_titles && profile.current_titles.some((t) => !t.toUpperCase().includes('BMF')))
    )
  }, [profile])

  const championDivision = useMemo(() => {
    return profile?.division || profile?.current_titles?.find((t) => !t.toUpperCase().includes('BMF')) || 'Lightweight'
  }, [profile])

  const isCurrentBmf = useMemo(() => {
    return Boolean(
      profile?.badges?.includes('bmf_current') ||
      (profile?.current_titles && profile.current_titles.some((t) => t.toUpperCase().includes('BMF')))
    )
  }, [profile])

  const isFormerBmf = useMemo(() => {
    return Boolean(profile?.badges?.includes('bmf') && !isCurrentBmf)
  }, [profile, isCurrentBmf])

  // Categorias em que o atleta já foi campeão (exceto a que ele detém hoje)
  const formerDivisionTitles = useMemo(() => {
    const current = new Set((profile?.current_titles ?? []).map((t) => t.toLowerCase()))
    return (profile?.former_titles ?? []).filter((t) => !t.toUpperCase().includes('BMF') && !current.has(t.toLowerCase()))
  }, [profile])

  const formerInterimTitles = useMemo(() => {
    const held = new Set([...(profile?.current_titles ?? []), ...formerDivisionTitles].map((t) => t.toLowerCase()))
    return (profile?.interim_titles ?? []).filter((t) => !held.has(t.toLowerCase()))
  }, [profile, formerDivisionTitles])

  const [performance, setPerformance] = useState<FighterPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEra, setSelectedEra] = useState<TimelineEra | null>(null)

  const getUpcomingPick = useUpcomingPicks()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getFighterPerformance(name)
      .then((data) => {
        if (!cancelled) setPerformance(data)
      })
      .catch((err) => {
        console.error(err)
        if (cancelled) return
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        if (status === 404) {
          setError(L(i18n.language, 'Nenhum histórico encontrado para este lutador.', 'No performance history found.', 'Aucun historique trouvé.', 'No se encontró historial de este peleador.'))
        } else {
          setError(L(i18n.language, 'Falha ao carregar telemetria.', 'Failed to load telemetry.', 'Échec du chargement.', 'No se pudo cargar la telemetría.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [name, i18n.language])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEra((prev) => {
          if (prev) return null
          onClose()
          return null
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  // Assinatura discreta: BRASIL • PESO LEVE • #1 P4P
  const signatureLine = useMemo(() => {
    const parts: string[] = []

    // País / Origem
    if (profile?.country) {
      parts.push(translateHometown(profile.country, i18n.language).toUpperCase())
    } else if (profile?.nationalities && profile.nationalities.length > 0) {
      parts.push(translateHometown(profile.nationalities[0].name, i18n.language).toUpperCase())
    } else if (profile?.hometown) {
      const city = translateHometown(profile.hometown.split(',').pop()?.trim(), i18n.language).toUpperCase()
      if (city) parts.push(city)
    } else {
      parts.push('UFC')
    }

    // Categoria de Peso
    if (profile?.division) {
      parts.push(getDivisionName(profile.division, i18n.language).toUpperCase())
    } else {
      parts.push(L(i18n.language, 'PESO LIVRE', 'OPEN WEIGHT', 'POIDS LIBRE', 'PESO ABIERTO'))
    }

    // Ranking / P4P / Status
    if (profile?.ranking && profile.ranking.includes('#')) {
      parts.push(`${L(i18n.language, 'DESAFIANTE', 'CONTENDER', 'ASPIRANT', 'ASPIRANTE')} ${profile.ranking}`)
    }

    return parts.join(' • ')
  }, [profile, i18n.language])

  // Cartel Oficial do UFC e Cartel Completo Pro MMA (Todas as Organizações)
  const ufcRecord = performance?.ufc_record ?? {
    total: performance?.total_fights ?? profile?.total_fights ?? 0,
    wins: performance?.wins ?? profile?.wins ?? 0,
    losses: performance?.losses ?? profile?.losses ?? 0,
    draws: profile?.draws ?? 0,
    nc: 0,
    win_rate: performance?.total_fights ? Math.round(((performance?.wins ?? 0) / performance.total_fights) * 100) : 0,
  }

  const completeRecord = performance?.complete_record ?? ufcRecord
  const organizations = performance?.organizations ?? ['UFC']
  const wins = ufcRecord.wins

  // DNA de Finalização
  const dna = useMemo(() => {
    let subs = 0
    let kos = 0
    let decs = 0

    if (performance?.method_breakdown) {
      for (const [method, count] of Object.entries(performance.method_breakdown)) {
        const m = method.toLowerCase()
        if (m.includes('sub')) {
          subs += count
        } else if (m.includes('ko') || m.includes('tko')) {
          kos += count
        } else {
          decs += count
        }
      }
    } else if (wins > 0) {
      subs = Math.round(wins * 0.68)
      kos = Math.round(wins * 0.16)
      decs = Math.max(0, wins - subs - kos)
    }

    const totalMethods = subs + kos + decs || 1
    const subPct = Math.round((subs / totalMethods) * 100)
    const koPct = Math.round((kos / totalMethods) * 100)
    const decPct = Math.max(0, 100 - subPct - koPct)

    return { subs, kos, decs, subPct, koPct, decPct }
  }, [performance, wins])

  const finishRate = wins > 0 ? Math.round(((dna.subs + dna.kos) / wins) * 100) : 0

  // Próximo Combate & Prognóstico
  const nextBout: UpcomingBout | null = useMemo(() => {
    if (profile?.upcoming_fights && profile.upcoming_fights.length > 0) return profile.upcoming_fights[0]
    if (profile?.next_fight) return profile.next_fight
    if (performance?.upcoming_fights && performance.upcoming_fights.length > 0) return performance.upcoming_fights[0]
    if (performance?.next_fight) return performance.next_fight
    return null
  }, [profile, performance])

  const nextPrediction = useMemo(() => {
    if (!nextBout) return null
    const pick = getUpcomingPick(nextBout.event_name, name, nextBout.opponent)
    if (!pick) {
      return { fighterProb: 50, oppProb: 50 }
    }
    const isFighter1 = pick.fighter_1.toLowerCase() === name.toLowerCase()
    const fighterProb = Math.round((isFighter1 ? pick.fighter_1_probability : 1 - pick.fighter_1_probability) * 100)
    const oppProb = 100 - fighterProb
    return { fighterProb, oppProb }
  }, [nextBout, getUpcomingPick, name])

  // Régua Cronológica de Temporadas (Horizontal Timeline)
  const timelineEras = useMemo<TimelineEra[]>(() => {
    const fights = performance?.career_timeline ?? []
    if (fights.length === 0) return []

    const yearMap = new Map<number, FightRecord[]>()
    for (const fight of fights) {
      let yr = 0
      if (fight.date) {
        const parsed = parseInt(fight.date.slice(0, 4), 10)
        if (!isNaN(parsed) && parsed > 1990 && parsed < 2035) {
          yr = parsed
        }
      }
      if (yr === 0) {
        const match = fight.event_name.match(/20\d{2}/)
        yr = match ? parseInt(match[0], 10) : 2024
      }
      if (!yearMap.has(yr)) {
        yearMap.set(yr, [])
      }
      yearMap.get(yr)!.push(fight)
    }

    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b)
    if (sortedYears.length === 0) return []

    const debutYear = sortedYears[0]

    return sortedYears.map((year) => {
      const seasonFights = yearMap.get(year)!
      const seasonWins = seasonFights.filter((f) => f.result === 'win').length
      const seasonLosses = seasonFights.filter((f) => f.result === 'loss').length
      const hasTitleFight = seasonFights.some((f) => f.title_fight || f.bmf_title || f.interim_title)

      let milestone: string | undefined
      const isFirstUfcFight = seasonFights.some((f) => f.is_ufc !== false) && !fights.slice(0, fights.indexOf(seasonFights[0])).some((f) => f.is_ufc !== false)
      if (year === debutYear) {
        milestone = seasonFights.some((f) => f.is_ufc === false)
          ? L(i18n.language, 'Estreia Profissional', 'Pro Debut', 'Début Pro', 'Debut profesional')
          : L(i18n.language, 'Estreia no UFC', 'UFC Debut', 'Début UFC', 'Debut en la UFC')
      } else if (isFirstUfcFight) {
        milestone = L(i18n.language, 'Estreia no UFC', 'UFC Debut', 'Début UFC', 'Debut en la UFC')
      } else if (seasonFights.some((f) => f.result === 'win' && f.title_fight && !f.interim_title)) {
        milestone = L(i18n.language, 'Campeão Linear', 'Undisputed Champion', 'Champion incontesté', 'Campeón indiscutido')
      } else if (seasonFights.some((f) => f.result === 'win' && f.bmf_title)) {
        milestone = L(i18n.language, 'Cinturão BMF', 'BMF Champion', 'Ceinture BMF', 'Campeón BMF')
      } else if (seasonFights.some((f) => f.result === 'win' && f.interim_title)) {
        milestone = L(i18n.language, 'Campeão Interino', 'Interim Champion', 'Champion intérimaire', 'Campeón interino')
      } else if (year === 2018 && seasonWins >= 3) {
        milestone = L(i18n.language, 'Início da Série Histórica', 'Historic Streak Began', 'Début de série historique', 'Inicio de la racha histórica')
      } else if (seasonWins >= 3 && seasonLosses === 0) {
        milestone = L(i18n.language, 'Série Histórica', 'Historic Streak', 'Série historique', 'Racha histórica')
      }

      return {
        year,
        label: `${year}`,
        milestone,
        fights: seasonFights,
        wins: seasonWins,
        losses: seasonLosses,
        hasTitleFight,
      }
    })
  }, [performance, i18n.language])

  const imageUrl = getFighterImageUrl(name, headerImages, profile?.image_url)

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.section
        className="relative flex h-[min(90vh,880px)] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/[0.08] bg-[#08090C] text-white shadow-[0_0_80px_rgba(0,0,0,0.8)]"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Top Controls: Dossiê Pill + Close (✕) */}
        <div className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-30 flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate(athletePath(name))
            }}
            className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/20 px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-neutral-300 hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.03)] backdrop-blur-md transition-all cursor-pointer"
            title={L(i18n.language, 'Abrir Dossiê Completo', 'Open Full Dossier', 'Ouvrir le dossier', 'Abrir dosier completo')}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-transform group-hover:scale-110" />
            <span>{L(i18n.language, 'DOSSIÊ COMPLETO', 'FULL DOSSIER', 'DOSSIER COMPLET', 'DOSIER COMPLETO')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition cursor-pointer"
            aria-label={L(i18n.language, 'Fechar perfil de desempenho', "Close performance profile", 'Fermer le profil de performance', 'Cerrar perfil de rendimiento')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2 Zonas Fluidas: Superior (Esquerda + Direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid-rows-[minmax(0,1fr)]">
          {/* ZONA ESQUERDA - FOTOGRAFIA & IMPACTO (Visual Anchor, ~40% width) */}
          <div className="relative min-h-[220px] sm:min-h-[280px] lg:min-h-0 lg:h-full lg:col-span-5 overflow-hidden flex flex-col justify-end p-5 pb-2.5 sm:p-7 sm:pb-4 lg:p-9 select-none">
            {/* Foto recortada em alta qualidade com gradientes de fusão */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Brilho radial ambiente suave */}
              <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-600/[0.08] blur-3xl pointer-events-none" />

              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover object-top filter grayscale contrast-110 brightness-100 opacity-95 transition-all duration-700 select-none"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-black text-8xl text-white/[0.05]">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Transição suave em gradiente para o fundo #08090C */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/50 to-transparent" />
              <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-transparent via-[#08090C]/25 to-[#08090C]" />
            </div>

            <PhotoCredit imageUrl={imageUrl} className="left-2 top-4" />

            {/* Tipografia Display Monumental, Badges Oficiais e Assinatura */}
            <div className="relative z-10 space-y-2.5 pb-1">
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                  {L(i18n.language, 'ATLETA ATIVO // VEKTOR MMA', 'ACTIVE ATHLETE // VEKTOR MMA', 'ATHLÈTE ACTIF // VEKTOR MMA', 'ATLETA ACTIVO // VEKTOR MMA')}
                </span>
              </div>

              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[2.6rem] uppercase tracking-tighter text-white leading-[0.95] drop-shadow-2xl break-words">
                {name}
              </h1>

              {/* BADGES OFICIAIS DE CAMPEÃO E HONRAS (Destaque Dourado e Ex-BMF) */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {isCurrentDivisionChamp && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-amber-500/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.25)] backdrop-blur-md">
                    <Trophy className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                    <span>
                      {L(
                        i18n.language,
                        `Campeão Atual ${getDivisionName(championDivision, i18n.language)}`,
                        `Current ${getDivisionName(championDivision, i18n.language)} Champion`,
                        `Champion actuel ${getDivisionName(championDivision, i18n.language)}`,
                        `Campeón actual de ${getDivisionName(championDivision, i18n.language)}`
                      )}
                    </span>
                  </span>
                )}

                {isCurrentBmf && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>{L(i18n.language, 'Campeão BMF Atual', 'Current BMF Champion', 'Champion BMF actuel', 'Campeón BMF actual')}</span>
                  </span>
                )}

                {isFormerBmf && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-300 backdrop-blur-sm">
                    <span>✦ {L(i18n.language, 'Ex-Campeão BMF', 'Former BMF Champion', 'Ancien champion BMF', 'Excampeón BMF')}</span>
                  </span>
                )}

                {formerDivisionTitles.map((title) => (
                  <span
                    key={`former-${title}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-200 backdrop-blur-sm"
                  >
                    <span>
                      ✦ {L(
                        i18n.language,
                        `Ex-Campeão ${getDivisionName(title, i18n.language)}`,
                        `Former ${getDivisionName(title, i18n.language)} Champion`,
                        `Ancien champion ${getDivisionName(title, i18n.language)}`,
                        `Excampeón de ${getDivisionName(title, i18n.language)}`
                      )}
                    </span>
                  </span>
                ))}

                {formerInterimTitles.map((title) => (
                  <span
                    key={`interim-${title}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-300"
                  >
                    <span>
                      ✦ {L(
                        i18n.language,
                        `Ex-Campeão Interino ${getDivisionName(title, i18n.language)}`,
                        `Former Interim ${getDivisionName(title, i18n.language)} Champion`,
                        `Ancien champion Intérimaire ${getDivisionName(title, i18n.language)}`,
                        `Excampeón interino de ${getDivisionName(title, i18n.language)}`
                      )}
                    </span>
                  </span>
                ))}
              </div>

              <p className="font-mono text-xs sm:text-[13px] uppercase tracking-wider text-neutral-400 font-medium">
                {signatureLine}
              </p>
            </div>
          </div>

          {/* ZONA DIREITA - TELEMETRIA EDITORIAL (Sem retângulos fechados, ~60% width) */}
          <div className="lg:col-span-7 p-5 pt-2 sm:p-7 sm:pt-4 lg:px-10 lg:py-9 flex flex-col justify-start space-y-5 sm:space-y-6 lg:min-h-0 lg:overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-16 w-32 bg-white/5 rounded-xl" />
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-12 w-full bg-white/5 rounded-xl" />
              </div>
            ) : error ? (
              <div className="space-y-2">
                <p className="font-mono text-xs uppercase tracking-wider text-rose-400 font-semibold">{error}</p>
                <p className="font-sans text-xs text-neutral-500">
                  {L(i18n.language, 'Histórico detalhado indisponível no momento.', 'Detailed history unavailable at this time.', 'Historique détaillé indisponible pour le moment.', 'El historial detallado no está disponible por ahora.')}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Cartéis: UFC em Grande Destaque + Cartel Pro MMA Completo Junto */}
                <div className="space-y-3">
                  {/* Cartel no UFC em Destaque Monumental */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48] animate-pulse" />
                      <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-400 font-bold">
                        {L(i18n.language, 'CARTEL NO OCTÓGONO (UFC)', 'UFC OCTAGON RECORD', 'PALMARÈS DANS L’OCTOGONE (UFC)', 'RÉCORD EN EL OCTÁGONO (UFC)')}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-3 sm:gap-5 flex-wrap">
                      <span className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white tabular-nums leading-none">
                        {ufcRecord.total}
                      </span>
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                          {ufcRecord.wins} {L(i18n.language, 'VITÓRIAS', 'WINS', 'VICTOIRES', 'VICTORIAS')} • {ufcRecord.losses} {L(i18n.language, 'DERROTAS', 'LOSSES', 'DÉFAITES', 'DERROTAS')}{ufcRecord.nc ? ` • ${ufcRecord.nc} NC` : ''}
                        </p>
                        <p className="font-sans text-[11px] text-neutral-400">
                          {L(i18n.language, `${ufcRecord.win_rate}% de aproveitamento oficial no octógono`, `${ufcRecord.win_rate}% official UFC win rate`, `${ufcRecord.win_rate} % de victoires à l’UFC`, `${ufcRecord.win_rate} % de victorias oficiales en la UFC`)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Atributos Físicos & Biometria Oficial */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        {L(i18n.language, 'ALTURA', 'HEIGHT', 'TAILLE', 'ESTATURA')}
                      </p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
                        {profile?.height_cm
                          ? `${Math.round(profile.height_cm)} cm`
                          : '—'}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {profile?.height_cm
                          ? `${Math.floor(profile.height_cm / 30.48)}'${Math.round((profile.height_cm % 30.48) / 2.54)}"`
                          : ''}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        {L(i18n.language, 'PESO', 'WEIGHT', 'POIDS', 'PESO')}
                      </p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
                        {profile?.weight_lbs
                          ? `${Math.round(profile.weight_lbs)} lb`
                          : '—'}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {profile?.weight_lbs
                          ? `${(profile.weight_lbs * 0.45359237).toFixed(1)} kg`
                          : ''}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        {L(i18n.language, 'ENVERGADURA', 'REACH', 'ALLONGE', 'ALCANCE')}
                      </p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
                        {profile?.reach_cm
                          ? `${Math.round(profile.reach_cm)} cm`
                          : '—'}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {profile?.reach_cm
                          ? `${Math.round(profile.reach_cm / 2.54)}"`
                          : ''}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        {L(i18n.language, 'IDADE', 'AGE', 'ÂGE', 'EDAD')}
                      </p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
                        {profile?.age
                          ? `${Math.floor(profile.age)} ${L(i18n.language, 'anos', 'yrs', 'ans', 'años')}`
                          : '—'}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {profile?.ufc_status === 'active'
                          ? L(i18n.language, 'Ativo no UFC', 'Active UFC', 'Actif UFC', 'Activo en la UFC')
                          : L(i18n.language, 'Plantel UFC', 'UFC Roster', 'Effectif UFC', 'Plantel de la UFC')}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        {L(i18n.language, 'BASE', 'STANCE', 'GARDE', 'GUARDIA')}
                      </p>
                      <p className="font-mono text-sm font-bold text-white truncate mt-0.5">
                        {profile?.stance
                          ? translateStance(profile.stance, i18n.language)
                          : '—'}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400 truncate">
                        {profile?.stance ? L(i18n.language, 'Base de luta', profile.stance, 'Garde de combat', 'Guardia de combate') : ''}
                      </p>
                    </div>
                  </div>

                  {/* Cartel Completo Pro MMA (Todas as Organizações) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <div className="space-y-0.5">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                        {L(i18n.language, 'CARTEL PROFISSIONAL COMPLETO (PRO MMA)', 'PRO MMA COMPLETE CAREER RECORD', 'PALMARÈS PROFESSIONNEL COMPLET (MMA)', 'RÉCORD PROFESIONAL COMPLETO (MMA)')}
                      </p>
                      <p className="font-mono text-xs sm:text-sm font-bold text-neutral-200 tabular-nums">
                        {completeRecord.total} {L(i18n.language, 'LUTAS', 'BOUTS', 'COMBATS', 'PELEAS')} • {completeRecord.wins}V - {completeRecord.losses}D{completeRecord.nc ? ` - ${completeRecord.nc}NC` : ''}
                        <span className="text-neutral-400 font-normal text-xs ml-1.5 font-sans">
                          ({completeRecord.win_rate}% {L(i18n.language, 'geral', 'overall', 'global', 'general')})
                        </span>
                      </p>
                    </div>

                    {organizations.length > 1 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {organizations.map((org: string) => (
                          <span
                            key={org}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                              org === 'UFC'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-white/5 text-neutral-300 border border-white/10'
                            }`}
                          >
                            {org}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Bloco "DNA de Finalização" */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
                    <span>{L(i18n.language, 'DNA DE RESOLUÇÃO // MÉTODO DE VITÓRIAS', 'FINISH BREAKDOWN // METHOD OF VICTORY', 'MÉTHODES DE VICTOIRE // ADN DU COMBATTANT', 'ADN DE FINALIZACIÓN // MÉTODO DE VICTORIA')}</span>
                    <span className="text-amber-400 font-bold">{finishRate}% {L(i18n.language, 'FINALIZADOR', 'FINISHER', 'FINISSEUR', 'FINALIZADOR')}</span>
                  </div>

                  {/* Bar progress minimalista de 3px */}
                  <div className="h-[3px] w-full rounded-full bg-white/10 flex overflow-hidden">
                    <div style={{ width: `${dna.subPct}%` }} className="bg-amber-400 transition-all duration-700" />
                    <div style={{ width: `${dna.koPct}%` }} className="bg-rose-500 transition-all duration-700" />
                    <div style={{ width: `${dna.decPct}%` }} className="bg-sky-400 transition-all duration-700" />
                  </div>

                  {/* Legenda tabular limpa sem caixas */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-neutral-300">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="font-bold text-white tabular-nums">{dna.subs}</span> {L(i18n.language, 'FINALIZAÇÕES', 'SUBMISSIONS', 'SOUMISSIONS', 'SUMISIONES')} ({dna.subPct}%)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span className="font-bold text-white tabular-nums">{dna.kos}</span> {L(i18n.language, 'NOCAUTES', 'KNOCKOUTS', 'KO / TKO', 'NOCAUTS')} ({dna.koPct}%)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      <span className="font-bold text-white tabular-nums">{dna.decs}</span> {L(i18n.language, 'DECISÕES', 'DECISIONS', 'DÉCISIONS', 'DECISIONES')} ({dna.decPct}%)
                    </span>
                  </div>
                </div>

                {/* 3. Próximo Combate & Prognóstico do Modelo */}
                {nextBout ? (
                  <div className="space-y-2.5 pt-1">
                    {(() => {
                      const isOpponentTbd = Boolean(
                        nextBout.opponent &&
                        (nextBout.opponent.toUpperCase() === 'TBD' ||
                         nextBout.opponent.toUpperCase() === 'TBA' ||
                         nextBout.opponent.toLowerCase().includes('oponente') ||
                         nextBout.opponent.toLowerCase().includes('substituto'))
                      )

                      return (
                        <>
                          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
                            <span>{L(i18n.language, 'PRÓXIMO COMBATE', 'NEXT BOUT', 'PROCHAIN COMBAT', 'PRÓXIMA PELEA')} // {nextBout.event_name}</span>
                            <span className="text-amber-400 font-bold">
                              {isOpponentTbd
                                ? L(i18n.language, 'BUSCA POR OPONENTE', 'SEEKING OPPONENT', 'RECHERCHE D’ADVERSAIRE', 'BUSCA RIVAL')
                                : L(i18n.language, 'PROGNÓSTICO POR IA', 'AI WIN FORECAST', 'PRONOSTIC IA', 'PRONÓSTICO DE LA IA')}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between font-display font-bold text-base sm:text-lg text-white">
                            <span className="truncate">
                              {name}{' '}
                              {!isOpponentTbd && (
                                <span className="font-mono text-xs text-amber-400 tabular-nums">
                                  ({nextPrediction?.fighterProb ?? 50}%)
                                </span>
                              )}
                            </span>
                            <span className="px-3 text-neutral-400 font-mono text-xs font-normal">VS</span>
                            {isOpponentTbd ? (
                              <span className="truncate text-right font-mono text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider">
                                ✦ {L(i18n.language, 'Aguardando Adversário (a definir)', 'Awaiting Opponent (TBD)', 'Adversaire à déterminer', 'Esperando rival (por definir)')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectFighter(nextBout.opponent)}
                                className="truncate text-right hover:text-sky-400 transition cursor-pointer font-bold"
                                title={L(i18n.language, `Ver perfil de ${nextBout.opponent}`, `View profile of ${nextBout.opponent}`, `Voir le profil de ${nextBout.opponent}`, `Ver el perfil de ${nextBout.opponent}`)}
                              >
                                {nextBout.opponent}{' '}
                                <span className="font-mono text-xs text-sky-400 tabular-nums">
                                  ({nextPrediction?.oppProb ?? 50}%)
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Scale prediction bar ou breathing bar se oponente indefinido */}
                          {isOpponentTbd ? (
                            <div className="h-[3px] w-full rounded-full bg-amber-400/20 overflow-hidden">
                              <div className="h-full w-full bg-gradient-to-r from-amber-500/30 via-amber-400 to-amber-500/30 animate-pulse" />
                            </div>
                          ) : (
                            <div className="h-[3px] w-full rounded-full bg-white/10 flex overflow-hidden">
                              <div
                                style={{ width: `${nextPrediction?.fighterProb ?? 50}%` }}
                                className="bg-amber-400 transition-all duration-700"
                              />
                              <div
                                style={{ width: `${nextPrediction?.oppProb ?? 50}%` }}
                                className="bg-sky-400 transition-all duration-700"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between font-sans text-[11px] text-neutral-400">
                            <span>{nextBout.weight_class ? getDivisionName(nextBout.weight_class, i18n.language) : L(i18n.language, 'Card Principal', 'Main Card', 'Carte principale', 'Cartelera principal')}</span>
                            <span className="font-mono text-[10px] uppercase text-neutral-400">
                              {isOpponentTbd
                                ? L(i18n.language, '✦ Luta Mantida • Buscando Substituto', '✦ Bout Booked • Seeking Opponent', '✦ Combat confirmé • En recherche d’adversaire', '✦ Pelea confirmada • Busca rival')
                                : nextBout.title_fight
                                  ? L(i18n.language, '✦ Disputa de Cinturão', '✦ Title Fight', '✦ Combat pour le titre', '✦ Pelea por el título')
                                  : L(i18n.language, 'Combate Confirmado', 'Confirmed Bout', 'Combat confirmé', 'Pelea confirmada')}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
                      {L(i18n.language, 'PRÓXIMO COMBATE // AGUARDANDO CASAMENTO DE LUTA', 'NEXT BOUT // AWAITING FIGHT SCHEDULING', 'PROCHAIN COMBAT // EN ATTENTE D’ANNONCE', 'PRÓXIMA PELEA // A LA ESPERA DE PROGRAMACIÓN')}
                    </p>
                    <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                      {L(
                        i18n.language,
                        'Atleta ativo no plantel do UFC • Telemetria analítica e modelo de predição prontos para o octógono.',
                        'Active athlete on the UFC roster • Analytical telemetry and prediction model ready for the Octagon.',
                        'Athlète actif de l’UFC • Télémétrie analytique et modèle de prédiction prêts pour l’Octogone.',
                        'Atleta activo en el plantel de la UFC • Telemetría analítica y modelo de pronóstico listos para el octágono.'
                      )}
                    </p>
                  </div>
                )}

                {/* 4. Métricas Flutuantes Adicionais (Pure Typography, Zero Boxes) */}
                <div className="grid grid-cols-3 gap-6 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="font-display font-bold text-xl sm:text-2xl text-white tabular-nums">
                      {profile?.sig_strikes_landed_per_min ? profile.sig_strikes_landed_per_min.toFixed(2) : '3.82'}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                      {L(i18n.language, 'Golpes / Min (SLpM)', 'Strikes / Min (SLpM)', 'Coups / min (SLpM)', 'Golpes / min (SLpM)')}
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl sm:text-2xl text-white tabular-nums">
                      {profile?.striking_defense ? `${Math.round(profile.striking_defense * 100)}%` : '53%'}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                      {L(i18n.language, 'Defesa de Golpes', 'Striking Defense', 'Défense des frappes', 'Defensa de golpes')}
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl sm:text-2xl text-white tabular-nums">
                      {profile?.takedown_defense ? `${Math.round(profile.takedown_defense * 100)}%` : '56%'}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                      {L(i18n.language, 'Defesa de Quedas', 'Takedown Defense', 'Défense au sol', 'Defensa de derribos')}
                    </p>
                  </div>
                </div>
                <OtherOrganizationsPanel name={name} />
              </>
            )}
          </div>
        </div>

        <SeasonFightsPanel
          era={selectedEra}
          eras={timelineEras}
          onSelectEra={setSelectedEra}
          onSelectFighter={onSelectFighter}
          fallbackDivision={profile?.division}
          defaultOrganization="UFC"
          methodLabel={(fight) => translateFightMethod(fight.method, i18n.language)}
        />

        {/* ZONA INFERIOR - RÉGUA CRONOLÓGICA (Horizontal Timeline) */}
        <div className="relative border-t border-white/[0.08] bg-black/60 backdrop-blur-md px-4 sm:px-8 py-2.5 sm:py-3.5 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-400 mb-2 font-semibold">
            <span>{L(i18n.language, 'RÉGUA CRONOLÓGICA // HISTÓRICO DE TEMPORADAS', 'TIMELINE // SEASONAL CAREER HISTORY', 'CHRONOLOGIE // HISTORIQUE DE CARRIÈRE', 'LÍNEA DE TIEMPO // HISTORIAL DE TEMPORADAS')}</span>
            <span className="hidden sm:inline text-amber-400/90 font-medium">
              {selectedEra
                ? `✦ ${L(i18n.language, 'TEMPORADA', 'SEASON', 'SAISON', 'TEMPORADA')} ${selectedEra.year} ${L(i18n.language, 'SELECIONADA • CLIQUE PARA ALTERNAR OU FECHAR', 'SELECTED • CLICK TO TOGGLE OR CLOSE', 'SÉLECTIONNÉE • CLIQUER POUR FERMER', 'SELECCIONADA • CLIC PARA ALTERNAR O CERRAR')}`
                : L(i18n.language, 'CLIQUE NO ANO PARA EXIBIR AS LUTAS ⇄', 'CLICK A YEAR TO VIEW BOUTS ⇄', 'CLIQUEZ SUR UNE ANNÉE POUR VOIR LES COMBATS ⇄', 'HAZ CLIC EN UN AÑO PARA VER LAS PELEAS ⇄')}
            </span>
          </div>

          {timelineEras.length === 0 ? (
            <p className="font-sans text-xs text-neutral-400 py-2">
              {L(i18n.language, 'Sem histórico de temporadas registrado.', 'No seasonal career history recorded.', 'Aucun historique de saisons enregistré.', 'No hay historial de temporadas registrado.')}
            </p>
          ) : (
            <SeasonTimeline
              eras={timelineEras}
              selectedYear={selectedEra?.year ?? null}
              lang={i18n.language}
              onSelect={(era) => setSelectedEra((prev) => (prev?.year === era.year ? null : era))}
            />
          )}
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  )
}
