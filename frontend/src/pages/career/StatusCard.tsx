import { useTranslation } from 'react-i18next'
import { Flame, Trophy } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import { getDivisionName } from '../../shared/data/divisions'
import { recordText, standing, TITLE_SHOT_POINTS, type Career } from '../../shared/game/career'
import { STANDING_LABELS } from '../../shared/game/labels'
import { Chip, Emblem, SkillMeter } from './ui'

const SHORT_METHOD = { ko: 'KO', sub: 'SUB', dec: 'DEC' } as const

/** The player's heads-up display: who they are, where they stand, and the three skills. It stays on screen through the whole career. */
export function StatusCard({ career }: { career: Career }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const where = standing(career)
  const progress = career.champion ? 100 : Math.min((career.points / TITLE_SHOT_POINTS) * 100, 100)
  const age = Math.floor(career.age)

  return (
    <section aria-label={L(lang, 'Seu lutador', 'Your fighter', 'Votre combattant', 'Tu peleador')} className="surface-card rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <Emblem name={career.name} className="h-16 w-16 text-2xl sm:h-20 sm:w-20" />
        <div className="min-w-[8.5rem] flex-1">
          <h2 className="game-title break-words text-xl sm:text-2xl">{career.name}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {getDivisionName(career.division, lang)} · {L(lang, `${age} anos`, `age ${age}`, `${age} ans`, `${age} años`)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone={career.champion ? 'gold' : 'red'}>
              {career.champion ? <Trophy className="h-3 w-3" aria-hidden="true" /> : null}
              <span data-testid="standing">{pick(lang, STANDING_LABELS[where])}</span>
            </Chip>
            {career.winStreak >= 2 ? (
              <Chip tone="green">
                <Flame className="h-3 w-3" aria-hidden="true" />
                {L(lang, `${career.winStreak} vitórias seguidas`, `${career.winStreak}-fight win streak`, `${career.winStreak} victoires de suite`, `${career.winStreak} victorias seguidas`)}
              </Chip>
            ) : null}
            {career.defenses > 0 ? <Chip tone="gold">{L(lang, `${career.defenses} defesas`, `${career.defenses} defenses`, `${career.defenses} défenses`, `${career.defenses} defensas`)}</Chip> : null}
          </div>
          {career.history.length ? (
            <ol className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={L(lang, 'Últimas lutas', 'Recent fights', 'Derniers combats', 'Últimas peleas')}>
              {career.history.slice(-5).map((entry, index) => (
                <li key={`${entry.opponent}-${index}`} title={`${entry.opponent} · ${SHORT_METHOD[entry.method]}${entry.method === 'dec' ? '' : ` R${entry.round}`}`}>
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ${entry.won ? 'bg-[var(--accent-green)]/12 text-[var(--text-green)] ring-[var(--accent-green)]/40' : 'bg-[var(--accent-red)]/12 text-[var(--text-red)] ring-[var(--accent-red)]/40'}`}>
                    {entry.won ? L(lang, 'V', 'W', 'V', 'V') : L(lang, 'D', 'L', 'D', 'D')}
                    <span className="font-semibold opacity-80">{SHORT_METHOD[entry.method]}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{L(lang, 'Cartel', 'Record', 'Bilan', 'Récord')}</p>
          <p className="data-value text-4xl font-bold leading-none text-[var(--text-main)] sm:text-5xl" data-testid="record">
            {recordText(career)}
          </p>
        </div>
      </div>

      {!career.champion ? (
        <div className="px-4 pb-1 sm:px-5">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            <span>{L(lang, 'Rumo ao cinturão', 'Road to the title', 'Vers la ceinture', 'Rumbo al cinturón')}</span>
            <span className="data-value">{Math.min(career.points, TITLE_SHOT_POINTS)}/{TITLE_SHOT_POINTS}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]" role="img" aria-label={`${Math.min(career.points, TITLE_SHOT_POINTS)}/${TITLE_SHOT_POINTS}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-red)] transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 p-4 sm:grid-cols-3 sm:p-5">
        <SkillMeter label={L(lang, 'Golpes', 'Striking', 'Frappe', 'Golpeo')} value={career.striking} />
        <SkillMeter label={L(lang, 'Quedas', 'Takedowns', 'Amenées au sol', 'Derribos')} value={career.takedowns} tone="gold" />
        <SkillMeter label={L(lang, 'Alcance', 'Reach', 'Allonge', 'Alcance')} value={career.reach} tone="blue" />
      </div>
    </section>
  )
}
