import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'

/** The small building blocks of the game screens: the emblem, the skill meters, the radar and the step bar. */

/**
 * Puts the keyboard focus on a screen's heading when the screen appears. The screens of the game replace one another (camp,
 * matchmaking, fight, end): left where it was, on a button that is gone, the focus falls to the page body and a keyboard or
 * screen reader user loses their place at every step. The page does not scroll for it, so what the player sees stays as it is.
 */
export function useFocusOnMount<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return ref
}

/** A round badge with the initials: the player's stand-in for a photo. */
export function Emblem({ name, className = 'h-16 w-16 text-xl' }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center bg-[var(--ink)] font-display font-extrabold text-[var(--on-ink)] ${className}`}
    >
      {initials || '?'}
    </span>
  )
}

/** A skill bar whose fill glides to its value. */
export function SkillMeter({ label, value, max = 100, tone = 'red' }: { label: string; value: number; max?: number; tone?: 'red' | 'gold' | 'blue' }) {
  const reduce = useReducedMotion()
  // The bars are skills, not corners: ink for the skills, gold for the one that stands out.
  const fill = { red: 'bg-[var(--ink)]', gold: 'bg-[var(--gold)]', blue: 'bg-[var(--ink)]' }[tone]
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        <span>{label}</span>
        <span className="data-value text-sm text-[var(--text-main)]">{Math.round(value)}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--border-subtle)]" role="img" aria-label={`${label}: ${Math.round(value)}/${max}`}>
        <motion.div className={`h-full ${fill}`} initial={false} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }} transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }} />
      </div>
    </div>
  )
}

const RADAR_W = 320
const RADAR_H = 250

/** Three skills on a triangle: the shape of the fighter at a glance. */
export function Radar({ values, labels }: { values: [number, number, number]; labels: [string, string, string] }) {
  const reduce = useReducedMotion()
  const cx = RADAR_W / 2
  const cy = 128
  const radius = 76
  const angles = [-90, 30, 150].map((degrees) => (degrees * Math.PI) / 180)
  const point = (index: number, scale: number): [number, number] => [cx + Math.cos(angles[index]) * radius * scale, cy + Math.sin(angles[index]) * radius * scale]
  const ring = (scale: number) => angles.map((_, index) => point(index, scale).join(',')).join(' ')
  const shape = values.map((value, index) => point(index, Math.min(Math.max(value, 0), 100) / 100).join(',')).join(' ')
  const anchors: ('middle' | 'start' | 'end')[] = ['middle', 'start', 'end']
  return (
    <svg viewBox={`0 0 ${RADAR_W} ${RADAR_H}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label={labels.map((label, index) => `${label} ${Math.round(values[index])}`).join(', ')}>
      {[0.33, 0.66, 1].map((scale) => (
        <polygon key={scale} points={ring(scale)} fill="none" stroke="var(--border-default)" strokeWidth={1} opacity={0.6} />
      ))}
      {angles.map((_, index) => (
        <line key={index} x1={cx} y1={cy} x2={point(index, 1)[0]} y2={point(index, 1)[1]} stroke="var(--border-subtle)" />
      ))}
      <motion.polygon points={shape} fill="var(--accent-red)" fillOpacity={0.28} stroke="var(--accent-red)" strokeWidth={2.5} strokeLinejoin="round" initial={false} animate={{ points: shape }} transition={{ duration: reduce ? 0 : 0.35 }} />
      {angles.map((_, index) => {
        const [x, y] = point(index, 1.28)
        return (
          <text key={index} x={x} y={y + (index === 0 ? 0 : 6)} textAnchor={anchors[index]} className="fill-[var(--text-secondary)] text-[12px] font-bold uppercase" style={{ letterSpacing: '0.08em' }}>
            {labels[index]}
          </text>
        )
      })}
    </svg>
  )
}

/** Where the player is in the game: create, camp, fight, retrospect. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step} className="flex items-center gap-1.5 sm:gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition ${
                done ? 'bg-[var(--accent-green)] text-white' : active ? 'bg-[var(--accent-red-solid)] text-white ring-4 ring-[var(--accent-red)]/25' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] ring-1 ring-[var(--border-default)]'
              }`}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className={`hidden text-xs font-bold uppercase tracking-[0.12em] sm:inline ${active ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{step}</span>
            {index < steps.length - 1 ? <span className={`h-px w-4 sm:w-8 ${done ? 'bg-[var(--accent-green)]' : 'bg-[var(--border-default)]'}`} aria-hidden="true" /> : null}
          </li>
        )
      })}
    </ol>
  )
}

export function PrimaryButton({ children, onClick, disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm uppercase">
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ghost-action inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm uppercase">
      {children}
    </button>
  )
}

/** A small badge, squared like the ones on the other pages (the title fight, the reason a fight fell through). */
export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'red' | 'gold' | 'green' }) {
  const tones = {
    neutral: 'border-[var(--border-default)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)]',
    red: 'border-[var(--accent-red)]/60 bg-[var(--accent-red)]/10 text-[var(--text-red)]',
    gold: 'border-[var(--accent-gold)]/60 bg-[var(--accent-gold)]/15 text-[var(--text-gold)]',
    green: 'border-[var(--accent-green)]/60 bg-[var(--accent-green)]/15 text-[var(--text-green)]',
  }
  return <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] ${tones[tone]}`}>{children}</span>
}
