import type { ReactNode } from 'react'

import { Eyebrow } from './Eyebrow'
import { Stat } from './Stat'

type PageHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  /** A few headline numbers, shown beside the title on wide screens. */
  stats?: { label: string; value: string; note?: string }[]
  /** Search and filter controls, shown under the title. */
  children?: ReactNode
}

/** The top of a listing page: the page's only h1, its numbers and its filters, straight on the page background. */
export function PageHeader({ eyebrow, title, description, stats, children }: PageHeaderProps) {
  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-1 text-[40px] leading-none text-[var(--ink)] sm:text-[52px]">{title}</h1>
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
