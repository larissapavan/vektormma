import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export interface SectionTab {
  to: string
  label: string
  labelKey?: string
}

const MATCHUP_PATHS = new Set(['/predictor', '/head-to-head', '/matchup-intelligence'])

/** Tab bar shared by a group of related pages; every tab keeps its own URL, so deep links still work. */
export function TabbedLayout({ label, tabs }: { label: string; tabs: SectionTab[] }) {
  const { t } = useTranslation()
  const { search } = useLocation()

  const getTabHref = (to: string) => {
    if (!search || !MATCHUP_PATHS.has(to)) return to
    const currentParams = new URLSearchParams(search)
    const carried = new URLSearchParams()
    const a = currentParams.get('a') || currentParams.get('fighter_a')
    const b = currentParams.get('b') || currentParams.get('fighter_b')
    const event = currentParams.get('event')
    if (a) carried.set('a', a)
    if (b) carried.set('b', b)
    if (event) carried.set('event', event)
    const qs = carried.toString()
    return qs ? `${to}?${qs}` : to
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <nav aria-label={label} className="border-b border-[var(--rule)]">
        <ul className="no-scrollbar flex max-w-full gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <li key={tab.to} className="shrink-0">
              <NavLink
                to={getTabHref(tab.to)}
                className={({ isActive }) =>
                  [
                    'flex min-h-11 items-center whitespace-nowrap text-[15px] text-[var(--ink)] underline-offset-[6px] hover:underline',
                    isActive ? 'font-bold underline decoration-[3px]' : 'font-semibold decoration-2',
                  ].join(' ')
                }
              >
                {tab.labelKey ? t(tab.labelKey) : tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
