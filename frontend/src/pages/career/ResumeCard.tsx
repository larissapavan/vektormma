import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../../shared/data/divisions'
import { recordText } from '../../shared/game/career'
import type { SavedGame } from '../../shared/game/save'
import { Emblem, GhostButton, PrimaryButton } from './ui'

/** Offered above the creation screen when this browser holds a career in progress. */
export function ResumeCard({ saved, onResume, onDiscard }: { saved: SavedGame; onResume: () => void; onDiscard: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { career } = saved
  const fights = career.ufcFights
  return (
    <section aria-label={L(lang, 'Carreira salva', 'Saved career', 'Carrière enregistrée', 'Carrera guardada')} className="game-card flex flex-wrap items-center gap-4 p-4 sm:p-5">
      <Emblem name={career.name} className="h-14 w-14 text-xl" />
      <div className="min-w-[10rem] flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-red)]">{L(lang, 'Carreira salva neste navegador', 'Career saved in this browser', 'Carrière enregistrée dans ce navigateur', 'Carrera guardada en este navegador')}</p>
        <p className="game-title mt-1 break-words text-lg sm:text-xl">{career.name}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          {getDivisionName(career.division, lang)} · <span className="data-value">{recordText(career)}</span> ·{' '}
          {L(lang, `${fights} ${fights === 1 ? 'luta' : 'lutas'} no UFC`, `${fights} UFC ${fights === 1 ? 'fight' : 'fights'}`, `${fights} ${fights === 1 ? 'combat' : 'combats'} à l’UFC`, `${fights} ${fights === 1 ? 'pelea' : 'peleas'} en la UFC`)}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={onResume}>
          {L(lang, 'Retomar a carreira', 'Resume the career', 'Reprendre la carrière', 'Retomar la carrera')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
        <GhostButton onClick={onDiscard}>{L(lang, 'Descartar', 'Discard', 'Supprimer', 'Descartar')}</GhostButton>
      </div>
    </section>
  )
}
