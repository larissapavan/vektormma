import { isLandingPath, orgPath, type OrgConfig } from './orgs'
import { isInfoOnlyPath } from './staticPages'

/** One entry of the section menu. `group` lists every path the entry stands for; `section` also covers its sub-pages. */
export type NavItem = { to: string; label: string; group?: string[]; section?: boolean }

export const NAV_I18N_KEYS: Record<string, string> = {
  Predict: 'nav.predict',
  Compare: 'nav.compare',
  Fighters: 'nav.fighters',
  Events: 'nav.events',
  Results: 'nav.results',
  Rankings: 'nav.rankings',
  Gyms: 'nav.gyms',
  Champions: 'nav.champions',
  Game: 'nav.career',
  About: 'nav.about',
  RecordBook: 'nav.recordBook',
  Cancelled: 'nav.cancelled',
}

// One entry per page: the matchup and champions pages used to sit under a second row of tabs that repeated this menu.
const ufcNavItems: NavItem[] = [
  { to: '/predictor', label: 'Predict' },
  { to: '/head-to-head', label: 'Compare' },
  { to: '/fighters', label: 'Fighters' },
  { to: '/events', label: 'Events' },
  { to: '/results', label: 'Results' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/champions', label: 'Champions' },
  { to: '/record-book', label: 'RecordBook' },
  { to: '/gyms', label: 'Gyms', section: true },
  { to: '/cancelled-fights', label: 'Cancelled' },
  { to: '/career', label: 'Game' },
]

export function navItemsFor(org: OrgConfig): NavItem[] {
  if (org.id === 'ufc') return ufcNavItems
  return [
    ...(org.hasPredictions ? [{ to: orgPath(org, 'predictor'), label: 'Predict' }] : []),
    { to: orgPath(org, 'fighters'), label: 'Fighters' },
    { to: orgPath(org, 'events'), label: 'Events' },
    ...(org.hasRankings ? [{ to: orgPath(org, 'rankings'), label: 'Rankings' }] : []),
    ...(org.hasChampions ? [{ to: orgPath(org, 'champions'), label: 'Champions' }] : []),
    { to: orgPath(org, 'gyms'), label: 'Gyms', section: true },
  ]
}

export function isItemActive(item: NavItem, pathname: string) {
  const current = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (item.section && current.startsWith(`${item.to}/`)) return true
  return (item.group ?? [item.to]).includes(current)
}

/** The About pages share the bare menu of the text pages, and "About" is their current entry. */
export function isAboutPath(pathname: string) {
  return pathname === '/about' || pathname.startsWith('/about/') || pathname === '/data' || pathname === '/model' || pathname === '/track-record'
}

/** Whether the page belongs to an organization's section menu: not the landing, not About, not a text page. */
export function hasSectionNav(pathname: string) {
  return !isLandingPath(pathname) && !isAboutPath(pathname) && !isInfoOnlyPath(pathname)
}
