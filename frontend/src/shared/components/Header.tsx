import { ChevronDown, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { DIRECTORY_HASH, isLandingPath, LANDING_PATH } from '../data/orgs'
import { isAboutPath, isItemActive, NAV_I18N_KEYS, orgNav, type NavItem } from '../data/navItems'
import { isInfoOnlyPath } from '../data/staticPages'
import { useOrg } from '../hooks/useOrg'
import { useTheme } from '../context/ThemeContext'
import { BrandMark } from './BrandMark'
import { FighterSearch } from './FighterSearch'
import { LanguageSwitcher } from './LanguageSwitcher'
import { OrgSwitcher } from './OrgSwitcher'

const navLinkClass = (active: boolean) =>
  `flex h-full min-h-11 shrink-0 items-center whitespace-nowrap text-[15px] text-[var(--ink)] underline-offset-[6px] hover:underline ${
    active ? 'font-bold underline decoration-[3px]' : 'font-semibold decoration-2'
  }`

/** The entries that do not fit the main bar, in a small menu. It is remounted on every page change, which closes it. */
function MoreMenu({ items, pathname, label, itemLabel }: { items: NavItem[]; pathname: string; label: string; itemLabel: (item: NavItem) => string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = items.some((item) => isItemActive(item, pathname))

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
        className={`${navLinkClass(active)} cursor-pointer gap-1`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul id="header-more-menu" className="absolute left-0 top-full z-50 min-w-52 border-[1.5px] border-[var(--ink)] bg-[var(--panel)] py-1">
          {items.map((item) => {
            const current = isItemActive(item, pathname)
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-h-11 items-center px-4 text-[15px] text-[var(--ink)] underline-offset-[6px] hover:bg-[var(--panel-hover)] ${
                    current ? 'font-bold underline decoration-[3px]' : 'font-semibold'
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

/**
 * The site header. On the home page and the text pages: the brand, the way to the organizations, language and theme. Inside
 * an organization: the brand, the organization in a switcher, its main destinations (Events, Fighters, Predictions, More)
 * from `lg` up, search, language and theme. Under `lg` the same destinations sit in the bottom bar (MobileTabBar), in the
 * same order, so each screen size has one level of main navigation.
 */
export function Header() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { pathname } = useLocation()
  const org = useOrg()
  const landing = isLandingPath(pathname)
  const isAbout = isAboutPath(pathname)
  const bare = landing || isAbout || isInfoOnlyPath(pathname)
  const { primary, more } = orgNav(org)
  const { isLight, toggleTheme } = useTheme()
  const itemLabel = (item: NavItem) => t(NAV_I18N_KEYS[item.label] ?? item.label, item.label)
  const mainNavLabel = L(lang, 'Navegação principal', 'Main navigation', 'Navigation principale', 'Navegación principal')

  return (
    <header className="w-full shrink-0">
      <div className="flex h-14 w-full items-center justify-between gap-2 sm:h-16 sm:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 xl:gap-8">
          <Link
            to={LANDING_PATH}
            aria-label={L(lang, 'Vektor MMA • Início', 'Vektor MMA home', 'Vektor MMA • Accueil', 'Vektor MMA • Inicio')}
            className="flex min-h-11 shrink-0 items-center gap-2 sm:gap-2.5"
          >
            <BrandMark className="h-6 w-6 sm:h-[30px] sm:w-[30px]" />
            {/* Under 400px the mark alone leaves room for the organization's name or the menu (the link keeps its name). */}
            <span className="whitespace-nowrap font-display text-[22px] leading-none text-[var(--ink)] max-[399px]:hidden sm:text-[28px]">
              <span className="font-black">Vektor</span> <span className="font-medium">MMA</span>
            </span>
          </Link>

          {bare ? (
            <nav aria-label={mainNavLabel} className="min-w-0">
              <ul className="flex items-center gap-4 sm:gap-6">
                {/* On a phone the home page's own button leads to the directory, so the link waits for wider screens there. */}
                <li className={landing ? 'max-sm:hidden' : ''}>
                  {/* A plain link: from a text page it opens the home page at the directory; on the home page it jumps there. */}
                  <Link to={{ pathname: LANDING_PATH, hash: DIRECTORY_HASH }} className={navLinkClass(false)}>
                    {L(lang, 'Organizações', 'Organizations', 'Organisations', 'Organizaciones')}
                  </Link>
                </li>
                <li className={landing ? '' : 'max-sm:hidden'}>
                  <NavLink to="/about" className={navLinkClass(isAbout)}>
                    {t('nav.about', 'About')}
                  </NavLink>
                </li>
              </ul>
            </nav>
          ) : (
            <>
              <OrgSwitcher className="min-w-0 shrink" />
              <nav aria-label={mainNavLabel} className="hidden h-16 min-w-0 items-center gap-6 lg:flex">
                {primary.map((item) => {
                  const active = isItemActive(item, pathname)
                  return (
                    <NavLink key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={navLinkClass(active)}>
                      {itemLabel(item)}
                    </NavLink>
                  )
                })}
                {more.length ? (
                  <MoreMenu key={pathname} items={more} pathname={pathname} label={L(lang, 'Mais', 'More', 'Plus', 'Más')} itemLabel={itemLabel} />
                ) : null}
              </nav>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {bare ? null : <FighterSearch />}
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--ink)] hover:bg-[var(--panel-hover)]"
            aria-label={t('header.switchTheme', { theme: isLight ? t('header.themeDark') : t('header.themeLight') })}
            title={t('header.switchTheme', { theme: isLight ? t('header.themeDark') : t('header.themeLight') })}
          >
            {isLight ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}
