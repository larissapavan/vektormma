/**
 * Static <head> for each route.
 *
 * The app is a single page: the browser sets the title and the share tags after the JavaScript runs (PageMeta). Link
 * previews (WhatsApp, X, LinkedIn) and the first pass of a search crawler read the HTML as it is served, before any
 * script, so every route needs those tags in its own HTML file. The build writes one copy of index.html per route with
 * only the <head> tags swapped (see the seoPages plugin in vite.config.ts). These helpers are plain string functions so
 * they can be tested without a build.
 */

import { langPath, UI_LANGS, type UiLang } from '../i18n/lang'

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

const EMPTY_ROOT = '<div id="root"></div>'

/**
 * Puts the page's own text inside the empty <div id="root">. A crawler that reads the HTML before running any script
 * (or that does not wait for the data to load) then finds the page's heading and text, not a blank page. The app
 * replaces this when it starts, so a visitor only sees it for the instant before the script runs.
 */
function setBody(html: string, body: string): string {
  if (!html.includes(EMPTY_ROOT)) throw new Error('seo: could not find the empty <div id="root"> in index.html')
  return html.replace(EMPTY_ROOT, () => `<div id="root">${body}</div>`)
}

function setTitle(html: string, title: string): string {
  if (!/<title>[^<]*<\/title>/.test(html)) throw new Error('seo: could not find <title> in index.html')
  return html.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
}

/** The language tag of each language in <html lang> and og:locale (the app sets the same ones once it runs). */
export const HTML_LANG: Record<UiLang, string> = { pt: 'pt-BR', en: 'en-US', fr: 'fr-FR', es: 'es-419' }

/** hreflang codes, which name the language (and the region only where it matters). */
export const HREFLANG: Record<UiLang, string> = { pt: 'pt-BR', en: 'en', fr: 'fr', es: 'es-419' }

/** The <link rel="alternate" hreflang> tags of a page: the same address in every language, and the Portuguese one as the default. */
export function hreflangLinks(siteUrl: string, path: string, indent = '    '): string {
  const link = (code: string, href: string) => `${indent}<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}" />`
  const lines = UI_LANGS.map((lang) => link(HREFLANG[lang], absoluteUrl(siteUrl, langPath(lang, path))))
  lines.push(link('x-default', absoluteUrl(siteUrl, path)))
  return lines.join('\n')
}

export interface RouteOptions {
  /** The language the copy of the page is written in (Portuguese when left out). Sets <html lang>, og:locale, the address prefix and hreflang. */
  lang: UiLang
  /** Address of the share image, from the site root ("/og/athletes/jon-jones.jpg"). The template's image stays when left out. */
  image?: string
  /** Use the title as it is, without " · Site" (the home page). */
  rawTitle?: boolean
  /** The site description for the JSON-LD block, in the language of the page. */
  siteDescription?: string
  /** Structured data of the page itself (a person, a fight, a breadcrumb), written after the site's block. */
  jsonLd?: object[]
}

/**
 * <script type="application/ld+json"> blocks for the page. The `<` of the text is written as < so a name can never
 * close the script; `data-page-ld` carries the page's address so the app can drop the block when the visitor moves on.
 */
