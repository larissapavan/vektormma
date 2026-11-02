import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag, uiLang, type UiLang } from '../../i18n/lang'
import { absoluteUrl } from '../../seo/htmlMeta'
import pageMeta from '../data/pageMeta.json'

interface PageText {
  title: string
  description: string
}

// The titles and descriptions live in pageMeta.json so the build can write the same text into each route's static
// HTML (see seoPages in vite.config.ts). A route that exists but is missing there would read "Page not found".
const SITE = pageMeta.site.name
const SITE_URL = pageMeta.site.url
const PAGE_TABLES = pageMeta.pages as Record<UiLang, Record<string, PageText>>
const GYM_DETAILS = pageMeta.gymDetail as Record<UiLang, PageText>
const DEFAULT_DESCRIPTIONS = pageMeta.defaultDescription as Record<UiLang, string>

const GYM_PAGE = /^(\/pfl|\/bellator|\/one|\/rizin|\/ksw|\/lfa|\/cage-warriors|\/oktagon|\/jungle-fight|\/invicta)?\/gyms\/[^/]+$/
const ATHLETE_PAGE = /^\/athlete\/([^/]+)$/

/** The athlete in the address (/athlete/Jon%20Jones), or null for any other page. */
function athleteName(path: string): string | null {
  const match = ATHLETE_PAGE.exec(path)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function athleteText(language: string, name: string): PageText {
  return {
    title: name,
    description: L(
      language,
      `Perfil de ${name}: cartel, histórico de lutas, estatísticas e lutadores similares.`,
      `${name}: record, fight history, stats and similar fighters.`,
      `${name} : palmarès, historique des combats, statistiques et combattants similaires.`,
      `${name}: récord, historial de peleas, estadísticas y peleadores similares.`,
    ),
  }
}

/** Sets a <meta> tag, creating it when the page does not have it yet. */
function setMeta(attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', value)
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (href === null) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

/** Keeps the tab title, the description and the share tags in step with the page being viewed (the app is a single page). */
export function PageMeta() {
  const { pathname } = useLocation()
  const { i18n } = useTranslation()
  const lang = uiLang(i18n.language)

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
    const athlete = athleteName(path)
    // /athlete with no name is the fighter search: it reads like the Fighters page.
    const page =
      PAGE_TABLES[lang][path === '/athlete' ? '/fighters' : path] ??
      (athlete ? athleteText(i18n.language, athlete) : undefined) ??
      (GYM_PAGE.test(path) ? GYM_DETAILS[lang] : undefined)
    const known = path === '/' || page !== undefined

    const title = page
      ? `${page.title} · ${SITE}`
      : path === '/'
        ? SITE
        : `${L(i18n.language, 'Página não encontrada', 'Page not found', 'Page introuvable', 'Página no encontrada')} · ${SITE}`
    const description = page?.description ?? DEFAULT_DESCRIPTIONS[lang]
    // The address without a query string or a trailing slash: ?a=X&b=Y on /head-to-head is the same page for a search engine.
    const url = absoluteUrl(SITE_URL, path)

    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:locale', localeTag(i18n.language).replace('-', '_'))
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:url', url)

    // A path the app does not have still answers 200 (every address serves the same HTML), so tell search engines.
    if (known) {
      document.head.querySelector('meta[name="robots"]')?.remove()
      setCanonical(url)
    } else {
      setMeta('name', 'robots', 'noindex')
      setCanonical(null)
    }
  }, [pathname, i18n.language, lang])

  return null
}
