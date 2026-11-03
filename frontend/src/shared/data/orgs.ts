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
    tagline: 'Stats, rankings and AI win predictions.',
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
    tagline: 'Fighters, events, league rankings and AI win predictions.',
    hasPredictions: true,
    probabilitiesEased: true,
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
    tagline: 'MMA, Muay Thai, champions and AI win predictions.',
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
    tagline: 'Archive 2009–2023: fighters, events, champions and what-if predictions.',
    hasPredictions: true,
    probabilitiesEased: true,
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

/** The organization the way Spanish names it: "la UFC" and "la PFL" take an article, "Bellator" and "ONE" do not. */
export function orgEs(org: Pick<OrgConfig, 'id' | 'shortName'>): string {
  return org.id === 'ufc' || org.id === 'pfl' ? `la ${org.shortName}` : org.id === 'one' ? 'ONE Championship' : org.shortName
}

/** The landing screen sits at "/", outside the organization hierarchy. */
export const LANDING_PATH = '/'

export function isLandingPath(pathname: string): boolean {
  return pathname === LANDING_PATH || pathname === ''
}
