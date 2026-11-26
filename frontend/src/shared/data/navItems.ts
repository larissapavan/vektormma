import { isLandingPath, orgPath, type OrgConfig } from './orgs'
import { isInfoOnlyPath } from './staticPages'

/** One entry of the section menu. `group` lists every path the entry stands for; `section` also covers its sub-pages. */
export type NavItem = { to: string; label: string; group?: string[]; section?: boolean }

/** The menu of an organization: the same main destinations everywhere (Events, Fighters, Predictions), the rest under "More". */
export type OrgNav = { primary: NavItem[]; more: NavItem[] }

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
  MyCard: 'nav.myCard',
}

// "Events" also stands for the results page, and "Predictions" for a fight's own page: they live under the same entry.
const ufcNav: OrgNav = {
  primary: [
    { to: '/events', label: 'Events', group: ['/events', '/results'] },
    { to: '/fighters', label: 'Fighters', group: ['/fighters', '/athlete'], section: true },
    { to: '/predictor', label: 'Predict', group: ['/predictor', '/fight'], section: true },
  ],
  more: [
    { to: '/rankings', label: 'Rankings' },
    { to: '/champions', label: 'Champions' },
    { to: '/gyms', label: 'Gyms', section: true },
    { to: '/record-book', label: 'RecordBook' },
    { to: '/head-to-head', label: 'Compare' },
    { to: '/my-card', label: 'MyCard' },
    { to: '/cancelled-fights', label: 'Cancelled' },
    { to: '/career', label: 'Game' },
  ],
}

export function orgNav(org: OrgConfig): OrgNav {
  if (org.id === 'ufc') return ufcNav
  return {
    primary: [
      { to: orgPath(org, 'events'), label: 'Events' },
      { to: orgPath(org, 'fighters'), label: 'Fighters' },
      ...(org.hasPredictions ? [{ to: orgPath(org, 'predictor'), label: 'Predict' }] : []),
    ],
    more: [
      ...(org.hasRankings ? [{ to: orgPath(org, 'rankings'), label: 'Rankings' }] : []),
      ...(org.hasChampions ? [{ to: orgPath(org, 'champions'), label: 'Champions' }] : []),
      { to: orgPath(org, 'gyms'), label: 'Gyms', section: true },
    ],
  }
}

/** Every entry of the menu, main ones first. */
export function navItemsFor(org: OrgConfig): NavItem[] {
  const { primary, more } = orgNav(org)
  return [...primary, ...more]
}

export function isItemActive(item: NavItem, pathname: string) {
  const current = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  const paths = item.group ?? [item.to]
  if (item.section && paths.some((path) => current.startsWith(`${path}/`))) return true
  return paths.includes(current)
}

/** The About pages share the bare menu of the text pages, and "About" is their current entry. */
export function isAboutPath(pathname: string) {
  return pathname === '/about' || pathname.startsWith('/about/') || pathname === '/data' || pathname === '/model' || pathname === '/track-record'
}

/** Whether the page belongs to an organization's section menu: not the landing, not About, not a text page. */
export function hasSectionNav(pathname: string) {
  return !isLandingPath(pathname) && !isAboutPath(pathname) && !isInfoOnlyPath(pathname)
}
