import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { L } from '../../../i18n/lang'
import { LOOP_SECONDS } from './choreography'
import { FightScene } from './FightScene'

/** The moment of the loop shown when nothing moves (for a visitor who asks for less motion, or who paused it): a trade of blows. */
export const STILL_TIME = 2.6
/** The picture is redrawn this many times a second: enough for the eye, and half the work of every frame. */
const FRAMES_PER_SECOND = 30

function prefersLessMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * The fight, on a loop, on its own dark panel. It stops by itself when the tab is hidden or the panel is off the screen, starts
 * still for a visitor who asked the system for less motion, and has a button to pause it (anything that moves for more than five
 * seconds needs one).
 */
export function FightLoop({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const panel = useRef<HTMLDivElement>(null)
  const [time, setTime] = useState(STILL_TIME)
  const [paused, setPaused] = useState(prefersLessMotion)
  const [visible, setVisible] = useState(true)
  const clock = useRef(STILL_TIME)

  useEffect(() => {
    const node = panel.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const watcher = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    watcher.observe(node)
    return () => watcher.disconnect()
  }, [])

  useEffect(() => {
    if (paused || !visible) return
    let frame = 0
    let last = performance.now()
    let drawn = last
    const tick = (now: number) => {
      clock.current = (clock.current + (now - last) / 1000) % LOOP_SECONDS
      last = now
      if (now - drawn >= 1000 / FRAMES_PER_SECOND && !document.hidden) {
        drawn = now
        setTime(clock.current)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [paused, visible])

  const describe = L(
    lang,
    'Ilustração animada: dois lutadores estilizados, de bermuda vermelha e azul, trocam golpes; o vermelho acerta um direto, o azul cai e o vermelho vence.',
    'Animated illustration: two stylised fighters, in red and blue shorts, trade blows; the red one lands a straight right and knocks the blue one down, and wins.',
    'Illustration animée : deux combattants stylisés, en short rouge et bleu, échangent des coups ; le rouge place un direct, envoie le bleu au tapis et gagne.',
    'Ilustración animada: dos peleadores estilizados, con short rojo y azul, intercambian golpes; el rojo conecta un recto, tumba al azul y gana.',
  )

  return (
    <div ref={panel} className={`relative overflow-hidden bg-[#10151d] ${className}`}>
      <div role="img" aria-label={describe} className="h-full w-full">
        <FightScene time={time} />
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? L(lang, 'Retomar a animação', 'Play the animation', 'Reprendre l’animation', 'Reanudar la animación') : L(lang, 'Pausar a animação', 'Pause the animation', 'Mettre l’animation en pause', 'Pausar la animación')}
        className="absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-sm border-[1.5px] border-white bg-transparent text-white hover:bg-white hover:text-[#10151d]"
      >
        {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
