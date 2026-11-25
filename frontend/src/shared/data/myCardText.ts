import { L, localeTag } from '../../i18n/lang'
import { chanceOfLuck, sameName, score, type MyPick, type Score } from './myCard'

/** What the page promises, also written into its static copy. */
export function myCardRules(lang: string): string[] {
  return [
    L(
      lang,
      'Escolha quem vence cada luta de um card anunciado. O palpite do modelo só aparece depois do seu, para não influenciar a escolha.',
      'Pick who wins each fight of an announced card. The model’s pick shows only after yours, so it does not steer your choice.',
      'Choisissez qui gagne chaque combat d’une carte annoncée. Le pronostic du modèle n’apparaît qu’après le vôtre, pour ne pas vous influencer.',
      'Elige quién gana cada pelea de una cartelera anunciada. El pronóstico del modelo solo aparece después del tuyo, para no influir en tu elección.',
    ),
    L(
      lang,
      'Você pode mudar de ideia até o fim do dia do card. Depois disso os palpites ficam como estão.',
      'You can change your mind until the end of the day of the card. After that your picks stay as they are.',
      'Vous pouvez changer d’avis jusqu’à la fin du jour de la carte. Ensuite, vos pronostics restent tels quels.',
      'Puedes cambiar de opinión hasta el final del día de la cartelera. Después, tus pronósticos quedan como están.',
    ),
    L(
      lang,
      'Quando sai o resultado oficial, a página confere os seus palpites e os do modelo, luta por luta. O do modelo é o que ele salvou antes do card.',
      'When the official results are in, the page checks your picks and the model’s, fight by fight. The model’s is the one it saved before the card.',
      'Une fois les résultats officiels connus, la page vérifie vos pronostics et ceux du modèle, combat par combat. Celui du modèle est celui qu’il a enregistré avant la carte.',
      'Cuando salen los resultados oficiales, la página revisa tus pronósticos y los del modelo, pelea por pelea. El del modelo es el que guardó antes de la cartelera.',
    ),
    L(
      lang,
      'Lutas canceladas, empates e lutas sem resultado não contam para ninguém.',
      'Cancelled fights, draws and no contests count for neither side.',
      'Les combats annulés, les nuls et les no contests ne comptent pour personne.',
      'Las peleas canceladas, los empates y las peleas sin resultado no cuentan para nadie.',
    ),
    L(
      lang,
      'Seus palpites ficam só neste navegador: não há conta nem ranking público, e limpar os dados do site apaga tudo.',
      'Your picks stay in this browser only: there is no account and no public leaderboard, and clearing the site’s data erases everything.',
      'Vos pronostics restent dans ce navigateur : il n’y a ni compte ni classement public, et effacer les données du site supprime tout.',
      'Tus pronósticos se quedan solo en este navegador: no hay cuenta ni ranking público, y borrar los datos del sitio elimina todo.',
    ),
  ]
}

export const outOf = (lang: string, right: number, total: number) => L(lang, `${right} de ${total}`, `${right} of ${total}`, `${right} sur ${total}`, `${right} de ${total}`)

