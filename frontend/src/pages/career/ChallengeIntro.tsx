import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Dices, Flag } from 'lucide-react'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../../shared/data/divisions'
import { cleanName, type Stance } from '../../shared/game/career'
import { challengeBuild, CHALLENGE_FIGHTS, dailySeed, randomSeed, type Challenge, type ChallengeResult } from '../../shared/game/challenge'
import { Chip, GhostButton, PrimaryButton, SkillMeter } from './ui'

const field = 'mt-1.5 block min-h-12 w-full rounded-sm border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-3.5 text-base font-semibold normal-case text-[var(--text-main)] transition focus:border-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]'

/** The challenge's code, short enough to say out loud. */
export const challengeCode = (seed: number) => seed.toString(36).toUpperCase()

/** What a result says of a run: points first (unless the score is shown beside it), then the record and how the wins came. */
export function ResultLine({ result, points = true }: { result: ChallengeResult; points?: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <span>
      {points ? (
        <>
          <strong className="data-value">{result.p}</strong> {L(lang, 'pontos', 'points', 'points', 'puntos')} ·{' '}
        </>
      ) : null}
      <span className="data-value">{result.w}-{result.l}</span> · {result.ko} KO · {result.sb} SUB · {result.dc} DEC
    </span>
  )
}

/** On the first screen: the way into a challenge, with the day's challenge (the same for everyone) and a new one. */
export function ChallengeEntry({ onPick }: { onPick: (challenge: Challenge) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <section aria-label={L(lang, 'Desafio', 'Challenge', 'Défi', 'Desafío')} className="surface-card rounded-sm space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
          <Flag className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'Desafio', 'Challenge', 'Défi', 'Desafío')}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {L(
            lang,
            `Mesmo lutador, mesmos dados: ${CHALLENGE_FIGHTS} lutas para ver quem faz mais pontos. Jogue e mande o link para um amigo tentar bater o seu resultado.`,
            `Same fighter, same dice: ${CHALLENGE_FIGHTS} fights to see who scores more. Play it and send the link to a friend to try to beat your result.`,
            `Même combattant, mêmes dés : ${CHALLENGE_FIGHTS} combats pour voir qui marque le plus. Jouez et envoyez le lien à un ami pour qu’il tente de battre votre résultat.`,
            `Mismo peleador, mismos dados: ${CHALLENGE_FIGHTS} peleas para ver quién suma más. Juega y envía el enlace a un amigo para que intente superar tu resultado.`,
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => onPick({ seed: dailySeed(), fights: CHALLENGE_FIGHTS, target: null })}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'Desafio do dia', 'Today’s challenge', 'Défi du jour', 'Desafío del día')}
        </PrimaryButton>
        <GhostButton onClick={() => onPick({ seed: randomSeed(Math.random), fights: CHALLENGE_FIGHTS, target: null })}>
          <Dices className="h-4 w-4" aria-hidden="true" />
          {L(lang, 'Novo desafio', 'New challenge', 'Nouveau défi', 'Nuevo desafío')}
        </GhostButton>
      </div>
    </section>
  )
}

const STANCE_NAME: Record<Stance, [string, string, string, string]> = {
  Orthodox: ['Ortodoxo', 'Orthodox', 'Orthodoxe', 'Ortodoxo'],
  Southpaw: ['Canhoto', 'Southpaw', 'Gaucher', 'Zurdo'],
  Switch: ['Alternado', 'Switch', 'Switch', 'Alternado'],
}

