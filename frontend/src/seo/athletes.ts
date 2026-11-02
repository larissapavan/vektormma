/**
 * The athlete and fight pages as plain text: the address of each, its title, description and body in every language.
 *
 * The data comes from athletes.json (written by scripts/build_seo_athletes.py). The build turns it into one HTML file per
 * athlete and per announced fight (see seoPages in vite.config.ts), and the app uses the same functions for the tab
 * title and the share tags once it runs, so a page reads the same before and after the script starts. No React here: the
 * build imports this file too.
 */

import { L, langPath, type UiLang } from '../i18n/lang'
import { cardPositionLabel } from '../shared/data/cardPosition'
import { divisionOrder, getDivisionName } from '../shared/data/divisions'
import { formatProbability } from '../shared/data/probability'
import { normalizeFighterName } from '../shared/hooks/useFighterImages'
import type { BodyLink, BodyPage, BodySection, RouteText } from './htmlMeta'

export interface AthleteSeo {
  name: string
  slug: string
  nickname: string | null
  division: string | null
  wins: number | null
  losses: number | null
  draws: number | null
  belt: boolean
  titles: string[]
  country: string | null
  countryCode: string | null
  photo: string | null
}

export interface FightSeo {
  slug: string
  event: string
  date: string
  position: number
  titleFight: boolean
  weightClass: string | null
  a: AthleteSeo
  b: AthleteSeo
  pick?: { winner: string; probability: number; winnerIsA: boolean }
}

export interface SeoData {
  athletes: AthleteSeo[]
  fights: FightSeo[]
}

/** "Jon Jones" -> "jon-jones". The same name matching the app uses everywhere, joined with hyphens; the Python script has the twin. */
export function athleteSlug(name: string): string {
  return normalizeFighterName(name).replace(/ /g, '-')
}

export function athletePath(name: string): string {
  return `/athlete/${athleteSlug(name)}`
}

/** "/fight/jon-jones-vs-tom-aspinall": the two names in the order of the card. */
export function fightPath(nameA: string, nameB: string): string {
  return `/fight/${athleteSlug(nameA)}-vs-${athleteSlug(nameB)}`
}

const FIGHT_SLUG = /^(.+)-vs-(.+)$/

/** The two slugs of a /fight/ address, or null. A slug never contains "-vs-" for a fighter named Vs, so the first split is the right one. */
export function splitFightSlug(pair: string): [string, string] | null {
  const match = FIGHT_SLUG.exec(pair)
  return match ? [match[1], match[2]] : null
}

function record(athlete: Pick<AthleteSeo, 'wins' | 'losses' | 'draws'>): string | null {
  if (athlete.wins == null || athlete.losses == null) return null
  return `${athlete.wins}-${athlete.losses}-${athlete.draws ?? 0}`
}

function countryName(code: string | null, language: string): string | null {
  if (!code) return null
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code.toUpperCase()) ?? null
  } catch {
    return null
  }
}

