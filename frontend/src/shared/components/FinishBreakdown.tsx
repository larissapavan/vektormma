import { L } from '../../i18n/lang'

export interface FinishDna {
  subs: number
  kos: number
  decs: number
  subPct: number
  koPct: number
  decPct: number
}

/** Red and blue belong to the fight corners, so the three ways of winning are told apart by ink, grey and track. */
const SWATCHES = {
  kos: 'bg-[var(--ink)]',
  subs: 'bg-[var(--muted)]',
  decs: 'bg-[var(--track)] border border-[var(--rule)]',
}

/** How a fighter's wins came (knockouts, submissions, decisions): a bar split by share and a legend. Shared by both profile modals. */
export function FinishBreakdown({ dna, finishRate, language }: { dna: FinishDna; finishRate: number; language: string }) {
  const parts = [
    { key: 'kos' as const, count: dna.kos, pct: dna.koPct, label: L(language, 'nocautes', 'knockouts', 'KO / TKO', 'nocauts') },
    { key: 'subs' as const, count: dna.subs, pct: dna.subPct, label: L(language, 'finalizações', 'submissions', 'soumissions', 'sumisiones') },
    { key: 'decs' as const, count: dna.decs, pct: dna.decPct, label: L(language, 'decisões', 'decisions', 'décisions', 'decisiones') },
  ]
  const summary = parts.map((part) => `${part.count} ${part.label} (${part.pct}%)`).join(', ')

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-label font-semibold text-[var(--muted)]">
          {L(language, 'Como vieram as vitórias', 'How the wins came', 'Comment sont venues les victoires', 'Cómo llegaron las victorias')}
        </span>
        <span className="text-label font-semibold text-[var(--ink)]">
          {L(
            language,
            `${finishRate}% antes da decisão dos juízes`,
            `${finishRate}% before the judges’ decision`,
            `${finishRate} % avant la décision des juges`,
            `${finishRate}% antes de la decisión de los jueces`
          )}
        </span>
      </div>
      <div role="img" aria-label={summary} className="flex h-2 w-full gap-[2px] bg-[var(--mat)]">
        {parts.map((part) =>
          part.pct > 0 ? <div key={part.key} style={{ width: `${part.pct}%` }} className={SWATCHES[part.key]} /> : null
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
        {parts.map((part) => (
          <span key={part.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 shrink-0 ${SWATCHES[part.key]}`} />
            <span>
              <span className="font-bold text-[var(--ink)] tabular-nums">{part.count}</span> {part.label} ({part.pct}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
