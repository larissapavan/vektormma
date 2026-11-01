import { motion } from 'framer-motion'
import { ExternalLink, MapPin, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import { formatDate, formatMethod, originLine } from '../data/orgFormat'
import { orgEs, type OrgConfig } from '../data/orgs'
import { translateHometown } from '../data/fightLabels'
import { normalizeFighterName } from '../hooks/useFighterImages'
import { useOrgFighterFights, useOrgFighters } from '../hooks/useOrgData'
import { useUpcomingPicks } from '../hooks/useUpcomingPicks'
import type { FightRecord } from '../types/api'
import { FlagIcon } from './FlagIcon'
import { PhotoCredit } from './PhotoCredit'
import { SeasonFightsPanel } from './SeasonFightsPanel'
import { SeasonTimeline, type TimelineEra } from './SeasonTimeline'

/** "18-4-0" -> wins, losses, draws. */
function parseRecord(text: string | null | undefined) {
  const match = text?.match(/(\d+)-(\d+)-(\d+)/)
  return match ? { wins: Number(match[1]), losses: Number(match[2]), draws: Number(match[3]) } : null
}

const isTbd = (name: string) => /^(tbd|tba)$/i.test(name.trim()) || /oponente|substituto/i.test(name)

/**
 * The fighter profile of every organization other than the UFC, laid out like the UFC one: the photo and the titles on
 * the left; the record, the build, how the wins came, the next bout with the model's pick and the striking numbers on
 * the right; the season-by-season timeline along the foot.
 */
export function OrgFighterModal({
  org,
  name,
  onClose,
  onSelectFighter,
}: {
  org: OrgConfig
  name: string
  onClose: () => void
  onSelectFighter: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const { fighters } = useOrgFighters(org.id)
  const { fights, loading, error } = useOrgFighterFights(org.id, name)
  const pickFor = useUpcomingPicks(org.id, org.hasPredictions)
  const [selectedEra, setSelectedEra] = useState<TimelineEra | null>(null)

  const profile = useMemo(
    () => fighters.find((fighter) => normalizeFighterName(fighter.name) === normalizeFighterName(name)) ?? null,
    [fighters, name],
  )
  const known = useMemo(() => new Set(fighters.map((fighter) => normalizeFighterName(fighter.name))), [fighters])
  const archived = Boolean(org.archived)

  const completedFights = useMemo(
    () =>
      fights
        .filter((fight) => Boolean(fight.result || fight.winner || fight.method))
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    [fights],
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (selectedEra) setSelectedEra(null)
      else onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, selectedEra])

  // Titles: the belt held today, and the divisions where a title fight was won before.
  const isChampion = Boolean(profile?.belt)
  const isInterim = profile?.title_status === 'interim'
  const championDivision = profile?.division ?? null
  const formerTitles = useMemo(() => {
    const held = new Set<string>()
    for (const fight of completedFights) {
      if (fight.result === 'win' && fight.title_fight && fight.weight_class) held.add(fight.weight_class)
    }
    if (isChampion && championDivision) held.delete(championDivision)
    return Array.from(held)
  }, [completedFights, isChampion, championDivision])

  const signatureLine = useMemo(() => {
    const parts: string[] = []
    if (profile?.country) parts.push(translateHometown(profile.country, lang).toUpperCase())
    else if (profile?.hometown) {
      const place = translateHometown(profile.hometown.split(',').pop()?.trim(), lang).toUpperCase()
      if (place) parts.push(place)
    } else parts.push(org.shortName.toUpperCase())

    parts.push(profile?.division ? getDivisionName(profile.division, lang).toUpperCase() : L(lang, 'PESO LIVRE', 'OPEN WEIGHT', 'POIDS LIBRE', 'PESO ABIERTO'))

    const place = profile?.ranking?.match(/^#(\d+)\s*(.*)$/)
    if (place) {
      parts.push(place[2] === 'P4P' ? `P4P #${place[1]}` : `${L(lang, 'DESAFIANTE', 'CONTENDER', 'ASPIRANT', 'ASPIRANTE')} #${place[1]}`)
    }
    return parts.join(' • ')
  }, [profile, lang, org.shortName])

  // The organization's own record: the one the file states, else counted from the bouts we have.
  const orgRecord = useMemo(() => {
    const stated = parseRecord(profile?.org_record)
    if (stated) return stated
    return {
      wins: completedFights.filter((fight) => fight.result === 'win').length,
      losses: completedFights.filter((fight) => fight.result === 'loss').length,
      draws: 0,
    }
  }, [profile, completedFights])
  const orgTotal = orgRecord.wins + orgRecord.losses + orgRecord.draws
  const orgWinRate = orgTotal ? Math.round((orgRecord.wins / orgTotal) * 100) : 0

  const proWins = profile?.wins ?? null
  const proLosses = profile?.losses ?? null
  const hasProRecord = proWins != null && proLosses != null
  const proTotal = hasProRecord ? proWins + proLosses + (profile?.draws ?? 0) + (profile?.no_contests ?? 0) : 0
  const proWinRate = hasProRecord && proTotal ? Math.round((proWins / proTotal) * 100) : 0

  // How the wins came.
  const dna = useMemo(() => {
    let subs = 0
    let kos = 0
    let decs = 0
    for (const fight of completedFights) {
      if (fight.result !== 'win') continue
      const method = (fight.method ?? '').toUpperCase()
      if (method.includes('SUB')) subs += 1
      else if (method.includes('KO') || method.includes('TKO')) kos += 1
      else decs += 1
    }
    const total = subs + kos + decs
    const subPct = total ? Math.round((subs / total) * 100) : 0
    const koPct = total ? Math.round((kos / total) * 100) : 0
    return { subs, kos, decs, total, subPct, koPct, decPct: total ? Math.max(0, 100 - subPct - koPct) : 0 }
  }, [completedFights])
  const finishRate = dna.total ? Math.round(((dna.subs + dna.kos) / dna.total) * 100) : 0

  // The next bout and, where the organization has predictions, the model's reading of it.
  const nextBout = profile?.next_fight ?? null
  const nextDetails = useMemo(
    () => (nextBout ? fights.find((fight) => !fight.result && fight.opponent === nextBout.opponent) ?? null : null),
    [fights, nextBout],
  )
  const nextPrediction = useMemo(() => {
    if (!nextBout || !org.hasPredictions) return null
    const direct = pickFor(nextBout.event, name, nextBout.opponent)
    const reverse = direct ? null : pickFor(nextBout.event, nextBout.opponent, name)
    const pick = direct ?? reverse
    if (!pick) return null
    const mine = direct ? pick.fighter_1_probability : 1 - pick.fighter_1_probability
    const fighterProb = Math.round(mine * 100)
    return { fighterProb, oppProb: 100 - fighterProb }
  }, [nextBout, org.hasPredictions, pickFor, name])

  const timelineEras = useMemo<TimelineEra[]>(() => {
    const byYear = new Map<number, FightRecord[]>()
    for (const fight of completedFights) {
      const year = fight.date ? parseInt(fight.date.slice(0, 4), 10) : NaN
      if (Number.isNaN(year)) continue
      byYear.set(year, [...(byYear.get(year) ?? []), fight])
    }
    const years = Array.from(byYear.keys()).sort((a, b) => a - b)
    return years.map((year, index) => {
      const seasonFights = byYear.get(year) ?? []
      const wins = seasonFights.filter((fight) => fight.result === 'win').length
      const losses = seasonFights.filter((fight) => fight.result === 'loss').length
      let milestone: string | undefined
      if (index === 0) {
        milestone = L(lang, `Estreia no ${org.shortName}`, `${org.shortName} Debut`, `Début ${org.shortName}`, `Debut en ${orgEs(org)}`)
      } else if (seasonFights.some((fight) => fight.result === 'win' && fight.title_fight)) {
        milestone = L(lang, 'Cinturão Conquistado', 'Won the Title', 'Titre conquis', 'Título conquistado')
      } else if (wins >= 3 && losses === 0) {
        milestone = L(lang, 'Ano Invicto', 'Unbeaten Year', 'Année sans défaite', 'Año invicto')
      }
      return {
        year,
        label: `${year}`,
        milestone,
        fights: seasonFights,
        wins,
        losses,
        hasTitleFight: seasonFights.some((fight) => fight.title_fight),
      }
    })
  }, [completedFights, lang, org])

  const imageUrl = profile?.image_url ?? null
  const origin = profile ? originLine(profile, lang) : null
  const openFighter = (opponent: string) => {
    if (known.has(normalizeFighterName(opponent))) onSelectFighter(opponent)
  }
  const statusLabel = archived
    ? L(lang, 'ARQUIVO HISTÓRICO // VEKTOR MMA', 'HISTORICAL ARCHIVE // VEKTOR MMA', 'ARCHIVES // VEKTOR MMA', 'ARCHIVO HISTÓRICO // VEKTOR MMA')
    : profile?.is_active === false
      ? L(lang, 'ATLETA INATIVO // VEKTOR MMA', 'INACTIVE ATHLETE // VEKTOR MMA', 'ATHLÈTE INACTIF // VEKTOR MMA', 'ATLETA INACTIVO // VEKTOR MMA')
      : L(lang, 'ATLETA ATIVO // VEKTOR MMA', 'ACTIVE ATHLETE // VEKTOR MMA', 'ATHLÈTE ACTIF // VEKTOR MMA', 'ATLETA ACTIVO // VEKTOR MMA')

  const label = 'font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold'

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        role="dialog"
        aria-label={L(lang, `${name}, perfil no ${org.shortName}`, `${name}, ${org.shortName} fighter profile`, `${name}, profil ${org.shortName}`, `${name}, perfil de peleador de ${orgEs(org)}`)}
        className="relative flex h-[min(90vh,880px)] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/[0.08] bg-[#08090C] text-white shadow-[0_0_80px_rgba(0,0,0,0.8)]"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-30 flex items-center gap-2 sm:gap-2.5">
          {profile?.ufc_name ? (
            <Link
              to={`/fighters?fighter=${encodeURIComponent(profile.ufc_name)}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/20 px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-neutral-300 hover:text-white backdrop-blur-md transition-all"
            >
              {L(lang, 'Ver perfil completo no UFC →', 'Also in the UFC: open the UFC profile', 'Voir le profil complet à l\'UFC →', 'Ver el perfil completo en la UFC →')}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition cursor-pointer"
            aria-label={L(lang, 'Fechar perfil do lutador', 'Close fighter profile', 'Fermer le profil du combattant', 'Cerrar el perfil del peleador')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid-rows-[minmax(0,1fr)]">
          {/* Photo and titles */}
          <div className="relative min-h-[220px] sm:min-h-[280px] lg:min-h-0 lg:h-full lg:col-span-5 overflow-hidden flex flex-col justify-end p-5 pb-2.5 sm:p-7 sm:pb-4 lg:p-9 select-none">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-600/[0.08] blur-3xl pointer-events-none" />
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover object-top filter grayscale contrast-110 brightness-100 opacity-95 transition-all duration-700 select-none"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                  loading="eager"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-black text-8xl text-white/[0.05]">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/50 to-transparent" />
              <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-transparent via-[#08090C]/25 to-[#08090C]" />
            </div>

            <PhotoCredit imageUrl={imageUrl} className="left-2 top-4" />

            <div className="relative z-10 space-y-2.5 pb-1">
              <div className="inline-flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${profile?.is_active !== false && !archived ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">{statusLabel}</span>
              </div>

              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[2.6rem] uppercase tracking-tighter text-white leading-[0.95] drop-shadow-2xl break-words">
                {name}
              </h1>
              {profile?.nickname ? <p className="font-sans text-sm italic text-neutral-300">“{profile.nickname}”</p> : null}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {isChampion ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-amber-500/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.25)] backdrop-blur-md">
                    <Trophy className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                    <span>
                      {isInterim
                        ? L(lang, 'Campeão Interino', 'Interim Champion', 'Champion Intérimaire', 'Campeón interino')
                        : archived
                          ? L(lang, 'Último Campeão', 'Final Champion', 'Dernier Champion', 'Último campeón')
                          : L(lang, 'Campeão', 'Champion', 'Champion', 'Campeón')}
                      {championDivision ? ` ${getDivisionName(championDivision, lang)}` : ''}
                    </span>
                  </span>
                ) : null}

                {formerTitles.map((title) => (
                  <span
                    key={`former-${title}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-200 backdrop-blur-sm"
                  >
                    ✦ {L(
                      lang,
                      `Ex-Campeão ${getDivisionName(title, 'pt')}`,
                      `Former ${getDivisionName(title, 'en')} Champion`,
                      `Ancien Champion ${getDivisionName(title, 'fr')}`,
                      `Excampeón de ${getDivisionName(title, 'es')}`,
                    )}
                  </span>
                ))}
              </div>

              <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs sm:text-[13px] uppercase tracking-wider text-neutral-400 font-medium">
                {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
                <span>{signatureLine}</span>
              </p>
              {origin ? (
                <p className="flex items-center gap-1.5 font-sans text-xs text-neutral-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{origin}</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Telemetry */}
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
                  {L(lang, 'Histórico detalhado indisponível no momento.', 'Detailed history unavailable at this time.', 'Historique détaillé indisponible pour le moment.', 'El historial detallado no está disponible por ahora.')}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Record: the organization's in large type, the whole career beside it */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48] animate-pulse" />
                      <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-400 font-bold">
                        {L(lang, `CARTEL NO ${org.shortName}`, `${org.shortName} RECORD`, `PALMARÈS CHEZ ${org.shortName}`, `RÉCORD EN ${orgEs(org).toUpperCase()}`)}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-3 sm:gap-5 flex-wrap">
                      <span className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white tabular-nums leading-none">{orgTotal}</span>
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                          {orgRecord.wins} {L(lang, 'VITÓRIAS', 'WINS', 'VICTOIRES', 'VICTORIAS')} • {orgRecord.losses} {L(lang, 'DERROTAS', 'LOSSES', 'DÉFAITES', 'DERROTAS')}
                          {orgRecord.draws ? ` • ${orgRecord.draws} ${L(lang, 'EMPATES', 'DRAWS', 'NULS', 'EMPATES')}` : ''}
                        </p>
                        <p className="font-sans text-[11px] text-neutral-400">
                          {L(lang, `${orgWinRate}% de aproveitamento no ${org.shortName}`, `${orgWinRate}% ${org.shortName} win rate`, `${orgWinRate}% de victoires chez ${org.shortName}`, `${orgWinRate}% de victorias en ${orgEs(org)}`)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <div>
                      <p className={label}>{L(lang, 'ALTURA', 'HEIGHT', 'TAILLE', 'ESTATURA')}</p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">{profile?.height_cm ? `${Math.round(profile.height_cm)} cm` : '—'}</p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {profile?.height_cm ? `${Math.floor(profile.height_cm / 30.48)}'${Math.round((profile.height_cm % 30.48) / 2.54)}"` : ''}
                      </p>
                    </div>
                    <div>
                      <p className={label}>{L(lang, 'PESO', 'WEIGHT', 'POIDS', 'PESO')}</p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">{profile?.weight_lbs ? `${Math.round(profile.weight_lbs)} lb` : '—'}</p>
                      <p className="font-mono text-[10px] text-neutral-400">{profile?.weight_lbs ? `${(profile.weight_lbs * 0.45359237).toFixed(1)} kg` : ''}</p>
                    </div>
                    <div>
                      <p className={label}>{L(lang, 'ENVERGADURA', 'REACH', 'ALLONGE', 'ALCANCE')}</p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">{profile?.reach_cm ? `${Math.round(profile.reach_cm)} cm` : '—'}</p>
                      <p className="font-mono text-[10px] text-neutral-400">{profile?.reach_cm ? `${Math.round(profile.reach_cm / 2.54)}"` : ''}</p>
                    </div>
                    <div>
                      <p className={label}>{L(lang, 'IDADE', 'AGE', 'ÂGE', 'EDAD')}</p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
                        {profile?.age ? `${Math.floor(profile.age)} ${L(lang, 'anos', 'yrs', 'ans', 'años')}` : '—'}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {archived
                          ? L(lang, `Arquivo ${org.shortName}`, `${org.shortName} archive`, `Archives ${org.shortName}`, `Archivo de ${orgEs(org)}`)
                          : profile?.is_active
                            ? L(lang, `Ativo no ${org.shortName}`, `Active ${org.shortName}`, `Actif ${org.shortName}`, `Activo en ${orgEs(org)}`)
                            : L(lang, `Plantel ${org.shortName}`, `${org.shortName} Roster`, `Effectif ${org.shortName}`, `Plantel de ${orgEs(org)}`)}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className={label}>{L(lang, 'EQUIPE', 'CAMP', 'ÉQUIPE', 'EQUIPO')}</p>
                      <p className="font-mono text-sm font-bold text-white truncate mt-0.5">{profile?.camp ?? '—'}</p>
                      <p className="font-mono text-[10px] text-neutral-400 truncate">{profile?.fighting_out_of ?? ''}</p>
                    </div>
                  </div>

                  {hasProRecord ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                      <div className="space-y-0.5">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                          {L(lang, 'CARTEL PROFISSIONAL COMPLETO', 'COMPLETE PROFESSIONAL RECORD', 'PALMARÈS PROFESSIONNEL COMPLET', 'RÉCORD PROFESIONAL COMPLETO')}
                        </p>
                        <p className="font-mono text-xs sm:text-sm font-bold text-neutral-200 tabular-nums">
                          {proTotal} {L(lang, 'LUTAS', 'BOUTS', 'COMBATS', 'PELEAS')} • {proWins}V - {proLosses}D{profile?.draws ? ` - ${profile.draws}E` : ''}{profile?.no_contests ? ` - ${profile.no_contests}NC` : ''}
                          <span className="text-neutral-400 font-normal text-xs ml-1.5 font-sans">({proWinRate}% {L(lang, 'geral', 'overall', 'global', 'general')})</span>
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 2. How the wins came */}
                {dna.total > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
                      <span>{L(lang, 'DNA DE RESOLUÇÃO // MÉTODO DE VITÓRIAS', 'FINISH BREAKDOWN // METHOD OF VICTORY', 'MÉTHODES DE VICTOIRE // ADN DU COMBATTANT', 'ADN DE FINALIZACIÓN // MÉTODO DE VICTORIA')}</span>
                      <span className="text-amber-400 font-bold">{finishRate}% {L(lang, 'FINALIZADOR', 'FINISHER', 'FINISSEUR', 'FINALIZADOR')}</span>
                    </div>
                    <div className="h-[3px] w-full rounded-full bg-white/10 flex overflow-hidden">
                      <div style={{ width: `${dna.subPct}%` }} className="bg-amber-400 transition-all duration-700" />
                      <div style={{ width: `${dna.koPct}%` }} className="bg-rose-500 transition-all duration-700" />
                      <div style={{ width: `${dna.decPct}%` }} className="bg-sky-400 transition-all duration-700" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="font-bold text-white tabular-nums">{dna.subs}</span> {L(lang, 'FINALIZAÇÕES', 'SUBMISSIONS', 'SOUMISSIONS', 'SUMISIONES')} ({dna.subPct}%)
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="font-bold text-white tabular-nums">{dna.kos}</span> {L(lang, 'NOCAUTES', 'KNOCKOUTS', 'KO / TKO', 'NOCAUTS')} ({dna.koPct}%)
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                        <span className="font-bold text-white tabular-nums">{dna.decs}</span> {L(lang, 'DECISÕES', 'DECISIONS', 'DÉCISIONS', 'DECISIONES')} ({dna.decPct}%)
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* 3. Next bout and the model's reading of it */}
                {nextBout ? (
                  <div className="space-y-2.5 pt-1">
                    {(() => {
                      const opponentTbd = isTbd(nextBout.opponent)
                      return (
                        <>
                          <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
                            <span className="min-w-0 truncate">{L(lang, 'PRÓXIMO COMBATE', 'NEXT BOUT', 'PROCHAIN COMBAT', 'PRÓXIMA PELEA')} // {nextBout.event}</span>
                            <span className="shrink-0 text-amber-400 font-bold">
                              {opponentTbd
                                ? L(lang, 'BUSCA POR OPONENTE', 'SEEKING OPPONENT', 'RECHERCHE D\'ADVERSAIRE', 'BUSCA RIVAL')
                                : nextPrediction
                                  ? L(lang, 'PROGNÓSTICO POR IA', 'AI WIN FORECAST', 'PRONOSTIC IA', 'PRONÓSTICO DE LA IA')
                                  : formatDate(nextBout.date, true, lang).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between font-display font-bold text-base sm:text-lg text-white">
                            <span className="truncate">
                              {name}{' '}
                              {nextPrediction ? <span className="font-mono text-xs text-amber-400 tabular-nums">({nextPrediction.fighterProb}%)</span> : null}
                            </span>
                            <span className="px-3 text-neutral-400 font-mono text-xs font-normal">VS</span>
                            {opponentTbd ? (
                              <span className="truncate text-right font-mono text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider">
                                ✦ {L(lang, 'Aguardando Adversário (a definir)', 'Awaiting Opponent (TBD)', 'Adversaire à déterminer', 'Esperando rival (por definir)')}
                              </span>
                            ) : known.has(normalizeFighterName(nextBout.opponent)) ? (
                              <button
                                type="button"
                                onClick={() => onSelectFighter(nextBout.opponent)}
                                className="truncate text-right hover:text-sky-400 transition cursor-pointer font-bold"
                                title={L(lang, `Ver perfil de ${nextBout.opponent}`, `View profile of ${nextBout.opponent}`, `Voir le profil de ${nextBout.opponent}`, `Ver el perfil de ${nextBout.opponent}`)}
                              >
                                {nextBout.opponent}{' '}
                                {nextPrediction ? <span className="font-mono text-xs text-sky-400 tabular-nums">({nextPrediction.oppProb}%)</span> : null}
                              </button>
                            ) : (
                              <span className="truncate text-right font-bold">
                                {nextBout.opponent}{' '}
                                {nextPrediction ? <span className="font-mono text-xs text-sky-400 tabular-nums">({nextPrediction.oppProb}%)</span> : null}
                              </span>
                            )}
                          </div>

                          {opponentTbd ? (
                            <div className="h-[3px] w-full rounded-full bg-amber-400/20 overflow-hidden">
                              <div className="h-full w-full bg-gradient-to-r from-amber-500/30 via-amber-400 to-amber-500/30 animate-pulse" />
                            </div>
                          ) : nextPrediction ? (
                            <div className="h-[3px] w-full rounded-full bg-white/10 flex overflow-hidden">
                              <div style={{ width: `${nextPrediction.fighterProb}%` }} className="bg-amber-400 transition-all duration-700" />
                              <div style={{ width: `${nextPrediction.oppProb}%` }} className="bg-sky-400 transition-all duration-700" />
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between font-sans text-[11px] text-neutral-400">
                            <span>{nextDetails?.weight_class ? getDivisionName(nextDetails.weight_class, lang) : L(lang, 'Card Principal', 'Main Card', 'Carte Principale', 'Cartelera principal')}</span>
                            <span className="font-mono text-[10px] uppercase text-neutral-400">
                              {opponentTbd
                                ? L(lang, '✦ Luta Mantida • Buscando Substituto', '✦ Bout Booked • Seeking Opponent', '✦ Combat Confirmé • En recherche d\'adversaire', '✦ Pelea confirmada • Busca rival')
                                : nextDetails?.title_fight
                                  ? L(lang, '✦ Disputa de Cinturão', '✦ Title Fight', '✦ Combat pour le Titre', '✦ Pelea por el título')
                                  : L(lang, 'Combate Confirmado', 'Confirmed Bout', 'Combat Confirmé', 'Pelea confirmada')}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : archived ? null : (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
                      {L(lang, 'PRÓXIMO COMBATE // AGUARDANDO CASAMENTO DE LUTA', 'NEXT BOUT // AWAITING FIGHT SCHEDULING', 'PROCHAIN COMBAT // EN ATTENTE D\'ANNONCE', 'PRÓXIMA PELEA // A LA ESPERA DE PROGRAMACIÓN')}
                    </p>
                  </div>
                )}

                {/* 4. Striking numbers */}
                <div className="grid grid-cols-3 gap-6 pt-3 border-t border-white/[0.06]">
                  <Metric value={profile?.sig_strikes_landed_per_min != null ? profile.sig_strikes_landed_per_min.toFixed(2) : '—'} label={L(lang, 'Golpes / Min (SLpM)', 'Strikes / Min (SLpM)', 'Coups / Min (SLpM)', 'Golpes / min (SLpM)')} />
                  <Metric value={profile?.striking_defense != null ? `${Math.round(profile.striking_defense * 100)}%` : '—'} label={L(lang, 'Defesa de Golpes', 'Striking Defense', 'Défense Frappes', 'Defensa de golpes')} />
                  <Metric value={profile?.takedown_defense != null ? `${Math.round(profile.takedown_defense * 100)}%` : '—'} label={L(lang, 'Defesa de Quedas', 'Takedown Defense', 'Défense au sol', 'Defensa de derribos')} />
                </div>

                {profile?.profile_url ? (
                  <a
                    href={profile.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-300 underline decoration-white/30 underline-offset-4 hover:text-white"
                  >
                    {L(lang, `Perfil oficial no ${org.sourceName}`, `Profile on ${org.sourceName}`, `Profil officiel sur ${org.sourceName}`, `Perfil oficial en ${org.sourceName}`)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </>
            )}
          </div>
        </div>

        <SeasonFightsPanel
          era={selectedEra}
          eras={timelineEras}
          onSelectEra={setSelectedEra}
          onSelectFighter={openFighter}
          fallbackDivision={profile?.division}
          defaultOrganization={org.shortName}
          methodLabel={(fight) => formatMethod(fight.method, null, lang)}
        />

        {/* Season timeline */}
        <div className="relative border-t border-white/[0.08] bg-black/60 backdrop-blur-md px-4 sm:px-8 py-2.5 sm:py-3.5 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-400 mb-2 font-semibold">
            <span>{L(lang, 'RÉGUA CRONOLÓGICA // HISTÓRICO DE TEMPORADAS', 'TIMELINE // SEASONAL CAREER HISTORY', 'CHRONOLOGIE // HISTORIQUE DE CARRIÈRE', 'LÍNEA DE TIEMPO // HISTORIAL DE TEMPORADAS')}</span>
            <span className="hidden sm:inline text-amber-400/90 font-medium">
              {selectedEra
                ? `✦ ${L(lang, 'TEMPORADA', 'SEASON', 'SAISON', 'TEMPORADA')} ${selectedEra.year} ${L(lang, 'SELECIONADA • CLIQUE PARA ALTERNAR OU FECHAR', 'SELECTED • CLICK TO TOGGLE OR CLOSE', 'SÉLECTIONNÉE • CLIQUER POUR FERMER', 'SELECCIONADA • CLIC PARA ALTERNAR O CERRAR')}`
                : L(lang, 'CLIQUE NO ANO PARA EXIBIR AS LUTAS ⇄', 'CLICK A YEAR TO VIEW BOUTS ⇄', 'CLIQUEZ SUR UNE ANNÉE POUR VOIR LES COMBATS ⇄', 'HAZ CLIC EN UN AÑO PARA VER LAS PELEAS ⇄')}
            </span>
          </div>

          {timelineEras.length === 0 ? (
            <p className="font-sans text-xs text-neutral-400 py-2">
              {loading
                ? L(lang, 'Carregando histórico…', 'Loading history…', 'Chargement de l\'historique…', 'Cargando historial…')
                : L(lang, `Nenhuma luta no ${org.shortName} registrada ainda.`, `No ${org.shortName} fights recorded yet.`, `Aucun combat ${org.shortName} enregistré pour l'instant.`, `Aún no hay peleas registradas en ${orgEs(org)}.`)}
            </p>
          ) : (
            <SeasonTimeline
              eras={timelineEras}
              selectedYear={selectedEra?.year ?? null}
              lang={lang}
              onSelect={(era) => setSelectedEra((previous) => (previous?.year === era.year ? null : era))}
            />
          )}
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display font-bold text-xl sm:text-2xl text-white tabular-nums">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-medium">{label}</p>
    </div>
  )
}
