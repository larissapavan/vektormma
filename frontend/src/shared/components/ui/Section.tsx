import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  /** Kept for callers; section titles carry no icon in this design. */
  icon?: React.ComponentType<{ className?: string }>
  /** A link or button shown at the end of the title row. */
  action?: ReactNode
  /** The content is a list of rows: it starts right under the rule, with no gap. */
  rows?: boolean
  children: ReactNode
  className?: string
}

/** A section on the page background: a title in the display face, a 3px ink rule, then the content. */
export function Section({ title, action, rows = false, children, className = '' }: SectionProps) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 pb-3">
        <h2 className="section-title min-w-0">{title}</h2>
        {action}
      </div>
      <div className={`border-t-[3px] border-[var(--ink)] ${rows ? '' : 'pt-5'}`}>{children}</div>
    </section>
  )
}

/** The text link used as a section's action ("View all"). */
export const sectionActionClass =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 text-base font-bold text-[var(--ink)] underline decoration-2 underline-offset-[5px] hover:decoration-[3px]'
