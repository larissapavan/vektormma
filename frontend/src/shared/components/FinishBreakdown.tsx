import { L } from '../../i18n/lang'

export interface FinishDna {
  subs: number
  kos: number
  decs: number
  subPct: number
  koPct: number
  decPct: number
}

/** How a fighter's wins came (submissions, knockouts, decisions): a thin bar and a legend. Shared by both profile modals. */
export function FinishBreakdown({ dna, finishRate, language }: { dna: FinishDna; finishRate: number; language: string }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
        <span>{L(language, 'DNA DE RESOLUÇÃO // MÉTODO DE VITÓRIAS', 'FINISH BREAKDOWN // METHOD OF VICTORY', 'MÉTHODES DE VICTOIRE // ADN DU COMBATTANT', 'ADN DE FINALIZACIÓN // MÉTODO DE VICTORIA')}</span>
        <span className="text-amber-400 font-bold">{finishRate}% {L(language, 'FINALIZADOR', 'FINISHER', 'FINISSEUR', 'FINALIZADOR')}</span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-white/10 flex overflow-hidden">
        <div style={{ width: `${dna.subPct}%` }} className="bg-amber-400 transition-all duration-700" />
        <div style={{ width: `${dna.koPct}%` }} className="bg-rose-500 transition-all duration-700" />
        <div style={{ width: `${dna.decPct}%` }} className="bg-sky-400 transition-all duration-700" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-neutral-300">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="font-bold text-white tabular-nums">{dna.subs}</span> {L(language, 'FINALIZAÇÕES', 'SUBMISSIONS', 'SOUMISSIONS', 'SUMISIONES')} ({dna.subPct}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="font-bold text-white tabular-nums">{dna.kos}</span> {L(language, 'NOCAUTES', 'KNOCKOUTS', 'KO / TKO', 'NOCAUTS')} ({dna.koPct}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="font-bold text-white tabular-nums">{dna.decs}</span> {L(language, 'DECISÕES', 'DECISIONS', 'DÉCISIONS', 'DECISIONES')} ({dna.decPct}%)
        </span>
      </div>
    </div>
  )
}
