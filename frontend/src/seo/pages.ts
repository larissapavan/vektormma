/**
 * The list pages as plain text: rankings, champions, cards, results, the settled picks, gyms and each organization's pages.
 *
 * The data comes from pages.json (written by scripts/build_seo_pages.py, names, dates and numbers only); the sentences are
 * written here, in every language. The build puts the result inside each page's HTML (see seoPages in vite.config.ts), so
 * a crawler that reads the HTML as served finds what the page is about and not only its title. No React here.
 */

import { L, langPath, localeTag, type UiLang } from '../i18n/lang'
import { ABOUT_SOURCES, sourceName, sourceUse } from '../shared/data/aboutSources'
import { baselineName, localizeApiText } from '../shared/data/apiText'
import { DATA_ECOSYSTEM_SOURCES, dataSteps, sourceOrg, sourceScope } from '../shared/data/dataPipeline'
import { careerRules } from '../shared/data/careerRules'
import { getDivisionName } from '../shared/data/divisions'
import { localizeCountryName } from '../shared/data/fightLabels'
import { eventPreview, eventRecap } from '../shared/data/eventText'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { CATEGORY_TABLES, STAT_TITLE_TABLES, localizedLabel } from '../shared/data/recordBookLabels'
import { GENERIC_ORGS, orgEs, orgFr, orgPt, type OrgConfig } from '../shared/data/orgs'
import { formatProbability } from '../shared/data/probability'
import { athleteSlug, counted, eventDay, isDecision, methodLabel, upcomingPicksSection, type FightSeo } from './athletes'
import type { ModelInfo } from '../shared/types/api'
import type { BodyItem, BodyLink, BodyPage, BodySection, RouteText } from './htmlMeta'

export interface PageFight {
  a: string
  b: string
  winner: string | null
  method: string | null
  round: number | null
  time: string | null
  weightClass: string | null
  title: boolean
  /** The model's pick saved before the fight (UFC cards only). */
  pick?: { winner: string; probability: number }
}

export interface PageEvent {
  name: string
  date: string
  location: string | null
  fights: PageFight[]
}

export interface PageRanking {
  category: string
  p4p: boolean
  fighters: string[]
}

export interface PageChampion {
  division: string
  champion: string
  interim: boolean
  since?: string
  defenses?: number
  /** Other organizations: the champion's record and country (the UFC gives the reign instead). */
  record?: string | null
  country?: string | null
}

export interface PageGym {
  slug: string
  name: string
  fighters: number
}

export interface OrgPages {
  fighterCount: number
  eventCount: number
  upcoming: PageEvent[]
  results: PageEvent[]
  rankings: PageRanking[]
  champions: PageChampion[]
  roster: { name: string; record: string | null; division: string | null }[]
}

export interface PagesData {
  ufc: {
    upcoming: PageEvent[]
    results: PageEvent[]
    rankings: PageRanking[]
    champions: PageChampion[]
    trackRecord: { since: string | null; resolved: number | null; correct: number | null; accuracy: number | null; picks: { event: string; date: string; a: string; b: string; pick: string; confidence: number; correct: boolean }[] }
    cancelled: { a: string; b: string; event: string | null; date: string | null; weightClass: string | null; title: boolean }[]
    recordBook: { name: string; stats: { key: string; title: string; leaders: { fighter: string; value: string }[] }[] }[]
  }
  orgs: Record<string, OrgPages>
  gyms: { total: number; top: PageGym[]; byOrg: Record<string, PageGym[]> }
  dataInfo: { fighters: number; events: number; fights: number; lastUpdated: string | null }
  /** What the API answers at /model-info (without the feature names), or null when it was never written. */
  model: Omit<ModelInfo, 'features'> | null
  /** By fight slug: what moved the model's answer for each announced fight. */
  fights?: Record<string, { factors: { feature: string; towardA: boolean }[]; reasons: string[] }>
}

/** What the build knows besides pages.json: which athletes and announced fights have a page of their own, to link them. */
export interface PageContext {
  athleteSlugs: ReadonlySet<string>
  fights: FightSeo[]
}

