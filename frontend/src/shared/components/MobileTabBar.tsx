import { BarChart3, BookOpen, CalendarDays, CalendarX, ClipboardList, Dumbbell, Ellipsis, Gamepad2, ListOrdered, Scale, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { hasSectionNav, isItemActive, NAV_I18N_KEYS, navItemsFor, type NavItem } from '../data/navItems'
import { useOrg } from '../hooks/useOrg'

const ICONS: Record<string, LucideIcon> = {
  Predict: Swords,
  Compare: Scale,
  Fighters: Users,
  Events: CalendarDays,
  Results: ClipboardList,
  Rankings: ListOrdered,
  Gyms: Dumbbell,
  Champions: Trophy,
  RecordBook: BookOpen,
  Analysis: BarChart3,
  Cancelled: CalendarX,
  Game: Gamepad2,
}

/** What the bar shows first on a phone; anything else goes under "More". */
const PRIMARY_ORDER = ['Predict', 'Compare', 'Fighters', 'Events', 'Rankings', 'Champions', 'Results', 'RecordBook', 'Gyms', 'Analysis', 'Cancelled', 'Game']
/** Five slots fit a 320px phone with a readable label under each icon. */
const SLOTS = 5

function splitItems(items: NavItem[]): { primary: NavItem[]; more: NavItem[] } {
  if (items.length <= SLOTS) return { primary: items, more: [] }
  const ranked = [...items].sort((a, b) => PRIMARY_ORDER.indexOf(a.label) - PRIMARY_ORDER.indexOf(b.label))
  const first = new Set(ranked.slice(0, SLOTS - 1))
  // Each list keeps the menu's own order.
  return { primary: items.filter((item) => first.has(item)), more: items.filter((item) => !first.has(item)) }
}

const tabClass = (active: boolean) =>
  `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0 text-label font-semibold transition-colors ${
    active ? 'text-[var(--ink)] underline decoration-[3px] underline-offset-4' : 'text-[var(--muted)] hover:text-[var(--ink)]'
  }`

/**
 * The section menu on a phone: a bar fixed to the bottom of the screen, within reach of the thumb. It shows on screens
 * narrower than `md`; from there up the header carries the menu.
 */
export function MobileTabBar() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const org = useOrg()
  const [moreOpenAt, setMoreOpenAt] = useState<string | null>(null)
  // The sheet belongs to the page it was opened on, so following a link closes it.
  const moreOpen = moreOpenAt === pathname

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpenAt(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  if (!hasSectionNav(pathname)) return null

  const { primary, more } = splitItems(navItemsFor(org))
  const label = (item: NavItem) => t(NAV_I18N_KEYS[item.label] ?? item.label, item.label)
  const moreActive = more.some((item) => isItemActive(item, pathname))
  const moreLabel = L(i18n.language, 'Mais', 'More', 'Plus', 'Más')

  return (
    <div className="md:hidden">
      {moreOpen ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setMoreOpenAt(null)}
            className="fixed inset-0 z-40 cursor-default bg-[var(--modal-backdrop)]"
          />
          <div
            id="mobile-more-menu"
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 overflow-hidden border-[1.5px] border-[var(--ink)] bg-[var(--panel)]"
          >
            <ul className="divide-y divide-[var(--border-subtle)]">
              {more.map((item) => {
                const Icon = ICONS[item.label] ?? Ellipsis
                const active = isItemActive(item, pathname)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMoreOpenAt(null)}
                      className={`flex min-h-12 items-center gap-3 px-4 text-sm font-semibold ${active ? 'underline decoration-[3px] underline-offset-4' : ''} text-[var(--ink)]`}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {label(item)}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : null}

      <nav
        aria-label={L(i18n.language, 'Navegação inferior', 'Bottom navigation', 'Navigation du bas', 'Navegación inferior')}
        className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-[var(--ink)] bg-[var(--mat)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch">
          {primary.map((item) => {
            const Icon = ICONS[item.label] ?? Ellipsis
            const active = isItemActive(item, pathname)
            return (
              <NavLink key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full text-center leading-tight [hyphens:auto]">{label(item)}</span>
              </NavLink>
            )
          })}
          {more.length ? (
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-menu"
              onClick={() => setMoreOpenAt(moreOpen ? null : pathname)}
              className={`${tabClass(moreActive || moreOpen)} cursor-pointer`}
            >
              <Ellipsis className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full text-center leading-tight [hyphens:auto]">{moreLabel}</span>
            </button>
          ) : null}
        </div>
      </nav>
    </div>
  )
}
