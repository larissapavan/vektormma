import { SlidersHorizontal } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { L } from '../../../i18n/lang'

/**
 * Secondary filters: always in view from `sm` up; on a phone they wait behind a "Filters" button, which says how many are on.
 * `className` is the layout of the filters themselves (a grid, a row).
 */
export function MobileFilters({ active = 0, className = '', label: name, children }: { active?: number; className?: string; label?: string; children: ReactNode }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const id = useId()
  const label = name ?? L(i18n.language, 'Filtros', 'Filters', 'Filtres', 'Filtros')

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="ghost-action inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 px-4 text-[15px] sm:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        {active ? `${label} (${active})` : label}
      </button>
      <div id={id} className={`${open ? '' : 'max-sm:hidden'} ${className}`}>
        {children}
      </div>
    </>
  )
}