/** "7 nov 2026" in the language, for the day the API sends as 2026-11-07 (the same day everywhere, so no time zone). */
export function eventDay(date: string, language: string): string {
  const tag = L(language, 'pt-BR', 'en-US', 'fr-FR', 'es-419')
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** The fight an athlete is booked in next, if any (the fights are in date order). */
export function nextFightOf(slug: string, fights: FightSeo[]): FightSeo | undefined {
  return fights.find((fight) => fight.a.slug === slug || fight.b.slug === slug)
}

function nicknamePart(athlete: AthleteSeo): string {
  return athlete.nickname ? ` “${athlete.nickname}”` : ''
}

export function athleteText(language: string, athlete: AthleteSeo): RouteText {
  const rec = record(athlete)
  const division = athlete.division ? getDivisionName(athlete.division, language) : null
  const nick = nicknamePart(athlete)
  const recordPart = rec ? L(language, `cartel ${rec}`, `${rec} record`, `palmarès ${rec}`, `récord ${rec}`) : null
  const divisionPart = division ? L(language, `${division} do UFC`, `UFC ${division}`, `${division} de l’UFC`, `${division} de la UFC`) : null
  const facts = [recordPart, divisionPart].filter(Boolean).join(', ')
  const belt = athlete.belt ? L(language, ' Com o cinturão do UFC.', ' Holds a UFC title.', ' Détient une ceinture de l’UFC.', ' Con un título de la UFC.') : ''
  const rest = L(
    language,
    'Estatísticas, histórico de lutas e probabilidade de vitória na próxima luta.',
    'Stats, fight history and win probability for the next fight.',
    'Statistiques, historique des combats et probabilité de victoire pour le prochain combat.',
    'Estadísticas, historial de peleas y probabilidad de victoria en la próxima pelea.',
  )
  const colon = L(language, ': ', ': ', ' : ', ': ')
  return { title: athlete.name, description: `${athlete.name}${nick}${facts ? `${colon}${facts}.` : '.'}${belt} ${rest}` }
}

export function fightText(language: string, fight: FightSeo): RouteText {
  const ra = record(fight.a)
  const rb = record(fight.b)
  const side = (athlete: AthleteSeo, rec: string | null) => (rec ? `${athlete.name} (${rec})` : athlete.name)
  const place = cardPositionLabel(fight.position, language)
  const title = L(language, `${fight.a.name} vs. ${fight.b.name}`, `${fight.a.name} vs. ${fight.b.name}`, `${fight.a.name} vs ${fight.b.name}`, `${fight.a.name} vs. ${fight.b.name}`)
  const day = eventDay(fight.date, language)
  const where = L(language, `${place} do ${fight.event}, ${day}.`, `${place} at ${fight.event}, ${day}.`, `${place} de ${fight.event}, ${day}.`, `${place} de ${fight.event}, ${day}.`)
  const pick = fight.pick
    ? ` ${L(
        language,
        `O modelo favorece ${fight.pick.winner} (${formatProbability(fight.pick.probability)}).`,
        `The model favors ${fight.pick.winner} (${formatProbability(fight.pick.probability)}).`,
        `Le modèle favorise ${fight.pick.winner} (${formatProbability(fight.pick.probability)}).`,
        `El modelo favorece a ${fight.pick.winner} (${formatProbability(fight.pick.probability)}).`,
      )}`
    : ''
  return { title, description: `${side(fight.a, ra)} vs. ${side(fight.b, rb)}. ${where}${pick}` }
}

interface Labels {
  facts: string
  record: string
  division: string
  nickname: string
  country: string
  nextFight: string
  about: string
  moreFighters: string
  allFighters: string
  predictor: string
  headToHead: string
  analysis: string
  card: string
  pick: string
}

function labels(language: string): Labels {
  return {
    facts: L(language, 'Dados do lutador', 'Fighter facts', 'Fiche du combattant', 'Ficha del peleador'),
    record: L(language, 'Cartel', 'Record', 'Palmarès', 'Récord'),
    division: L(language, 'Categoria', 'Division', 'Catégorie', 'Categoría'),
    nickname: L(language, 'Apelido', 'Nickname', 'Surnom', 'Apodo'),
    country: L(language, 'País', 'Country', 'Pays', 'País'),
    nextFight: L(language, 'Próxima luta', 'Next fight', 'Prochain combat', 'Próxima pelea'),
    about: L(language, 'Sobre a luta', 'About the fight', 'À propos du combat', 'Sobre la pelea'),
    moreFighters: L(language, 'Veja também', 'See also', 'Voir aussi', 'Ver también'),
    allFighters: L(language, 'Todos os lutadores', 'All fighters', 'Tous les combattants', 'Todos los peleadores'),
    predictor: L(language, 'Simulador de lutas', 'Fight simulator', 'Simulateur de combats', 'Simulador de peleas'),
    headToHead: L(language, 'Confronto direto', 'Head-to-head', 'Face-à-face', 'Cara a cara'),
    analysis: L(language, 'Análise do confronto e fatores da previsão', 'Matchup analysis and prediction factors', 'Analyse du combat et facteurs du pronostic', 'Análisis del enfrentamiento y factores del pronóstico'),
    card: L(language, 'Card', 'Card', 'Card', 'Cartelera'),
    pick: L(language, 'Previsão do modelo', 'Model pick', 'Pronostic du modèle', 'Pronóstico del modelo'),
  }
}

export function athleteBody(lang: UiLang, athlete: AthleteSeo, fights: FightSeo[]): BodyPage {
  const text = athleteText(lang, athlete)
  const t = labels(lang)
  const rec = record(athlete)
  const country = countryName(athlete.countryCode, lang)
  const bullets = [
    rec ? `${t.record}: ${rec}` : null,
    athlete.division ? `${t.division}: ${getDivisionName(athlete.division, lang)}` : null,
    athlete.nickname ? `${t.nickname}: ${athlete.nickname}` : null,
    country ? `${t.country}: ${country}` : null,
  ].filter((line): line is string => line !== null)
  const sections: BodySection[] = []
  if (bullets.length) sections.push({ heading: t.facts, bullets })

  const next = nextFightOf(athlete.slug, fights)
  if (next) {
    const opponent = next.a.slug === athlete.slug ? next.b : next.a
    sections.push({
      heading: t.nextFight,
      paragraphs: [`${opponent.name}: ${cardPositionLabel(next.position, lang)}, ${next.event}, ${eventDay(next.date, lang)}.`],
      links: [{ label: fightText(lang, next).title, href: langPath(lang, `/fight/${next.slug}`) }],
    })
  }
  sections.push({
    heading: t.moreFighters,
    links: [
      { label: t.allFighters, href: langPath(lang, '/fighters') },
      { label: t.predictor, href: langPath(lang, '/predictor') },
      { label: t.headToHead, href: langPath(lang, '/head-to-head') },
    ],
  })
  return { title: text.title, intro: text.description, sections }
}

export function fightBody(lang: UiLang, fight: FightSeo): BodyPage {
  const text = fightText(lang, fight)
  const t = labels(lang)
  const side = (athlete: AthleteSeo) => {
    const rec = record(athlete)
    return `${athlete.name}${rec ? ` (${rec})` : ''}`
  }
  const bullets = [
    `${t.card}: ${fight.event}, ${eventDay(fight.date, lang)}`,
    fight.weightClass ? `${t.division}: ${getDivisionName(fight.weightClass, lang)}` : null,
    `${side(fight.a)} vs. ${side(fight.b)}`,
    fight.pick ? `${t.pick}: ${fight.pick.winner} (${formatProbability(fight.pick.probability)})` : null,
  ].filter((line): line is string => line !== null)
  const query = new URLSearchParams({ a: fight.a.name, b: fight.b.name, event: fight.event }).toString()
  return {
    title: text.title,
    intro: text.description,
    sections: [
      { heading: t.about, bullets },
      {
        heading: t.moreFighters,
        links: [
          { label: fight.a.name, href: langPath(lang, `/athlete/${fight.a.slug}`) },
          { label: fight.b.name, href: langPath(lang, `/athlete/${fight.b.slug}`) },
          { label: t.analysis, href: `${langPath(lang, '/matchup-intelligence')}?${query}` },
        ],
      },
    ],
  }
}

/** The fighters page with a link to every active athlete, grouped by division, so a crawler can walk to each profile. */
export function fightersListBody(lang: UiLang, text: RouteText, athletes: AthleteSeo[]): BodyPage {
  const byDivision = new Map<string, AthleteSeo[]>()
  for (const athlete of athletes) {
    const key = athlete.division ?? ''
    byDivision.set(key, [...(byDivision.get(key) ?? []), athlete])
  }
  const sections = [...byDivision.entries()]
    .filter(([division]) => division)
    .sort(([a], [b]) => divisionOrder(a) - divisionOrder(b) || a.localeCompare(b))
    .map(([division, members]) => ({
      heading: getDivisionName(division, lang),
      links: members
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((athlete): BodyLink => ({ label: athlete.name, href: langPath(lang, `/athlete/${athlete.slug}`) })),
    }))
  return { title: text.title, intro: text.description, sections }
}
