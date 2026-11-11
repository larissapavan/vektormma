import { motion } from 'framer-motion'
import { ExternalLink, MapPin, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import { formatDate, formatMethod, nonMmaDiscipline, originLine, profileSource } from '../data/orgFormat'
import { OrgSportTag } from './OrgFightRow'
import { orgEs, orgFr, orgPt, type OrgConfig } from '../data/orgs'
import { translateHometown } from '../data/fightLabels'
import { normalizeFighterName } from '../hooks/useFighterImages'
import { useOrgFighterFights, useOrgFighters } from '../hooks/useOrgData'
import { useUpcomingPicks } from '../hooks/useUpcomingPicks'
import type { FightRecord, OrgSeasonStats } from '../types/api'
import { FighterProfileModal } from './FighterProfileModal'
import { FinishBreakdown } from './FinishBreakdown'
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
 * One profile per person. A fighter who also fought in the UFC opens the UFC profile, which holds the whole career and
 * lists the fights in the other organizations too; the profile of the organization is for those who never fought there.
 * A name the organization does not have (an opponent picked inside the UFC profile) is the UFC's as well.
 */
export function OrgFighterModal(props: {
  org: OrgConfig
  name: string
  onClose: () => void
  onSelectFighter: (name: string) => void
}) {
  const { fighters } = useOrgFighters(props.org.id)
  const own = fighters.find((fighter) => normalizeFighterName(fighter.name) === normalizeFighterName(props.name))
  const ufcName = own ? own.ufc_name : fighters.length > 0 ? props.name : null
  if (ufcName) return <FighterProfileModal name={ufcName} onClose={props.onClose} onSelectFighter={props.onSelectFighter} />
  return <OrgOnlyFighterModal {...props} />
}

/**
 * The fighter profile of every organization other than the UFC, laid out like the UFC one: the photo and the titles on
 * the left; the record, the build, how the wins came, the next bout with the model's pick and the striking numbers on
 * the right; the season-by-season timeline along the foot.
 */
function OrgOnlyFighterModal({
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
    if (profile?.country) parts.push(translateHometown(profile.country, lang))
    else if (profile?.hometown) {
      const place = translateHometown(profile.hometown.split(',').pop()?.trim(), lang)
      if (place) parts.push(place)
    } else parts.push(org.shortName.toUpperCase())

    parts.push(profile?.division ? getDivisionName(profile.division, lang) : L(lang, 'Peso livre', 'Open weight', 'Poids libre', 'Peso abierto'))

    const place = profile?.ranking?.match(/^#(\d+)\s*(.*)$/)
    if (place) {
      parts.push(place[2] === 'P4P' ? `P4P #${place[1]}` : `${L(lang, 'Desafiante', 'Contender', 'Aspirant', 'Aspirante')} #${place[1]}`)
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
  // The profile link goes to the site the profile is on: a RIZIN or KSW fighter can have an ESPN page or, from 2025, a Sherdog one.
  const profileLabel = profileSource(profile?.profile_url, org.sourceName)
  // The record counts every bout of the organization; the ones that are not MMA are flagged in the history.
  const otherSports = useMemo(() => completedFights.filter((fight) => nonMmaDiscipline(fight.discipline) !== null).length, [completedFights])
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
        milestone = L(lang, `Estreia ${orgPt(org, 'em')}`, `${org.shortName} Debut`, `Début ${org.shortName}`, `Debut en ${orgEs(org)}`)
      } else if (seasonFights.some((fight) => fight.result === 'win' && fight.title_fight)) {
        milestone = L(lang, 'Cinturão conquistado', 'Won the title', 'Titre conquis', 'Título conquistado')
      } else if (wins >= 3 && losses === 0) {
        milestone = L(lang, 'Ano invicto', 'Unbeaten year', 'Année sans défaite', 'Año invicto')
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
    ? L(lang, 'Arquivo histórico', 'Historical archive', 'Archives', 'Archivo histórico')
    : profile?.is_active === false
      ? L(lang, 'Atleta inativo', 'Inactive fighter', 'Combattant inactif', 'Peleador inactivo')
      : L(lang, 'Atleta ativo', 'Active fighter', 'Combattant actif', 'Peleador activo')

  const label = 'text-label font-semibold text-[var(--muted)]'

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[var(--modal-backdrop)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        role="dialog"
        aria-label={L(lang, `${name}, perfil ${orgPt(org, 'em')}`, `${name}, ${org.shortName} fighter profile`, `${name}, profil ${org.shortName}`, `${name}, perfil de peleador de ${orgEs(org)}`)}
        className="relative flex h-[min(90vh,880px)] w-full max-w-6xl flex-col overflow-hidden border border-[var(--rule)] bg-[var(--mat)] text-[var(--ink)]"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-30 flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-[var(--rule)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)] hover:border-[var(--rule)] transition cursor-pointer"
            aria-label={L(lang, 'Fechar perfil do lutador', 'Close fighter profile', 'Fermer le profil du combattant', 'Cerrar el perfil del peleador')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid-rows-[minmax(0,1fr)]">
          {/* Photo and titles */}
          <div className="relative min-h-[220px] sm:min-h-[280px] lg:min-h-0 lg:h-full lg:col-span-5 overflow-hidden flex flex-col justify-end p-5 pb-2.5 sm:p-7 sm:pb-4 lg:p-9 select-none">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
                <div className="w-full h-full flex items-center justify-center font-display font-black text-8xl text-[var(--muted)]">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0" />
              <div className="hidden lg:block absolute inset-0" />
            </div>

            <PhotoCredit imageUrl={imageUrl} className="left-2 top-4" />

            <div className="relative z-10 space-y-2.5 pb-1">
              <div className="inline-flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${profile?.is_active !== false && !archived ? 'bg-[var(--positive)]' : 'bg-[var(--muted)]'}`} />
                <span className="text-label text-[var(--muted)] font-semibold">{statusLabel}</span>
              </div>

              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[2.6rem] text-[var(--ink)] leading-[0.95] break-words">
                {name}
              </h1>
              {profile?.nickname ? <p className="font-sans text-sm italic text-[var(--ink)]">“{profile.nickname}”</p> : null}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {isChampion ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold)]">
                    <Trophy className="h-3.5 w-3.5 text-[var(--gold)]" />
                    <span>
                      {isInterim
                        ? L(lang, 'Campeão interino', 'Interim champion', 'Champion intérimaire', 'Campeón interino')
                        : archived
                          ? L(lang, 'Último campeão', 'Final champion', 'Dernier champion', 'Último campeón')
                          : L(lang, 'Campeão', 'Champion', 'Champion', 'Campeón')}
                      {championDivision ? ` ${getDivisionName(championDivision, lang)}` : ''}
                    </span>
                  </span>
                ) : null}

                {formerTitles.map((title) => (
                  <span
                    key={`former-${title}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--panel)] px-2.5 py-1 text-label font-bold text-[var(--ink)]"
                  >
                    {L(
                      lang,
                      `Ex-Campeão ${getDivisionName(title, 'pt')}`,
                      `Former ${getDivisionName(title, 'en')} champion`,
                      `Ancien champion ${getDivisionName(title, 'fr')}`,
                      `Excampeón de ${getDivisionName(title, 'es')}`,
                    )}
                  </span>
                ))}
              </div>

              <p className="flex flex-wrap items-center gap-x-2 text-xs sm:text-[13px] text-[var(--muted)] font-medium">
                {profile?.country_code ? <FlagIcon code={profile.country_code} country={profile.country} /> : null}
                <span>{signatureLine}</span>
              </p>
              {origin ? (
                <p className="flex items-center gap-1.5 font-sans text-xs text-[var(--muted)]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{origin}</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Telemetry */}
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
                  {L(lang, 'Histórico detalhado indisponível no momento.', 'Detailed history unavailable at this time.', 'Historique détaillé indisponible pour le moment.', 'El historial detallado no está disponible por ahora.')}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Record: the organization's in large type, the whole career beside it */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
                      <p className="text-label text-[var(--muted)] font-bold">
                        {L(lang, `Cartel no ${org.shortName}`, `${org.shortName} record`, `Palmarès chez ${org.shortName}`, `Récord en ${orgEs(org)}`)}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-3 sm:gap-5 flex-wrap">
                      <span className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] tabular-nums leading-none">{orgTotal}</span>
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                          {orgRecord.wins} {L(lang, 'vitórias', 'wins', 'victoires', 'victorias')} • {orgRecord.losses} {L(lang, 'derrotas', 'losses', 'défaites', 'derrotas')}
                          {orgRecord.draws ? ` • ${orgRecord.draws} ${L(lang, 'Empates', 'Draws', 'Nuls', 'Empates')}` : ''}
                        </p>
                        <p className="font-sans text-label text-[var(--muted)]">
                          {L(lang, `${orgWinRate}% de aproveitamento ${orgPt(org, 'em')}`, `${orgWinRate}% ${org.shortName} win rate`, `${orgWinRate} % de victoires chez ${org.shortName}`, `${orgWinRate} % de victorias en ${orgEs(org)}`)}
                        </p>
                        {otherSports > 0 ? (
                          <p className="font-sans text-label text-[var(--muted)]">
                            {L(
                              lang,
                              `Inclui ${otherSports} ${otherSports === 1 ? 'luta que não é de MMA' : 'lutas que não são de MMA'}, sinalizadas no histórico.`,
                              `Includes ${otherSports} non-MMA ${otherSports === 1 ? 'bout' : 'bouts'}, flagged in the fight history.`,
                              `Comprend ${otherSports} ${otherSports === 1 ? 'combat qui n’est pas du MMA' : 'combats qui ne sont pas du MMA'}, signalé${otherSports === 1 ? '' : 's'} dans l’historique.`,
                              `Incluye ${otherSports} ${otherSports === 1 ? 'pelea que no es de MMA' : 'peleas que no son de MMA'}, señaladas en el historial.`,
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 border border-[var(--rule)] bg-[var(--panel)]">
                    <div>
                      <p className={label}>{L(lang, 'Altura', 'Height', 'Taille', 'Estatura')}</p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">{profile?.height_cm ? `${Math.round(profile.height_cm)} cm` : '—'}</p>
                      <p className="text-label text-[var(--muted)]">
                        {profile?.height_cm ? `${Math.floor(profile.height_cm / 30.48)}'${Math.round((profile.height_cm % 30.48) / 2.54)}"` : ''}
                      </p>
                    </div>
                    <div>
                      <p className={label}>{L(lang, 'Peso', 'Weight', 'Poids', 'Peso')}</p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">{profile?.weight_lbs ? `${Math.round(profile.weight_lbs)} lb` : '—'}</p>
                      <p className="text-label text-[var(--muted)]">{profile?.weight_lbs ? `${(profile.weight_lbs * 0.45359237).toFixed(1)} kg` : ''}</p>
                    </div>
                    <div>
                      <p className={label}>{L(lang, 'Envergadura', 'Reach', 'Allonge', 'Alcance')}</p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">{profile?.reach_cm ? `${Math.round(profile.reach_cm)} cm` : '—'}</p>
                      <p className="text-label text-[var(--muted)]">{profile?.reach_cm ? `${Math.round(profile.reach_cm / 2.54)}"` : ''}</p>
                    </div>
                    <div>
                      <p className={label}>{L(lang, 'Idade', 'Age', 'Âge', 'Edad')}</p>
                      <p className="text-sm font-bold text-[var(--ink)] tabular-nums mt-0.5">
                        {profile?.age ? `${Math.floor(profile.age)} ${L(lang, 'anos', 'yrs', 'ans', 'años')}` : '—'}
                      </p>
                      <p className="text-label text-[var(--muted)]">
                        {archived
                          ? L(lang, `Arquivo ${org.shortName}`, `${org.shortName} archive`, `Archives ${org.shortName}`, `Archivo de ${orgEs(org)}`)
                          : profile?.is_active
                            ? L(lang, `Ativo ${orgPt(org, 'em')}`, `Active ${org.shortName}`, `Actif ${org.shortName}`, `Activo en ${orgEs(org)}`)
                            : L(lang, `Plantel ${org.shortName}`, `${org.shortName} Roster`, `Effectif ${org.shortName}`, `Plantel de ${orgEs(org)}`)}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className={label}>{L(lang, 'Equipe', 'Camp', 'Équipe', 'Equipo')}</p>
                      <p className="text-sm font-bold text-[var(--ink)] truncate mt-0.5">{profile?.camp ?? '—'}</p>
                      <p className="text-label text-[var(--muted)] truncate">{profile?.fighting_out_of ?? ''}</p>
                    </div>
                  </div>

                  {hasProRecord ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border border-[var(--rule)] bg-[var(--panel)]">
                      <div className="space-y-0.5">
                        <p className="text-label text-[var(--gold)] font-bold">
                          {L(lang, 'Cartel profissional completo', 'Complete professional record', 'Palmarès professionnel complet', 'Récord profesional completo')}
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-[var(--ink)] tabular-nums">
                          {proTotal} {L(lang, 'Lutas', 'Bouts', 'Combats', 'Peleas')} • {proWins}V - {proLosses}D{profile?.draws ? ` - ${profile.draws}E` : ''}{profile?.no_contests ? ` - ${profile.no_contests}NC` : ''}
                          <span className="text-[var(--muted)] font-normal text-xs ml-1.5 font-sans">({proWinRate}% {L(lang, 'geral', 'overall', 'global', 'general')})</span>
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 2. How the wins came */}
                {dna.total > 0 ? <FinishBreakdown dna={dna} finishRate={finishRate} language={lang} /> : null}

                {/* 3. Next bout and the model's reading of it */}
                {nextBout ? (
                  <div className="space-y-2.5 pt-1">
                    {(() => {
                      const opponentTbd = isTbd(nextBout.opponent)
                      return (
                        <>
                          <div className="flex items-center justify-between gap-3 text-label text-[var(--muted)] font-semibold">
                            <span className="min-w-0 truncate">{L(lang, 'Próximo combate', 'Next bout', 'Prochain combat', 'Próxima pelea')} // {nextBout.event}</span>
                            <span className="shrink-0 text-[var(--gold)] font-bold">
                              {opponentTbd
                                ? L(lang, 'Busca por oponente', 'Seeking opponent', 'Recherche d’adversaire', 'Busca rival')
                                : nextPrediction
                                  ? L(lang, 'Chance estimada pelo modelo', 'Model’s estimated chance', 'Chance estimée par le modèle', 'Probabilidad estimada por el modelo')
                                  : formatDate(nextBout.date, true, lang)}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between font-display font-bold text-base sm:text-lg text-[var(--ink)]">
                            <span className="truncate">
                              {name}{' '}
                              {nextPrediction ? <span className="text-xs text-[var(--gold)] tabular-nums">({nextPrediction.fighterProb}%)</span> : null}
                            </span>
                            <span className="px-3 text-[var(--muted)] text-xs font-normal">VS</span>
                            {opponentTbd ? (
                              <span className="truncate text-right text-xs sm:text-sm font-bold text-[var(--gold)]">
                                {L(lang, 'Aguardando adversário (a definir)', 'Awaiting opponent (TBD)', 'Adversaire à déterminer', 'Esperando rival (por definir)')}
                              </span>
                            ) : known.has(normalizeFighterName(nextBout.opponent)) ? (
                              <button
                                type="button"
                                onClick={() => onSelectFighter(nextBout.opponent)}
                                className="truncate text-right hover:text-[var(--ink)] transition cursor-pointer font-bold"
                                title={L(lang, `Ver perfil de ${nextBout.opponent}`, `View profile of ${nextBout.opponent}`, `Voir le profil de ${nextBout.opponent}`, `Ver el perfil de ${nextBout.opponent}`)}
                              >
                                {nextBout.opponent}{' '}
                                {nextPrediction ? <span className="text-xs text-[var(--ink)] tabular-nums">({nextPrediction.oppProb}%)</span> : null}
                              </button>
                            ) : (
                              <span className="truncate text-right font-bold">
                                {nextBout.opponent}{' '}
                                {nextPrediction ? <span className="text-xs text-[var(--ink)] tabular-nums">({nextPrediction.oppProb}%)</span> : null}
                              </span>
                            )}
                          </div>

                          {opponentTbd ? (
                            <div className="h-[3px] w-full rounded-full bg-[var(--gold-fill)] overflow-hidden">
                              <div className="h-full w-full" />
                            </div>
                          ) : nextPrediction ? (
                            <div className="flex h-2 w-full gap-[2px] overflow-hidden">
                              <div style={{ width: `${nextPrediction.fighterProb}%` }} className="bg-[var(--ink)]" />
                              <div style={{ width: `${nextPrediction.oppProb}%` }} className="bg-[var(--track)]" />
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between font-sans text-label text-[var(--muted)]">
                            <span className="inline-flex flex-wrap items-center gap-1.5">{nextDetails?.weight_class ? getDivisionName(nextDetails.weight_class, lang) : L(lang, 'Card principal', 'Main card', 'Carte principale', 'Cartelera principal')}<OrgSportTag discipline={nextDetails?.discipline} /></span>
                            <span className="text-label text-[var(--muted)]">
                              {opponentTbd
                                ? L(lang, 'Luta mantida • Buscando substituto', 'Bout booked • Seeking opponent', 'Combat confirmé • En recherche d’adversaire', 'Pelea confirmada • Busca rival')
                                : nextDetails?.title_fight
                                  ? L(lang, 'Disputa de cinturão', 'Title fight', 'Combat pour le titre', 'Pelea por el título')
                                  : L(lang, 'Combate confirmado', 'Confirmed bout', 'Combat confirmé', 'Pelea confirmada')}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : archived ? null : (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-label text-[var(--muted)] font-semibold">
                      {L(lang, 'Próxima luta: ainda não marcada', 'Next fight: not booked yet', 'Prochain combat : pas encore programmé', 'Próxima pelea: aún no programada')}
                    </p>
                  </div>
                )}

                {/* 4. Striking numbers: the organization's own season stats when it prints them (the PFL), else nothing is measured */}
                {org.hasSeasonStats && profile?.season_stats?.length ? (
                  <SeasonStatsTable org={org} seasons={profile.season_stats} lang={lang} />
                ) : (
                  <div className="space-y-2 pt-3 border-t border-[var(--rule)]">
                    <div className="grid grid-cols-3 gap-6">
                      <Metric value={profile?.sig_strikes_landed_per_min != null ? profile.sig_strikes_landed_per_min.toFixed(2) : '—'} label={L(lang, 'Golpes / Min (SLpM)', 'Strikes / Min (SLpM)', 'Coups / min (SLpM)', 'Golpes / min (SLpM)')} />
                      <Metric value={profile?.striking_defense != null ? `${Math.round(profile.striking_defense * 100)}%` : '—'} label={L(lang, 'Defesa de golpes', 'Striking defense', 'Défense frappes', 'Defensa de golpes')} />
                      <Metric value={profile?.takedown_defense != null ? `${Math.round(profile.takedown_defense * 100)}%` : '—'} label={L(lang, 'Defesa de quedas', 'Takedown defense', 'Défense au sol', 'Defensa de derribos')} />
                    </div>
                    {profile?.sig_strikes_landed_per_min == null && profile?.striking_defense == null && profile?.takedown_defense == null ? (
                      <p className="font-sans text-label text-[var(--muted)]">
                        {org.hasSeasonStats
                          ? L(
                              lang,
                              `${orgPt(org, 'O')} não publicou estatísticas de golpes e quedas para este atleta.`,
                              `${org.shortName} has not published striking or takedown statistics for this fighter.`,
                              `${orgFr(org, 'Le')} n’a pas publié de statistiques de frappe ni de takedowns pour ce combattant.`,
                              `${orgEs(org)} no ha publicado estadísticas de golpes ni de derribos de este peleador.`,
                            )
                          : L(
                              lang,
                              `${orgPt(org, 'O')} não publica estatísticas de golpes e quedas.`,
                              `${org.shortName} does not publish striking or takedown statistics.`,
                              `${orgFr(org, 'Le')} ne publie pas de statistiques de frappe ni de takedowns.`,
                              `${orgEs(org)} no publica estadísticas de golpes ni de derribos.`,
                            )}
                      </p>
                    ) : null}
                  </div>
                )}

                {profile?.profile_url ? (
                  <a
                    href={profile.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-label font-semibold text-[var(--ink)] underline decoration-[var(--rule)] underline-offset-4 hover:text-[var(--ink)]"
                  >
                    {org.partialCoverage
                      ? L(lang, `Perfil no ${profileLabel}`, `Profile on ${profileLabel}`, `Profil sur ${profileLabel}`, `Perfil en ${profileLabel}`)
                      : L(lang, `Perfil oficial no ${org.sourceName}`, `Profile on ${org.sourceName}`, `Profil officiel sur ${org.sourceName}`, `Perfil oficial en ${org.sourceName}`)}
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
        <div className="relative border-t border-[var(--rule)] bg-[var(--mat)] px-4 sm:px-8 py-2.5 sm:py-3.5 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between text-label text-[var(--muted)] mb-2 font-semibold">
            <span>{L(lang, 'Carreira ano a ano', 'Career year by year', 'Carrière année par année', 'Carrera año por año')}</span>
            <span className="hidden sm:inline text-[var(--muted)] font-medium">
              {selectedEra
                ? `${L(lang, 'Temporada', 'Season', 'Saison', 'Temporada')} ${selectedEra.year} ${L(lang, 'aberta. Clique de novo para fechar', 'open. Click again to close', 'ouverte. Cliquez à nouveau pour fermer', 'abierta. Haz clic de nuevo para cerrar')}`
                : L(lang, 'Escolha um ano para ver as lutas', 'Pick a year to see the fights', 'Choisissez une année pour voir les combats', 'Elige un año para ver las peleas')}
            </span>
          </div>

          {timelineEras.length === 0 ? (
            <p className="font-sans text-xs text-[var(--muted)] py-2">
              {loading
                ? L(lang, 'Carregando histórico…', 'Loading history…', 'Chargement de l’historique…', 'Cargando historial…')
                : L(lang, `Nenhuma luta ${orgPt(org, 'em')} registrada ainda.`, `No ${org.shortName} fights recorded yet.`, `Aucun combat ${org.shortName} enregistré pour l’instant.`, `Aún no hay peleas registradas en ${orgEs(org)}.`)}
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

/** The organization's own season tallies, as it prints them ("landed / attempted"): one row per season, newest first. */
function SeasonStatsTable({ org, seasons, lang }: { org: OrgConfig; seasons: OrgSeasonStats[]; lang: string }) {
  const tally = (value?: string | null) => (value ? value.replace('/', ' / ') : '—')
  const columns: { label: string; value: (season: OrgSeasonStats) => string }[] = [
    { label: L(lang, 'Golpes', 'Strikes', 'Coups', 'Golpes'), value: (season) => tally(season.strikes) },
    { label: L(lang, 'Braço', 'Arm', 'Bras', 'Brazo'), value: (season) => tally(season.arm_strikes) },
    { label: L(lang, 'Perna', 'Leg', 'Jambe', 'Pierna'), value: (season) => tally(season.leg_strikes) },
    { label: L(lang, 'Solo', 'Ground', 'Sol', 'Suelo'), value: (season) => tally(season.ground_strikes) },
    { label: L(lang, 'Quedas', 'Takedowns', 'Amenées', 'Derribos'), value: (season) => tally(season.takedowns) },
    { label: L(lang, 'Vel. do soco', 'Punch speed', 'Vitesse du coup', 'Velocidad del golpe'), value: (season) => (season.max_punch_speed_mph ? `${season.max_punch_speed_mph} mph` : '—') },
  ]
  return (
    <div className="space-y-2 pt-3 border-t border-[var(--rule)]">
      <p className="text-label text-[var(--muted)] font-semibold">
        {L(lang, `Estatísticas por temporada // ${org.shortName}`, `Season stats // ${org.shortName}`, `Stats par saison // ${org.shortName}`, `Estadísticas por temporada // ${org.shortName}`)}
      </p>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[460px] whitespace-nowrap text-left text-xs tabular-nums">
          <thead>
            <tr className="text-label text-[var(--muted)]">
              <th scope="col" className="py-1 pr-3 font-medium">{L(lang, 'Temporada', 'Season', 'Saison', 'Temporada')}</th>
              {columns.map((column) => (
                <th key={column.label} scope="col" className="py-1 pr-3 font-medium">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <tr key={season.season} className="border-t border-[var(--rule)] text-[var(--ink)]">
                <th scope="row" className="py-1.5 pr-3 font-bold">{season.season}</th>
                {columns.map((column) => (
                  <td key={column.label} className="py-1.5 pr-3">{column.value(season)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-sans text-label text-[var(--muted)]">
        {L(
          lang,
          `Números como ${orgPt(org, 'o')} os publica (acertos / tentativas), por temporada. É a contagem ${orgPt(org, 'de')}, não comparável às estatísticas do UFC.`,
          `Numbers as ${org.shortName} publishes them (landed / attempted), by season. It is ${org.shortName}'s own count, not comparable to UFC statistics.`,
          `Chiffres tels que ${orgFr(org, 'le')} les publie (réussis / tentés), par saison. C’est le décompte ${orgFr(org, 'de')}, non comparable aux statistiques de l’UFC.`,
          `Cifras tal como las publica ${orgEs(org)} (acertados / intentados), por temporada. Es el conteo de ${orgEs(org)}, no comparable con las estadísticas de la UFC.`,
        )}
      </p>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display font-bold text-xl sm:text-2xl text-[var(--ink)] tabular-nums">{value}</p>
      <p className="text-label text-[var(--muted)] font-medium">{label}</p>
    </div>
  )
}
