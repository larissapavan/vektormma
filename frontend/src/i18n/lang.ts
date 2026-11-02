export type UiLang = 'pt' | 'en' | 'fr' | 'es'

export type LocaleTag = 'pt-BR' | 'en-US' | 'fr-FR' | 'es-419'

export function uiLang(language: string | boolean | null | undefined): UiLang {
  if (language === true) return 'pt'
  if (language === false || language == null) return 'en'
  if (language.startsWith('pt')) return 'pt'
  if (language.startsWith('fr')) return 'fr'
  if (language.startsWith('es')) return 'es'
  return 'en'
}

export function localeTag(language: string | boolean | null | undefined): LocaleTag {
  const lang = uiLang(language)
  if (lang === 'pt') return 'pt-BR'
  if (lang === 'fr') return 'fr-FR'
  if (lang === 'es') return 'es-419'
  return 'en-US'
}

/**
 * The string for the active language. Every language is written out in full (never the English text as a stand-in), so
 * a page reads in one language only. Proper names (fighters, organizations, events) are the only shared text.
 */
export function L(language: string | boolean | null | undefined, pt: string, en: string, fr: string, es: string): string {
  const lang = uiLang(language)
  if (lang === 'pt') return pt
  if (lang === 'fr') return fr
  if (lang === 'es') return es
  return en
}

/** A value per language, for lookup tables. */
export type ByLang<T = string> = Record<UiLang, T>

/** Picks the entry of a `ByLang` table for the active language. */
export function pick<T>(language: string | boolean | null | undefined, table: ByLang<T>): T {
  return table[uiLang(language)]
}

/** The address prefix of each language: Portuguese, the language the site opens in, has none (/fighters, /en/fighters). */
export const LANG_PREFIX: Record<UiLang, string> = { pt: '', en: '/en', fr: '/fr', es: '/es' }

export const UI_LANGS: UiLang[] = ['pt', 'en', 'fr', 'es']

/** The language an address is written in, and the same address without its language prefix: "/fr/guide" -> fr, "/guide". */
export function splitLangPath(path: string): { lang: UiLang | null; path: string } {
  for (const lang of UI_LANGS) {
    const prefix = LANG_PREFIX[lang]
    if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) return { lang, path: path.slice(prefix.length) || '/' }
  }
  return { lang: null, path }
}

/** An address inside the site in the given language: ("fr", "/guide") -> "/fr/guide", ("en", "/") -> "/en", ("pt", "/") -> "/". */
export function langPath(lang: UiLang, path: string): string {
  const prefix = LANG_PREFIX[lang]
  if (!prefix) return path
  return path === '/' ? prefix : `${prefix}${path}`
}
