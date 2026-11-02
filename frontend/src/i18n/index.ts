import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ptBR from './locales/pt-BR.json'
import enUS from './locales/en-US.json'
import frFR from './locales/fr-FR.json'
import es419 from './locales/es-419.json'
import { localeTag, splitLangPath } from './lang'

export const LANGUAGE_STORAGE_KEY = 'ufc-predictor:language'

export const resources = {
  'pt-BR': {
    translation: ptBR,
  },
  'en-US': {
    translation: enUS,
  },
  'fr-FR': {
    translation: frFR,
  },
  'es-419': {
    translation: es419,
  },
} as const

const isTest = import.meta.env?.MODE === 'test'

/**
 * The language the address asks for: /en/..., /fr/..., /es/... are English, French and Spanish, an address with no prefix is
 * Portuguese. Null when the address says nothing (it never does in a test, which runs on a memory router).
 */
function languageOfAddress(): string | null {
  if (isTest || typeof window === 'undefined') return null
  const { lang } = splitLangPath(window.location.pathname)
  return lang ? localeTag(lang) : null
}

const addressLanguage = languageOfAddress()
// Choosing a language by its address is a choice: the next visit to a bare address (/) opens in it.
if (addressLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, addressLanguage)
  } catch {
    // Private mode: the address still decides the language of this visit.
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-US',
    lng: isTest
      ? 'en-US'
      : addressLanguage || (typeof window !== 'undefined' && window.localStorage?.getItem(LANGUAGE_STORAGE_KEY)) || 'pt-BR',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
  })

// Keeps <html lang> in step with the language on screen (screen readers and browser translation read it).
if (typeof document !== 'undefined') {
  const syncHtmlLang = (language: string) => {
    document.documentElement.lang = language
  }
  syncHtmlLang(i18n.resolvedLanguage ?? i18n.language)
  i18n.on('languageChanged', syncHtmlLang)
}

export default i18n