export function jsonLdScripts(objects: object[], url: string, indent = '    '): string {
  return objects
    .map((object) => {
      const json = JSON.stringify(object).replace(new RegExp('[<\\u2028\\u2029]', 'g'), (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
      return `${indent}<script type="application/ld+json" data-page-ld="${escapeHtml(url)}">${json}</script>`
    })
    .join('\n')
}

/**
 * index.html with the tags of one route. `meta` is the route's own title and description; `null` leaves the text of the
 * template (the home page) and only sets the address tags.
 */
export function routeHtml(template: string, site: SiteInfo, path: string, meta: RouteText | null, body?: string, options?: RouteOptions): string {
  const lang = options?.lang ?? 'pt'
  const url = escapeHtml(absoluteUrl(site.url, langPath(lang, path)))
  let html = template
  if (body !== undefined) html = setBody(html, body)
  if (meta) {
    const title = escapeHtml(options?.rawTitle ? meta.title : pageTitle(site.name, meta.title))
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
  if (options) html = localize(html, site, path, options)
  return html
}

/** The tags that depend on the language and on the page's image: <html lang>, og:locale, hreflang, JSON-LD and the share image. */
function localize(template: string, site: SiteInfo, path: string, options: RouteOptions): string {
  const tag = HTML_LANG[options.lang]
  let html = template.replace(/<html lang="[^"]*"/, () => `<html lang="${tag}"`)
  html = html.replace(/(<meta property="og:locale" content=")[^"]*(")/, (_m, open: string, close: string) => open + tag.replace('-', '_') + close)
  html = html.replace(/("inLanguage": ")[^"]*(")/, (_m, open: string, close: string) => open + tag + close)
  if (options.siteDescription) {
    const description = options.siteDescription.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    html = html.replace(/("description": ")[^"]*(")/, (_m, open: string, close: string) => open + description + close)
  }
  if (options.image) {
    const image = escapeHtml(absoluteUrl(site.url, options.image))
    html = setTag(html, '<meta property="og:image"', 'content', image)
    html = setTag(html, '<meta name="twitter:image"', 'content', image)
  }
  const alternates = hreflangLinks(site.url, path)
  const structured = options.jsonLd?.length ? `\n${jsonLdScripts(options.jsonLd, absoluteUrl(site.url, langPath(options.lang, path)))}` : ''
  return html.includes('</head>') ? html.replace('</head>', () => `${alternates}${structured}\n  </head>`) : html
}

/**
 * sitemap.xml for the given paths. No <lastmod>: the pages are rebuilt on every deploy, which says nothing about a change.
 * With `langs`, each path is listed once per language and each entry names its siblings (hreflang), as search engines ask.
 */
export function sitemapXml(siteUrl: string, paths: string[], langs?: UiLang[]): string {
  const head = '<?xml version="1.0" encoding="UTF-8"?>'
  if (!langs) {
    const entries = paths.map((path) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(siteUrl, path))}</loc>\n  </url>`)
    return `${head}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
  }
  const alternate = (code: string, href: string) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}" />`
  const entries = paths.flatMap((path) => {
    const siblings = [
      ...langs.map((lang) => alternate(HREFLANG[lang], absoluteUrl(siteUrl, langPath(lang, path)))),
      alternate('x-default', absoluteUrl(siteUrl, path)),
    ].join('\n')
    return langs.map((lang) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(siteUrl, langPath(lang, path)))}</loc>\n${siblings}\n  </url>`)
  })
  const urlset = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  return `${head}\n${urlset}\n${entries.join('\n')}\n</urlset>\n`
}

export interface BodyLink {
  label: string
  href: string
}

export interface BodySection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  links?: BodyLink[]
}

export interface BodyPage {
  title: string
  intro: string
  sections?: BodySection[]
}

const MAIN_OPEN = '<main style="max-width:48rem;margin:0 auto;padding:1rem;line-height:1.6">'

function linkList(links: BodyLink[]): string {
  return `<ul>${links.map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`).join('')}</ul>`
}

/** The text of a page as plain HTML: a heading, its intro, each section, then a list of links to the rest of the site. */
export function bodyHtml(page: BodyPage, nav: BodyLink[]): string {
  const sections = (page.sections ?? []).map((section) => {
    const parts = [`<h2>${escapeHtml(section.heading)}</h2>`]
    for (const paragraph of section.paragraphs ?? []) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
    if (section.bullets?.length) parts.push(`<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`)
    if (section.links?.length) parts.push(linkList(section.links))
    return `<section>${parts.join('')}</section>`
  })
  return `${MAIN_OPEN}<h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.intro)}</p>${sections.join('')}<nav>${linkList(nav)}</nav></main>`
}
