import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { RetrospectCard } from '../shared/components/RetrospectCard'
import {
  canRetire,
  createCareer,
  decodeRetrospect,
  fight,
  offerCoaches,
  retire,
  seededRng,
  trainCamp,
  type Build,
  type Career as CareerState,
  type CoachId,
  type FightResult,
  type Plan,
  type PlayerStats,
  type Rng,
} from '../shared/game/career'
import type { GameOpponent } from '../shared/types/api'
import { CampStep, type CampNote } from './career/CampStep'
import { CreateStep } from './career/CreateStep'
import { EndStep } from './career/EndStep'
import { FightStep } from './career/FightStep'
import { OffersStep } from './career/OffersStep'
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
  fight: { offer: GameOpponent; result: FightResult } | null
}

/** The career game: build a fighter, train, take fights, and end with a picture of the retrospect. */
export function Career() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [params] = useSearchParams()
  const shared = useMemo(() => decodeRetrospect(params.get('c')), [params])
  const [game, setGame] = useState<Game | null>(null)
  const rng = useRef<Rng | null>(null)
  const random = useCallback(() => {
    rng.current ??= seededRng(Math.floor(Math.random() * 2 ** 31))
    return rng.current()
  }, [])

  const steps = [L(lang, 'Criar', 'Create', 'Créer', 'Crear'), L(lang, 'Camp', 'Camp', 'Préparation', 'Campamento'), L(lang, 'Luta', 'Fight', 'Combat', 'Pelea'), L(lang, 'Retrospecto', 'Retrospect', 'Bilan', 'Balance')]
  const stepIndex = !game ? 0 : game.stage === 'camp' ? 1 : game.stage === 'end' ? 3 : 2

  const start = (build: Build) => setGame({ career: createCareer(build), stage: 'camp', note: null, seed: 0, fight: null, coaches: offerCoaches(random) })

  const train = (coach: CoachId) => {
    if (!game) return
    const result = trainCamp(game.career, coach, random)
    setGame({ ...game, career: result.career, note: { injured: result.injured, declined: result.declined }, stage: result.career.ended ? 'end' : 'offers', seed: Math.floor(random() * 2 ** 31) })
  }

  const takeFight = (offer: GameOpponent, plan: Plan, player: PlayerStats) => {
    if (!game) return
    setGame({ ...game, stage: 'fight', fight: { offer, result: fight(game.career, offer, plan, player, random) } })
  }

  const continueCareer = () => {
    if (!game?.fight) return
    const career = game.fight.result.career
    setGame({ ...game, career, fight: null, note: null, stage: career.ended ? 'end' : 'camp', coaches: offerCoaches(random) })
  }

  // Retiring after a fight counts that fight: its result has not been applied to the career yet.
  const stop = () => {
    if (!game) return
    setGame({ ...game, career: retire(game.fight?.result.career ?? game.career), fight: null, stage: 'end' })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="game-hero overflow-hidden rounded-3xl border border-[var(--border-subtle)] px-5 py-7 sm:px-10 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-red)]">{L(lang, 'Jogo', 'Game', 'Jeu', 'Juego')}</p>
        <h1 className="game-title mt-2 text-3xl sm:text-5xl lg:text-6xl">{L(lang, 'Simule sua carreira no UFC', 'Simulate your UFC career', 'Simulez votre carrière à l’UFC', 'Simula tu carrera en la UFC')}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          {L(
            lang,
            'Crie um lutador, treine, escolha seus adversários entre lutadores reais e veja até onde vai. No fim, salve uma imagem do seu retrospecto ou compartilhe o link.',
            'Build a fighter, train, pick your opponents among real fighters and see how far you go. At the end, save a picture of your career or share the link.',
            'Créez un combattant, entraînez-vous, choisissez vos adversaires parmi de vrais combattants et voyez jusqu’où vous allez. À la fin, enregistrez une image de votre bilan ou partagez le lien.',
            'Crea un peleador, entrena, elige a tus rivales entre peleadores reales y mira hasta dónde llegas. Al final, guarda una imagen de tu balance o comparte el enlace.',
          )}
        </p>
        {!shared || game ? (
          <div className="mt-6">
            <Stepper steps={steps} current={stepIndex} />
          </div>
        ) : null}
        <details className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
          <summary className="cursor-pointer font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{L(lang, 'Como funciona', 'How it works', 'Comment ça marche', 'Cómo funciona')}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{L(lang, 'A chance de vencer cada luta vem do mesmo modelo do site, que lê precisão de golpes e de quedas, alcance, idade e cartel.', 'The chance of winning each fight comes from the site’s own model, which reads striking and takedown accuracy, reach, age and record.', 'La probabilité de gagner chaque combat vient du modèle du site, qui lit la précision de frappe et d’amenée au sol, l’allonge, l’âge et le bilan.', 'La probabilidad de ganar cada pelea sale del mismo modelo del sitio, que lee la precisión de golpeo y de derribos, el alcance, la edad y el récord.')}</li>
            <li>{L(lang, 'Regras do jogo, e não do modelo: o desconto de 4 pontos contra ranqueados e 6 contra o campeão, o plano de luta (até 4 pontos), as lesões e o acaso.', 'Game rules, not the model’s: a 4-point discount against ranked fighters and 6 against the champion, the game plan (up to 4 points), injuries and luck.', 'Règles du jeu, pas du modèle : une décote de 4 points contre les classés et de 6 contre le champion, le plan de combat (jusqu’à 4 points), les blessures et le hasard.', 'Reglas del juego, no del modelo: un descuento de 4 puntos ante rivales del ranking y de 6 ante el campeón, el plan de pelea (hasta 4 puntos), las lesiones y el azar.')}</li>
            <li>{L(lang, 'Nada é salvo: se você sair da página, a carreira se perde. O que fica é a imagem e o link do final.', 'Nothing is saved: leave the page and the career is gone. What stays is the picture and the link at the end.', 'Rien n’est enregistré : si vous quittez la page, la carrière est perdue. Ce qui reste, c’est l’image et le lien de la fin.', 'No se guarda nada: si sales de la página, la carrera se pierde. Lo que queda es la imagen y el enlace del final.')}</li>
            <li>{L(lang, 'É uma simulação para brincar. Nada aqui é resultado real.', 'It is a simulation for fun. Nothing here is a real result.', 'C’est une simulation pour s’amuser. Rien ici n’est un résultat réel.', 'Es una simulación para divertirse. Nada de esto es un resultado real.')}</li>
          </ul>
        </details>
      </header>

      {shared && !game ? (
        <section className="game-card space-y-5 p-5 sm:p-8">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            {L(lang, 'Este é o retrospecto de uma carreira simulada, aberto por um link. Os dados vêm do próprio link e não foram verificados.', 'This is the retrospect of a simulated career, opened from a link. The numbers come from the link itself and have not been verified.', 'Voici le bilan d’une carrière simulée, ouvert depuis un lien. Les chiffres viennent du lien lui-même et n’ont pas été vérifiés.', 'Este es el balance de una carrera simulada, abierto desde un enlace. Los datos vienen del propio enlace y no se han verificado.')}
          </p>
          <RetrospectCard card={shared} actions={false} />
          <div className="text-center">
            <Link to="/career" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent-red-solid)] px-7 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-[var(--accent-red)]/25 transition hover:brightness-110">
              {L(lang, 'Criar a minha carreira', 'Build my own career', 'Créer ma carrière', 'Crear mi carrera')}
            </Link>
          </div>
        </section>
      ) : !game ? (
        <CreateStep onStart={start} />
      ) : (
        <>
          {game.stage !== 'end' ? <StatusCard career={game.career} /> : null}
          {game.stage === 'camp' ? <CampStep key={game.career.ufcFights} career={game.career} coaches={game.coaches} note={game.note} onTrain={train} onRetire={stop} /> : null}
          {game.stage === 'offers' ? <OffersStep key={game.seed} career={game.career} seed={game.seed} onFight={takeFight} onRetire={stop} canRetire={canRetire(game.career)} /> : null}
          {game.stage === 'fight' && game.fight ? <FightStep key={game.career.ufcFights} career={game.career} offer={game.fight.offer} result={game.fight.result} onContinue={continueCareer} onRetire={stop} /> : null}
          {game.stage === 'end' ? <EndStep career={game.career} onRestart={() => setGame(null)} /> : null}
        </>
      )}
    </div>
  )
}