const titleFight = (lang: UiLang) => L(lang, 'luta pelo cinturão', 'title fight', 'combat pour le titre', 'pelea por el título')

function division(weightClass: string | null, lang: UiLang): string | null {
  return weightClass ? getDivisionName(weightClass, lang) : null
}

/** A fighter's name, as a link to their page when they have one. */
function athleteItem(lang: UiLang, name: string, context?: PageContext): string | BodyLink {
  const slug = athleteSlug(name)
  return context?.athleteSlugs.has(slug) ? { label: name, href: langPath(lang, `/athlete/${slug}`) } : name
}

/**
 * "A vs. B, Peso Pesado, luta pelo cinturão" for an announced fight (linked to its page when it has one); "A venceu B,
 * Decisão unânime" for one with a winner, the two names linked to their pages.
 */
function fightLine(lang: UiLang, fight: PageFight, context?: PageContext, fightHref?: string): BodyItem {
  const tail: string[] = []
  let head: BodyItem
  if (fight.winner === fight.a || fight.winner === fight.b) {
    const loser = fight.winner === fight.a ? fight.b : fight.a
    const w = athleteItem(lang, fight.winner, context)
    const l = athleteItem(lang, loser, context)
    head = [w, L(lang, ' venceu ', ' def. ', ' bat ', ' venció a '), l]
    const method = methodLabel(fight.method, lang)
    if (method) tail.push(method)
    if (!isDecision(fight.method) && fight.round) tail.push(`round ${fight.round}${fight.time ? ` (${fight.time})` : ''}`)
  } else {
    const pair = `${fight.a} vs. ${fight.b}`
    head = fightHref ? [{ label: pair, href: fightHref }] : pair
    if (fight.method) tail.push(L(lang, 'sem vencedor', 'no winner', 'sans vainqueur', 'sin ganador'))
  }
  const weight = division(fight.weightClass, lang)
  if (weight) tail.push(weight)
  if (fight.title) tail.push(titleFight(lang))
  const rest = `${tail.length ? `, ${tail.join(', ')}` : ''}.`
  return typeof head === 'string' ? `${head}${rest}` : [...head, rest]
}

/**
 * One section per card: its name, the day and place, a short written read of the card (a preview before it, a recap after
 * it) and a line per fight. The fights and fighters that have a page are linked in the line itself.
 */
function eventSections(lang: UiLang, events: PageEvent[], context?: PageContext): BodySection[] {
  const withPage = new Set(context?.fights.map((fight) => fight.slug))
  return events.map((event) => {
    const fightHref = (fight: PageFight) => {
      const slug = `${athleteSlug(fight.a)}-vs-${athleteSlug(fight.b)}`
      return withPage.has(slug) ? langPath(lang, `/fight/${slug}`) : undefined
    }
    const decided = event.fights.some((fight) => fight.winner === fight.a || fight.winner === fight.b)
    const read = decided ? eventRecap(lang, event.name, event.fights) : eventPreview(lang, event.name, event.fights)
    return {
      heading: event.name,
      paragraphs: [`${eventDay(event.date, lang)}${event.location ? `, ${event.location}` : ''}.`, ...(read.length ? [read.join(' ')] : [])],
      bullets: event.fights.map((fight) => fightLine(lang, fight, context, fightHref(fight))),
    }
  })
}

/** "Pound-for-Pound (Men's)" and the division names, in the language of the page. */
function categoryName(lang: UiLang, ranking: PageRanking): string {
  if (!ranking.p4p) return getDivisionName(ranking.category, lang)
  if (ranking.category.includes("Women's")) return L(lang, 'Peso por Peso Feminino', 'Women’s pound-for-pound', 'Livre pour livre féminin', 'Libra por libra femenino')
  if (ranking.category.includes("Men's")) return L(lang, 'Peso por Peso Masculino', 'Men’s pound-for-pound', 'Livre pour livre masculin', 'Libra por libra masculino')
  return L(lang, 'Peso por Peso', 'Pound-for-pound', 'Livre pour livre', 'Libra por libra')
}

