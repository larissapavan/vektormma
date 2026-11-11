export type OrgId = 'ufc' | 'pfl' | 'one' | 'bellator' | 'rizin' | 'ksw' | 'lfa' | 'cage-warriors' | 'oktagon' | 'jungle-fight' | 'invicta'

export type OrgSection = 'fighters' | 'events' | 'rankings' | 'gyms' | 'champions' | 'predictor'

export interface OrgConfig {
  id: OrgId
  name: string
  shortName: string
  /** URL prefix of the organization's pages: the UFC keeps the site root, every other organization gets its own. */
  basePath: string
  /** Where the data comes from, for the footer and the data note. */
  sourceName: string
  sourceUrl: string
  tagline: string
  /** Whether the organization has a predictor page and picks on its cards. The model is trained on UFC fights, so outside
   *  the UFC these come with a notice that they are less reliable. */
  hasPredictions: boolean
  /** True when the API pulls this organization's probabilities toward 50% (PROBABILITY_SHRINK in prediction_service.py):
   *  its fighters' records come without striking or takedown numbers, so the model works from averages for those. */
  probabilitiesEased?: boolean
  /** True when the organization's own pages print season statistics (the PFL): the fighter profile shows them. */
  hasSeasonStats?: boolean
  /** Set for an organization that no longer holds events: what happened to it. Its pages read as an archive. */
  archived?: string
  /** True when the data comes from a source that covers the organization only in part and is not refreshed every day
   *  (ESPN, for RIZIN, KSW, LFA and Cage Warriors): its pages say so instead of promising daily, official data. */
  partialCoverage?: boolean
  /** False for an organization with no rankings page (its champions still show on its home page). */
  hasRankings: boolean
  /** Whether the organization has a dedicated Champions page (/champions, /pfl/champions, /one/champions, /bellator/champions). */
  hasChampions: boolean
}

