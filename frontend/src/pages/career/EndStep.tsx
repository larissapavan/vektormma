import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

import { L } from '../../i18n/lang'
import { RetrospectCard } from '../../shared/components/RetrospectCard'
import { retrospect, similarFighter, type Career } from '../../shared/game/career'
import { useFighters } from '../../shared/hooks/useFighters'
import { GhostButton } from './ui'

/** The end of the career: the retrospect picture, with the ways to save or share it. */
export function EndStep({ career, onRestart }: { career: Career; onRestart: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fighters } = useFighters()
  const reduce = useReducedMotion()
  const similar = useMemo(() => similarFighter(career, fighters), [career, fighters])
  const card = useMemo(() => retrospect(career, similar), [career, similar])

  return (
    <section className="game-card overflow-hidden">
      <div className="game-hero px-5 py-7 text-center sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-red)]">{L(lang, 'Retrospecto', 'Retrospect', 'Bilan', 'Balance')}</p>
        <h2 className="game-title mt-1 text-2xl sm:text-4xl">{L(lang, 'Fim de carreira', 'The career is over', 'Fin de carrière', 'Fin de la carrera')}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-secondary)]">
          {L(lang, 'Salve a imagem ou compartilhe o link: nada fica guardado aqui.', 'Save the image or share the link: nothing is kept here.', 'Enregistrez l’image ou partagez le lien : rien n’est conservé ici.', 'Guarda la imagen o comparte el enlace: aquí no se guarda nada.')}
        </p>
      </div>
      <div className="space-y-6 p-5 sm:p-8">
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
          <RetrospectCard card={card} />
        </motion.div>
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
