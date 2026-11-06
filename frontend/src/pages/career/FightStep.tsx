import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronsRight, Lightbulb, Scale, Shield, Swords, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'

import { L, pick } from '../../i18n/lang'
import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { METHOD_LABELS } from '../../shared/data/cancelledFights'
import { canRetire, cornerAdvice, liveChance, playRound, recordText, settleFight, TACTICS, type Career, type Edge, type FightResult, type FightState, type Rng, type Tactic } from '../../shared/game/career'
import { ADVICE_TEXT, TACTIC_TEXT } from '../../shared/game/corner'
import { BAND_LABELS, chanceBand, STANDING_LABELS } from '../../shared/game/labels'
import { decisionText, roundText } from '../../shared/game/narration'
import type { GameOpponent } from '../../shared/types/api'
import { Chip, Emblem, GhostButton, PrimaryButton } from './ui'

const EDGE_STYLE: Record<Edge, string> = {
  you: 'border-[var(--accent-green)] bg-[var(--accent-green)]/8',
  opp: 'border-[var(--accent-red)] bg-[var(--accent-red)]/8',
  even: 'border-[var(--border-default)] bg-[var(--bg-surface-subtle)]',
}

const TACTIC_ICON: Record<Tactic, ReactNode> = {
  attack: <Swords className="h-5 w-5" aria-hidden="true" />,
  steady: <Scale className="h-5 w-5" aria-hidden="true" />,
  cover: <Shield className="h-5 w-5" aria-hidden="true" />,
}

/** One pip per scheduled round: green for a round the player took, red for one the opponent took, empty for one still to come. */
function Scorecard({ state }: { state: FightState }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <div className="flex items-center justify-center gap-3" data-testid="scorecard">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{L(lang, 'Cartões', 'Scorecards', 'Cartons', 'Tarjetas')}</span>
      <ol className="flex gap-1.5" aria-label={L(lang, `Cartões: ${state.youRounds} a ${state.oppRounds}`, `Scorecards: ${state.youRounds} to ${state.oppRounds}`, `Cartons : ${state.youRounds} à ${state.oppRounds}`, `Tarjetas: ${state.youRounds} a ${state.oppRounds}`)}>
        {Array.from({ length: state.scheduled }, (_, index) => {
          const story = state.stories[index]
          const tone = !story ? 'border border-[var(--border-default)] bg-transparent' : story.edge === 'you' ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'
          return <li key={index} className={`h-3 w-7 rounded-full transition-colors duration-500 ${tone}`} />
        })}
      </ol>
      <span className="data-value text-sm font-bold text-[var(--text-main)]">{state.youRounds}–{state.oppRounds}</span>
    </div>
  )
}

