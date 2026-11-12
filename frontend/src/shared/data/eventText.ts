/**
 * A short written read of a card: a preview before it (what is at stake and where the model stands) and a recap after it
 * (how the fights ended and how the model's picks did). Every sentence is built from the card's own data, so the text is
 * the same in the app (Events, Results) and in the static HTML the build writes (src/seo/pages.ts). No React here.
 */

import { L } from '../../i18n/lang'
import { getDivisionName } from './divisions'
import { getMethodLabel } from './fightLabels'
import { formatProbability } from './probability'

export interface CardFight {
  a: string
  b: string
  winner?: string | null
  method?: string | null
  round?: number | null
  weightClass?: string | null
  title?: boolean | null
  /** The model's pick saved before the fight: who, and with what chance. */
  pick?: { winner: string; probability: number } | null
}

/** "3 lutas" / "1 luta": the count with the right form of the word. */
function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Lower case without accents, to find a fighter's surname inside the name of the card. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * The fight the card is named after ("UFC 334: Gane vs. Hokit"), whatever the order of the list; the first fight when the
 * name does not say (the announced cards come with the main event first).
 */
export function headliner<T extends CardFight>(eventName: string, fights: T[], firstIsMain: boolean): T | undefined {
  const name = fold(eventName)
  const surname = (fighter: string) => fold(fighter).split(' ').pop() ?? ''
  const named = fights.find((fight) => name.includes(surname(fight.a)) && name.includes(surname(fight.b)) && name.includes(' vs'))
  return named ?? (firstIsMain ? fights[0] : undefined)
}

const METHOD_ALIASES: Record<string, string> = { SUB: 'Submission', DEC: 'Decision', CNC: 'Overturned', 'NO CONTEST': 'Overturned' }
const isDecision = (method: string | null | undefined) => !!method && (method === 'DEC' || method.endsWith('-DEC'))
const isKnockout = (method: string | null | undefined) => method === 'KO/TKO'
const isSubmission = (method: string | null | undefined) => method === 'SUB' || method === 'Submission'

function loserOf(fight: CardFight): string {
  return fight.winner === fight.a ? fight.b : fight.a
}

/** The sentences of the preview of an announced card. Empty when the card has no fight yet. */
export function eventPreview(language: string, eventName: string, fights: CardFight[]): string[] {
  const lang = language
  if (!fights.length) return []
  const sentences: string[] = []
  const titles = fights.filter((fight) => fight.title).length
  const total = L(lang, counted(fights.length, 'luta anunciada', 'lutas anunciadas'), counted(fights.length, 'fight announced', 'fights announced'), counted(fights.length, 'combat annoncé', 'combats annoncés'), counted(fights.length, 'pelea anunciada', 'peleas anunciadas'))
  const belts = titles
    ? L(lang, `, ${counted(titles, 'valendo cinturão', 'valendo cinturão')}`, `, ${counted(titles, 'for a title', 'for a title')}`, `, dont ${counted(titles, 'pour un titre', 'pour un titre')}`, `, ${counted(titles, 'por un título', 'por un título')}`)
    : ''
  sentences.push(`${total}${belts}.`)

  const main = headliner(eventName, fights, true)
  if (main) {
    const weight = main.weightClass ? ` (${getDivisionName(main.weightClass, lang)})` : ''
    const pair = `${main.a} vs. ${main.b}${weight}`
    const pick = main.pick
    sentences.push(
      pick
        ? L(
            lang,
            `A luta principal é ${pair}; o modelo dá ${formatProbability(pick.probability)} de chance a ${pick.winner}.`,
            `The main event is ${pair}; the model gives ${pick.winner} a ${formatProbability(pick.probability)} chance.`,
            `Le combat principal est ${pair} ; le modèle donne ${formatProbability(pick.probability)} de chances à ${pick.winner}.`,
            `La pelea estelar es ${pair}; el modelo le da ${formatProbability(pick.probability)} de probabilidad a ${pick.winner}.`,
          )
        : L(lang, `A luta principal é ${pair}.`, `The main event is ${pair}.`, `Le combat principal est ${pair}.`, `La pelea estelar es ${pair}.`),
    )
  }

  const picked = fights.filter((fight): fight is CardFight & { pick: NonNullable<CardFight['pick']> } => !!fight.pick)
  const rest = picked.filter((fight) => fight !== main)
  if (rest.length) {
    const firmest = rest.reduce((best, fight) => (fight.pick.probability > best.pick.probability ? fight : best))
    const other = firmest.pick.winner === firmest.a ? firmest.b : firmest.a
    const odds = formatProbability(firmest.pick.probability)
    sentences.push(
      L(
        lang,
        `O palpite mais firme do card é ${firmest.pick.winner} contra ${other}, com ${odds}.`,
        `The model’s firmest pick on the card is ${firmest.pick.winner} over ${other}, at ${odds}.`,
        `Le pronostic le plus net de la carte est ${firmest.pick.winner} contre ${other}, à ${odds}.`,
        `El pronóstico más firme de la cartelera es ${firmest.pick.winner} ante ${other}, con ${odds}.`,
      ),
    )
  }
  if (rest.length > 1) {
    const closest = rest.reduce((best, fight) => (fight.pick.probability < best.pick.probability ? fight : best))
    const odds = formatProbability(closest.pick.probability)
    sentences.push(
      L(
        lang,
        `A luta mais equilibrada para o modelo é ${closest.a} vs. ${closest.b}: ${odds} para ${closest.pick.winner}.`,
        `The closest fight for the model is ${closest.a} vs. ${closest.b}: ${odds} for ${closest.pick.winner}.`,
        `Le combat le plus serré pour le modèle est ${closest.a} vs ${closest.b} : ${odds} pour ${closest.pick.winner}.`,
        `La pelea más pareja para el modelo es ${closest.a} vs. ${closest.b}: ${odds} para ${closest.pick.winner}.`,
      ),
    )
  }
  return sentences
}

