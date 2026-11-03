/**
 * Structured data (schema.org JSON-LD) for the athlete and fight pages.
 *
 * It says to a search engine what the page is about: a person who fights MMA, or a fight between two of them on a date.
 * Only facts the catalog holds go in. There is no venue because the data has none, and the model's pick is left out: it
 * is a forecast, not a fact about the event. The build writes these objects into each page's static HTML (see seoPages in
 * vite.config.ts); plain functions with no React, like the rest of this folder.
 */

import { L, langPath, type UiLang } from '../i18n/lang'
import { countryName, eventDay, fightText, type AthleteSeo, type FightSeo } from './athletes'
import { absoluteUrl, type RouteText } from './htmlMeta'

export type JsonLd = Record<string, unknown>

/** Names for the first and the middle step of the breadcrumb: the site, and the list page the page belongs to. */
export interface Trail {
  site: string
  list: string
  listPath: string
}

const CONTEXT = 'https://schema.org'

function breadcrumb(siteUrl: string, lang: UiLang, trail: Trail, name: string, path: string): JsonLd {
  const steps = [
    { name: trail.site, path: '/' },
    { name: trail.list, path: trail.listPath },
    { name, path },
  ]
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absoluteUrl(siteUrl, langPath(lang, step.path)),
    })),
  }
}

function person(siteUrl: string, lang: UiLang, athlete: AthleteSeo, description?: string): JsonLd {
  const country = countryName(athlete.countryCode, lang)
  return {
    '@type': 'Person',
    name: athlete.name,
    ...(athlete.nickname ? { alternateName: athlete.nickname } : {}),
    url: absoluteUrl(siteUrl, langPath(lang, `/athlete/${athlete.slug}`)),
    ...(athlete.photo ? { image: absoluteUrl(siteUrl, `/fighter-photos/${athlete.photo}`) } : {}),
    jobTitle: L(lang, 'Lutador de MMA', 'MMA fighter', 'Combattant de MMA', 'Peleador de MMA'),
    ...(country ? { nationality: { '@type': 'Country', name: country } } : {}),
    ...(description ? { description } : {}),
  }
}

/** The athlete's page: the person, and the breadcrumb Home > Fighters > name. */
export function athleteJsonLd(siteUrl: string, lang: UiLang, athlete: AthleteSeo, text: RouteText, trail: Trail): JsonLd[] {
  const path = `/athlete/${athlete.slug}`
  const main = { '@context': CONTEXT, ...person(siteUrl, lang, athlete, text.description), mainEntityOfPage: absoluteUrl(siteUrl, langPath(lang, path)) }
  return [main, breadcrumb(siteUrl, lang, trail, athlete.name, path)]
}

/** The fight's page: the bout as a sports event with its two competitors, and the breadcrumb Home > Events > "A vs. B". */
export function fightJsonLd(siteUrl: string, lang: UiLang, fight: FightSeo, trail: Trail, image?: string): JsonLd[] {
  const path = `/fight/${fight.slug}`
  const title = fightText(lang, fight).title
  const url = absoluteUrl(siteUrl, langPath(lang, path))
  const main: JsonLd = {
    '@context': CONTEXT,
    '@type': 'SportsEvent',
    name: title,
    url,
    mainEntityOfPage: url,
    inLanguage: L(lang, 'pt-BR', 'en-US', 'fr-FR', 'es-419'),
    sport: L(lang, 'Artes marciais mistas', 'Mixed martial arts', 'Arts martiaux mixtes', 'Artes marciales mixtas'),
    startDate: fight.date,
    eventStatus: `${CONTEXT}/EventScheduled`,
    ...(image ? { image: absoluteUrl(siteUrl, image) } : {}),
    description: `${fight.event}, ${eventDay(fight.date, lang)}.`,
    superEvent: { '@type': 'SportsEvent', name: fight.event, startDate: fight.date },
    competitor: [person(siteUrl, lang, fight.a), person(siteUrl, lang, fight.b)],
  }
  return [main, breadcrumb(siteUrl, lang, trail, title, path)]
}