function TacticButton({ tactic, onPick }: { tactic: Tactic; onPick: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const text = TACTIC_TEXT[tactic]
  return (
    <button type="button" onClick={onPick} className="game-pick flex h-full flex-col gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 text-left sm:p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-red)]/12 text-[var(--text-red)]">{TACTIC_ICON[tactic]}</span>
      <span>
        <span className="block text-xs font-bold text-[var(--text-main)] sm:text-sm">{pick(lang, text.name)}</span>
        <span className="block text-[11px] leading-4 text-[var(--text-secondary)] sm:text-xs sm:leading-5">{pick(lang, text.hint)}</span>
      </span>
    </button>
  )
}

/**
 * The fight, a round at a time. Before every round the player tells the corner what to do (attack, stick to the plan or cover
 * up); the round is fought, the cards and the odds move, and so on until a finish or the last bell. Then what it did to the career.
 */
export function FightStep({ career, offer, start, random, onContinue, onRetire }: { career: Career; offer: GameOpponent; start: FightState; random: Rng; onContinue: (result: FightResult) => void; onRetire: (result: FightResult) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [state, setState] = useState(start)
  const [asked, setAsked] = useState(false)
  const result = useMemo(() => (state.over ? settleFight(career, offer, state) : null), [career, offer, state])
  const title = offer.champion || career.champion
  const finished = state.over !== null

  // The bar sits where the exact odds of the fight are right now, with every round to come taken steady: it swings with each round.
  const chance = liveChance(state)
  const band = chanceBand(chance)

  const play = (tactic: Tactic) => setState(playRound(state, tactic, random))
  const toTheEnd = () => {
    let next = state
    while (!next.over) next = playRound(next, 'steady', random)
    setState(next)
  }

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
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{L(lang, `${state.scheduled} rounds`, `${state.scheduled} rounds`, `${state.scheduled} rounds`, `${state.scheduled} rounds`)}</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <FighterAvatar name={offer.name} imageUrl={offer.image_url} className="h-20 w-20 sm:h-28 sm:w-28" highlight={offer.champion} />
            <p className="game-title text-lg sm:text-2xl" aria-hidden="true">{offer.name}</p>
            <p className="data-value text-sm font-bold text-[var(--text-secondary)]">{offer.record}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2" role="img" aria-label={`${L(lang, 'Momento da luta', 'Fight momentum', 'Momentum du combat', 'Impulso de la pelea')}: ${pick(lang, BAND_LABELS[band])}`}>
          <div className="relative h-3 overflow-hidden rounded-full bg-[var(--accent-red)]/40">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--text-green)]" initial={false} animate={{ width: `${Math.min(Math.max(chance * 100, 4), 100)}%` }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} />
            <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--bg-app)]/60" aria-hidden="true" />
          </div>
          {!finished ? <p className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]" data-testid="live-band">{pick(lang, BAND_LABELS[band])}</p> : null}
        </div>
        <div className="mt-3">
          <Scorecard state={state} />
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-8">
        <ol className="space-y-2.5" aria-live="polite">
          {state.stories.map((story) => (
            <motion.li key={story.round} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`rounded-xl border-l-4 px-4 py-3 text-sm leading-6 text-[var(--text-main)] ${EDGE_STYLE[story.edge]}`}>
              <span className="mr-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Round {story.round}</span>
              {story.tactic && story.tactic !== 'steady' ? <span className="mr-2 align-middle"><Chip tone={story.tactic === 'attack' ? 'red' : 'neutral'}>{pick(lang, TACTIC_TEXT[story.tactic].name)}</Chip></span> : null}
              {roundText(lang, story, state.over?.method ?? 'dec', state.over?.won ?? false, career.name, offer.name)}
            </motion.li>
          ))}
          {state.over?.method === 'dec' ? (
            <motion.li initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-l-4 border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-4 py-3 text-sm font-semibold text-[var(--text-main)]">
              {decisionText(lang, state.over.won, state.over.split, career.name, offer.name)}
            </motion.li>
          ) : null}
        </ol>

        {!finished ? (
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {state.played === 0
                ? L(lang, 'Soa o gongo. O que o córner manda no round 1?', 'The bell rings. What does the corner say for round 1?', 'Le gong retentit. Que dit le coin pour le round 1 ?', 'Suena la campana. ¿Qué indica el córner para el round 1?')
                : L(lang, `O que o córner manda no round ${state.played + 1}?`, `What does the corner say for round ${state.played + 1}?`, `Que dit le coin pour le round ${state.played + 1} ?`, `¿Qué indica el córner para el round ${state.played + 1}?`)}
            </legend>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {TACTICS.map((tactic) => (
                <TacticButton key={tactic} tactic={tactic} onPick={() => play(tactic)} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <GhostButton onClick={() => setAsked((value) => !value)}>
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                {asked ? L(lang, 'Esconder o conselho', 'Hide the advice', 'Masquer le conseil', 'Ocultar el consejo') : L(lang, 'Ouvir o córner', 'Ask the corner', 'Écouter le coin', 'Escuchar al córner')}
              </GhostButton>
              <GhostButton onClick={toTheEnd}>
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                {L(lang, 'Ir direto ao resultado', 'Skip to the result', 'Passer au résultat', 'Ir al resultado')}
              </GhostButton>
            </div>
            {asked ? (
              <p role="status" className="rounded-xl bg-[var(--bg-surface-subtle)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]" data-testid="corner-advice">
                {pick(lang, ADVICE_TEXT[cornerAdvice(state)])}
              </p>
            ) : null}
            <p className="text-xs text-[var(--text-muted)]">{L(lang, 'Pular o resultado joga os rounds que faltam sem mudar nada.', 'Skipping plays the rounds that are left with no changes.', 'Passer au résultat joue les rounds restants sans rien changer.', 'Ir al resultado juega los rounds que faltan sin cambiar nada.')}</p>
          </fieldset>
        ) : result ? (
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
              <PrimaryButton onClick={() => onContinue(result)}>
                {result.career.ended ? L(lang, 'Ver o retrospecto', 'See the retrospect', 'Voir le bilan', 'Ver el balance') : L(lang, 'Continuar a carreira', 'Continue the career', 'Poursuivre la carrière', 'Continuar la carrera')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrimaryButton>
              {!result.career.ended && canRetire(result.career) ? <GhostButton onClick={() => onRetire(result)}>{L(lang, 'Aposentar', 'Retire', 'Prendre sa retraite', 'Retirarse')}</GhostButton> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
