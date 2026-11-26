import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Header } from '../shared/components/Header'
import { MobileTabBar } from '../shared/components/MobileTabBar'
import { ScrollToTop } from '../shared/components/ScrollToTop'
import { PageMeta } from '../shared/components/PageMeta'
import { isLandingPath } from '../shared/data/orgs'
import { isStaticPath } from '../shared/data/staticPages'
import { hasSectionNav } from '../shared/data/navItems'
import { SiteFooter } from '../shared/components/SiteFooter'
import { useOrg } from '../shared/hooks/useOrg'
import { ServerLoadingState } from '../shared/components/ServerLoadingState'
import { getOrgDataInfo, waitForHealth } from '../shared/services/api'

function formatDataDate(iso: string, locale = 'pt-BR') {
  const date = new Date(`${iso}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MainLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'pt-BR'
  const [dataDate, setDataDate] = useState<string | null>(null)
  const [orgDataDate, setOrgDataDate] = useState<{ org: string; date: string | null } | null>(null)
  const [apiState, setApiState] = useState<'pending' | 'ready' | 'down'>('pending')
  const org = useOrg()
  const { pathname } = useLocation()
  const landing = isLandingPath(pathname)
  // The landing screen and the text pages need nothing from the API, so they open at once.
  const opensAtOnce = landing || isStaticPath(pathname)
  const showLoading = !opensAtOnce && apiState === 'pending'

  // Each organization has its own accent color (see index.css); the attribute is what the stylesheet reads.
  useEffect(() => {
    document.documentElement.dataset.org = org.id
  }, [org.id])

  // The footer says how fresh the data of the organization on screen is (the health check only knows the UFC's).
  useEffect(() => {
    if (org.id === 'ufc') return
    let active = true
    getOrgDataInfo(org.id)
      .then((info) => active && setOrgDataDate({ org: org.id, date: info.last_updated ? formatDataDate(info.last_updated, locale) : null }))
      .catch(() => active && setOrgDataDate({ org: org.id, date: null }))
    return () => {
      active = false
    }
  }, [org.id, locale])

  useEffect(() => {
    // The API runs on a paid server, so it answers at once; the retries only cover a brief restart or outage.
    waitForHealth()
      .then((health) => {
        setDataDate(health.latest_fight_date ? formatDataDate(health.latest_fight_date, locale) : null)
        setApiState('ready')
      })
      .catch(() => {
        setDataDate(null)
        setApiState('down')
      })
  }, [locale])

  const footerDate = landing ? null : org.id === 'ufc' ? dataDate : orgDataDate?.org === org.id ? orgDataDate.date : null

  return (
    <div
      className={`dashboard-shell w-full max-w-full min-h-screen transition-colors duration-200 bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col overflow-x-hidden ${
        // Room for the bottom bar a phone shows on section pages.
        hasSectionNav(pathname) ? 'max-lg:pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''
      }`}
    >
      <a
        href="#main-content"
        className="type-tech sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        {t('common.skipToContent', 'Skip to content')}
      </a>
      {/* The header stays pinned to the top of the screen. */}
      <div className="sticky top-0 z-50 w-full border-b border-[var(--rule)] bg-[var(--mat)]">
        <div className="mx-auto w-full max-w-[1376px] px-4 sm:px-6 lg:px-12">
          <Header />
        </div>
      </div>

      {/* Inner pages share the header's width and side padding so the content lines up with the logo. The landing runs edge to
          edge so its hero background has no visible box; its sections pad themselves to the same content column as the header. */}
      <div
        className={`mx-auto flex w-full flex-1 flex-col ${landing ? 'max-w-none px-0' : 'max-w-[1376px] px-4 sm:px-6 lg:px-12'}`}
      >
        <ScrollToTop />
        <PageMeta />
        {apiState === 'down' && !opensAtOnce ? (
          <p role="alert" className="error-note mt-3">
            {t('common.serverDown', 'The server is not answering right now. Give it a minute and reload the page.')}
          </p>
        ) : null}
        <main
          id="main-content"
          className={
            landing
              ? 'flex-1 flex flex-col w-full max-w-full my-0'
              : 'flex-1 pt-3 sm:pt-4 w-full max-w-full min-w-0'
          }
        >
          {/* The chooser needs no data, so it opens at once while the API answers in the background. */}
          {showLoading ? <ServerLoadingState /> : children}
        </main>
        {landing ? null : <SiteFooter dataDate={footerDate} className="mt-10 sm:mt-12" />}
      </div>
      <MobileTabBar />
    </div>
  )
}
