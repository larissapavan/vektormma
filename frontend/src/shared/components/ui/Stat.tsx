type StatProps = {
  label: string
  value: string
  /** One short line under the label that says what the number measures. */
  note?: string
}

/** A number in the display face with its label under it, without a box. */
export function Stat({ label, value, note }: StatProps) {
  return (
    <div className="min-w-0">
      <p className="font-display text-[32px] font-extrabold leading-none tabular-nums text-[var(--ink)] sm:text-4xl">{value}</p>
      <p className="mt-1 text-[15px] text-[var(--muted)]">{label}</p>
      {note ? <p className="text-sm text-[var(--muted)]">{note}</p> : null}
    </div>
  )
}
