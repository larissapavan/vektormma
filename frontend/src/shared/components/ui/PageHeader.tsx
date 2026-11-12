import type { ReactNode } from 'react'

import { Stat } from './Stat'

type PageHeaderProps = {
  /** Not shown on page titles any more: the menu and tabs say where the reader is. Kept optional for callers. */
  eyebrow?: string
  title: string
  description?: string
  /** A few headline numbers, shown beside the title on wide screens. */
  stats?: { label: string; value: string; note?: string }[]
  /** Search and filter controls, shown under the title. */
  children?: ReactNode
}

/** The top of a listing page: the page's only h1, its numbers and its filters, straight on the page background. */
export function PageHeader({ title, description, stats, children }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <h1 className="text-[40px] leading-none text-[var(--ink)] sm:text-[52px]">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-[var(--ink)] sm:text-lg">{description}</p>
          ) : null}
        </div>
        {stats?.length ? (
          <div className="flex shrink-0 flex-wrap gap-x-8 gap-y-4 sm:gap-x-10">
            {stats.map((stat) => (
              <Stat key={stat.label} label={stat.label} value={stat.value} note={stat.note} />
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </header>
  )
}
