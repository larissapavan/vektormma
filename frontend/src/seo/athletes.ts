/**
 * The athlete and fight pages as plain text: the address of each, its title, description and body in every language.
 *
 * The data comes from athletes.json (written by scripts/build_seo_athletes.py). The build turns it into one HTML file per
 * athlete and per announced fight (see seoPages in vite.config.ts), and the app uses the same functions for the tab
 * title and the share tags once it runs, so a page reads the same before and after the script starts. No React here: the
 * build imports this file too.
 */

import { L, langPath, localeTag, type UiLang } from '../i18n/lang'
import { cardPositionLabel } from '../shared/data/cardPosition'
import { divisionOrder, getDivisionName } from '../shared/data/divisions'
import { getMethodLabel, translateHometown, translateStance } from '../shared/data/fightLabels'
import { translateReason } from '../shared/data/confidenceText'
import { formatProbability } from '../shared/data/probability'
import { localizeFeature } from '../shared/utils/localizeFeature'
import { normalizeFighterName } from '../shared/hooks/useFighterImages'
import type { BodyItem, BodyLink, BodyPage, BodySection, RouteText } from './htmlMeta'

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

/** Body, career averages and UFC fights of one athlete (athleteDetails.json, read by the build only). */
export interface AthleteDetail {
  stats: {
    heightCm?: number
    reachCm?: number
    stance?: string
    hometown?: string
    debut?: string
    strikesLanded?: number
    strikesAbsorbed?: number
    strikeAccuracy?: number
    strikeDefense?: number
    takedowns?: number
    takedownAccuracy?: number
    takedownDefense?: number
    submissions?: number
  }
  /** Newest first. `result` is null for a no contest or an overturned result. */
  history: AthleteFight[]
}

export interface AthleteFight {
  date: string
  opponent: string
  result: string | null
  method: string | null
  round: number | null
  time: string | null
  event: string | null
  title: boolean
}

export type AthleteDetails = Record<string, AthleteDetail>

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

