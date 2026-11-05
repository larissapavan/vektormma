import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronsRight, Trophy } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { METHOD_LABELS } from '../../shared/data/cancelledFights'
import { canRetire, recordText, type Career, type Edge, type FightResult } from '../../shared/game/career'
import { STANDING_LABELS } from '../../shared/game/labels'
import { decisionText, roundText } from '../../shared/game/narration'
import type { GameOpponent } from '../../shared/types/api'
import { Chip, Emblem, GhostButton, PrimaryButton } from './ui'

const EDGE_STYLE: Record<Edge, string> = {
  you: 'border-[var(--accent-green)] bg-[var(--accent-green)]/8',
  opp: 'border-[var(--accent-red)] bg-[var(--accent-red)]/8',
  even: 'border-[var(--border-default)] bg-[var(--bg-surface-subtle)]',
}

/** The fight itself, a round at a time, with a momentum bar that swings, and then what it did to the career. */
export function FightStep({ career, offer, result, onContinue, onRetire }: { career: Career; offer: GameOpponent; result: FightResult; onContinue: () => void; onRetire: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [shown, setShown] = useState(0)
  const total = result.rounds.length
  const finished = shown >= total
  const title = offer.champion || career.champion

  // Momentum: each round the player takes pushes the bar toward them, each one the opponent takes pulls it back.
  const swing = result.rounds.slice(0, shown).reduce((sum, round) => sum + (round.edge === 'you' ? 1 : round.edge === 'opp' ? -1 : 0), 0)
  const momentum = finished ? (result.won ? 100 : 0) : 50 + (swing / Math.max(total, 1)) * 40

  return (
    <section className="game-card overflow-hidden">
      <div className="game-hero px-5 pb-6 pt-5 sm:px-8">
        {title ? (
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-gold)]">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            {L(lang, 'Disputa de cinturão', 'Title fight', 'Combat pour la ceinture', 'Pelea por el cinturón')}
          </p>
        ) : null}
        <h2 className="sr-only">
          {career.name} vs. {offer.name}
        </h2>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Emblem name={career.name} className="h-20 w-20 text-3xl sm:h-28 sm:w-28 sm:text-4xl" />
            <p className="game-title text-lg sm:text-2xl" aria-hidden="true">{career.name}</p>
            <p className="data-value text-sm font-bold text-[var(--text-secondary)]">{recordText(career)}</p>
          </div>
          <div className="text-center">
            <p className="game-title text-4xl text-[var(--accent-red)] sm:text-6xl">VS</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{L(lang, `${total} rounds`, `${total} rounds`, `${total} rounds`, `${total} rounds`)}</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <FighterAvatar name={offer.name} imageUrl={offer.image_url} className="h-20 w-20 sm:h-28 sm:w-28" highlight={offer.champion} />
            <p className="game-title text-lg sm:text-2xl" aria-hidden="true">{offer.name}</p>
            <p className="data-value text-sm font-bold text-[var(--text-secondary)]">{offer.record}</p>
          </div>
        </div>

        <div className="mt-5" role="img" aria-label={L(lang, 'Momento da luta', 'Fight momentum', 'Momentum du combat', 'Impulso de la pelea')}>
          <div className="relative h-3 overflow-hidden rounded-full bg-[var(--accent-red)]/40">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--text-green)]" initial={false} animate={{ width: `${momentum}%` }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} />
            <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--bg-app)]/60" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-8">
        <ol className="space-y-2.5" aria-live="polite">
          {result.rounds.slice(0, shown).map((story) => (
            <motion.li key={story.round} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`rounded-xl border-l-4 px-4 py-3 text-sm leading-6 text-[var(--text-main)] ${EDGE_STYLE[story.edge]}`}>
              <span className="mr-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Round {story.round}</span>
              {roundText(lang, story, result.method, result.won, career.name, offer.name)}
            </motion.li>
          ))}
          {finished && result.method === 'dec' ? (
            <motion.li initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-l-4 border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-4 py-3 text-sm font-semibold text-[var(--text-main)]">
              {decisionText(lang, result.won, result.split, career.name, offer.name)}
            </motion.li>
          ) : null}
        </ol>

        {!finished ? (
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => setShown((value) => value + 1)}>
              {shown === 0 ? L(lang, 'Soa o gongo: começar', 'The bell rings: start', 'Le gong retentit : commencer', 'Suena la campana: empezar') : L(lang, 'Próximo round', 'Next round', 'Round suivant', 'Siguiente round')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
            <GhostButton onClick={() => setShown(total)}>
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
              {L(lang, 'Ir direto ao resultado', 'Skip to the result', 'Passer au résultat', 'Ir al resultado')}
            </GhostButton>
          </div>
        ) : (
          <div className="space-y-5 border-t border-[var(--border-subtle)] pt-6">
            <div className={`game-pop rounded-2xl px-5 py-6 text-center ring-2 ${result.won ? 'bg-[var(--accent-green)]/10 ring-[var(--accent-green)]/50' : 'bg-[var(--accent-red)]/10 ring-[var(--accent-red)]/50'}`}>
              <p className={`game-title text-4xl sm:text-6xl ${result.won ? 'text-[var(--text-green)]' : 'text-[var(--text-red)]'}`} data-testid="fight-result">
                {result.won ? L(lang, 'Vitória', 'Victory', 'Victoire', 'Victoria') : L(lang, 'Derrota', 'Defeat', 'Défaite', 'Derrota')}
                <span className="sr-only"> · </span>
                <span className="mt-2 block text-base tracking-[0.1em] text-[var(--text-secondary)] sm:text-xl">
                  {pick(lang, METHOD_LABELS[result.method])}
                  {result.method !== 'dec' ? ` · round ${result.round}` : ''}
                </span>
              </p>
            </div>

            <ul className="flex flex-wrap gap-2">
              <li>
                <Chip tone={result.pointsGained >= 0 ? 'green' : 'red'}>{L(lang, `Pontos: ${result.pointsGained >= 0 ? '+' : ''}${result.pointsGained}`, `Points: ${result.pointsGained >= 0 ? '+' : ''}${result.pointsGained}`, `Points : ${result.pointsGained >= 0 ? '+' : ''}${result.pointsGained}`, `Puntos: ${result.pointsGained >= 0 ? '+' : ''}${result.pointsGained}`)}</Chip>
              </li>
              {result.standingAfter !== result.standingBefore ? (
                <li>
                  <Chip tone="gold">{L(lang, `Nova posição: ${pick(lang, STANDING_LABELS[result.standingAfter])}`, `New standing: ${pick(lang, STANDING_LABELS[result.standingAfter])}`, `Nouvelle position : ${pick(lang, STANDING_LABELS[result.standingAfter])}`, `Nueva posición: ${pick(lang, STANDING_LABELS[result.standingAfter])}`)}</Chip>
                </li>
              ) : null}
              {result.wonBelt ? <li><Chip tone="gold">{L(lang, 'Você é o novo campeão!', 'You are the new champion!', 'Vous êtes le nouveau champion !', '¡Eres el nuevo campeón!')}</Chip></li> : null}
              {result.lostBelt ? <li><Chip tone="red">{L(lang, 'Você perdeu o cinturão.', 'You lost the belt.', 'Vous avez perdu la ceinture.', 'Perdiste el cinturón.')}</Chip></li> : null}
            </ul>
            {!result.won && result.career.ended !== 'released' ? <p className="text-sm text-[var(--text-secondary)]">{L(lang, `${offer.name} agora é seu rival: dá para pedir a revanche.`, `${offer.name} is now your rival: you can ask for the rematch.`, `${offer.name} est maintenant votre rival : vous pouvez réclamer la revanche.`, `${offer.name} es ahora tu rival: puedes pedir la revancha.`)}</p> : null}
            {result.career.ended === 'released' ? <p className="text-sm font-semibold text-[var(--text-red)]">{L(lang, 'Três derrotas seguidas: o UFC dispensou você.', 'Three straight losses: the UFC has released you.', 'Trois défaites de suite : l’UFC vous a libéré.', 'Tres derrotas seguidas: la UFC te liberó.')}</p> : null}

            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={onContinue}>
                {result.career.ended ? L(lang, 'Ver o retrospecto', 'See the retrospect', 'Voir le bilan', 'Ver el balance') : L(lang, 'Continuar a carreira', 'Continue the career', 'Poursuivre la carrière', 'Continuar la carrera')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrimaryButton>
              {!result.career.ended && canRetire(result.career) ? <GhostButton onClick={onRetire}>{L(lang, 'Aposentar', 'Retire', 'Prendre sa retraite', 'Retirarse')}</GhostButton> : null}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
