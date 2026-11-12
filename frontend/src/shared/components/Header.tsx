import { ChevronDown, FolderGit2, Maximize2, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, langPath, uiLang } from '../../i18n/lang'
import { isLandingPath, LANDING_PATH } from '../data/orgs'
import { isAboutPath, isItemActive, NAV_I18N_KEYS, navItemsFor, type NavItem } from '../data/navItems'
import { isInfoOnlyPath } from '../data/staticPages'
import { useModelInfo } from '../hooks/useModelInfo'
import { useOrg } from '../hooks/useOrg'
import { useTheme } from '../context/ThemeContext'
import { BrandMark } from './BrandMark'
import { FighterSearch } from './FighterSearch'
import { SocialLinks } from './SocialLinks'
import { LanguageSwitcher } from './LanguageSwitcher'
import { OrgSwitcher } from './OrgSwitcher'

/**
 * The tablet menu scrolls sideways (a phone has the bar at the bottom of the screen instead). It opens with the current page's tab in view, and while more tabs are hidden at an edge
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

const DESKTOP_BAR_ITEMS = 4

/** The entries that do not fit the desktop bar, in a small menu. It is remounted on every page change, which closes it. */
function MoreMenu({
  items,
  pathname,
  label,
  itemLabel,
  triggerClass,
}: {
  items: NavItem[]
  pathname: string
  label: string
  itemLabel: (item: NavItem) => string
  triggerClass: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex h-full items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="header-more-menu"
        onClick={() => setOpen((current) => !current)}
        className={`${triggerClass} cursor-pointer gap-1`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul id="header-more-menu" className="absolute left-0 top-full z-50 min-w-44 border-[1.5px] border-[var(--ink)] bg-[var(--panel)] py-1 rounded-sm">
          {items.map((item) => {
            const active = isItemActive(item, pathname)
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center px-4 text-[15px] text-[var(--ink)] underline-offset-[6px] hover:bg-[var(--panel-hover)] ${
                    active ? 'font-bold underline decoration-[3px]' : 'font-semibold'
                  }`}
                >
                  {itemLabel(item)}
                </NavLink>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/** The site header: logo, text navigation, league switcher, search, language and theme. */
export function Header() {
  const { t, i18n } = useTranslation()
  const { health, loading } = useModelInfo()
  const { pathname } = useLocation()
  const org = useOrg()
  const landing = isLandingPath(pathname)
  const isAbout = isAboutPath(pathname)
  // The privacy, terms, contact and guide pages have the same bare menu as About, but "About" is not their current page.
  const bare = isAbout || isInfoOnlyPath(pathname)
  const navItems = landing || bare ? [] : navItemsFor(org)
  // The desktop bar holds this many entries; a longer menu puts the rest under "More".
  const barItems = navItems.length > DESKTOP_BAR_ITEMS + 1 ? navItems.slice(0, DESKTOP_BAR_ITEMS) : navItems
  const moreItems = navItems.slice(barItems.length)
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

  // "Live" is ink with a dot, never a corner colour.
  const apiDotColor = loading ? 'bg-[var(--muted)]' : health?.model_loaded ? 'bg-[var(--ink)]' : 'border-[1.5px] border-[var(--ink)]'
  const navLinkClass = (active: boolean) =>
    `flex h-full shrink-0 items-center whitespace-nowrap text-[15px] underline-offset-[6px] hover:underline ${
      active ? 'font-bold underline decoration-[3px]' : 'font-semibold decoration-2'
    } text-[var(--ink)]`

  return (
    <header className="w-full shrink-0">
      <div className="relative w-full text-[var(--text-primary)]">
        {/* Main Navbar Row */}
        <div className="flex h-14 sm:h-16 w-full items-center justify-between gap-1 xs:gap-2 sm:gap-6">
          {/* Left: the mark and the full wordmark. Under 480px the org switcher on the right shrinks to an icon and the
              wordmark and gaps get smaller, so "Vektor MMA" fits next to the toolbar on a 320px phone. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 xl:gap-8">
            <Link
              to={LANDING_PATH}
              aria-label={L(i18n.language, 'Vektor MMA • Início', 'Vektor MMA home', 'Vektor MMA • Accueil', 'Vektor MMA • Inicio')}
              className="flex min-h-11 min-w-0 shrink-0 items-center gap-1.5 xs:gap-2 sm:gap-2.5"
            >
              <BrandMark className="h-[22px] w-[22px] min-[360px]:h-6 min-[360px]:w-6 xs:h-[26px] xs:w-[26px] sm:h-[30px] sm:w-[30px]" />
              <span className="whitespace-nowrap font-display text-[20px] leading-none text-[var(--ink)] min-[360px]:text-[22px] xs:text-[26px] sm:text-[30px]">
                <span className="font-black">Vektor</span> <span className="font-medium">MMA</span>
              </span>
            </Link>

            {/* Text navigation: underlined on hover and on the current page. */}
            {landing || bare ? (
              <nav
                aria-label={L(i18n.language, 'Navegação principal', 'Main navigation', 'Navigation principale', 'Navegación principal')}
                className="min-w-0 flex-1"
              >
                <div ref={tabsRef} style={fadeStyle} className="overflow-x-auto no-scrollbar overscroll-x-contain">
                  <div className="flex h-14 min-w-max shrink-0 items-center gap-5 whitespace-nowrap sm:h-16 sm:gap-7">
                    <a
                      href={`${langPath(uiLang(i18n.language), '/')}#organizations-grid`}
                      onClick={(e) => {
                        if (landing) {
                          e.preventDefault()
                          document.getElementById('organizations-grid')?.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                      className={navLinkClass(landing && !bare && pathname === '/')}
                    >
                      {L(i18n.language, 'Organizações', 'Organizations', 'Organisations', 'Organizaciones')}
                    </a>
                    <NavLink to="/about" className={navLinkClass(isAbout)}>
                      {t('nav.about', 'About')}
                    </NavLink>
                  </div>
                </div>
              </nav>
            ) : (
              <nav
                aria-label={L(i18n.language, 'Navegação principal', 'Main navigation', 'Navigation principale', 'Navegación principal')}
                className="hidden h-14 min-w-0 items-center gap-5 sm:h-16 xl:flex"
              >
                {barItems.map((item) => {
                  const active = isItemActive(item, pathname)
                  return (
                    <NavLink key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={navLinkClass(active)}>
                      {t(NAV_I18N_KEYS[item.label] ?? item.label, item.label)}
                    </NavLink>
                  )
                })}
                {moreItems.length ? (
                  <MoreMenu
                    key={pathname}
                    items={moreItems}
                    pathname={pathname}
                    label={L(i18n.language, 'Mais', 'More', 'Plus', 'Más')}
                    itemLabel={(item) => t(NAV_I18N_KEYS[item.label] ?? item.label, item.label)}
                    triggerClass={navLinkClass(moreItems.some((item) => isItemActive(item, pathname)))}
                  />
                ) : null}
              </nav>
            )}
          </div>

          {/* Right: Modern SaaS Utility Toolbar */}
          <div className="flex shrink-0 items-center gap-0.5 min-[360px]:gap-1 xs:gap-1.5 sm:gap-2.5">
            {!landing && !bare && <OrgSwitcher className="shrink-0" />}

            {!landing && !bare && <FighterSearch />}

            {/* Minimalist LIVE Telemetry Status Pill. Inner pages have no room for it next to the menu, the search and the switcher. */}
            {landing || bare ? (
            <div
              title={apiTitle}
              className="hidden min-h-11 cursor-default items-center gap-2 border-[1.5px] border-[var(--rule)] px-3 text-[15px] font-bold text-[var(--ink)] sm:inline-flex rounded-sm"
            >
              <span className={`h-2 w-2 rounded-sm ${apiDotColor}`} aria-hidden="true" />
              {apiLabel}
            </div>
            ) : null}

            <LanguageSwitcher />

            {/* Minimalist Secondary Control Icons (Theme, Fullscreen & Social/GitHub) */}
            <div className="inline-flex items-center">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-sm cursor-pointer text-[var(--ink)] hover:bg-[var(--panel-hover)]"
                aria-label={t('header.switchTheme', { theme: isLight ? t('header.themeDark') : t('header.themeLight') })}
                title={t('header.switchTheme', { theme: isLight ? t('header.themeDark') : t('header.themeLight') })}
              >
                {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
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
                className="hidden md:inline-flex h-11 w-11 items-center justify-center rounded-sm cursor-pointer text-[var(--ink)] hover:bg-[var(--panel-hover)]"
                aria-label={L(i18n.language, 'Alternar tela cheia', 'Toggle fullscreen', 'Plein écran', 'Pantalla completa')}
                title={L(i18n.language, 'Alternar tela cheia', 'Toggle fullscreen', 'Plein écran', 'Pantalla completa')}
              >
                <Maximize2 className="h-5 w-5" />
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
                className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-sm text-[var(--ink)] hover:bg-[var(--panel-hover)]"
              >
                <FolderGit2 className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Tablet navigation: a sub-bar under the header. Phones use the bottom bar (MobileTabBar). */}
        {!landing && !bare && (
          <div
            ref={tabsRef}
            style={fadeStyle}
            className="min-w-0 overflow-x-auto overscroll-x-contain border-t border-[var(--rule)] no-scrollbar max-md:hidden xl:hidden"
          >
            <nav
              aria-label={L(i18n.language, 'Navegação móvel', 'Mobile navigation', 'Navigation mobile', 'Navegación móvil')}
              className="flex w-max items-center gap-6"
            >
              {navItems.map((item) => {
                const active = isItemActive(item, pathname)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`${navLinkClass(active)} min-h-11`}
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
