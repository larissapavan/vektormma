import { FolderGit2, Maximize2, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, langPath, uiLang } from '../../i18n/lang'
import { isLandingPath, LANDING_PATH, orgPath, type OrgConfig } from '../data/orgs'
import { isInfoOnlyPath } from '../data/staticPages'
import { useModelInfo } from '../hooks/useModelInfo'
import { useOrg } from '../hooks/useOrg'
import { useTheme } from '../context/ThemeContext'
import { BrandMark } from './BrandMark'
import { FighterSearch } from './FighterSearch'
import { SocialLinks } from './SocialLinks'
import { LanguageSwitcher } from './LanguageSwitcher'
import { OrgSwitcher } from './OrgSwitcher'

type NavItem = { to: string; label: string; group?: string[]; section?: boolean }

const NAV_I18N_KEYS: Record<string, string> = {
  Predict: 'nav.predict',
  Fighters: 'nav.fighters',
  Events: 'nav.events',
  Rankings: 'nav.rankings',
  Gyms: 'nav.gyms',
  Champions: 'nav.champions',
  About: 'nav.about',
}

const ufcNavItems: NavItem[] = [
  { to: '/predictor', label: 'Predict', group: ['/predictor', '/head-to-head', '/matchup-intelligence'] },
  { to: '/fighters', label: 'Fighters' },
  { to: '/events', label: 'Events' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/gyms', label: 'Gyms', section: true },
  { to: '/champions', label: 'Champions', group: ['/champions', '/record-book'] },
]

function navItemsFor(org: OrgConfig): NavItem[] {
  if (org.id === 'ufc') return ufcNavItems
  return [
    ...(org.hasPredictions ? [{ to: orgPath(org, 'predictor'), label: 'Predict' }] : []),
    { to: orgPath(org, 'fighters'), label: 'Fighters' },
    { to: orgPath(org, 'events'), label: 'Events' },
    ...(org.hasRankings ? [{ to: orgPath(org, 'rankings'), label: 'Rankings' }] : []),
    ...(org.hasChampions ? [{ to: orgPath(org, 'champions'), label: 'Champions' }] : []),
    { to: orgPath(org, 'gyms'), label: 'Gyms', section: true },
  ]
}

function isItemActive(item: NavItem, pathname: string) {
  const current = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (item.section && current.startsWith(`${item.to}/`)) return true
  return (item.group ?? [item.to]).includes(current)
}

/**
 * The phone menus scroll sideways. They open with the current page's tab in view, and while more tabs are hidden at an edge
 * the bar fades out there, so a cut-off tab reads as "more this way" and not as a truncated label.
 */
function useScrollingTabs(pathname: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [moreOnRight, setMoreOnRight] = useState(false)
  const [moreOnLeft, setMoreOnLeft] = useState(false)

  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const update = () => {
      setMoreOnRight(bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2)
      setMoreOnLeft(bar.scrollLeft > 2)
    }
    bar.querySelector('[aria-current="page"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
    update()
    bar.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      bar.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [pathname])

  return [ref, moreOnRight, moreOnLeft] as const
}

/**
 * Modern, Minimalist SaaS Combat Sports Analytics Navbar (Clean Single-Bar Layout).
 */
export function Header() {
  const { t, i18n } = useTranslation()
  const { health, loading } = useModelInfo()
  const { pathname } = useLocation()
  const org = useOrg()
  const landing = isLandingPath(pathname)
  const isAbout = pathname === '/about' || pathname.startsWith('/about/') || pathname === '/data' || pathname === '/model' || pathname === '/track-record'
  // The privacy, terms, contact and guide pages have the same bare menu as About, but "About" is not their current page.
  const bare = isAbout || isInfoOnlyPath(pathname)
  const navItems = landing || bare ? [] : navItemsFor(org)
  const { isLight, toggleTheme } = useTheme()
  const githubLabel = L(i18n.language, 'Perfil no GitHub (abre em nova aba)', 'GitHub profile (opens in a new tab)', 'Profil GitHub (s’ouvre dans un nouvel onglet)', 'Perfil de GitHub (se abre en una pestaña nueva)')
  const [tabsRef, moreTabsOnRight, moreTabsOnLeft] = useScrollingTabs(pathname)
  // Fade the edge where more tabs are hidden.
  const fade = (left: boolean, right: boolean) =>
    left || right ? `linear-gradient(to right, ${left ? 'transparent, #000 28px' : '#000'}, ${right ? '#000 calc(100% - 28px), transparent' : '#000'})` : undefined
  const fadeImage = fade(moreTabsOnLeft, moreTabsOnRight)
  const fadeStyle = fadeImage ? { maskImage: fadeImage, WebkitMaskImage: fadeImage } : undefined

  const apiLabel = loading
    ? t('header.apiWaking', 'Starting')
    : health?.model_loaded
      ? t('header.apiLive', 'Live')
      : t('header.apiOffline', 'Offline')

  const apiTitle = loading
    ? t('header.apiWakingTitle', 'Starting API server...')
    : health?.model_loaded
      ? t('header.apiLiveTitle', 'API is live and the model is loaded')
      : t('header.apiOfflineTitle', 'API is unreachable')

  const apiDotColor = loading
    ? 'bg-[#F2C230] animate-pulse'
    : health?.model_loaded
      ? 'bg-[#22c55e]'
      : 'bg-[#C8102E]'

  return (
    <header className="w-full shrink-0">
      <div className="relative w-full text-[var(--text-primary)]">
        {/* Main Navbar Row */}
        <div className="flex h-14 sm:h-16 w-full items-center justify-between gap-1 xs:gap-2 sm:gap-6">
          {/* Left: Native Brand Identity. Under 480px the toolbar on the right drops its globe icon and divider and the
              gaps tighten, so the whole wordmark fits next to it on a 320px phone instead of ending under the org button. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 xl:gap-8">
            <Link
              to={LANDING_PATH}
              aria-label={L(i18n.language, 'Vektor MMA • Início', 'Vektor MMA home', 'Vektor MMA • Accueil', 'Vektor MMA • Inicio')}
              className="flex shrink-0 items-center gap-1.5 xs:gap-2 sm:gap-2.5 transition opacity-95 hover:opacity-100 min-w-0"
            >
              <BrandMark className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 shrink-0 drop-shadow-sm" />
              <span className="flex flex-col items-start justify-center leading-tight min-w-0">
                <span className="hidden sm:block font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {t('header.matchupAnalytics', 'Análise de Combates')}
                </span>
                <span className="text-xs xs:text-sm sm:text-base font-bold tracking-tight whitespace-nowrap text-[var(--text-primary)]">
                  VEKTOR <span className="text-[#C8102E] dark:text-[#FF2E54]">MMA</span>
                </span>
              </span>
            </Link>

            {/* Center-Left: Desktop Navigation com Indicador Neon Ancorado na Borda */}
            {landing || bare ? (
              <nav
                aria-label={L(i18n.language, 'Navegação principal', 'Main navigation', 'Navigation principale', 'Navegación principal')}
                className="min-w-0 flex-1"
              >
                <div ref={tabsRef} style={fadeStyle} className="overflow-x-auto no-scrollbar overscroll-x-contain">
                <div className="flex h-14 min-w-max shrink-0 items-center gap-1 whitespace-nowrap sm:h-16 sm:gap-2">
                <a
                  href={`${langPath(uiLang(i18n.language), '/')}#organizations-grid`}
                  onClick={(e) => {
                    if (landing) {
                      e.preventDefault()
                      document.getElementById('organizations-grid')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className="relative flex h-full shrink-0 items-center px-2.5 text-xs font-bold whitespace-nowrap text-[var(--text-secondary)] transition duration-200 hover:text-[var(--text-primary)] dark:hover:text-white sm:px-3 xl:text-[13px]"
                >
                  <span>{L(i18n.language, 'Organizações', 'Organizations', 'Organisations', 'Organizaciones')}</span>
                  {landing && !bare && pathname === '/' && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#FF2E54] rounded-full shadow-[0_0_12px_#FF2E54,0_0_4px_#FF2E54]" />
                  )}
                </a>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `relative flex h-full shrink-0 items-center px-2.5 text-xs font-bold whitespace-nowrap transition duration-200 sm:px-3 xl:text-[13px] ${
                      isActive || isAbout
                        ? 'text-[var(--text-primary)] dark:text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{t('nav.about', 'About')}</span>
                      {(isActive || isAbout) && (
                        <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#FF2E54] rounded-full shadow-[0_0_12px_#FF2E54,0_0_4px_#FF2E54]" />
                      )}
                    </>
                  )}
                </NavLink>
                </div>
                </div>
              </nav>
            ) : (
              <nav
                aria-label={L(i18n.language, 'Navegação principal', 'Main navigation', 'Navigation principale', 'Navegación principal')}
                className="hidden min-[1200px]:flex items-center h-14 sm:h-16 gap-1 sm:gap-2"
              >
                {navItems.map((item) => {
                  const active = isItemActive(item, pathname)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`relative h-full flex shrink-0 items-center px-3 xl:px-2.5 text-xs xl:text-[13px] font-bold transition duration-200 whitespace-nowrap ${
                        active
                          ? 'text-[var(--text-primary)] dark:text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white'
                      }`}
                    >
                      <span>{t(NAV_I18N_KEYS[item.label] ?? item.label, item.label)}</span>
                      {active && (
                        <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#FF2E54] rounded-full shadow-[0_0_12px_#FF2E54,0_0_4px_#FF2E54]" />
                      )}
                    </NavLink>
                  )
                })}
              </nav>
            )}
          </div>

          {/* Right: Modern SaaS Utility Toolbar */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {!landing && !bare && <OrgSwitcher className="shrink-0" />}

            {!landing && !bare && <FighterSearch />}

            {/* Minimalist LIVE Telemetry Status Pill. Inner pages have no room for it next to the menu, the search and the switcher. */}
            {landing || bare ? (
            <div
              title={apiTitle}
              className="hidden sm:inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] dark:border-white/10 dark:bg-white/[0.04] backdrop-blur-md cursor-default text-[var(--text-secondary)] shadow-xs transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${apiDotColor} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${apiDotColor} shadow-[0_0_6px_#22c55e]`} />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] dark:text-neutral-300">
                {apiLabel}
              </span>
            </div>
            ) : null}

            <LanguageSwitcher />

            {/* Minimalist Secondary Control Icons (Theme, Fullscreen & Social/GitHub) */}
            <div className="inline-flex items-center gap-0.5 sm:gap-1 border-l border-[var(--border-subtle)] dark:border-white/10 pl-1.5 sm:pl-2.5 max-xs:border-l-0 max-xs:pl-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] dark:hover:text-white"
                aria-label={t('header.switchTheme', { theme: isLight ? t('header.themeDark') : t('header.themeLight') })}
                title={t('header.switchTheme', { theme: isLight ? t('header.themeDark') : t('header.themeLight') })}
              >
                {isLight ? <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.()
                  } else {
                    document.exitFullscreen?.()
                  }
                }}
                className="hidden md:inline-flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] dark:hover:text-white"
                aria-label={L(i18n.language, 'Alternar tela cheia', 'Toggle fullscreen', 'Plein écran', 'Pantalla completa')}
                title={L(i18n.language, 'Alternar tela cheia', 'Toggle fullscreen', 'Plein écran', 'Pantalla completa')}
              >
                <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Same on the social icons: the footer carries them on inner pages. */}
              {landing || bare ? (
                <div className="hidden xl:inline-flex items-center gap-0.5">
                  <SocialLinks />
                </div>
              ) : null}

              <a
                href="https://github.com/larissapavan"
                target="_blank"
                rel="noreferrer"
                title={githubLabel}
                aria-label={githubLabel}
                className="hidden sm:inline-flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] dark:hover:text-white"
              >
                <FolderGit2 className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Navigation: Seamless integrated sub-bar */}
        {!landing && !bare && (
          <div
            ref={tabsRef}
            style={fadeStyle}
            className="min-[1200px]:hidden min-w-0 border-t border-[var(--border-subtle)] px-2 py-1 overflow-x-auto no-scrollbar overscroll-x-contain"
          >
            <nav
              aria-label={L(i18n.language, 'Navegação móvel', 'Mobile navigation', 'Navigation mobile', 'Navegación móvil')}
              className="flex items-center gap-1 w-max"
            >
              {navItems.map((item) => {
                const active = isItemActive(item, pathname)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      color: active ? '#ffffff' : 'var(--text-primary)',
                      backgroundColor: active ? '#C8102E' : undefined,
                    }}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/10 ${
                      active ? 'shadow-xs font-bold' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {t(NAV_I18N_KEYS[item.label] ?? item.label, item.label)}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
