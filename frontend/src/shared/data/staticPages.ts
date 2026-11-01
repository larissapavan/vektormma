/**
 * Pages made of text only. They need nothing from the API, so they open at once instead of waiting behind the loading
 * screen while the free host wakes up (a visitor, or a reviewer, would otherwise see "loading" instead of the page).
 */
export const STATIC_PATHS = ['/about', '/privacy', '/terms', '/contact', '/guide']

/** The information pages that sit outside any organization (no UFC/PFL menu on them). */
export const INFO_ONLY_PATHS = ['/privacy', '/terms', '/contact', '/guide']

function clean(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
}

export function isStaticPath(pathname: string): boolean {
  const path = clean(pathname)
  return STATIC_PATHS.includes(path) || path.startsWith('/about/')
}

export function isInfoOnlyPath(pathname: string): boolean {
  return INFO_ONLY_PATHS.includes(clean(pathname))
}