/** Before a challenge starts: who the fighter is, what there is to beat, the rules, and a name to play under. */
export function ChallengeIntro({ challenge, fromLink, onStart, onBack }: { challenge: Challenge; fromLink: boolean; onStart: (name: string) => void; onBack: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [name, setName] = useState('')
  const fighter = challengeBuild(challenge.seed, name)
  const stance = STANCE_NAME[fighter.stance]
  const { target } = challenge
  const ready = cleanName(name).length > 0

  return (
    <form
      className="surface-card rounded-sm space-y-6 p-5 sm:p-7"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onStart(cleanName(name))
      }}
    >
      <div>
        <p className="text-xs font-bold text-[var(--ink)]">
          {L(lang, 'Desafio', 'Challenge', 'Défi', 'Desafío')} <span className="data-value text-[var(--text-secondary)]" data-testid="challenge-code">#{challengeCode(challenge.seed)}</span>
        </p>
        <h2 className="game-title mt-1 text-xl sm:text-3xl">
          {target
            ? L(lang, `${target.n} desafiou você`, `${target.n} challenged you`, `${target.n} vous a lancé un défi`, `${target.n} te desafió`)
            : L(lang, 'Aceite o desafio', 'Take the challenge', 'Relevez le défi', 'Acepta el desafío')}
        </h2>
      </div>

      {target ? (
        <div role="note" className="space-y-1 rounded-sm border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-4 py-3 text-sm text-[var(--text-main)]" data-testid="challenge-target">
          <p className="text-xs font-bold text-[var(--text-gold)]">{L(lang, 'Para bater', 'To beat', 'À battre', 'Para superar')}</p>
          <p>
            <strong>{target.n}</strong>: <ResultLine result={target} />
          </p>
          <p className="text-xs text-[var(--text-muted)]">{L(lang, 'O resultado vem do link e não foi verificado.', 'The result comes from the link and has not been verified.', 'Le résultat vient du lien et n’a pas été vérifié.', 'El resultado viene del enlace y no se ha verificado.')}</p>
        </div>
      ) : null}

      <div className="space-y-3 rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 p-4" data-testid="challenge-fighter">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="red">{getDivisionName(fighter.division, lang)}</Chip>
          <Chip>{L(lang, stance[0], stance[1], stance[2], stance[3])}</Chip>
          <Chip tone="gold">{L(lang, `${challenge.fights} lutas`, `${challenge.fights} fights`, `${challenge.fights} combats`, `${challenge.fights} peleas`)}</Chip>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SkillMeter label={L(lang, 'Golpes', 'Striking', 'Frappe', 'Golpeo')} value={fighter.striking} />
          <SkillMeter label={L(lang, 'Quedas', 'Takedowns', 'Amenées au sol', 'Derribos')} value={fighter.takedowns} tone="gold" />
          <SkillMeter label={L(lang, 'Alcance', 'Reach', 'Allonge', 'Alcance')} value={fighter.reach} tone="blue" />
        </div>
      </div>

      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--text-secondary)]">
        <li>{L(lang, 'Todos jogam o mesmo lutador: divisão, base e habilidades saem do código do desafio.', 'Everyone plays the same fighter: division, stance and skills come from the challenge code.', 'Tout le monde joue le même combattant : catégorie, garde et compétences viennent du code du défi.', 'Todos juegan el mismo peleador: división, guardia y habilidades salen del código del desafío.')}</li>
        <li>{L(lang, 'Os técnicos oferecidos, as lesões e os dados das lutas também. Quem faz as mesmas escolhas vive a mesma carreira.', 'So do the coaches on offer, the injuries and the dice of the fights. Whoever makes the same choices lives the same career.', 'Les entraîneurs proposés, les blessures et les dés des combats aussi. Qui fait les mêmes choix vit la même carrière.', 'También los técnicos ofrecidos, las lesiones y los dados de las peleas. Quien hace las mismas elecciones vive la misma carrera.')}</li>
        <li>{L(lang, `São ${challenge.fights} lutas, sem aposentar antes. Vale quem terminar com mais pontos de ranking; no empate, quem tiver mais vitórias.`, `${challenge.fights} fights, with no retiring early. Whoever finishes with more ranking points wins; on a tie, more wins.`, `${challenge.fights} combats, sans retraite anticipée. Gagne celui qui finit avec le plus de points de classement ; à égalité, le plus de victoires.`, `${challenge.fights} peleas, sin retirarse antes. Gana quien termine con más puntos de ranking; en caso de empate, más victorias.`)}</li>
      </ul>

      <label className="block max-w-sm text-xs font-bold text-[var(--text-secondary)]">
        {L(lang, 'Seu nome', 'Your name', 'Votre nom', 'Tu nombre')}
        <input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} className={field} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" disabled={!ready}>
          {L(lang, 'Começar o desafio', 'Start the challenge', 'Commencer le défi', 'Empezar el desafío')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
        {fromLink ? (
          <Link to="/career" className="inline-flex min-h-12 items-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--ink)]">
            {L(lang, 'Criar a minha carreira', 'Build my own career', 'Créer ma carrière', 'Crear mi carrera')}
          </Link>
        ) : (
          <GhostButton onClick={onBack}>{L(lang, 'Voltar', 'Back', 'Retour', 'Volver')}</GhostButton>
        )}
      </div>
    </form>
  )
}