function rankingSections(lang: UiLang, rankings: PageRanking[], context?: PageContext): BodySection[] {
  return rankings.map((ranking) => ({
    heading: categoryName(lang, ranking),
    bullets: ranking.fighters.map((name, index): BodyItem => [`${index + 1}. `, athleteItem(lang, name, context)]),
  }))
}

function championsSection(lang: UiLang, champions: PageChampion[], context?: PageContext): BodySection[] {
  if (!champions.length) return []
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const line = (entry: PageChampion): BodyItem => {
    const parts: string[] = []
    if (entry.interim) parts.push(` (${L(lang, 'cinturão interino', 'interim title', 'ceinture intérimaire', 'título interino')})`)
    if (entry.record) parts.push(L(lang, `cartel ${entry.record}`, `${entry.record} record`, `palmarès ${entry.record}`, `récord ${entry.record}`))
    const country = entry.country ? localizeCountryName(entry.country, lang) : null
    if (country) parts.push(country)
    if (entry.since) {
      const day = eventDay(entry.since, lang)
      parts.push(L(lang, `com o cinturão desde ${day}`, `title held since ${day}`, `ceinture détenue depuis le ${day}`, `con el título desde el ${day}`))
    }
    if (entry.defenses) {
      parts.push(L(lang, counted(entry.defenses, 'defesa de cinturão', 'defesas de cinturão'), counted(entry.defenses, 'title defense', 'title defenses'), counted(entry.defenses, 'défense de titre', 'défenses de titre'), counted(entry.defenses, 'defensa del título', 'defensas del título')))
    }
    // The interim note follows the name directly; the other facts come after a comma.
    const [interim, ...facts] = entry.interim ? parts : ['', ...parts]
    return [`${getDivisionName(entry.division, lang)}${colon}`, athleteItem(lang, entry.champion, context), `${interim}${facts.length ? `, ${facts.join(', ')}` : ''}.`]
  }
  return [
    {
      heading: L(lang, 'Campeões atuais', 'Current champions', 'Champions en titre', 'Campeones actuales'),
      bullets: champions.map(line),
    },
  ]
}

function trackRecordSections(lang: UiLang, record: PagesData['ufc']['trackRecord']): BodySection[] {
  if (!record.since || !record.resolved || record.correct == null || record.accuracy == null) return []
  const day = eventDay(record.since, lang)
  const share = formatProbability(record.accuracy)
  const { correct, resolved } = record
  const summary = L(
    lang,
    `Desde ${day}, o modelo acertou ${correct} de ${resolved} lutas já decididas (${share}). Cada palpite é registrado antes do evento e conferido depois.`,
    `Since ${day}, the model has called ${correct} of ${resolved} settled fights correctly (${share}). Each pick is logged before the event and checked afterwards.`,
    `Depuis le ${day}, le modèle a vu juste sur ${correct} des ${resolved} combats déjà disputés (${share}). Chaque pronostic est enregistré avant l’événement et vérifié ensuite.`,
    `Desde el ${day}, el modelo acertó ${correct} de ${resolved} peleas ya decididas (${share}). Cada pronóstico se registra antes del evento y se revisa después.`,
  )
  const line = (pick: PagesData['ufc']['trackRecord']['picks'][number]) => {
    const odds = formatProbability(pick.confidence)
    const fight = `${pick.a} vs. ${pick.b} (${pick.event})`
    return L(
      lang,
      `${fight}: palpite em ${pick.pick}, ${odds}. ${pick.correct ? 'Acertou' : 'Errou'}.`,
      `${fight}: pick ${pick.pick}, ${odds}. ${pick.correct ? 'Correct' : 'Wrong'}.`,
      `${fight} : pronostic ${pick.pick}, ${odds}. ${pick.correct ? 'Juste' : 'Faux'}.`,
      `${fight}: pronóstico ${pick.pick}, ${odds}. ${pick.correct ? 'Acertó' : 'Falló'}.`,
    )
  }
  return [{ heading: L(lang, 'Palpites mais recentes já conferidos', 'Latest settled picks', 'Derniers pronostics vérifiés', 'Últimos pronósticos revisados'), paragraphs: [summary], bullets: record.picks.map(line) }]
}

