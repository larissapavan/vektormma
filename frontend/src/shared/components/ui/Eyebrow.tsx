import type { ReactNode } from 'react'

type EyebrowProps = {
  children: ReactNode
  /** `accent` is ink; `muted` is the quieter secondary colour. */
  tone?: 'muted' | 'accent'
  icon?: React.ComponentType<{ className?: string }>
  className?: string
  as?: 'p' | 'span'
}

/** The short label above a title or a number: plain sentence-case text, never capitals or a monospaced face. */
export function Eyebrow({ children, tone = 'muted', icon: Icon, className = '', as: Tag = 'p' }: EyebrowProps) {
  return (
    <Tag className={`flex items-center gap-1.5 text-[15px] font-bold ${tone === 'accent' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'} ${className}`}>
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {children}
    </Tag>
  )
}
