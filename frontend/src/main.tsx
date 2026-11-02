import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import i18n from './i18n'
import { LANG_PREFIX, langPath, localeTag, splitLangPath, uiLang } from './i18n/lang'
import App from './App.tsx'

/** The address of the page the visitor is on, written in the given language: /fighters?x=1#a -> /en/fighters?x=1#a. */
function addressIn(lang: ReturnType<typeof uiLang>): string {
  const { path } = splitLangPath(window.location.pathname)
  return `${langPath(lang, path)}${window.location.search}${window.location.hash}`
}

// A visitor who chose another language earlier and opens a bare address (the Portuguese one) is taken to their language.
if (splitLangPath(window.location.pathname).lang === null && uiLang(i18n.language) !== 'pt') {
  window.history.replaceState(window.history.state, '', addressIn(uiLang(i18n.language)))
}

// Choosing a language in the menu moves the address to that language's prefix. This runs before the router for the new
// language mounts, which reads the address when it does.
i18n.on('languageChanged', (language: string) => {
  const lang = uiLang(language)
  if ((splitLangPath(window.location.pathname).lang ?? 'pt') !== lang) window.history.pushState(window.history.state, '', addressIn(lang))
})

// Back and forward cross between languages too: the address wins.
window.addEventListener('popstate', () => {
  const lang = splitLangPath(window.location.pathname).lang ?? 'pt'
  if (lang !== uiLang(i18n.language)) void i18n.changeLanguage(localeTag(lang))
})

/** One router per language: its basename is the language prefix, so every link in the app keeps the language without knowing it. */
function LocalizedRouter() {
  const { i18n: instance } = useTranslation()
  const lang = uiLang(instance.language)
  return (
    <BrowserRouter key={lang} basename={LANG_PREFIX[lang] || '/'}>
      <App />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocalizedRouter />
    {/* Vercel Web Analytics: page views and countries, no cookies. Only in the production build, and it only records
        once Web Analytics is turned on for the project in the Vercel dashboard (until then the script answers 404). */}
    {import.meta.env.PROD ? <Analytics /> : null}
  </StrictMode>,
)
