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
import { getDivisionName } from '../shared/data/divisions'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { CATEGORY_TABLES, STAT_TITLE_TABLES, localizedLabel } from '../shared/data/recordBookLabels'
import { GENERIC_ORGS, orgEs, orgFr, orgPt, type OrgConfig } from '../shared/data/orgs'
import { formatProbability } from '../shared/data/probability'
import { athleteSlug, counted, eventDay, isDecision, methodLabel, upcomingPicksSection, type FightSeo } from './athletes'
import type { ModelInfo } from '../shared/types/api'
import type { BodyLink, BodyPage, BodySection, RouteText } from './htmlMeta'

export interface PageFight {
  a: string
  b: string
  winner: string | null
  method: string | null
  round: number | null
  time: string | null
  weightClass: string | null
  title: boolean
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

/** "A vs. B, Peso Pesado, luta pelo cinturão" for an announced fight; "A venceu B, Decisão unânime" for one with a winner. */
function fightLine(lang: UiLang, fight: PageFight): string {
  const pair = `${fight.a} vs. ${fight.b}`
  const parts: string[] = []
  if (fight.winner === fight.a || fight.winner === fight.b) {
    const loser = fight.winner === fight.a ? fight.b : fight.a
    parts.push(L(lang, `${fight.winner} venceu ${loser}`, `${fight.winner} def. ${loser}`, `${fight.winner} bat ${loser}`, `${fight.winner} venció a ${loser}`))
    const method = methodLabel(fight.method, lang)
    if (method) parts.push(method)
    if (!isDecision(fight.method) && fight.round) parts.push(`round ${fight.round}${fight.time ? ` (${fight.time})` : ''}`)
  } else {
    parts.push(pair)
    if (fight.method) parts.push(L(lang, 'sem vencedor', 'no winner', 'sans vainqueur', 'sin ganador'))
  }
  const weight = division(fight.weightClass, lang)
  if (weight) parts.push(weight)
  if (fight.title) parts.push(titleFight(lang))
  return `${parts.join(', ')}.`
}

/** One section per card: its name, the day and place, and a line per fight. The UFC fights that have a page are linked. */
function eventSections(lang: UiLang, events: PageEvent[], context?: PageContext): BodySection[] {
  const withPage = new Set(context?.fights.map((fight) => fight.slug))
  return events.map((event) => {
    const links: BodyLink[] = []
    for (const fight of event.fights) {
      const slug = `${athleteSlug(fight.a)}-vs-${athleteSlug(fight.b)}`
      if (withPage.has(slug)) links.push({ label: `${fight.a} vs. ${fight.b}`, href: langPath(lang, `/fight/${slug}`) })
    }
    return {
      heading: event.name,
      paragraphs: [`${eventDay(event.date, lang)}${event.location ? `, ${event.location}` : ''}.`],
      bullets: event.fights.map((fight) => fightLine(lang, fight)),
      links,
    }
  })
}

function athleteLinks(lang: UiLang, names: string[], context?: PageContext): BodyLink[] {
  const links = new Map<string, BodyLink>()
  for (const name of names) {
    const slug = athleteSlug(name)
    if (context?.athleteSlugs.has(slug)) links.set(slug, { label: name, href: langPath(lang, `/athlete/${slug}`) })
  }
  return [...links.values()]
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
    bullets: ranking.fighters.map((name, index) => `${index + 1}. ${name}`),
    links: athleteLinks(lang, ranking.fighters, context),
  }))
}

function championsSection(lang: UiLang, champions: PageChampion[], context?: PageContext): BodySection[] {
  if (!champions.length) return []
  const colon = L(lang, ': ', ': ', ' : ', ': ')
  const line = (entry: PageChampion) => {
    const parts = [`${getDivisionName(entry.division, lang)}${colon}${entry.champion}`]
    if (entry.interim) parts[0] += ` (${L(lang, 'cinturão interino', 'interim title', 'ceinture intérimaire', 'título interino')})`
    if (entry.since) {
      const day = eventDay(entry.since, lang)
      parts.push(L(lang, `com o cinturão desde ${day}`, `title held since ${day}`, `ceinture détenue depuis le ${day}`, `con el título desde el ${day}`))
    }
    if (entry.defenses) {
      parts.push(L(lang, counted(entry.defenses, 'defesa de cinturão', 'defesas de cinturão'), counted(entry.defenses, 'title defense', 'title defenses'), counted(entry.defenses, 'défense de titre', 'défenses de titre'), counted(entry.defenses, 'defensa del título', 'defensas del título')))
    }
    return `${parts.join(', ')}.`
  }
  return [
    {
      heading: L(lang, 'Campeões atuais', 'Current champions', 'Champions en titre', 'Campeones actuales'),
      bullets: champions.map(line),
      links: athleteLinks(lang, champions.map((entry) => entry.champion), context),
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
  const line = (fight: PagesData['ufc']['cancelled'][number]) => {
    const parts = [`${fight.a} vs. ${fight.b}`]
    const weight = division(fight.weightClass, lang)
    if (weight) parts.push(weight)
    if (fight.title) parts.push(titleFight(lang))
    if (fight.event) parts.push(fight.event)
    if (fight.date) parts.push(eventDay(fight.date, lang))
    return `${parts.join(', ')}.`
  }
  return [
    {
      heading: L(lang, 'Lutas marcadas que não aconteceram', 'Booked fights that never happened', 'Combats annoncés qui n’ont jamais eu lieu', 'Peleas pactadas que nunca se dieron'),
      bullets: fights.map(line),
      links: athleteLinks(lang, fights.flatMap((fight) => [fight.a, fight.b]), context),
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
      bullets: category.stats.map((stat) => `${localizedLabel(lang, stat.title, STAT_TITLE_TABLES, stat.key)}${colon}${stat.leaders.map((leader, index) => `${index + 1}. ${leader.fighter} (${leader.value})`).join(', ')}`),
      links: athleteLinks(lang, category.stats.flatMap((stat) => stat.leaders.map((leader) => leader.fighter)), context),
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

function orgSections(lang: UiLang, org: OrgConfig, section: string, data: OrgPages, gyms: PageGym[]): BodySection[] {
  if (section === '') return [...championsSection(lang, data.champions), ...eventSections(lang, data.upcoming), ...eventSections(lang, data.results.slice(0, 2))]
  if (section === '/events' || section === '/predictor') return [...eventSections(lang, data.upcoming), ...(section === '/events' ? eventSections(lang, data.results) : [])]
  if (section === '/fighters') return rosterSection(lang, org, data)
  if (section === '/rankings') return rankingSections(lang, data.rankings)
  if (section === '/champions') return championsSection(lang, data.champions)
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