export function countryName(code: string | null, language: string): string | null {
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

/** The method codes of the fight history that the shared table does not know by that name. */
const METHOD_ALIASES: Record<string, string> = { SUB: 'Submission', DEC: 'Decision', CNC: 'Overturned', 'NO CONTEST': 'Overturned' }

export function methodLabel(method: string | null, lang: UiLang): string | null {
  return method ? getMethodLabel(METHOD_ALIASES[method] ?? method, lang) : null
}

export const isDecision = (method: string | null) => method !== null && (method === 'DEC' || method.endsWith('-DEC'))

/** "3 vitórias" / "1 vitória": the count with the right form of the word. */
export function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** One line per fight: the day, the result and opponent, how it ended and the card. */
/** The line of one fight; the opponent is a link to their page when `slugs` says they have one. */
function historyLine(lang: UiLang, fight: AthleteFight, slugs?: ReadonlySet<string>): BodyItem {
  const slug = athleteSlug(fight.opponent)
  const who: string | BodyLink = slugs?.has(slug) ? { label: fight.opponent, href: langPath(lang, `/athlete/${slug}`) } : fight.opponent
  const outcome =
    fight.result === 'win'
      ? L(lang, 'vitória sobre ', 'win over ', 'victoire contre ', 'victoria sobre ')
      : fight.result === 'loss'
        ? L(lang, 'derrota para ', 'loss to ', 'défaite contre ', 'derrota ante ')
        : fight.result === 'draw'
          ? L(lang, 'empate com ', 'draw with ', 'match nul contre ', 'empate con ')
          : L(lang, 'sem resultado contra ', 'no contest against ', 'sans résultat contre ', 'sin resultado ante ')
  const parts: string[] = []
  if (fight.result === 'win' || fight.result === 'loss') {
    const method = methodLabel(fight.method, lang)
    if (method) parts.push(method)
    if (!isDecision(fight.method) && fight.round) parts.push(`round ${fight.round}${fight.time ? ` (${fight.time})` : ''}`)
  }
  if (fight.event) parts.push(fight.event)
  if (fight.title) parts.push(L(lang, 'luta pelo cinturão', 'title fight', 'combat pour le titre', 'pelea por el título'))
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  return [`${eventDay(fight.date, lang)}${colon}${outcome}`, who, `${parts.length ? `, ${parts.join(', ')}` : ''}.`]
}

/** Two sentences that sum up the UFC fights on file: the tally, then how the wins came. */
function historySummary(lang: UiLang, name: string, history: AthleteFight[]): string {
  const wins = history.filter((fight) => fight.result === 'win')
  const losses = history.filter((fight) => fight.result === 'loss').length
  const w = L(lang, counted(wins.length, 'vitória', 'vitórias'), counted(wins.length, 'win', 'wins'), counted(wins.length, 'victoire', 'victoires'), counted(wins.length, 'victoria', 'victorias'))
  const l = L(lang, counted(losses, 'derrota', 'derrotas'), counted(losses, 'loss', 'losses'), counted(losses, 'défaite', 'défaites'), counted(losses, 'derrota', 'derrotas'))
  const n = history.length
  const total = L(
    lang,
    counted(n, 'luta registrada aqui', 'lutas registradas aqui'),
    counted(n, 'fight on record here', 'fights on record here'),
    counted(n, 'combat recensé ici', 'combats recensés ici'),
    counted(n, 'pelea registrada aquí', 'peleas registradas aquí'),
  )
  const tally = L(lang, `No UFC, ${name} soma ${w} e ${l} em ${total}.`, `In the UFC, ${name} has ${w} and ${l} in ${total}.`, `À l’UFC, ${name} compte ${w} et ${l} en ${total}.`, `En la UFC, ${name} suma ${w} y ${l} en ${total}.`)
  if (!wins.length) return tally
  const ko = wins.filter((fight) => fight.method === 'KO/TKO').length
  const sub = wins.filter((fight) => fight.method === 'SUB').length
  const dec = wins.filter((fight) => isDecision(fight.method)).length
  const methods = L(
    lang,
    `Vitórias por método: ${ko} por nocaute, ${sub} por finalização e ${dec} por decisão.`,
    `Wins by method: ${ko} by knockout, ${sub} by submission and ${dec} by decision.`,
    `Victoires par méthode : ${ko} par KO, ${sub} par soumission et ${dec} sur décision.`,
    `Victorias por método: ${ko} por nocaut, ${sub} por sumisión y ${dec} por decisión.`,
  )
  return `${tally} ${methods}`
}

/** The body and the career averages as "label: value" lines; a stat the data does not have is left out. */
function statLines(lang: UiLang, stats: AthleteDetail['stats']): { body: string[]; averages: string[] } {
  const tag = localeTag(lang)
  const decimal = (value: number) => value.toLocaleString(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const percent = (value: number) => value.toLocaleString(tag, { style: 'percent', maximumFractionDigits: 0 })
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const line = (label: string, value: string | null | undefined) => (value ? `${label}${colon}${value}` : null)
  const number = (label: string, value: number | undefined, format: (value: number) => string) => line(label, value == null ? null : format(value))
  const cm = (value: number) => `${value} cm`
  const keep = (lines: (string | null)[]) => lines.filter((entry): entry is string => entry !== null)
  return {
    body: keep([
      number(L(lang, 'Altura', 'Height', 'Taille', 'Estatura'), stats.heightCm, cm),
      number(L(lang, 'Alcance', 'Reach', 'Allonge', 'Alcance'), stats.reachCm, cm),
      line(L(lang, 'Base', 'Stance', 'Garde', 'Guardia'), stats.stance?.toLowerCase() === 'unknown' ? null : translateStance(stats.stance, lang)),
      line(L(lang, 'Cidade natal', 'Hometown', 'Ville d’origine', 'Ciudad natal'), translateHometown(stats.hometown, lang)),
      line(L(lang, 'Estreia no UFC', 'UFC debut', 'Débuts à l’UFC', 'Debut en la UFC'), stats.debut ? eventDay(stats.debut, lang) : null),
    ]),
    averages: keep([
      number(L(lang, 'Golpes significativos acertados por minuto', 'Significant strikes landed per minute', 'Frappes significatives portées par minute', 'Golpes significativos conectados por minuto'), stats.strikesLanded, decimal),
      number(L(lang, 'Golpes significativos sofridos por minuto', 'Significant strikes absorbed per minute', 'Frappes significatives encaissées par minute', 'Golpes significativos recibidos por minuto'), stats.strikesAbsorbed, decimal),
      number(L(lang, 'Precisão dos golpes significativos', 'Significant strike accuracy', 'Précision des frappes significatives', 'Precisión de los golpes significativos'), stats.strikeAccuracy, percent),
      number(L(lang, 'Defesa de golpes', 'Strike defense', 'Défense contre les frappes', 'Defensa de golpes'), stats.strikeDefense, percent),
      number(L(lang, 'Quedas por 15 minutos', 'Takedowns per 15 minutes', 'Amenées au sol par 15 minutes', 'Derribos por 15 minutos'), stats.takedowns, decimal),
      number(L(lang, 'Precisão de quedas', 'Takedown accuracy', 'Précision des amenées au sol', 'Precisión de derribos'), stats.takedownAccuracy, percent),
      number(L(lang, 'Defesa de quedas', 'Takedown defense', 'Défense contre les amenées au sol', 'Defensa de derribos'), stats.takedownDefense, percent),
      number(L(lang, 'Tentativas de finalização por 15 minutos', 'Submission attempts per 15 minutes', 'Tentatives de soumission par 15 minutes', 'Intentos de sumisión por 15 minutos'), stats.submissions, decimal),
    ]),
  }
}

/**
 * The athlete page as text. With `detail` (the build passes it) the page also carries the career averages and every UFC
 * fight on file, so the HTML holds the same substance the app shows once it loads. `slugs` are the athletes that have a
 * page: the opponents among them are linked.
 */
export function athleteBody(lang: UiLang, athlete: AthleteSeo, fights: FightSeo[], detail?: AthleteDetail, slugs?: ReadonlySet<string>): BodyPage {
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
  const stats = detail ? statLines(lang, detail.stats) : { body: [], averages: [] }
  bullets.push(...stats.body)
  const sections: BodySection[] = []
  if (bullets.length) sections.push({ heading: t.facts, bullets })
  if (stats.averages.length) sections.push({ heading: L(lang, 'Médias da carreira no UFC', 'UFC career averages', 'Moyennes en carrière à l’UFC', 'Promedios de carrera en la UFC'), bullets: stats.averages })
  if (detail?.history.length) {
    sections.push({
      heading: L(lang, 'Histórico de lutas no UFC', 'UFC fight history', 'Historique des combats à l’UFC', 'Historial de peleas en la UFC'),
      paragraphs: [historySummary(lang, athlete.name, detail.history)],
      bullets: detail.history.map((fight) => historyLine(lang, fight, slugs)),
    })
  }

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

/** What the build knows about an announced fight beyond the card: both fighters' details and what moved the model's answer. */
export interface FightExtra {
  a?: AthleteDetail
  b?: AthleteDetail
  /** The stats that pulled the prediction most, heaviest first, and toward which fighter. */
  factors?: { feature: string; towardA: boolean }[]
  /** Sentences from the API (in English) on how much the prediction has to go on. */
  reasons?: string[]
}

/** How many of each fighter's latest fights the fight page lists. */
const RECENT_FIGHTS = 4

/** The two fighters side by side, one line per measurement both pages show: "Altura: A 193 cm · B 185 cm". */
function comparisonLines(lang: UiLang, fight: FightSeo, extra: FightExtra): string[] {
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const split = (lines: string[]) => new Map(lines.map((line) => line.split(colon, 2) as [string, string]))
  const side = (detail?: AthleteDetail) => {
    const lines = detail ? statLines(lang, detail.stats) : { body: [], averages: [] }
    // The hometown and the debut are about one fighter, not a measure to set against the other's.
    return split([...lines.body.slice(0, 3), ...lines.averages])
  }
  const a = side(extra.a)
  const b = side(extra.b)
  const labels = [...new Set([...a.keys(), ...b.keys()])].filter((label) => a.has(label) && b.has(label))
  return labels.map((label) => `${label}${colon}${fight.a.name} ${a.get(label)} · ${fight.b.name} ${b.get(label)}`)
}

/** The sections a fight page adds when the build has the details: the comparison, what weighs on the pick, and recent fights. */
function fightAnalysis(lang: UiLang, fight: FightSeo, extra: FightExtra): BodySection[] {
  const sections: BodySection[] = []
  const colon = L(lang, ': ', ': ', ' : ', ': ')

  const comparison = comparisonLines(lang, fight, extra)
  if (comparison.length) sections.push({ heading: L(lang, 'Os dois lutadores lado a lado', 'The two fighters side by side', 'Les deux combattants côte à côte', 'Los dos peleadores frente a frente'), bullets: comparison })

  if (extra.factors?.length) {
    const toward = (name: string) => L(lang, `a favor de ${name}`, `in favor of ${name}`, `en faveur de ${name}`, `a favor de ${name}`)
    // A sentence the tables do not know would stay in English on another language's page: it is left out there.
    const reasons = (extra.reasons ?? []).map((reason) => ({ reason, text: translateReason(reason, lang) })).filter(({ reason, text }) => lang === 'en' || text !== reason)
    sections.push({
      heading: L(lang, 'O que mais pesa nesta previsão', 'What weighs most on this pick', 'Ce qui pèse le plus dans ce pronostic', 'Lo que más pesa en este pronóstico'),
      paragraphs: [
        L(
          lang,
          'O modelo compara os números dos dois lutadores como estão antes da luta. Estes foram os que mais puxaram a chance para um lado, do que mais pesou ao que menos pesou.',
          'The model compares both fighters’ numbers as they stand before the fight. These pulled the chance most to one side, heaviest first.',
          'Le modèle compare les chiffres des deux combattants tels qu’ils sont avant le combat. Voici ceux qui ont le plus tiré la chance d’un côté, du plus lourd au moins lourd.',
          'El modelo compara los números de los dos peleadores como están antes de la pelea. Estos fueron los que más inclinaron la balanza, del que más pesó al que menos.',
        ),
        ...reasons.map(({ text }) => text),
      ],
      bullets: extra.factors.map((factor) => `${localizeFeature(factor.feature, lang)}${colon}${toward(factor.towardA ? fight.a.name : fight.b.name)}`),
    })
  }

  for (const [athlete, detail] of [[fight.a, extra.a], [fight.b, extra.b]] as const) {
    if (!detail?.history.length) continue
    sections.push({
      heading: L(lang, `Últimas lutas de ${athlete.name} no UFC`, `${athlete.name}: latest UFC fights`, `Derniers combats de ${athlete.name} à l’UFC`, `Últimas peleas de ${athlete.name} en la UFC`),
      paragraphs: [historySummary(lang, athlete.name, detail.history)],
      bullets: detail.history.slice(0, RECENT_FIGHTS).map((entry) => historyLine(lang, entry)),
    })
  }
  return sections
}

/** The fight page as text. With `extra` (the build passes it) it also carries the comparison, the factors and recent fights. */
export function fightBody(lang: UiLang, fight: FightSeo, extra?: FightExtra): BodyPage {
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
      ...(extra ? fightAnalysis(lang, fight, extra) : []),
      {
        heading: t.moreFighters,
        links: [
          { label: fight.a.name, href: langPath(lang, `/athlete/${fight.a.slug}`) },
          { label: fight.b.name, href: langPath(lang, `/athlete/${fight.b.slug}`) },
          { label: t.analysis, href: `${langPath(lang, '/predictor')}?${query}` },
        ],
      },
    ],
  }
}

/** How many announced fights the home page lists; the rest are one click away on the events page. */
const HOME_FIGHTS = 15

/** The home page as text: what the site is, then the next announced fights with the model's pick and a link to each. */
export function homeBody(lang: UiLang, title: string, intro: string, fights: FightSeo[]): BodyPage {
  const sections = upcomingPicksSection(lang, fights)
  return sections.length ? { title, intro, sections } : { title, intro }
}

/** The next announced UFC fights with the model's pick and a link to each; nothing when no fight is announced. */
export function upcomingPicksSection(lang: UiLang, fights: FightSeo[]): BodySection[] {
  const next = fights.slice(0, HOME_FIGHTS)
  if (!next.length) return []
  return [
    {
      heading: L(lang, 'Próximas lutas do UFC e a previsão do modelo', 'Upcoming UFC fights and the model’s pick', 'Prochains combats de l’UFC et le pronostic du modèle', 'Próximas peleas de la UFC y el pronóstico del modelo'),
      bullets: next.map((fight) => fightText(lang, fight).description),
      links: next.map((fight): BodyLink => ({ label: fightText(lang, fight).title, href: langPath(lang, `/fight/${fight.slug}`) })),
    },
  ]
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