function cancelledSection(lang: UiLang, fights: PagesData['ufc']['cancelled'], context?: PageContext): BodySection[] {
  if (!fights.length) return []
  const line = (fight: PagesData['ufc']['cancelled'][number]): BodyItem => {
    const parts: string[] = []
    const weight = division(fight.weightClass, lang)
    if (weight) parts.push(weight)
    if (fight.title) parts.push(titleFight(lang))
    if (fight.event) parts.push(fight.event)
    if (fight.date) parts.push(eventDay(fight.date, lang))
    return [athleteItem(lang, fight.a, context), ' vs. ', athleteItem(lang, fight.b, context), `${parts.length ? `, ${parts.join(', ')}` : ''}.`]
  }
  return [
    {
      heading: L(lang, 'Lutas marcadas que não aconteceram', 'Booked fights that never happened', 'Combats annoncés qui n’ont jamais eu lieu', 'Peleas pactadas que nunca se dieron'),
      bullets: fights.map(line),
    },
  ]
}

/** One section per category of the record book; each stat is a line with its first leaders and their numbers. */
function recordBookSections(lang: UiLang, categories: PagesData['ufc']['recordBook'], context?: PageContext): BodySection[] {
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  return categories
    .filter((category) => category.stats.length)
    .map((category) => ({
      heading: localizedLabel(lang, category.name, CATEGORY_TABLES, category.name),
      bullets: category.stats.map((stat): BodyItem => [
        `${localizedLabel(lang, stat.title, STAT_TITLE_TABLES, stat.key)}${colon}`,
        ...stat.leaders.flatMap((leader, index) => [`${index ? ', ' : ''}${index + 1}. `, athleteItem(lang, leader.fighter, context), ` (${leader.value})`]),
      ]),
    }))
}

/** The About page: who runs the site, the name, the legal notice and every source with what it is used for. */
export function aboutBody(lang: UiLang, about: Record<string, string>): BodyPage {
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  return {
    title: about.title,
    intro: about.description,
    sections: [
      { heading: about.who, paragraphs: [about.whoText1, about.whoText2, about.whoText3] },
      { heading: about.name, paragraphs: [about.nameText1, about.nameText2] },
      { heading: about.disclaimer, paragraphs: [about.disclaimerText1, about.disclaimerText2] },
      { heading: about.sources, bullets: ABOUT_SOURCES.map((source) => `${sourceName(source.name, lang)}${colon}${sourceUse(source, lang)}`) },
    ].map((section) => ({ ...section, paragraphs: section.paragraphs?.filter(Boolean) })),
  }
}

/** The Data page: the size of the data, the steps from the official sites to a prediction, and what each source covers. */
export function dataBody(lang: UiLang, labels: Record<string, string>, data: PagesData): BodyPage {
  const tag = localeTag(lang)
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const info = data.dataInfo
  const count = (value: number) => value.toLocaleString(tag)
  const numbers = [`${labels.fighters}${colon}${count(info.fighters)}`, `${labels.events}${colon}${count(info.events)}`, `${labels.fights}${colon}${count(info.fights)}`]
  if (info.lastUpdated) numbers.push(`${labels.lastUpdate}${colon}${eventDay(info.lastUpdated, lang)}`)
  const steps = dataSteps(lang, { fights: info.fights, fighters: info.fighters, featureCount: data.model?.feature_count ?? null, prefight: /pre-fight/i.test(data.model?.model_name ?? '') })
  return {
    title: labels.title,
    intro: labels.description,
    sections: [
      { heading: L(lang, 'Os dados em números', 'The data in numbers', 'Les données en chiffres', 'Los datos en números'), bullets: numbers },
      {
        heading: labels.pipelineTitle,
        paragraphs: [labels.pipelineDesc],
        bullets: steps.flatMap((step, index) => [`${index + 1}. ${step.title}${colon}${step.text}`, ...(step.groups ?? []).map(([label, detail]) => `${label}${colon}${detail}`)]),
      },
      {
        heading: L(lang, 'Fontes e o que cada uma cobre', 'Sources and what each covers', 'Les sources et ce que chacune couvre', 'Las fuentes y lo que cubre cada una'),
        bullets: DATA_ECOSYSTEM_SOURCES.map((source) => `${sourceOrg(source, lang)} (${source.name})${colon}${sourceScope(source, lang)}`),
      },
    ],
  }
}

