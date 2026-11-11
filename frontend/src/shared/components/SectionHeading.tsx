interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  /** 1 for the page's own title (one per page), 2 for a section inside it. */
  level?: 1 | 2
}

/** A title with its short label above and an optional line under it, in the display face. */
export function SectionHeading({ eyebrow, title, description, level = 2 }: SectionHeadingProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div>
      <p className="text-[15px] font-bold text-[var(--muted)]">{eyebrow}</p>
      <Heading className={level === 1 ? 'mt-1 text-[40px] leading-none text-[var(--ink)] sm:text-[52px]' : 'section-title mt-1 text-[var(--ink)]'}>{title}</Heading>
      {description ? <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-[var(--ink)] sm:text-lg">{description}</p> : null}
    </div>
  )
}
