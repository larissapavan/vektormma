/**
 * Static <head> for each route.
 *
 * The app is a single page: the browser sets the title and the share tags after the JavaScript runs (PageMeta). Link
 * previews (WhatsApp, X, LinkedIn) and the first pass of a search crawler read the HTML as it is served, before any
 * script, so every route needs those tags in its own HTML file. The build writes one copy of index.html per route with
 * only the <head> tags swapped (see the seoPages plugin in vite.config.ts). These helpers are plain string functions so
 * they can be tested without a build.
 */

export interface RouteText {
  title: string
  description: string
}

export interface SiteInfo {
  name: string
  url: string
}

/** The public address of a path: no trailing slash except for the site root. */
export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  if (path === '/' || path === '') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/+$/, '')
}

/** "Page · Site", the same title the app sets in the browser tab. */
export function pageTitle(siteName: string, title: string): string {
  return `${title} · ${siteName}`
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sets the content (or href) of a tag written as `<meta name="key" content="...">`, leaving the rest of the tag alone.
 * A tag that is not there stops the build: a silent miss would ship a page with the home tags on it.
 */
function setTag(html: string, tag: string, attribute: 'content' | 'href', value: string): string {
  const pattern = new RegExp(`(${escapeRegExp(tag)}[^>]*?\\s${attribute}=")[^"]*(")`)
  if (!pattern.test(html)) throw new Error(`seo: could not find ${tag} in index.html`)
  return html.replace(pattern, (_match, open: string, close: string) => open + value + close)
}

function setTitle(html: string, title: string): string {
  if (!/<title>[^<]*<\/title>/.test(html)) throw new Error('seo: could not find <title> in index.html')
  return html.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
}

/**
 * index.html with the tags of one route. `meta` is the route's own title and description; `null` leaves the text of the
 * template (the home page) and only sets the address tags.
 */
export function routeHtml(template: string, site: SiteInfo, path: string, meta: RouteText | null): string {
  const url = escapeHtml(absoluteUrl(site.url, path))
  let html = template
  if (meta) {
    const title = escapeHtml(pageTitle(site.name, meta.title))
    const description = escapeHtml(meta.description)
    html = setTitle(html, title)
    html = setTag(html, '<meta name="description"', 'content', description)
    html = setTag(html, '<meta property="og:title"', 'content', title)
    html = setTag(html, '<meta property="og:description"', 'content', description)
    html = setTag(html, '<meta name="twitter:title"', 'content', title)
    html = setTag(html, '<meta name="twitter:description"', 'content', description)
  }
  html = setTag(html, '<link rel="canonical"', 'href', url)
  html = setTag(html, '<meta property="og:url"', 'content', url)
  html = setTag(html, '<meta name="twitter:url"', 'content', url)
  return html
}

/** sitemap.xml for the given paths. No <lastmod>: the pages are rebuilt on every deploy, which says nothing about a change. */
export function sitemapXml(siteUrl: string, paths: string[]): string {
  const entries = paths.map((path) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(siteUrl, path))}</loc>\n  </url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
}