/** The sentences of the recap of a card that already happened. Empty when no fight has a winner yet. */
export function eventRecap(language: string, eventName: string, fights: CardFight[]): string[] {
  const lang = language
  const decided = fights.filter((fight) => fight.winner === fight.a || fight.winner === fight.b)
  if (!decided.length) return []
  const sentences: string[] = []
  const knockouts = decided.filter((fight) => isKnockout(fight.method)).length
  const submissions = decided.filter((fight) => isSubmission(fight.method)).length
  const decisions = decided.filter((fight) => isDecision(fight.method)).length
  sentences.push(
    L(
      lang,
      `${counted(decided.length, 'luta teve vencedor', 'lutas tiveram vencedor')}: ${knockouts} por nocaute, ${submissions} por finalização e ${decisions} por decisão.`,
      `${counted(decided.length, 'fight had a winner', 'fights had a winner')}: ${knockouts} by knockout, ${submissions} by submission and ${decisions} by decision.`,
      `${counted(decided.length, 'combat a eu un vainqueur', 'combats ont eu un vainqueur')} : ${knockouts} par KO, ${submissions} par soumission et ${decisions} sur décision.`,
      `${counted(decided.length, 'pelea tuvo ganador', 'peleas tuvieron ganador')}: ${knockouts} por nocaut, ${submissions} por sumisión y ${decisions} por decisión.`,
    ),
  )

  const main = headliner(eventName, decided, false)
  if (main && main.winner) {
    const method = main.method ? getMethodLabel(METHOD_ALIASES[main.method] ?? main.method, lang) : null
    const how = method ? ` (${method}${!isDecision(main.method) && main.round ? `, round ${main.round}` : ''})` : ''
    const loser = loserOf(main)
    sentences.push(
      L(
        lang,
        `Na luta principal, ${main.winner} venceu ${loser}${how}.`,
        `In the main event, ${main.winner} beat ${loser}${how}.`,
        `Dans le combat principal, ${main.winner} a battu ${loser}${how}.`,
        `En la pelea estelar, ${main.winner} venció a ${loser}${how}.`,
      ),
    )
  }

  const picked = decided.filter((fight): fight is CardFight & { winner: string; pick: NonNullable<CardFight['pick']> } => !!fight.pick)
  if (picked.length) {
    const right = picked.filter((fight) => fight.pick.winner === fight.winner)
    const wrong = picked.filter((fight) => fight.pick.winner !== fight.winner)
    sentences.push(
      L(
        lang,
        `O modelo acertou ${right.length} de ${counted(picked.length, 'palpite', 'palpites')} neste card.`,
        `The model got ${right.length} of ${counted(picked.length, 'pick', 'picks')} right on this card.`,
        `Le modèle a vu juste sur ${right.length} de ses ${counted(picked.length, 'pronostic', 'pronostics')} pour cette carte.`,
        `El modelo acertó ${right.length} de ${counted(picked.length, 'pronóstico', 'pronósticos')} en esta cartelera.`,
      ),
    )
    if (wrong.length) {
      const upset = wrong.reduce((worst, fight) => (fight.pick.probability > worst.pick.probability ? fight : worst))
      const odds = formatProbability(upset.pick.probability)
      sentences.push(
        L(
          lang,
          `A maior surpresa para o modelo foi ${upset.winner} vencer ${upset.pick.winner}, que tinha ${odds} de chance.`,
          `The model’s biggest miss was ${upset.winner} beating ${upset.pick.winner}, who had a ${odds} chance.`,
          `La plus grosse surprise pour le modèle : ${upset.winner} a battu ${upset.pick.winner}, qui avait ${odds} de chances.`,
          `La mayor sorpresa para el modelo fue que ${upset.winner} venciera a ${upset.pick.winner}, que tenía ${odds} de probabilidad.`,
        ),
      )
    }
    if (right.length) {
      const sure = right.reduce((best, fight) => (fight.pick.probability > best.pick.probability ? fight : best))
      const odds = formatProbability(sure.pick.probability)
      sentences.push(
        L(
          lang,
          `O palpite mais firme que se confirmou foi ${sure.winner} sobre ${loserOf(sure)}, com ${odds}.`,
          `Its firmest pick that held up was ${sure.winner} over ${loserOf(sure)}, at ${odds}.`,
          `Son pronostic le plus net qui s’est confirmé : ${sure.winner} contre ${loserOf(sure)}, à ${odds}.`,
          `Su pronóstico más firme que se cumplió fue ${sure.winner} sobre ${loserOf(sure)}, con ${odds}.`,
        ),
      )
    }
  }
  return sentences
}
