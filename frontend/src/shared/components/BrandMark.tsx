/** Vektor MMA mark: the two strokes of a V, one in each corner's colour. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <polygon points="2,3 10,3 18,29 13,29" fill="var(--red)" />
      <polygon points="30,3 22,3 14,29 19,29" fill="var(--blue)" />
    </svg>
  )
}