export const ORGS: Record<OrgId, OrgConfig> = {
  ufc: {
    id: 'ufc',
    name: 'Ultimate Fighting Championship',
    shortName: 'UFC',
    basePath: '',
    sourceName: 'ufc.com',
    sourceUrl: 'https://www.ufc.com',
    tagline: 'Stats, rankings and the model’s win predictions.',
    hasPredictions: true,
    hasRankings: true,
    hasChampions: true,
  },
  pfl: {
    id: 'pfl',
    name: 'Professional Fighters League',
    shortName: 'PFL',
    basePath: '/pfl',
    sourceName: 'pflmma.com',
    sourceUrl: 'https://pflmma.com',
    tagline: 'Fighters, events, league rankings and the model’s win predictions.',
    hasPredictions: true,
    probabilitiesEased: true,
    hasSeasonStats: true,
    hasRankings: true,
    hasChampions: true,
  },
  one: {
    id: 'one',
    name: 'ONE Championship',
    shortName: 'ONE',
    basePath: '/one',
    sourceName: 'onefc.com',
    sourceUrl: 'https://www.onefc.com/events/#past',
    tagline: 'MMA, Muay Thai, champions and the model’s win predictions.',
    hasPredictions: true,
    probabilitiesEased: true,
    hasRankings: true,
    hasChampions: true,
  },
  bellator: {
    id: 'bellator',
    name: 'Bellator MMA',
    shortName: 'Bellator',
    basePath: '/bellator',
    sourceName: 'ESPN and Wikipedia',
    sourceUrl: 'https://www.espn.com/mma/',
    tagline: 'Archive 2009–2023: fighters, events and champions.',
    hasPredictions: false,
    archived: 'Archive 2009–2023. Bellator held its last event in 2023.',
    hasRankings: false,
    hasChampions: true,
  },
  // RIZIN, KSW, LFA and Cage Warriors are read from ESPN (scripts/scrape_espn_org.py), OKTAGON from its own site, Jungle Fight
  // and Invicta FC from Sherdog: fighters and events only, because none of these sources gives belts or rankings that can be
  // trusted. Their pages are the fighters list, the events and the gyms.
  rizin: {
    id: 'rizin',
    name: 'RIZIN Fighting Federation',
    shortName: 'RIZIN',
    basePath: '/rizin',
    sourceName: 'ESPN, Sherdog',
    sourceUrl: 'https://www.espn.com/mma/',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
  ksw: {
    id: 'ksw',
    name: 'Konfrontacja Sztuk Walki',
    shortName: 'KSW',
    basePath: '/ksw',
    sourceName: 'ESPN, Sherdog',
    sourceUrl: 'https://www.espn.com/mma/',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
  lfa: {
    id: 'lfa',
    name: 'Legacy Fighting Alliance',
    shortName: 'LFA',
    basePath: '/lfa',
    sourceName: 'ESPN',
    sourceUrl: 'https://www.espn.com/mma/',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
  'cage-warriors': {
    id: 'cage-warriors',
    name: 'Cage Warriors',
    shortName: 'Cage Warriors',
    basePath: '/cage-warriors',
    sourceName: 'ESPN',
    sourceUrl: 'https://www.espn.com/mma/',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
  oktagon: {
    id: 'oktagon',
    name: 'OKTAGON MMA',
    shortName: 'OKTAGON',
    basePath: '/oktagon',
    sourceName: 'oktagonmma.com',
    sourceUrl: 'https://oktagonmma.com/en/events/',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
  'jungle-fight': {
    id: 'jungle-fight',
    name: 'Jungle Fight',
    shortName: 'Jungle Fight',
    basePath: '/jungle-fight',
    sourceName: 'Sherdog',
    sourceUrl: 'https://www.sherdog.com/organizations/Jungle-Fight-351',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
  invicta: {
    id: 'invicta',
    name: 'Invicta Fighting Championships',
    shortName: 'Invicta FC',
    basePath: '/invicta',
    sourceName: 'Sherdog',
    sourceUrl: 'https://www.sherdog.com/organizations/Invicta-Fighting-Championships-4469',
    tagline: 'Fighters and event results.',
    hasPredictions: false,
    hasRankings: false,
    hasChampions: false,
    partialCoverage: true,
  },
}

/** Display order of the organization switcher. Add a new organization here and in ORGS. */
export const ORG_LIST: OrgConfig[] = [ORGS.ufc, ORGS.pfl, ORGS.one, ORGS.bellator, ORGS.rizin, ORGS.ksw, ORGS.lfa, ORGS['cage-warriors'], ORGS.oktagon, ORGS['jungle-fight'], ORGS.invicta]

/** Organizations served by the generic /orgs/{id} API (everything but the UFC, which has its own endpoints). */
export const GENERIC_ORGS: OrgConfig[] = ORG_LIST.filter((org) => org.id !== 'ufc')

const SECTIONS: OrgSection[] = ['fighters', 'events', 'rankings', 'gyms', 'champions', 'predictor']

/** Which organization a URL belongs to: "/pfl/events" is the PFL, everything else is the UFC. */
export function orgFromPathname(pathname: string): OrgConfig {
  const first = pathname.split('/')[1] ?? ''
  return GENERIC_ORGS.find((org) => org.id === first) ?? ORGS.ufc
}

/** Route path for a section of an organization. UFC fighters are at "/fighters", PFL fighters at "/pfl/fighters". */
export function orgPath(org: OrgConfig | OrgId | string, section?: OrgSection): string {
  const config = typeof org === 'string' ? (ORGS[org as OrgId] ?? { basePath: `/${org}` }) : org
  if (!section) return config.basePath || '/home'
  return config.basePath ? `${config.basePath}/${section}` : `/${section}`
}

/** When the user clicks another organization in the switcher, keep them on the matching page if it has one. */
export function switchOrgPath(target: OrgConfig, currentPath: string): string {
  const currentOrg = orgFromPathname(currentPath)
  let tail = currentPath
  if (currentOrg.basePath && tail.startsWith(currentOrg.basePath)) {
    tail = tail.slice(currentOrg.basePath.length)
  }
  const clean = tail.replace(/^\/+/, '').split('/')[0] as OrgSection
  const validSection = SECTIONS.includes(clean) ? clean : undefined

  if (validSection === 'rankings' && !target.hasRankings) return orgPath(target)
  if (validSection === 'champions' && !target.hasChampions) return orgPath(target)
  if (validSection === 'predictor' && !target.hasPredictions) return orgPath(target)

  return orgPath(target, validSection)
}

/** What the article helpers need of an organization (the cross-organization panel only has its id as text). */
type OrgName = { id: string; shortName: string }

/** The organization the way Spanish names it: "la UFC" and "la PFL" take an article, "Bellator" and "ONE" do not. */
export function orgEs(org: OrgName): string {
  return org.id === 'ufc' || org.id === 'pfl' || org.id === 'lfa' ? `la ${org.shortName}` : org.id === 'one' ? 'ONE Championship' : org.shortName
}


/** The leagues Portuguese calls "a": "a PFL", "a LFA". Every other organization is "o" ("o Bellator", "o UFC"). */
const FEMININE_PT = new Set(['pfl', 'lfa'])

/**
 * The organization the way Portuguese says it, with the article and the preposition fused:
 * 'o' "a PFL" / "o Bellator", 'O' the same with a capital, 'de' "da PFL" / "do Bellator", 'em' "na PFL" / "no Bellator".
 */
export function orgPt(org: OrgName, form: 'o' | 'O' | 'de' | 'em'): string {
  const feminine = FEMININE_PT.has(org.id)
  const article = form === 'O' ? (feminine ? 'A' : 'O') : form === 'o' ? (feminine ? 'a' : 'o') : form === 'de' ? (feminine ? 'da' : 'do') : feminine ? 'na' : 'no'
  return `${article} ${org.shortName}`
}

/** Organizations French takes with "le" / "la" / "l’"; the rest (ONE, RIZIN, KSW, Cage Warriors, OKTAGON, Invicta FC) take none. */
const ARTICLE_FR: Record<string, 'l’' | 'la' | 'le'> = { ufc: 'l’', pfl: 'la', lfa: 'la', bellator: 'le', 'jungle-fight': 'le' }

/**
 * The organization the way French says it: 'le' "la PFL" / "le Bellator" / "l’UFC" / "ONE", 'Le' the same with a capital,
 * 'à' "à la PFL" / "au Bellator" / "à l’UFC" / "à ONE", 'de' "de la PFL" / "du Bellator" / "de l’UFC" / "d’ONE" / "de RIZIN".
 */
export function orgFr(org: OrgName, form: 'le' | 'Le' | 'à' | 'de'): string {
  const article = ARTICLE_FR[org.id]
  const name = org.shortName
  if (form === 'le' || form === 'Le') {
    const text = article ? (article === 'l’' ? `l’${name}` : `${article} ${name}`) : name
    return form === 'Le' ? text.charAt(0).toUpperCase() + text.slice(1) : text
  }
  if (form === 'à') return !article ? `à ${name}` : article === 'l’' ? `à l’${name}` : article === 'la' ? `à la ${name}` : `au ${name}`
  if (!article) return /^[AEIOUH]/i.test(name) ? `d’${name}` : `de ${name}`
  return article === 'l’' ? `de l’${name}` : article === 'la' ? `de la ${name}` : `du ${name}`
}

/** The landing screen sits at "/", outside the organization hierarchy. */
export const LANDING_PATH = '/'

export function isLandingPath(pathname: string): boolean {
  return pathname === LANDING_PATH || pathname === ''
}
