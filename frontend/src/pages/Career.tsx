import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
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
            <li>{L(lang, 'A chance de vencer cada luta vem do mesmo modelo do site. Do seu lutador, ele lê o que o jogo define: precisão de golpes e de quedas, alcance, idade e cartel.', 'The chance of winning each fight comes from the site’s own model. Of your fighter, it reads what the game sets: striking and takedown accuracy, reach, age and record.', 'La chance de gagner chaque combat vient du modèle du site. De votre combattant, il lit ce que le jeu fixe : précision de frappe et d’amenée au sol, allonge, âge et palmarès.', 'La probabilidad de ganar cada pelea sale del mismo modelo del sitio. De tu peleador, lee lo que define el juego: precisión de golpeo y de derribos, alcance, edad y récord.')}</li>
            <li>{L(lang, 'Em cada round você manda o córner atacar, manter o plano ou proteger. Isso não muda a chance que o modelo deu para a luta: muda como você gasta o risco. Na frente nos cartões, proteger vale a pena; atrás, só atacando.', 'Every round you tell the corner to attack, stick to the plan or cover up. That does not change the chance the model gave the fight: it changes how you spend the risk. Ahead on the cards, covering pays; behind, only attacking does.', 'À chaque round, vous dites au coin d’attaquer, de tenir le plan ou de se protéger. Cela ne change pas la probabilité donnée par le modèle : cela change la façon dont vous dépensez le risque. En tête aux cartons, se protéger paie ; derrière, seule l’attaque aide.', 'En cada round le dices al córner que ataque, mantenga el plan o se proteja. Eso no cambia la probabilidad que dio el modelo: cambia cómo gastas el riesgo. Arriba en las tarjetas conviene protegerse; abajo, solo atacar.')}</li>
            <li>{L(lang, 'No desafio, todos jogam o mesmo lutador com os mesmos técnicos, lesões e dados: quem faz as mesmas escolhas vive a mesma carreira. São 6 lutas, vale quem terminar com mais pontos de ranking, e o link do final desafia outra pessoa a bater o seu resultado.', 'In a challenge everyone plays the same fighter with the same coaches, injuries and dice: whoever makes the same choices lives the same career. It lasts 6 fights, whoever ends with more ranking points wins, and the link at the end challenges someone to beat your result.', 'Dans un défi, tout le monde joue le même combattant avec les mêmes entraîneurs, blessures et dés : qui fait les mêmes choix vit la même carrière. Il dure 6 combats, gagne celui qui finit avec le plus de points de classement, et le lien de la fin défie quelqu’un de battre votre résultat.', 'En un desafío todos juegan el mismo peleador con los mismos técnicos, lesiones y dados: quien hace las mismas elecciones vive la misma carrera. Dura 6 peleas, gana quien termine con más puntos de ranking, y el enlace del final desafía a otra persona a superar tu resultado.')}</li>
            <li>{L(lang, 'Cada carreira começa com 3 metas sorteadas: cumprir uma vale +2 pontos de ranking. As conquistas (como um nocaute no round 1, uma virada atacando ou uma carreira sem derrotas) ficam guardadas neste navegador e formam uma coleção.', 'Every career starts with 3 goals drawn at random: meeting one pays +2 ranking points. Achievements (such as a round-1 finish, a comeback by attacking or a career without a loss) are kept in this browser and make a collection.', 'Chaque carrière commence avec 3 objectifs tirés au sort : en atteindre un rapporte +2 points de classement. Les succès (comme une finition au round 1, une remontada en attaquant ou une carrière sans défaite) sont conservés dans ce navigateur et forment une collection.', 'Cada carrera empieza con 3 metas sorteadas: cumplir una vale +2 puntos de ranking. Los logros (como un cierre en el round 1, una remontada atacando o una carrera sin derrotas) se guardan en este navegador y forman una colección.')}</li>
            <li>{L(lang, 'Cada treino e a luta que vem depois passam cerca de 0,3 ano (umas 3 lutas por ano). Vitórias seguidas rendem pontos extras: +1 da terceira em diante, +2 da quinta, e a derrota zera a sequência. A disputa de cinturão abre com 20 pontos.', 'Each camp and the fight after it take about 0.3 of a year (around 3 fights a year). Wins in a row pay extra points: +1 from the third, +2 from the fifth, and a loss resets the run. The title shot opens at 20 points.', 'Chaque préparation et le combat qui suit prennent environ 0,3 an (environ 3 combats par an). Les victoires d’affilée rapportent des points en plus : +1 dès la troisième, +2 dès la cinquième, et une défaite remet la série à zéro. Le combat pour la ceinture s’ouvre à 20 points.', 'Cada campamento y la pelea que sigue duran cerca de 0,3 años (unas 3 peleas al año). Las victorias seguidas dan puntos extra: +1 desde la tercera, +2 desde la quinta, y una derrota reinicia la racha. La pelea por el cinturón se abre con 20 puntos.')}</li>
            <li>{L(lang, 'Depois de alguns treinos pode aparecer um card: um patrocinador que paga pontos se você cumprir o contrato na próxima luta, ou uma proposta ilegal para combinar uma derrota. Combinar resultado dá pontos, mas pode acabar a carreira com banimento. Os patrocinadores são marcas inventadas.', 'After some camps a card can turn up: a sponsor who pays points if you meet the contract in the next fight, or an illegal offer to fix a loss. Fixing a result pays points, but can end the career with a ban. The sponsors are made-up brands.', 'Après certaines préparations, une carte peut apparaître : un sponsor qui paie des points si vous remplissez le contrat au prochain combat, ou une offre illégale pour truquer une défaite. Truquer un résultat rapporte des points, mais peut mettre fin à la carrière par un bannissement. Les sponsors sont des marques inventées.', 'Después de algunos campamentos puede aparecer una carta: un patrocinador que paga puntos si cumples el contrato en la próxima pelea, o una oferta ilegal para arreglar una derrota. Arreglar un resultado da puntos, pero puede acabar la carrera con un veto. Los patrocinadores son marcas inventadas.')}</li>
            <li>{L(lang, 'Regras do jogo, e não do modelo: o desconto de 4 pontos contra ranqueados e 6 contra o campeão, o plano de luta (até 4 pontos), as lesões e o acaso.', 'Game rules, not the model’s: a 4-point discount against ranked fighters and 6 against the champion, the game plan (up to 4 points), injuries and luck.', 'Règles du jeu, pas du modèle : une décote de 4 points contre les classés et de 6 contre le champion, le plan de combat (jusqu’à 4 points), les blessures et le hasard.', 'Reglas del juego, no del modelo: un descuento de 4 puntos ante rivales del ranking y de 6 ante el campeón, el plan de pelea (hasta 4 puntos), las lesiones y el azar.')}</li>
            <li>{L(lang, 'A carreira fica salva neste navegador entre uma luta e outra, e só nele: nada vai para o servidor. Dá para fechar a página e retomar depois. No fim, ficam a imagem e o link.', 'The career is saved in this browser between fights, and only there: nothing goes to the server. You can close the page and pick it up later. At the end you get the picture and the link.', 'La carrière est enregistrée dans ce navigateur entre deux combats, et seulement là : rien n’est envoyé au serveur. Vous pouvez fermer la page et reprendre plus tard. À la fin, vous obtenez l’image et le lien.', 'La carrera se guarda en este navegador entre una pelea y otra, y solo ahí: nada va al servidor. Puedes cerrar la página y retomarla después. Al final quedan la imagen y el enlace.')}</li>
            <li>{L(lang, 'É uma simulação para brincar. Nada aqui é resultado real.', 'It is a simulation for fun. Nothing here is a real result.', 'C’est une simulation pour s’amuser. Rien ici n’est un résultat réel.', 'Es una simulación para divertirse. Nada de esto es un resultado real.')}</li>
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
