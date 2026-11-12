import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { careerRules } from '../shared/data/careerRules'
import { RetrospectCard } from '../shared/components/RetrospectCard'
import { SectionHeading } from '../shared/components/SectionHeading'
import { challengeBuild, challengeDone, challengeStreams, decodeChallenge, type Challenge } from '../shared/game/challenge'
import { acceptCard, drawCard, type Card } from '../shared/game/events'
import { drawGoals } from '../shared/game/goals'
import {
  canRetire,
  createCareer,
  decodeRetrospect,
  offerCoaches,
  playToTheEnd,
  retire,
  seededRng,
  startFight,
  throwFight,
  trainCamp,
  type Build,
  type Career as CareerState,
  type CoachId,
  type FightResult,
  type FightState,
  type Plan,
  type PlayerStats,
  type Rng,
} from '../shared/game/career'
import { clearSave, loadSave, storeSave, type SavedGame } from '../shared/game/save'
import type { GameOpponent } from '../shared/types/api'
import { AchievementsPanel } from './career/AchievementsPanel'
import { CardStep } from './career/CardStep'
import { CampStep, type CampNote } from './career/CampStep'
import { ChallengeBar } from './career/ChallengeEnd'
import { ChallengeEntry, ChallengeIntro } from './career/ChallengeIntro'
import { CreateStep } from './career/CreateStep'
import { EndStep } from './career/EndStep'
import { FightStep } from './career/FightStep'
import { GoalsCard } from './career/GoalsCard'
import { OffersStep } from './career/OffersStep'
import { ResumeCard } from './career/ResumeCard'
import { StatusCard } from './career/StatusCard'
import { Stepper } from './career/ui'

type Stage = 'camp' | 'offers' | 'fight' | 'end'

interface Game {
  career: CareerState
  stage: Stage
  note: CampNote | null
  seed: number
  /** The three coaches on offer for the camp on screen. */
  coaches: CoachId[]
  /** A card waiting for an answer before the matchmaking (a sponsor, an arranged fight), or null. */
  card: Card | null
  /** The challenge being played (same fighter, same dice for everyone), or null for an ordinary career. */
  challenge: Challenge | null
  /** The fight on screen, with the dice it is played with (the career's own stream, or the challenge's for this fight). */
  fight: { offer: GameOpponent; state: FightState; dice: Rng } | null
}

