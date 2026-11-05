import { pick, type ByLang } from '../../i18n/lang'
import type { CancelledReason } from '../types/api'
import type { PickMethod } from '../hooks/useCancelledPicks'

/**
 * The words around the cancelled fights. The API sends the facts (who, which card, why in a code); what happened is told here,
 * in the four languages, because a sentence like this cannot be assembled from parts.
 */

export const REASON_LABELS: Record<CancelledReason, ByLang> = {
  injury: { pt: 'Lesão', en: 'Injury', fr: 'Blessure', es: 'Lesión' },
  missed_weight: { pt: 'Peso não batido', en: 'Missed weight', fr: 'Poids manqué', es: 'No dio el peso' },
  travel_restrictions: { pt: 'Restrições de viagem', en: 'Travel restrictions', fr: 'Restrictions de voyage', es: 'Restricciones de viaje' },
  event_cancelled: { pt: 'Evento cancelado', en: 'Event cancelled', fr: 'Événement annulé', es: 'Evento cancelado' },
  other: { pt: 'Outro motivo', en: 'Other reason', fr: 'Autre raison', es: 'Otro motivo' },
}

export const METHOD_LABELS: Record<PickMethod, ByLang> = {
  ko: { pt: 'KO/TKO', en: 'KO/TKO', fr: 'KO/TKO', es: 'KO/TKO' },
  sub: { pt: 'Finalização', en: 'Submission', fr: 'Soumission', es: 'Sumisión' },
  dec: { pt: 'Decisão', en: 'Decision', fr: 'Décision', es: 'Decisión' },
}

