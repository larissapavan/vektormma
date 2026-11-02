import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, langPath, localeTag, UI_LANGS, uiLang, type UiLang } from '../../i18n/lang'
import { athleteSlug, athleteText, fightText, type SeoData } from '../../seo/athletes'
import { absoluteUrl, HREFLANG } from '../../seo/htmlMeta'
import pageMeta from '../data/pageMeta.json'

interface PageText {
  title: string
  description: string
}

// The titles and descriptions live in pageMeta.json so the build can write the same text into each route's static
// HTML (see seoPages in vite.config.ts). A route that exists but is missing there would read "Page not found".
const SITE = pageMeta.site.name
const SITE_URL = pageMeta.site.url
const SITE_IMAGE = absoluteUrl(SITE_URL, pageMeta.site.image)
const PAGE_TABLES = pageMeta.pages as Record<UiLang, Record<string, PageText>>
const GYM_DETAILS = pageMeta.gymDetail as Record<UiLang, PageText>
const DEFAULT_DESCRIPTIONS = pageMeta.defaultDescription as Record<UiLang, string>
const HOME_TITLES = pageMeta.homeTitle as Record<UiLang, string>

const GYM_PAGE = /^(\/pfl|\/bellator|\/one|\/rizin|\/ksw|\/lfa|\/cage-warriors|\/oktagon|\/jungle-fight|\/invicta)?\/gyms\/[^/]+$/
const ATHLETE_PAGE = /^\/athlete\/([^/]+)$/
const FIGHT_PAGE = /^\/fight\/([^/]+)$/

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

/** "jon-jones" -> "Jon Jones", for an address whose athlete the static data does not cover; a name written out is left as it is. */
function prettyName(value: string): string {
  return /^[a-z0-9-]+$/.test(value) ? value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : value
}

function plainAthleteText(language: string, name: string): PageText {
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

/** Sets the <link rel="alternate" hreflang> tags: the page in every language, the Portuguese one as the default. */
function setAlternates(path: string | null) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => link.remove())
  if (path === null) return
  const add = (code: string, href: string) => {
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', code)
    link.setAttribute('href', href)
    document.head.appendChild(link)
  }
  for (const lang of UI_LANGS) add(HREFLANG[lang], absoluteUrl(SITE_URL, langPath(lang, path)))
  add('x-default', absoluteUrl(SITE_URL, path))
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
  const [seo, setSeo] = useState<SeoData | null>(null)

  // The athletes and fights the static pages cover (a separate chunk: only the athlete and fight pages need it).
  const needsSeo = ATHLETE_PAGE.test(pathname) || FIGHT_PAGE.test(pathname)
  useEffect(() => {
    if (!needsSeo || seo) return
    let cancelled = false
    void import('../../seo/athletes.json').then((module) => {
      if (!cancelled) setSeo(module.default as SeoData)
    })
    return () => {
      cancelled = true
    }
  }, [needsSeo, seo])

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
    const athlete = athleteName(path)
    const fightSlug = FIGHT_PAGE.exec(path)?.[1] ?? null
    // The static page already carries the right tags: leave them until the data to write the same ones has loaded.
    if ((athlete || fightSlug) && !seo) return
    const seoAthlete = athlete && seo ? seo.athletes.find((entry) => entry.slug === athleteSlug(athlete)) : undefined
    const seoFight = fightSlug && seo ? seo.fights.find((entry) => entry.slug === fightSlug) : undefined
    // /athlete with no name is the fighter search: it reads like the Fighters page.
    const page =
      PAGE_TABLES[lang][path === '/athlete' ? '/fighters' : path] ??
      (seoAthlete ? athleteText(i18n.language, seoAthlete) : undefined) ??
      (athlete ? plainAthleteText(i18n.language, prettyName(athlete)) : undefined) ??
      (seoFight ? fightText(i18n.language, seoFight) : undefined) ??
      (fightSlug ? plainAthleteText(i18n.language, prettyName(fightSlug.replace('-vs-', ' vs. '))) : undefined) ??
      (GYM_PAGE.test(path) ? GYM_DETAILS[lang] : undefined)
    const known = path === '/' || page !== undefined
    const image = seoAthlete ? `/og/athletes/${seoAthlete.slug}.jpg` : seoFight ? `/og/fights/${seoFight.slug}.jpg` : null

    const title = page
      ? `${page.title} · ${SITE}`
      : path === '/'
        ? HOME_TITLES[lang]
        : `${L(i18n.language, 'Página não encontrada', 'Page not found', 'Page introuvable', 'Página no encontrada')} · ${SITE}`
    const description = page?.description ?? DEFAULT_DESCRIPTIONS[lang]
    // The address without a query string or a trailing slash: ?a=X&b=Y on /head-to-head is the same page for a search engine.
    // An athlete has one address, the slug: /athlete/Jon%20Jones and /athlete/jon-jones are the same page.
    const canonicalPath = athlete ? `/athlete/${athleteSlug(athlete)}` : path
    const url = absoluteUrl(SITE_URL, langPath(lang, canonicalPath))
    const shareImage = image ? absoluteUrl(SITE_URL, image) : SITE_IMAGE

    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:locale', localeTag(i18n.language).replace('-', '_'))
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:url', url)
    setMeta('property', 'og:image', shareImage)
    setMeta('name', 'twitter:image', shareImage)

    // A path the app does not have still answers 200 (every address serves the same HTML), so tell search engines.
    if (known) {
      document.head.querySelector('meta[name="robots"]')?.remove()
      setCanonical(url)
      setAlternates(canonicalPath)
    } else {
      setMeta('name', 'robots', 'noindex')
      setCanonical(null)
      setAlternates(null)
    }
  }, [pathname, i18n.language, lang, seo])

  return null
}