/** The career game: build a fighter, train, take fights, and end with a picture of the retrospect. */
export function Career() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [params] = useSearchParams()
  const shared = useMemo(() => decodeRetrospect(params.get('c')), [params])
  const linked = useMemo(() => decodeChallenge(params.get('d')), [params])
  const [game, setGame] = useState<Game | null>(null)
  /** A challenge picked on the first screen (the day's, or a new one), before the player starts it. */
  const [pending, setPending] = useState<Challenge | null>(null)
  /** Set once a game has started: the link that opened the page has been taken up, so the first screen is the ordinary one again. */
  const [linkUsed, setLinkUsed] = useState(false)
  const incoming = !game ? (pending ?? (linkUsed ? null : linked)) : null
  /** The career this browser kept from an earlier visit, offered on the first screen until the player takes it up or sets it aside. */
  const [saved, setSaved] = useState<SavedGame | null>(() => loadSave())
  const rng = useRef<Rng | null>(null)
  const random = useCallback(() => {
    rng.current ??= seededRng(Math.floor(Math.random() * 2 ** 31))
    return rng.current()
  }, [])

  const steps = [L(lang, 'Criar', 'Create', 'Créer', 'Crear'), L(lang, 'Camp', 'Camp', 'Préparation', 'Campamento'), L(lang, 'Luta', 'Fight', 'Combat', 'Pelea'), L(lang, 'Retrospecto', 'Retrospect', 'Bilan', 'Balance')]
  const stepIndex = !game ? 0 : game.stage === 'camp' ? 1 : game.stage === 'end' ? 3 : 2

  // Saved between fights only (at the camp and at the matchmaking), and forgotten when the career ends.
  useEffect(() => {
    if (!game) return
    if (game.stage === 'camp' || game.stage === 'offers') storeSave({ career: game.career, stage: game.stage, coaches: game.coaches, seed: game.seed, note: game.note, challenge: game.challenge, card: game.card })
    else if (game.stage === 'end') clearSave()
  }, [game])

  const start = (build: Build) => {
    setSaved(null)
    setLinkUsed(true)
    setGame({ career: createCareer(build, drawGoals(random)), stage: 'camp', note: null, seed: 0, fight: null, coaches: offerCoaches(random), card: null, challenge: null })
  }

  // A challenge: the fighter, the goals and every random event come from the seed (see challenge.ts).
  const startChallenge = (challenge: Challenge, name: string) => {
    const streams = challengeStreams(challenge.seed)
    setSaved(null)
    setPending(null)
    setLinkUsed(true)
    setGame({ career: createCareer(challengeBuild(challenge.seed, name), drawGoals(streams.goals())), stage: 'camp', note: null, seed: 0, fight: null, coaches: offerCoaches(streams.coaches(0)), card: null, challenge })
  }

  const resume = (save: SavedGame) => {
    setSaved(null)
    setLinkUsed(true)
    setGame({ career: save.career, stage: save.stage, note: save.note, seed: save.seed, fight: null, coaches: save.coaches, card: save.card, challenge: save.challenge })
  }

  const discard = () => {
    clearSave()
    setSaved(null)
  }

  const train = (coach: CoachId) => {
    if (!game) return
    const fightNumber = game.career.ufcFights
    const streams = game.challenge ? challengeStreams(game.challenge.seed) : null
    const result = trainCamp(game.career, coach, streams ? streams.camp(fightNumber) : random)
    const card = result.career.ended ? null : drawCard(result.career, streams ? streams.cards(fightNumber) : random)
    setGame({ ...game, career: result.career, note: { injured: result.injured, declined: result.declined }, stage: result.career.ended ? 'end' : 'offers', card, seed: streams ? streams.offers(fightNumber) : Math.floor(random() * 2 ** 31) })
  }

  // The answer to a card. An arranged fight rolls here whether the player will be caught (a challenge rolls it on its own stream).
  const answerCard = (accepted: boolean) => {
    if (!game?.card) return
    const career = accepted ? acceptCard(game.career, game.card, game.challenge ? challengeStreams(game.challenge.seed).cards(game.career.ufcFights + 1_000) : random) : game.career
    setGame({ ...game, career, card: null })
  }

  const takeFight = (offer: GameOpponent, plan: Plan, player: PlayerStats, quick = false) => {
    if (!game) return
    const dice = game.challenge ? challengeStreams(game.challenge.seed).fight(game.career.ufcFights) : random
    const first = startFight(game.career, offer, plan, player, dice)
    // An arranged fight is lost without rolling a round; "fight and skip to the result" plays every round with the plan unchanged, the same function the fight screen's own skip uses.
    const state = game.career.pact?.kind === 'fix' ? throwFight(first) : quick ? playToTheEnd(first, dice) : first
    setGame({ ...game, stage: 'fight', fight: { offer, state, dice } })
  }

  const continueCareer = (result: FightResult) => {
    if (!game?.fight) return
    // A challenge ends when its fights have been fought: there is no retiring early, and no fight to spare.
    const career = game.challenge && challengeDone(game.challenge, result.career) ? retire(result.career) : result.career
    const coaches = offerCoaches(game.challenge ? challengeStreams(game.challenge.seed).coaches(career.ufcFights) : random)
    setGame({ ...game, career, fight: null, note: null, card: null, stage: career.ended ? 'end' : 'camp', coaches })
  }

  // Retiring after a fight counts that fight: its result has not been applied to the career yet.
  const stop = (result?: FightResult) => {
    if (!game) return
    setGame({ ...game, career: retire(result?.career ?? game.career), fight: null, stage: 'end' })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <SectionHeading
          level={1}
          title={L(lang, 'Simule sua carreira no UFC', 'Simulate your UFC career', 'Simulez votre carrière à l’UFC', 'Simula tu carrera en la UFC')}
          description={L(
            lang,
            'Crie um lutador, treine, escolha seus adversários entre lutadores reais e veja até onde vai. No fim, salve uma imagem do seu retrospecto ou compartilhe o link.',
            'Build a fighter, train, pick your opponents among real fighters and see how far you go. At the end, save a picture of your career or share the link.',
            'Créez un combattant, entraînez-vous, choisissez vos adversaires parmi de vrais combattants et voyez jusqu’où vous allez. À la fin, enregistrez une image de votre bilan ou partagez le lien.',
            'Crea un peleador, entrena, elige a tus rivales entre peleadores reales y mira hasta dónde llegas. Al final, guarda una imagen de tu balance o comparte el enlace.',
          )}
        />
        {!shared || game ? (
          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
            <Stepper steps={steps} current={stepIndex} />
          </div>
        ) : null}
        <details className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
          <summary className="cursor-pointer font-bold text-[var(--text-secondary)]">{L(lang, 'Como funciona', 'How it works', 'Comment ça marche', 'Cómo funciona')}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {careerRules(lang).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
      </header>

      {shared && !game ? (
        <section className="surface-card rounded-sm space-y-5 p-5 sm:p-8">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            {L(lang, 'Este é o retrospecto de uma carreira simulada, aberto por um link. Os dados vêm do próprio link e não foram verificados.', 'This is the retrospect of a simulated career, opened from a link. The numbers come from the link itself and have not been verified.', 'Voici le bilan d’une carrière simulée, ouvert depuis un lien. Les chiffres viennent du lien lui-même et n’ont pas été vérifiés.', 'Este es el balance de una carrera simulada, abierto desde un enlace. Los datos vienen del propio enlace y no se han verificado.')}
          </p>
          <RetrospectCard card={shared} actions={false} />
          <div className="text-center">
            <Link to="/career" className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[var(--ink)] px-7 text-sm font-bold text-[var(--on-ink)] transition hover:brightness-110">
              {L(lang, 'Criar a minha carreira', 'Build my own career', 'Créer ma carrière', 'Crear mi carrera')}
            </Link>
          </div>
        </section>
      ) : incoming ? (
        <>
          {/* A career saved in this browser stays on offer: starting the challenge would replace it. */}
          {saved ? <ResumeCard saved={saved} onResume={() => resume(saved)} onDiscard={discard} /> : null}
          <ChallengeIntro challenge={incoming} fromLink={!pending} onStart={(name) => startChallenge(incoming, name)} onBack={() => setPending(null)} />
        </>
      ) : !game ? (
        <>
          {saved ? <ResumeCard saved={saved} onResume={() => resume(saved)} onDiscard={discard} /> : null}
          <CreateStep onStart={start} />
          <ChallengeEntry onPick={setPending} />
          <AchievementsPanel />
        </>
      ) : (
        <>
          {game.stage !== 'end' && game.challenge ? <ChallengeBar challenge={game.challenge} career={game.career} /> : null}
          {game.stage !== 'end' ? <StatusCard career={game.career} /> : null}
          {game.stage === 'camp' || game.stage === 'offers' ? <GoalsCard career={game.career} /> : null}
          {game.stage === 'camp' ? <CampStep key={game.career.ufcFights} career={game.career} coaches={game.coaches} note={game.note} onTrain={train} onRetire={() => stop()} retirable={!game.challenge} /> : null}
          {game.stage === 'offers' && game.card ? <CardStep key={game.card.kind} card={game.card} onAnswer={answerCard} /> : null}
          {game.stage === 'offers' && !game.card ? <OffersStep key={game.seed} career={game.career} seed={game.seed} onFight={takeFight} onRetire={() => stop()} canRetire={!game.challenge && canRetire(game.career)} /> : null}
          {game.stage === 'fight' && game.fight ? <FightStep key={game.career.ufcFights} career={game.career} offer={game.fight.offer} start={game.fight.state} random={game.fight.dice} onContinue={continueCareer} onRetire={stop} retirable={!game.challenge} endsCareer={Boolean(game.challenge && game.career.ufcFights + 1 >= game.challenge.fights)} /> : null}
          {game.stage === 'end' ? <EndStep career={game.career} challenge={game.challenge} onRestart={() => setGame(null)} /> : null}
        </>
      )}
    </div>
  )
}
