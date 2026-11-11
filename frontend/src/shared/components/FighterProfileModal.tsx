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
import { FinishBreakdown } from './FinishBreakdown'
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
          setError(L(i18n.language, 'Não foi possível carregar os números do lutador. Tente de novo em instantes.', 'The fighter’s numbers could not be loaded. Try again in a moment.', 'Impossible de charger les chiffres du combattant. Réessayez dans un instant.', 'No se pudieron cargar los números del peleador. Inténtalo de nuevo en un momento.'))
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
      parts.push(translateHometown(profile.country, i18n.language))
    } else if (profile?.nationalities && profile.nationalities.length > 0) {
      parts.push(translateHometown(profile.nationalities[0].name, i18n.language).toUpperCase())
    } else if (profile?.hometown) {
      const city = translateHometown(profile.hometown.split(',').pop()?.trim(), i18n.language)
      if (city) parts.push(city)
    } else {
      parts.push('UFC')
    }

    // Categoria de Peso
    if (profile?.division) {
      parts.push(getDivisionName(profile.division, i18n.language))
    } else {
      parts.push(L(i18n.language, 'Peso livre', 'Open weight', 'Poids libre', 'Peso abierto'))
    }

    // Ranking / P4P / Status
    if (profile?.ranking && profile.ranking.includes('#')) {
      parts.push(`${L(i18n.language, 'Desafiante', 'Contender', 'Aspirant', 'Aspirante')} ${profile.ranking}`)
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
          ? L(i18n.language, 'Estreia profissional', 'Pro debut', 'Début Pro', 'Debut profesional')
          : L(i18n.language, 'Estreia no UFC', 'UFC debut', 'Début UFC', 'Debut en la UFC')
      } else if (isFirstUfcFight) {
        milestone = L(i18n.language, 'Estreia no UFC', 'UFC debut', 'Début UFC', 'Debut en la UFC')
      } else if (seasonFights.some((f) => f.result === 'win' && f.title_fight && !f.interim_title)) {
        milestone = L(i18n.language, 'Campeão linear', 'Undisputed champion', 'Champion incontesté', 'Campeón indiscutido')
      } else if (seasonFights.some((f) => f.result === 'win' && f.bmf_title)) {
        milestone = L(i18n.language, 'Cinturão BMF', 'BMF champion', 'Ceinture BMF', 'Campeón BMF')
      } else if (seasonFights.some((f) => f.result === 'win' && f.interim_title)) {
        milestone = L(i18n.language, 'Campeão interino', 'Interim champion', 'Champion intérimaire', 'Campeón interino')
      } else if (year === 2018 && seasonWins >= 3) {
        milestone = L(i18n.language, 'Início da série histórica', 'Historic streak began', 'Début de série historique', 'Inicio de la racha histórica')
      } else if (seasonWins >= 3 && seasonLosses === 0) {
        milestone = L(i18n.language, 'Série histórica', 'Historic streak', 'Série historique', 'Racha histórica')
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
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[var(--modal-backdrop)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.section
        className="relative flex h-[min(90vh,880px)] w-full max-w-6xl flex-col overflow-hidden border border-[var(--rule)] bg-[var(--mat)] text-[var(--ink)]"
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
            className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[var(--rule)] bg-[var(--panel)] hover:bg-[var(--panel)] hover:border-[var(--rule)] px-3 sm:px-4 py-1.5 sm:py-2 text-label font-semibold text-[var(--ink)] hover:text-[var(--ink)] transition-all cursor-pointer"
            title={L(i18n.language, 'Abrir dossiê completo', 'Open full dossier', 'Ouvrir le dossier', 'Abrir dosier completo')}
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--gold)] transition-transform group-hover:scale-110" />
            <span>{L(i18n.language, 'Dossiê completo', 'Full dossier', 'Dossier complet', 'Dosier completo')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-[var(--rule)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)] hover:border-[var(--rule)] transition cursor-pointer"
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
                <div className="w-full h-full flex items-center justify-center font-display font-black text-8xl text-[var(--muted)]">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Transição suave em gradiente para o fundo #08090C */}
              <div className="absolute inset-0" />
              <div className="hidden lg:block absolute inset-0" />
            </div>

            <PhotoCredit imageUrl={imageUrl} className="left-2 top-4" />

            {/* Tipografia Display Monumental, Badges Oficiais e Assinatura */}
            <div className="relative z-10 space-y-2.5 pb-1">
              <div className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
                <span className="text-label text-[var(--muted)] font-semibold">
                  {L(i18n.language, 'Atleta ativo', 'Active fighter', 'Combattant actif', 'Peleador activo')}
                </span>
              </div>

              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[2.6rem] text-[var(--ink)] leading-[0.95] break-words">
                {name}
              </h1>

              {/* BADGES OFICIAIS DE CAMPEÃO E HONRAS (Destaque Dourado e Ex-BMF) */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {isCurrentDivisionChamp && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold)]">
                    <Trophy className="h-3.5 w-3.5 text-[var(--gold)]" />
                    <span>
                      {L(
                        i18n.language,
                        `Campeão atual ${getDivisionName(championDivision, i18n.language)}`,
                        `Current ${getDivisionName(championDivision, i18n.language)} champion`,
                        `Champion actuel ${getDivisionName(championDivision, i18n.language)}`,
                        `Campeón actual de ${getDivisionName(championDivision, i18n.language)}`
                      )}
                    </span>
                  </span>
                )}

                {isCurrentBmf && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)] bg-[var(--gold-fill)] px-2.5 py-1 text-label font-bold text-[var(--gold)]">
                    <Sparkles className="h-3 w-3 text-[var(--gold)]" />
                    <span>{L(i18n.language, 'Campeão BMF atual', 'Current BMF champion', 'Champion BMF actuel', 'Campeón BMF actual')}</span>
                  </span>
                )}

                {isFormerBmf && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--panel)] px-2.5 py-1 text-label font-bold text-[var(--ink)]">
                    <span>{L(i18n.language, 'Ex-Campeão BMF', 'Former BMF champion', 'Ancien champion BMF', 'Excampeón BMF')}</span>
                  </span>
                )}

                {formerDivisionTitles.map((title) => (
                  <span
                    key={`former-${title}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--panel)] px-2.5 py-1 text-label font-bold text-[var(--ink)]"
                  >
                    <span>
                      {L(
                        i18n.language,
                        `Ex-Campeão ${getDivisionName(title, i18n.language)}`,
                        `Former ${getDivisionName(title, i18n.language)} champion`,
                        `Ancien champion ${getDivisionName(title, i18n.language)}`,
                        `Excampeón de ${getDivisionName(title, i18n.language)}`
                      )}
                    </span>
                  </span>
                ))}

                {formerInterimTitles.map((title) => (
                  <span
                    key={`interim-${title}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--panel)] px-2.5 py-1 text-label font-bold text-[var(--ink)]"
                  >
                    <span>
                      {L(
                        i18n.language,
                        `Ex-campeão interino ${getDivisionName(title, i18n.language)}`,
                        `Former interim ${getDivisionName(title, i18n.language)} champion`,
                        `Ancien champion intérimaire ${getDivisionName(title, i18n.language)}`,
                        `Excampeón interino de ${getDivisionName(title, i18n.language)}`
                      )}
                    </span>
                  </span>
                ))}
              </div>

              <p className="text-xs sm:text-[13px] text-[var(--muted)] font-medium">
                {signatureLine}
              </p>
            </div>
          </div>

          {/* ZONA DIREITA - TELEMETRIA EDITORIAL (Sem retângulos fechados, ~60% width) */}
          <div className="lg:col-span-7 p-5 pt-2 sm:p-7 sm:pt-4 lg:px-10 lg:py-9 flex flex-col justify-start space-y-5 sm:space-y-6 lg:min-h-0 lg:overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="space-y-6">
                <div className="h-16 w-32 bg-[var(--panel)]" />
                <div className="h-4 w-full bg-[var(--panel)] rounded" />
                <div className="h-12 w-full bg-[var(--panel)]" />
              </div>
            ) : error ? (
              <div className="space-y-2">
                <p role="alert" className="error-note">{error}</p>
                <p className="font-sans text-xs text-[var(--muted)]">
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
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
                      <p className="text-label text-[var(--muted)] font-bold">
                        {L(i18n.language, 'Cartel no octógono (UFC)', 'UFC Octagon record', 'Palmarès dans l’octogone (UFC)', 'Récord en el octágono (UFC)')}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-3 sm:gap-5 flex-wrap">
                      <span className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] tabular-nums leading-none">
                        {ufcRecord.total}
                      </span>
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                          {ufcRecord.wins} {L(i18n.language, 'vitórias', 'wins', 'victoires', 'victorias')} • {ufcRecord.losses} {L(i18n.language, 'derrotas', 'losses', 'défaites', 'derrotas')}{ufcRecord.nc ? ` • ${ufcRecord.nc} NC` : ''}
                        </p>
                        <p className="font-sans text-label text-[var(--muted)]">
                          {L(i18n.language, `${ufcRecord.win_rate}% de aproveitamento oficial no octógono`, `${ufcRecord.win_rate}% official UFC win rate`, `${ufcRecord.win_rate} % de victoires à l’UFC`, `${ufcRecord.win_rate} % de victorias oficiales en la UFC`)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Atributos Físicos & Biometria Oficial */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 border border-[var(--rule)] bg-[var(--panel)]">
                    <div>
                      <p className="text-label text-[var(--muted)] font-semibold">
                        {L(i18n.language, 'Altura', 'Height', 'Taille', 'Estatura')}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">
                        {profile?.height_cm
                          ? `${Math.round(profile.height_cm)} cm`
                          : '—'}
                      </p>
                      <p className="text-label text-[var(--muted)]">
                        {profile?.height_cm
                          ? `${Math.floor(profile.height_cm / 30.48)}'${Math.round((profile.height_cm % 30.48) / 2.54)}"`
                          : ''}
                      </p>
                    </div>

                    <div>
                      <p className="text-label text-[var(--muted)] font-semibold">
                        {L(i18n.language, 'Peso', 'Weight', 'Poids', 'Peso')}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">
                        {profile?.weight_lbs
                          ? `${Math.round(profile.weight_lbs)} lb`
                          : '—'}
                      </p>
                      <p className="text-label text-[var(--muted)]">
                        {profile?.weight_lbs
                          ? `${(profile.weight_lbs * 0.45359237).toFixed(1)} kg`
                          : ''}
                      </p>
                    </div>

                    <div>
                      <p className="text-label text-[var(--muted)] font-semibold">
                        {L(i18n.language, 'Envergadura', 'Reach', 'Allonge', 'Alcance')}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">
                        {profile?.reach_cm
                          ? `${Math.round(profile.reach_cm)} cm`
                          : '—'}
                      </p>
                      <p className="text-label text-[var(--muted)]">
                        {profile?.reach_cm
                          ? `${Math.round(profile.reach_cm / 2.54)}"`
                          : ''}
                      </p>
                    </div>

                    <div>
                      <p className="text-label text-[var(--muted)] font-semibold">
                        {L(i18n.language, 'Idade', 'Age', 'Âge', 'Edad')}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">
                        {profile?.age
                          ? `${Math.floor(profile.age)} ${L(i18n.language, 'anos', 'yrs', 'ans', 'años')}`
                          : '—'}
                      </p>
                      <p className="text-label text-[var(--muted)]">
                        {profile?.ufc_status === 'active'
                          ? L(i18n.language, 'Ativo no UFC', 'Active UFC', 'Actif UFC', 'Activo en la UFC')
                          : L(i18n.language, 'Plantel UFC', 'UFC roster', 'Effectif UFC', 'Plantel de la UFC')}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-label text-[var(--muted)] font-semibold">
                        {L(i18n.language, 'Base', 'Stance', 'Garde', 'Guardia')}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)] truncate mt-0.5">
                        {profile?.stance
                          ? translateStance(profile.stance, i18n.language)
                          : '—'}
                      </p>
                      <p className="text-label text-[var(--muted)] truncate">
                        {profile?.stance ? L(i18n.language, 'Base de luta', profile.stance, 'Garde de combat', 'Guardia de combate') : ''}
                      </p>
                    </div>
                  </div>

                  {/* Cartel Completo Pro MMA (Todas as Organizações) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border border-[var(--rule)] bg-[var(--panel)]">
                    <div className="space-y-0.5">
                      <p className="text-label text-[var(--gold)] font-bold">
                        {L(i18n.language, 'Cartel profissional completo (pro MMA)', 'Pro MMA complete career record', 'Palmarès professionnel complet (MMA)', 'Récord profesional completo (MMA)')}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-[var(--ink)] tabular-nums">
                        {completeRecord.total} {L(i18n.language, 'Lutas', 'Bouts', 'Combats', 'Peleas')} • {completeRecord.wins}V - {completeRecord.losses}D{completeRecord.nc ? ` - ${completeRecord.nc}NC` : ''}
                        <span className="text-[var(--muted)] font-normal text-xs ml-1.5 font-sans">
                          ({completeRecord.win_rate}% {L(i18n.language, 'geral', 'overall', 'global', 'general')})
                        </span>
                      </p>
                    </div>

                    {organizations.length > 1 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {organizations.map((org: string) => (
                          <span
                            key={org}
                            className={`px-1.5 py-0.5 text-label font-semibold ${
                              org === 'UFC'
                                ? 'bg-[var(--ink)] text-[var(--on-ink)] border border-[var(--ink)]'
                                : 'bg-[var(--panel)] text-[var(--ink)] border border-[var(--rule)]'
                            }`}
                          >
                            {org}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. How the wins came */}
                <FinishBreakdown dna={dna} finishRate={finishRate} language={i18n.language} />

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
                          <div className="flex items-center justify-between text-label text-[var(--muted)] font-semibold">
                            <span>{L(i18n.language, 'Próximo combate', 'Next bout', 'Prochain combat', 'Próxima pelea')} // {nextBout.event_name}</span>
                            <span className="text-[var(--gold)] font-bold">
                              {isOpponentTbd
                                ? L(i18n.language, 'Busca por oponente', 'Seeking opponent', 'Recherche d’adversaire', 'Busca rival')
                                : L(i18n.language, 'Chance estimada pelo modelo', 'Model’s estimated chance', 'Chance estimée par le modèle', 'Probabilidad estimada por el modelo')}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between font-display font-bold text-base sm:text-lg text-[var(--ink)]">
                            <span className="truncate">
                              {name}{' '}
                              {!isOpponentTbd && (
                                <span className="text-xs text-[var(--gold)] tabular-nums">
                                  ({nextPrediction?.fighterProb ?? 50}%)
                                </span>
                              )}
                            </span>
                            <span className="px-3 text-[var(--muted)] text-xs font-normal">VS</span>
                            {isOpponentTbd ? (
                              <span className="truncate text-right text-xs sm:text-sm font-bold text-[var(--gold)]">
                                {L(i18n.language, 'Aguardando adversário (a definir)', 'Awaiting opponent (TBD)', 'Adversaire à déterminer', 'Esperando rival (por definir)')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectFighter(nextBout.opponent)}
                                className="truncate text-right hover:text-[var(--ink)] transition cursor-pointer font-bold"
                                title={L(i18n.language, `Ver perfil de ${nextBout.opponent}`, `View profile of ${nextBout.opponent}`, `Voir le profil de ${nextBout.opponent}`, `Ver el perfil de ${nextBout.opponent}`)}
                              >
                                {nextBout.opponent}{' '}
                                <span className="text-xs text-[var(--ink)] tabular-nums">
                                  ({nextPrediction?.oppProb ?? 50}%)
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Scale prediction bar ou breathing bar se oponente indefinido */}
                          {isOpponentTbd ? (
                            <div className="h-[3px] w-full rounded-full bg-[var(--gold-fill)] overflow-hidden">
                              <div className="h-full w-full" />
                            </div>
                          ) : (
                            <div className="flex h-2 w-full gap-[2px] overflow-hidden">
                              <div
                                style={{ width: `${nextPrediction?.fighterProb ?? 50}%` }}
                                className="bg-[var(--ink)]"
                              />
                              <div
                                style={{ width: `${nextPrediction?.oppProb ?? 50}%` }}
                                className="bg-[var(--track)]"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between font-sans text-label text-[var(--muted)]">
                            <span>{nextBout.weight_class ? getDivisionName(nextBout.weight_class, i18n.language) : L(i18n.language, 'Card principal', 'Main card', 'Carte principale', 'Cartelera principal')}</span>
                            <span className="text-label text-[var(--muted)]">
                              {isOpponentTbd
                                ? L(i18n.language, 'Luta mantida • Buscando substituto', 'Bout booked • Seeking opponent', 'Combat confirmé • En recherche d’adversaire', 'Pelea confirmada • Busca rival')
                                : nextBout.title_fight
                                  ? L(i18n.language, 'Disputa de cinturão', 'Title fight', 'Combat pour le titre', 'Pelea por el título')
                                  : L(i18n.language, 'Combate confirmado', 'Confirmed bout', 'Combat confirmé', 'Pelea confirmada')}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-label text-[var(--muted)] font-semibold">
                      {L(i18n.language, 'Próxima luta: ainda não marcada', 'Next fight: not booked yet', 'Prochain combat : pas encore programmé', 'Próxima pelea: aún no programada')}
                    </p>
                    <p className="font-sans text-xs text-[var(--muted)] leading-relaxed">
                      {L(
                        i18n.language,
                        'Atleta ativo no plantel do UFC, ainda sem luta marcada.',
                        'Active on the UFC roster, with no fight booked yet.',
                        'Combattant actif de l’UFC, sans combat programmé pour l’instant.',
                        'Peleador activo en el plantel de la UFC, aún sin pelea programada.'
                      )}
                    </p>
                  </div>
                )}

                {/* 4. Métricas Flutuantes Adicionais (Pure Typography, Zero Boxes) */}
                <div className="grid grid-cols-3 gap-6 pt-3 border-t border-[var(--rule)]">
                  <div>
                    <p className="font-display font-bold text-xl sm:text-2xl text-[var(--ink)] tabular-nums">
                      {profile?.sig_strikes_landed_per_min ? profile.sig_strikes_landed_per_min.toFixed(2) : '—'}
                    </p>
                    <p className="text-label text-[var(--muted)] font-medium">
                      {L(i18n.language, 'Golpes / Min (SLpM)', 'Strikes / Min (SLpM)', 'Coups / min (SLpM)', 'Golpes / min (SLpM)')}
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl sm:text-2xl text-[var(--ink)] tabular-nums">
                      {profile?.striking_defense ? `${Math.round(profile.striking_defense * 100)}%` : '—'}
                    </p>
                    <p className="text-label text-[var(--muted)] font-medium">
                      {L(i18n.language, 'Defesa de golpes', 'Striking defense', 'Défense des frappes', 'Defensa de golpes')}
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl sm:text-2xl text-[var(--ink)] tabular-nums">
                      {profile?.takedown_defense ? `${Math.round(profile.takedown_defense * 100)}%` : '—'}
                    </p>
                    <p className="text-label text-[var(--muted)] font-medium">
                      {L(i18n.language, 'Defesa de quedas', 'Takedown defense', 'Défense au sol', 'Defensa de derribos')}
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
        <div className="relative border-t border-[var(--rule)] bg-[var(--mat)] px-4 sm:px-8 py-2.5 sm:py-3.5 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between text-label text-[var(--muted)] mb-2 font-semibold">
            <span>{L(i18n.language, 'Carreira ano a ano', 'Career year by year', 'Carrière année par année', 'Carrera año por año')}</span>
            <span className="hidden sm:inline text-[var(--muted)] font-medium">
              {selectedEra
                ? `${L(i18n.language, 'Temporada', 'Season', 'Saison', 'Temporada')} ${selectedEra.year} ${L(i18n.language, 'aberta. Clique de novo para fechar', 'open. Click again to close', 'ouverte. Cliquez à nouveau pour fermer', 'abierta. Haz clic de nuevo para cerrar')}`
                : L(i18n.language, 'Escolha um ano para ver as lutas', 'Pick a year to see the fights', 'Choisissez une année pour voir les combats', 'Elige un año para ver las peleas')}
            </span>
          </div>

          {timelineEras.length === 0 ? (
            <p className="font-sans text-xs text-[var(--muted)] py-2">
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
