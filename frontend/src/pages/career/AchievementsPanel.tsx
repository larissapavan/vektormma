import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, Medal } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import { ACHIEVEMENT_IDS, type AchievementId } from '../../shared/game/achievements'
import { ACHIEVEMENT_TEXT } from '../../shared/game/rewardsText'
import { loadTrophies } from '../../shared/game/trophies'

/** One achievement: its name and what it asks for, lit when earned. */
export function AchievementTile({ id, earned, fresh = false }: { id: AchievementId; earned: boolean; fresh?: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const text = ACHIEVEMENT_TEXT[id]
  return (
    <li
      data-earned={earned}
      className={`flex items-start gap-3 rounded-xl border p-3 ${earned ? 'border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/50 opacity-70'} ${fresh ? 'game-pop' : ''}`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${earned ? 'bg-[var(--accent-gold)]/20 text-[var(--text-gold)]' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
        {earned ? <Medal className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight text-[var(--text-main)]">{pick(lang, text.name)}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--text-secondary)]">{pick(lang, text.hint)}</span>
        <span className="sr-only">{earned ? L(lang, 'Conquistada', 'Earned', 'Obtenue', 'Conseguida') : L(lang, 'Bloqueada', 'Locked', 'Verrouillée', 'Bloqueada')}</span>
      </span>
    </li>
  )
}

/** Everything this browser has ever earned, with what is still to earn. Opened from the first screen; it reads the collection when it appears. */
export function AchievementsPanel() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [trophies] = useState(loadTrophies)
  const have = ACHIEVEMENT_IDS.filter((id) => trophies[id] !== undefined).length
  return (
    <details className="game-card group p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-red)]">
        <span className="flex items-center gap-2">
          <Medal className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'Conquistas', 'Achievements', 'Succès', 'Logros')}
        </span>
        <span className="data-value text-[var(--text-secondary)]" data-testid="trophy-count">{have}/{ACHIEVEMENT_IDS.length}</span>
      </summary>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        {L(lang, 'Ficam guardadas neste navegador e crescem de uma carreira para a outra.', 'They are kept in this browser and grow from one career to the next.', 'Elles sont conservées dans ce navigateur et s’accumulent d’une carrière à l’autre.', 'Se guardan en este navegador y crecen de una carrera a la siguiente.')}
      </p>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENT_IDS.map((id) => (
          <AchievementTile key={id} id={id} earned={trophies[id] !== undefined} />
        ))}
      </ul>
    </details>
  )
}