/** What the score so far says, and what it does not: only the fights where the two chose different fighters tell them apart. */
export function scoreReading(total: Score, lang: string): string {
  const { differed, youOnly, modelOnly } = total
  if (differed === 0) {
    return L(
      lang,
      'Você e o modelo escolheram os mesmos vencedores em todas as lutas conferidas até aqui, então não há diferença para comparar.',
      'You and the model chose the same winners in every fight checked so far, so there is no difference to compare.',
      'Vous et le modèle avez choisi les mêmes vainqueurs dans tous les combats vérifiés jusqu’ici : il n’y a donc aucune différence à comparer.',
      'Tú y el modelo eligieron a los mismos ganadores en todas las peleas revisadas hasta ahora, así que no hay diferencia que comparar.',
    )
  }
  if (differed === 1) {
    return youOnly
      ? L(
          lang,
          'Você e o modelo discordaram em uma luta, e quem acertou foi você. É pouco para dizer quem acerta mais.',
          'You and the model disagreed on one fight, and you got it right. That is too little to say who is better.',
          'Vous et le modèle n’étiez pas d’accord sur un combat, et c’est vous qui aviez raison. C’est trop peu pour dire qui est le meilleur.',
          'Tú y el modelo no coincidieron en una pelea, y quien acertó fuiste tú. Es poco para decir quién acierta más.',
        )
      : L(
          lang,
          'Você e o modelo discordaram em uma luta, e quem acertou foi o modelo. É pouco para dizer quem acerta mais.',
          'You and the model disagreed on one fight, and the model got it right. That is too little to say who is better.',
          'Vous et le modèle n’étiez pas d’accord sur un combat, et c’est le modèle qui avait raison. C’est trop peu pour dire qui est le meilleur.',
          'Tú y el modelo no coincidieron en una pelea, y quien acertó fue el modelo. Es poco para decir quién acierta más.',
        )
  }
  const split = L(
    lang,
    `Você e o modelo discordaram em ${differed} lutas: você acertou ${youOnly} e o modelo, ${modelOnly}.`,
    `You and the model disagreed on ${differed} fights: you got ${youOnly} right and the model ${modelOnly}.`,
    `Vous et le modèle n’étiez pas d’accord sur ${differed} combats : ${youOnly} de justes pour vous, ${modelOnly} pour le modèle.`,
    `Tú y el modelo no coincidieron en ${differed} peleas: tú acertaste ${youOnly} y el modelo, ${modelOnly}.`,
  )
  if (youOnly === modelOnly) return `${split} ${L(lang, 'Por enquanto, empate.', 'A tie so far.', 'Égalité pour l’instant.', 'Por ahora, empate.')}`
  const reading =
    chanceOfLuck(youOnly, modelOnly) < 0.05
      ? L(lang, 'Uma diferença desse tamanho dificilmente é só sorte.', 'A gap that wide is unlikely to be luck alone.', 'Un tel écart tient difficilement au seul hasard.', 'Una diferencia de ese tamaño difícilmente es solo suerte.')
      : L(
          lang,
          'Ainda é pouco para dizer quem acerta mais: pode ser só sorte.',
          'That is still too few to say who is better: it may be luck alone.',
          'C’est encore trop peu pour dire qui est le meilleur : ce peut être un simple hasard.',
          'Todavía es poco para decir quién acierta más: puede ser solo suerte.',
        )
  return `${split} ${reading}`
}

export function cardDay(date: string, lang: string, month: 'long' | 'short' = 'long'): string {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(localeTag(lang), { day: 'numeric', month, year: 'numeric' })
}

/** The message shared for a card that has not happened yet: who the visitor picked, and where the model sees it differently. */
export function picksMessage(event: string, picks: MyPick[], lang: string): string {
  const lines = picks.map((pick) => {
    const other = pick.model && !sameName(pick.model.winner, pick.winner) ? pick.model.winner : null
    const fight = `${pick.a} vs. ${pick.b}${L(lang, ': ', ': ', ' : ', ': ')}${pick.winner}`
    return other ? `${fight} ${L(lang, `(o modelo: ${other})`, `(the model: ${other})`, `(le modèle : ${other})`, `(el modelo: ${other})`)}` : fight
  })
  return [L(lang, `Meus palpites para ${event}`, `My picks for ${event}`, `Mes pronostics pour ${event}`, `Mis pronósticos para ${event}`), ...lines].join('\n')
}

/** The message shared for a card already checked. */
export function resultMessage(event: string, picks: MyPick[], lang: string): string {
  const total = score(picks)
  const mine = outOf(lang, total.you + total.aloneRight, total.fights + total.alone)
  if (!total.fights) return L(lang, `${event}: acertei ${mine}.`, `${event}: I got ${mine} right.`, `${event} : j’en ai eu ${mine} de justes.`, `${event}: acerté ${mine}.`)
  const model = outOf(lang, total.model, total.fights)
  return L(
    lang,
    `${event}: acertei ${mine}; o modelo, ${model}.`,
    `${event}: I got ${mine} right; the model, ${model}.`,
    `${event} : j’en ai eu ${mine} de justes ; le modèle, ${model}.`,
    `${event}: acerté ${mine}; el modelo, ${model}.`,
  )
}