/** The Model page: its numbers on recent fights, the simple methods it is compared with, how it is built and where it falls short. */
export function modelBody(lang: UiLang, labels: Record<string, string>, model: PagesData['model']): BodyPage {
  if (!model) return { title: labels.title, intro: labels.description }
  const tag = localeTag(lang)
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const percent = (value: number) => value.toLocaleString(tag, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const decimal = (value: number) => value.toLocaleString(tag, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const shown = shownMetrics(model as ModelInfo, lang)
  const card = [model.model_name]
  if (shown.accuracy != null) card.push(`${L(lang, 'Taxa de acerto', 'Accuracy', 'Précision', 'Precisión')} (${shown.caption})${colon}${percent(shown.accuracy)}`)
  if (shown.rocAuc != null) card.push(`${labels.rocAuc}${colon}${decimal(shown.rocAuc)}`)
  if (shown.logLoss != null) card.push(`${L(lang, 'Perda logarítmica', 'Log loss', 'Perte logarithmique', 'Pérdida logarítmica')}${colon}${decimal(shown.logLoss)}`)
  const baselines = Object.entries(model.baseline_metrics ?? {}).map(([key, value]) => `${baselineName(key, lang)}${colon}${percent(value.accuracy)}`)
  const sections: BodySection[] = [{ heading: labels.modelCard, paragraphs: model.metrics_note ? [localizeApiText(model.metrics_note, lang)] : [], bullets: card }]
  if (baselines.length) sections.push({ heading: labels.baselines, bullets: baselines })
  if (model.highlights?.length) {
    sections.push({ heading: L(lang, 'Como o modelo é construído e testado', 'How the model is built and tested', 'Comment le modèle est construit et testé', 'Cómo se construye y se prueba el modelo'), bullets: model.highlights.map((item) => localizeApiText(item, lang)) })
  }
  if (model.limitations?.length) {
    sections.push({ heading: L(lang, 'O que o modelo não prevê', 'What it can’t do', 'Ce qu’il ne peut pas faire', 'Lo que no puede hacer'), bullets: model.limitations.map((item) => localizeApiText(item, lang)) })
  }
  return { title: labels.title, intro: labels.description, sections }
}

function gymsSection(lang: UiLang, gyms: PageGym[], gymsPath: string, total?: number): BodySection[] {
  if (!gyms.length) return []
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const count = (value: number) => L(lang, counted(value, 'lutador', 'lutadores'), counted(value, 'fighter', 'fighters'), counted(value, 'combattant', 'combattants'), counted(value, 'peleador', 'peleadores'))
  const all = total?.toLocaleString(localeTag(lang))
  const intro = all
    ? L(
        lang,
        `${all} academias e equipes no cadastro. Estas são as que têm mais lutadores.`,
        `${all} gyms and teams on file. These have the most fighters.`,
        `${all} salles et équipes recensées. Voici celles qui comptent le plus de combattants.`,
        `${all} gimnasios y equipos registrados. Estos son los que tienen más peleadores.`,
      )
    : null
  return [
    {
      heading: L(lang, 'Academias com mais lutadores', 'Gyms with the most fighters', 'Salles qui comptent le plus de combattants', 'Gimnasios con más peleadores'),
      paragraphs: intro ? [intro] : [],
      bullets: gyms.map((gym) => `${gym.name}${colon}${count(gym.fighters)}`),
      links: gyms.map((gym): BodyLink => ({ label: gym.name, href: langPath(lang, `${gymsPath}/${gym.slug}`) })),
    },
  ]
}

function rosterSection(lang: UiLang, org: OrgConfig, data: OrgPages): BodySection[] {
  if (!data.roster.length) return []
  const all = data.fighterCount.toLocaleString(localeTag(lang))
  const intro = L(
    lang,
    `${all} lutadores ${orgPt(org, 'de')} no cadastro. Estes são os que mais lutaram.`,
    `${all} ${org.shortName} fighters on file. These have fought the most.`,
    `${all} combattants ${orgFr(org, 'de')} recensés. Voici ceux qui ont le plus combattu.`,
    `${all} peleadores de ${orgEs(org)} registrados. Estos son los que más han peleado.`,
  )
  const line = (fighter: OrgPages['roster'][number]) => {
    const weight = division(fighter.division, lang)
    return `${fighter.name}${fighter.record ? ` (${fighter.record})` : ''}${weight ? `, ${weight}` : ''}`
  }
  return [{ heading: L(lang, 'Lutadores com mais lutas', 'Fighters with the most fights', 'Combattants les plus expérimentés', 'Peleadores con más peleas'), paragraphs: [intro], bullets: data.roster.map(line) }]
}

function orgIntro(lang: UiLang, org: OrgConfig, data: OrgPages): string {
  const tag = localeTag(lang)
  const events = data.eventCount.toLocaleString(tag)
  const fighters = data.fighterCount.toLocaleString(tag)
  return L(
    lang,
    `${events} eventos e ${fighters} lutadores ${orgPt(org, 'de')} no cadastro.`,
    `${events} ${org.shortName} events and ${fighters} fighters on file.`,
    `${events} événements et ${fighters} combattants ${orgFr(org, 'de')} recensés.`,
    `${events} eventos y ${fighters} peleadores de ${orgEs(org)} registrados.`,
  )
}

/** The title fights among an organization's latest results: who won the belt or kept it, and how. */
function titleFightsSection(lang: UiLang, org: OrgConfig, events: PageEvent[]): BodySection[] {
  const fights = events.flatMap((event) => event.fights.filter((fight) => fight.title && (fight.winner === fight.a || fight.winner === fight.b)).map((fight) => ({ event, fight })))
  if (!fights.length) return []
  return [
    {
      heading: L(lang, `Lutas de cinturão mais recentes ${orgPt(org, 'de')}`, `Latest ${org.shortName} title fights`, `Derniers combats de titre ${orgFr(org, 'de')}`, `Últimas peleas por el título de ${orgEs(org)}`),
      bullets: fights.map(({ event, fight }): BodyItem => {
        const line = fightLine(lang, fight)
        const where = `${event.name}, ${eventDay(event.date, lang)}: `
        return typeof line === 'string' ? `${where}${line}` : [where, ...line]
      }),
    },
  ]
}

/** What a champions page says about the belts of an organization, before the list. */
function championsIntro(lang: UiLang, org: OrgConfig, champions: PageChampion[]): string {
  const count = champions.length
  const interim = champions.filter((entry) => entry.interim).length
  const divisions = new Set(champions.map((entry) => entry.division)).size
  const interimPart = interim
    ? L(lang, `, ${counted(interim, 'deles interino', 'deles interinos')}`, `, ${interim} of them interim`, `, dont ${counted(interim, 'intérimaire', 'intérimaires')}`, `, ${counted(interim, 'de ellos interino', 'de ellos interinos')}`)
    : ''
  return L(
    lang,
    `${orgPt(org, 'O')} tem hoje ${counted(count, 'campeão', 'campeões')} em ${counted(divisions, 'categoria', 'categorias')}${interimPart}. A lista abaixo traz o cartel e o país de cada um.`,
    `${org.shortName} currently has ${counted(count, 'champion', 'champions')} across ${counted(divisions, 'division', 'divisions')}${interimPart}. The list below gives each one’s record and country.`,
    `${orgFr(org, 'Le')} compte aujourd’hui ${counted(count, 'champion', 'champions')} dans ${counted(divisions, 'catégorie', 'catégories')}${interimPart}. La liste ci-dessous donne le palmarès et le pays de chacun.`,
    `${orgEs(org).charAt(0).toUpperCase()}${orgEs(org).slice(1)} tiene hoy ${counted(count, 'campeón', 'campeones')} en ${counted(divisions, 'categoría', 'categorías')}${interimPart}. La lista de abajo da el récord y el país de cada uno.`,
  )
}

function orgSections(lang: UiLang, org: OrgConfig, section: string, data: OrgPages, gyms: PageGym[]): BodySection[] {
  // An organization with no card announced shows more of its latest results, so its home page still says something.
  if (section === '') return [...championsSection(lang, data.champions), ...eventSections(lang, data.upcoming), ...eventSections(lang, data.results.slice(0, data.upcoming.length ? 2 : 3))]
  if (section === '/events' || section === '/predictor') return [...eventSections(lang, data.upcoming), ...(section === '/events' ? eventSections(lang, data.results) : [])]
  if (section === '/fighters') return rosterSection(lang, org, data)
  if (section === '/rankings') return rankingSections(lang, data.rankings)
  if (section === '/champions') {
    const list = championsSection(lang, data.champions)
    if (list.length) list[0].paragraphs = [championsIntro(lang, org, data.champions)]
    return [...list, ...titleFightsSection(lang, org, data.results)]
  }
  if (section === '/gyms') return gymsSection(lang, gyms, `${org.basePath}/gyms`)
  return []
}

function ufcSections(lang: UiLang, path: string, data: PagesData, context: PageContext): BodySection[] | null {
  const ufc = data.ufc
  switch (path) {
    case '/home':
      return [...eventSections(lang, ufc.upcoming.slice(0, 2), context), ...championsSection(lang, ufc.champions, context)]
    case '/events':
      return [...eventSections(lang, ufc.upcoming, context), ...eventSections(lang, ufc.results.slice(0, 2))]
    case '/results':
      return eventSections(lang, ufc.results)
    case '/rankings':
      return rankingSections(lang, ufc.rankings, context)
    case '/champions':
      return championsSection(lang, ufc.champions, context)
    case '/track-record':
      return trackRecordSections(lang, ufc.trackRecord)
    case '/cancelled-fights':
      return cancelledSection(lang, ufc.cancelled, context)
    case '/gyms':
      return gymsSection(lang, data.gyms.top, '/gyms', data.gyms.total)
    case '/record-book':
      return recordBookSections(lang, ufc.recordBook, context)
    case '/predictor':
    case '/head-to-head':
      return upcomingPicksSection(lang, context.fights)
    case '/career':
      return [{ heading: L(lang, 'Como funciona', 'How it works', 'Comment ça marche', 'Cómo funciona'), bullets: careerRules(lang) }]
    default:
      return null
  }
}

/**
 * The text of a list page, or null for a page this file has nothing to add to (the build then writes its heading and
 * description only). `text` is the page's own title and description.
 */
export function listPageBody(lang: UiLang, path: string, text: RouteText, data: PagesData, context: PageContext): BodyPage | null {
  const own = ufcSections(lang, path, data, context)
  if (own) return own.length ? { title: text.title, intro: text.description, sections: own } : null
  const org = GENERIC_ORGS.find((entry) => path === entry.basePath || path.startsWith(`${entry.basePath}/`))
  const orgData = org && data.orgs[org.id]
  if (!org || !orgData) return null
  const section = path.slice(org.basePath.length)
  const sections = orgSections(lang, org, section, orgData, data.gyms.byOrg[org.id] ?? [])
  if (!sections.length) return null
  const intro = section === '' ? `${text.description} ${orgIntro(lang, org, orgData)}` : text.description
  return { title: text.title, intro, sections }
}
