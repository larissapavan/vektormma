import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

import { L } from '../../i18n/lang'
import { RetrospectCard } from '../../shared/components/RetrospectCard'
import { retrospect, similarFighter, type Career } from '../../shared/game/career'
import { isAchievementId } from '../../shared/game/achievements'
import { goalViews } from '../../shared/game/goals'
import { closeCareer } from '../../shared/game/progress'
import { recordTrophies } from '../../shared/game/trophies'
import { useFighters } from '../../shared/hooks/useFighters'
import { AchievementTile } from './AchievementsPanel'
import { ChallengeEnd } from './ChallengeEnd'
import type { Challenge } from '../../shared/game/challenge'
import { GhostButton, useFocusOnMount } from './ui'

/** The end of the career: the retrospect picture, with the ways to save or share it. */
export function EndStep({ career: ended, challenge, onRestart }: { career: Career; challenge: Challenge | null; onRestart: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fighters } = useFighters()
  const reduce = useReducedMotion()
  const heading = useFocusOnMount<HTMLHeadingElement>()
  // Some achievements are earned only by ending (a career without a loss): they are added here, once.
  const closed = useMemo(() => closeCareer(ended), [ended])
  const career = closed.career
  useEffect(() => {
    recordTrophies(career.earned)
  }, [career])
  const goals = goalViews(career)
  const similar = useMemo(() => similarFighter(career, fighters), [career, fighters])
  const card = useMemo(() => retrospect(career, similar), [career, similar])

  return (
    <section className="surface-card rounded-2xl overflow-hidden">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-5 py-7 text-center sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-red)]">{L(lang, 'Retrospecto', 'Retrospect', 'Bilan', 'Balance')}</p>
        <h2 ref={heading} tabIndex={-1} className="game-title mt-1 text-2xl focus:outline-none sm:text-4xl">{L(lang, 'Fim de carreira', 'The career is over', 'Fin de carrière', 'Fin de la carrera')}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-secondary)]">
          {L(lang, 'Salve a imagem ou compartilhe o link: a carreira em si não fica guardada. As conquistas ficam neste navegador.', 'Save the image or share the link: the career itself is not kept. The achievements stay in this browser.', 'Enregistrez l’image ou partagez le lien : la carrière elle-même n’est pas conservée. Les succès restent dans ce navigateur.', 'Guarda la imagen o comparte el enlace: la carrera en sí no se guarda. Los logros quedan en este navegador.')}
        </p>
      </div>
      <div className="space-y-6 p-5 sm:p-8">
        {challenge ? <ChallengeEnd challenge={challenge} career={career} /> : null}
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
          <RetrospectCard card={card} />
        </motion.div>
        {goals.length ? (
          <p className="text-center text-sm text-[var(--text-secondary)]" data-testid="goals-summary">
            {L(lang, `Metas cumpridas: ${goals.filter((goal) => goal.done).length} de ${goals.length}.`, `Goals met: ${goals.filter((goal) => goal.done).length} of ${goals.length}.`, `Objectifs atteints : ${goals.filter((goal) => goal.done).length} sur ${goals.length}.`, `Metas cumplidas: ${goals.filter((goal) => goal.done).length} de ${goals.length}.`)}
          </p>
        ) : null}
        {career.earned.length ? (
          <div className="space-y-2" data-testid="career-achievements">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-gold)]">{L(lang, 'Conquistas desta carreira', 'Achievements of this career', 'Succès de cette carrière', 'Logros de esta carrera')}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {career.earned.filter(isAchievementId).map((id) => (
                <AchievementTile key={id} id={id} earned />
              ))}
            </ul>
          </div>
        ) : null}
        <div className="text-center">
          <GhostButton onClick={onRestart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {L(lang, 'Começar outra carreira', 'Start another career', 'Commencer une autre carrière', 'Empezar otra carrera')}
          </GhostButton>
        </div>
      </div>
    </section>
  )
}
