import { L, pick, type ByLang } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import { type Retrospect, type Standing } from './career'
import type { CardLabels } from './shareImage'

export const STANDING_LABELS: Record<Standing, ByLang> = {
  prospect: { pt: 'Promessa', en: 'Prospect', fr: 'Espoir', es: 'Promesa' },
  rising: { pt: 'Em ascensão', en: 'Rising', fr: 'En progression', es: 'En ascenso' },
  top15: { pt: 'Top 15', en: 'Top 15', fr: 'Top 15', es: 'Top 15' },
  top5: { pt: 'Top 5', en: 'Top 5', fr: 'Top 5', es: 'Top 5' },
  contender: { pt: 'Desafiante ao cinturão', en: 'Title contender', fr: 'Aspirant à la ceinture', es: 'Aspirante al cinturón' },
  champion: { pt: 'Campeão', en: 'Champion', fr: 'Champion', es: 'Campeón' },
}

/** How a career ended, as one sentence ("Retired at 34 after 17 UFC fights."). */
export function endingText(language: string, card: Pick<Retrospect, 'e' | 'a' | 'f'>): string {
  if (card.e === 'released') {
    return L(
      language,
      `Dispensado do UFC aos ${card.a} anos, depois de três derrotas seguidas.`,
      `Released by the UFC at ${card.a} after three straight losses.`,
      `Libéré par l’UFC à ${card.a} ans après trois défaites de suite.`,
      `Liberado por la UFC a los ${card.a} años, tras tres derrotas seguidas.`,
    )
  }
  if (card.e === 'age') {
    return L(
      language,
      `Encerrou a carreira aos ${card.a} anos, no limite da idade, com ${card.f} lutas no UFC.`,
      `Ended the career at ${card.a}, out of years, after ${card.f} UFC fights.`,
      `A mis fin à sa carrière à ${card.a} ans, au bout de l’âge, après ${card.f} combats à l’UFC.`,
      `Cerró su carrera a los ${card.a} años, sin más tiempo, tras ${card.f} peleas en la UFC.`,
    )
  }
  return L(
    language,
    `Aposentou-se aos ${card.a} anos, depois de ${card.f} lutas no UFC.`,
    `Retired at ${card.a} after ${card.f} UFC fights.`,
    `A pris sa retraite à ${card.a} ans, après ${card.f} combats à l’UFC.`,
    `Se retiró a los ${card.a} años, tras ${card.f} peleas en la UFC.`,
  )
}

export function recordOf(card: Pick<Retrospect, 'w' | 'l' | 'dr'>) {
  return card.dr ? `${card.w}-${card.l}-${card.dr}` : `${card.w}-${card.l}`
}

/** The texts drawn on the picture, in the visitor's language. */
export function cardLabels(language: string, card: Retrospect, site = 'vektormma.com/career'): CardLabels & { name: string } {
  const details: CardLabels['details'] = []
  if (card.c > 0) {
    details.push({
      label: L(language, 'Cinturão', 'Title', 'Ceinture', 'Cinturón'),
      value: L(
        language,
        `${card.c}x campeão, ${card.df} ${card.df === 1 ? 'defesa' : 'defesas'}`,
        `${card.c}x champion, ${card.df} ${card.df === 1 ? 'defense' : 'defenses'}`,
        `${card.c}x champion, ${card.df} ${card.df > 1 ? 'défenses' : 'défense'}`,
        `${card.c}x campeón, ${card.df} ${card.df === 1 ? 'defensa' : 'defensas'}`,
      ),
    })
  }
  if (card.b) details.push({ label: L(language, 'Melhor vitória', 'Best win', 'Meilleure victoire', 'Mejor victoria'), value: card.b })
  if (card.x) details.push({ label: L(language, 'Carreira parecida com a de', 'A career like', 'Une carrière proche de celle de', 'Una carrera parecida a la de'), value: card.x })
  return {
    name: card.n,
    brand: 'VEKTOR MMA',
    heading: L(language, 'Retrospecto da carreira', 'Career retrospect', 'Bilan de carrière', 'Balance de carrera'),
    division: getDivisionName(card.d, language),
    standing: pick(language, STANDING_LABELS[card.s]),
    recordLabel: L(language, 'Cartel', 'Record', 'Bilan', 'Récord'),
    record: recordOf(card),
    stats: [
      { value: String(card.ko), label: 'KO/TKO' },
      { value: String(card.sb), label: L(language, 'Finalizações', 'Submissions', 'Soumissions', 'Sumisiones') },
      { value: String(card.dc), label: L(language, 'Decisões', 'Decisions', 'Décisions', 'Decisiones') },
    ],
    details,
    ending: endingText(language, card),
    note: L(language, 'Simulação do Vektor MMA. Não é um resultado real.', 'A Vektor MMA simulation. Not a real result.', 'Une simulation de Vektor MMA. Pas un résultat réel.', 'Una simulación de Vektor MMA. No es un resultado real.'),
    footer: site,
  }
}

/** The wording of a fight's odds, by the chance of winning (the number itself stays hidden). */
export function chanceBand(chance: number): 'favorite' | 'even' | 'underdog' | 'longshot' {
  if (chance >= 0.6) return 'favorite'
  if (chance >= 0.45) return 'even'
  if (chance >= 0.3) return 'underdog'
  return 'longshot'
}

export const BAND_LABELS: Record<ReturnType<typeof chanceBand>, ByLang> = {
  favorite: { pt: 'Você é o favorito', en: 'You are the favorite', fr: 'Vous êtes favori', es: 'Eres el favorito' },
  even: { pt: 'Luta parelha', en: 'A toss-up', fr: 'Combat équilibré', es: 'Pelea pareja' },
  underdog: { pt: 'Você é o azarão', en: 'You are the underdog', fr: 'Vous êtes l’outsider', es: 'Eres el desfavorito' },
  longshot: { pt: 'Grande azarão', en: 'A long shot', fr: 'Très gros outsider', es: 'Gran desfavorito' },
}