/** What happened to each fight, from the sources linked on its card. */
export const STORIES: Record<string, ByLang> = {
  'makhachev-vs-tsarukyan-2': {
    pt: 'A revanche do cinturão dos leves caiu no dia da pesagem do UFC 311: Tsarukyan saiu alegando uma lesão nas costas durante o corte de peso. Renato Moicano entrou no lugar e foi finalizado por Makhachev.',
    en: 'The lightweight title rematch fell apart on weigh-in day at UFC 311: Tsarukyan pulled out with a back injury suffered during his weight cut. Renato Moicano stepped in and was submitted by Makhachev.',
    fr: 'La revanche pour la ceinture des poids légers a capoté le jour de la pesée de l’UFC 311 : Tsarukyan a déclaré forfait, blessé au dos pendant sa descente de poids. Renato Moicano l’a remplacé et a été soumis par Makhachev.',
    es: 'La revancha por el cinturón de los ligeros se cayó el día del pesaje del UFC 311: Tsarukyan se retiró por una lesión de espalda durante el corte de peso. Renato Moicano entró en su lugar y Makhachev lo sometió.',
  },
  'mcgregor-vs-chandler': {
    pt: 'O combate principal do UFC 303 foi cancelado quando McGregor se lesionou, e o confronto segue sem acontecer. Chandler continua dizendo que quer enfrentá-lo.',
    en: 'The UFC 303 main event was scrapped when McGregor got hurt, and the matchup still has not happened. Chandler keeps saying he wants it.',
    fr: 'Le combat principal de l’UFC 303 a été annulé quand McGregor s’est blessé, et ce choc n’a toujours pas eu lieu. Chandler répète qu’il le veut.',
    es: 'La pelea estelar del UFC 303 se canceló cuando McGregor se lesionó, y el cruce sigue sin darse. Chandler sigue diciendo que lo quiere.',
  },
  'chimaev-vs-diaz': {
    pt: 'No UFC 279, Chimaev errou o peso por 3,4 kg na pesagem e o combate principal caiu. Diaz enfrentou Tony Ferguson e finalizou; Chimaev lutou com Kevin Holland em peso casado e também venceu. É o único combate principal cancelado em que os dois lutadores subiram ao octógono na mesma noite.',
    en: 'At UFC 279 Chimaev missed weight by 7.5 pounds and the main event was scrapped. Diaz fought Tony Ferguson and choked him out; Chimaev fought Kevin Holland at a catchweight and won too. It is the only cancelled headliner where both men still fought on the same card.',
    fr: 'À l’UFC 279, Chimaev a raté le poids de 3,4 kg et le combat principal a sauté. Diaz a affronté Tony Ferguson et l’a étranglé ; Chimaev a combattu Kevin Holland en poids convenu et l’a emporté aussi. C’est le seul combat principal annulé où les deux hommes ont quand même combattu lors de la même soirée.',
    es: 'En el UFC 279 Chimaev falló el peso por 3,4 kg y la pelea estelar se cayó. Diaz peleó con Tony Ferguson y lo estranguló; Chimaev peleó con Kevin Holland en peso pactado y también ganó. Es la única estelar cancelada en la que los dos pelearon igualmente esa noche.',
  },
  'khabib-vs-ferguson': {
    pt: 'A luta foi marcada cinco vezes e caiu cinco vezes: 2015 (lesão de Khabib), 2016 (problema no pulmão de Ferguson), UFC 209 (Khabib hospitalizado após o corte de peso), UFC 223 (Ferguson rompeu um ligamento do joelho) e UFC 249, em 2020, quando Khabib não conseguiu sair da Rússia por causa da pandemia. Khabib se aposentou sem nunca enfrentá-lo.',
    en: 'It was booked five times and fell through five times: 2015 (Khabib hurt), 2016 (Ferguson’s lung problem), UFC 209 (Khabib hospitalized after his weight cut), UFC 223 (Ferguson tore a knee ligament) and UFC 249 in 2020, when Khabib could not leave Russia because of pandemic travel limits. Khabib retired without ever facing him.',
    fr: 'Le combat a été programmé cinq fois et annulé cinq fois : 2015 (blessure de Khabib), 2016 (problème pulmonaire de Ferguson), UFC 209 (Khabib hospitalisé après sa descente de poids), UFC 223 (Ferguson s’est déchiré un ligament du genou) et UFC 249 en 2020, quand Khabib n’a pas pu quitter la Russie à cause des restrictions liées à la pandémie. Khabib a pris sa retraite sans jamais l’affronter.',
    es: 'La pelea se programó cinco veces y se cayó las cinco: 2015 (lesión de Khabib), 2016 (problema pulmonar de Ferguson), UFC 209 (Khabib hospitalizado tras el corte de peso), UFC 223 (Ferguson se rompió un ligamento de la rodilla) y UFC 249 en 2020, cuando Khabib no pudo salir de Rusia por las restricciones de la pandemia. Khabib se retiró sin enfrentarlo nunca.',
  },
  'mcgregor-vs-dos-anjos': {
    pt: 'Menos de duas semanas antes do UFC 196, Dos Anjos fraturou o pé e deixou a defesa do cinturão dos leves. McGregor lutou contra Nate Diaz, em outra categoria, e foi finalizado. A luta nunca foi remarcada.',
    en: 'Less than two weeks before UFC 196, Dos Anjos broke his foot and dropped out of his lightweight title defense. McGregor fought Nate Diaz instead, up a division, and was submitted. The fight was never rebooked.',
    fr: 'Moins de deux semaines avant l’UFC 196, Dos Anjos s’est fracturé le pied et a renoncé à sa défense de ceinture des poids légers. McGregor a affronté Nate Diaz à la place, une catégorie au-dessus, et a été soumis. Le combat n’a jamais été reprogrammé.',
    es: 'Menos de dos semanas antes del UFC 196, Dos Anjos se fracturó el pie y dejó su defensa del cinturón de los ligeros. McGregor peleó con Nate Diaz, una división más arriba, y fue sometido. La pelea nunca se reprogramó.',
  },
  'aldo-vs-pettis': {
    pt: 'Pettis machucou o joelho e saiu do UFC 163. Em vez de enfrentar Aldo, ele voltou aos leves e conquistou o cinturão contra Benson Henderson no UFC 164. Os dois nunca chegaram a se enfrentar.',
    en: 'Pettis hurt his knee and pulled out of UFC 163. Instead of facing Aldo he went back up to lightweight and won the title from Benson Henderson at UFC 164. The two never met.',
    fr: 'Pettis s’est blessé au genou et a déclaré forfait pour l’UFC 163. Au lieu d’affronter Aldo, il est remonté chez les poids légers et a pris la ceinture à Benson Henderson à l’UFC 164. Les deux hommes ne se sont jamais rencontrés.',
    es: 'Pettis se lesionó la rodilla y se retiró del UFC 163. En lugar de enfrentar a Aldo, volvió a los ligeros y ganó el cinturón ante Benson Henderson en el UFC 164. Los dos nunca se enfrentaron.',
  },
  'jones-vs-henderson': {
    pt: 'Henderson rompeu um ligamento do joelho nove dias antes. Jones recusou lutar contra Chael Sonnen com poucos dias de aviso e o UFC cancelou o evento inteiro, a primeira vez que isso aconteceu na história da organização.',
    en: 'Henderson tore a knee ligament nine days out. Jones turned down Chael Sonnen on short notice and the UFC cancelled the whole event, the first time that had happened in the company’s history.',
    fr: 'Henderson s’est déchiré un ligament du genou neuf jours avant. Jones a refusé d’affronter Chael Sonnen au pied levé et l’UFC a annulé tout l’événement, une première dans l’histoire de la compagnie.',
    es: 'Henderson se rompió un ligamento de la rodilla nueve días antes. Jones rechazó pelear con Chael Sonnen con tan poco aviso y la UFC canceló todo el evento, algo que nunca había pasado en su historia.',
  },
}

/** A sentence for a fight that has no story of its own yet: built from the fact the API sends. */
export function fallbackStory(language: string, reason: CancelledReason, withdrew: string | null): string {
  const why = pick(language, REASON_LABELS[reason]).toLowerCase()
  const who = withdrew ?? ''
  return pick(language, {
    pt: who ? `A luta caiu: ${who} saiu (${why}) e ela nunca foi remarcada.` : `A luta caiu (${why}) e nunca foi remarcada.`,
    en: who ? `The fight fell through: ${who} withdrew (${why}) and it was never rebooked.` : `The fight fell through (${why}) and was never rebooked.`,
    fr: who ? `Le combat a été annulé : ${who} a déclaré forfait (${why}) et il n’a jamais été reprogrammé.` : `Le combat a été annulé (${why}) et n’a jamais été reprogrammé.`,
    es: who ? `La pelea se cayó: ${who} se retiró (${why}) y nunca se reprogramó.` : `La pelea se cayó (${why}) y nunca se reprogramó.`,
  })
}

export function storyFor(language: string, fightId: string, reason: CancelledReason, withdrew: string | null): string {
  const story = STORIES[fightId]
  return story ? pick(language, story) : fallbackStory(language, reason, withdrew)
}
