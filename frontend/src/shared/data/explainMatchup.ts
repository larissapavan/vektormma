/**
 * The model's factors said in words, with the numbers it read for each fighter. No React here.
 *
 * Every sentence only states what the model was given and whom the factor helped. It never invents a cause: when a number on
 * its own points to the other fighter (the model reads it together with the rest), the sentence says so.
 */

import { L, formatDecimal, formatShare, localeTag } from '../../i18n/lang'
import { localizeFeature } from '../utils/localizeFeature'
import type { MainFactor, PredictionResponse, RecentEvaluation, UfcResults } from '../types/api'

type Pair = { favoured: string; other: string }
type Sentence = (lang: string, names: Pair, favoured: string, other: string) => string

type Metric = {
  /** How a value is written. Two values that would read the same get one more decimal. */
  format: (value: number, lang: string, extra: number) => string
  /** Which value helps a fighter when nothing else is known; null when neither does. */
  better: 'high' | 'low' | null
  say: Sentence
}

const plain = (digits: number) => (value: number, lang: string, extra: number) => formatDecimal(value, digits + extra, lang)
const share = (value: number, lang: string, extra: number) => formatShare(value, lang, extra)

/** "45 days", "8 months", "2.5 years". */
function duration(days: number, lang: string, extra: number): string {
  if (days < 60 || extra) {
    const n = Math.round(days)
    const text = n.toLocaleString(localeTag(lang))
    return n === 1 ? L(lang, '1 dia', '1 day', '1 jour', '1 día') : L(lang, `${text} dias`, `${text} days`, `${text} jours`, `${text} días`)
  }
  if (days < 730) {
    const n = Math.round(days / 30.44)
    return L(lang, `${n} meses`, `${n} months`, `${n} mois`, `${n} meses`)
  }
  const years = formatDecimal(days / 365.25, 1, lang)
  return L(lang, `${years} anos`, `${years} years`, `${years} ans`, `${years} años`)
}

const METRICS: Record<string, Metric> = {
  age_diff: {
    format: plain(0),
    better: 'low',
    say: (lang, n, f, o) => L(lang, `${n.favoured} tem ${f} anos; ${n.other}, ${o}.`, `${n.favoured} is ${f}; ${n.other} is ${o}.`, `${n.favoured} a ${f} ans ; ${n.other}, ${o}.`, `${n.favoured} tiene ${f} años; ${n.other}, ${o}.`),
  },
  height_diff: {
    format: plain(0),
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} mede ${f} cm; ${n.other}, ${o} cm.`, `${n.favoured} is ${f} cm tall; ${n.other}, ${o} cm.`, `${n.favoured} mesure ${f} cm ; ${n.other}, ${o} cm.`, `${n.favoured} mide ${f} cm; ${n.other}, ${o} cm.`),
  },
  reach_diff: {
    format: plain(0),
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} tem ${f} cm de envergadura; ${n.other}, ${o} cm.`, `${n.favoured} has a reach of ${f} cm; ${n.other}, ${o} cm.`, `${n.favoured} a une allonge de ${f} cm ; ${n.other}, ${o} cm.`, `${n.favoured} tiene ${f} cm de alcance; ${n.other}, ${o} cm.`),
  },
  days_off_diff: {
    format: duration,
    better: 'low',
    say: (lang, n, f, o) => L(lang, `${n.favoured} está há ${f} sem lutar; ${n.other}, há ${o}.`, `${n.favoured} last fought ${f} ago; ${n.other}, ${o} ago.`, `${n.favoured} n’a pas combattu depuis ${f} ; ${n.other}, depuis ${o}.`, `${n.favoured} lleva ${f} sin pelear; ${n.other}, ${o}.`),
  },
  finish_rate_diff: {
    format: share,
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} venceu antes do limite em ${f} das vitórias no UFC; ${n.other}, em ${o}.`, `${n.favoured} finished ${f} of their UFC wins inside the distance; ${n.other}, ${o}.`, `${n.favoured} a gagné avant la limite dans ${f} de ses victoires à l’UFC ; ${n.other}, dans ${o}.`, `${n.favoured} ganó antes del límite el ${f} de sus victorias en la UFC; ${n.other}, el ${o}.`),
  },
  ko_losses_diff: {
    format: plain(0),
    better: 'low',
    say: (lang, n, f, o) => L(lang, `Derrotas por nocaute no UFC: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Knockout losses in the UFC: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Défaites par KO à l’UFC : ${n.favoured}, ${f} ; ${n.other}, ${o}.`, `Derrotas por nocaut en la UFC: ${n.favoured}, ${f}; ${n.other}, ${o}.`),
  },
  sig_acc_diff: {
    format: share,
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} acerta ${f} dos golpes que tenta; ${n.other}, ${o}.`, `${n.favoured} lands ${f} of the strikes attempted; ${n.other}, ${o}.`, `${n.favoured} touche avec ${f} de ses coups ; ${n.other}, ${o}.`, `${n.favoured} acierta el ${f} de los golpes que intenta; ${n.other}, el ${o}.`),
  },
  sig_def_diff: {
    format: share,
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} evita ${f} dos golpes do adversário; ${n.other}, ${o}.`, `${n.favoured} avoids ${f} of opponents’ strikes; ${n.other}, ${o}.`, `${n.favoured} évite ${f} des coups adverses ; ${n.other}, ${o}.`, `${n.favoured} evita el ${f} de los golpes rivales; ${n.other}, el ${o}.`),
  },
  sig_per_min_diff: {
    format: plain(1),
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} acerta ${f} golpes por minuto; ${n.other}, ${o}.`, `${n.favoured} lands ${f} strikes per minute; ${n.other}, ${o}.`, `${n.favoured} porte ${f} coups par minute ; ${n.other}, ${o}.`, `${n.favoured} conecta ${f} golpes por minuto; ${n.other}, ${o}.`),
  },
  sig_absorbed_per_min_diff: {
    format: plain(1),
    better: 'low',
    say: (lang, n, f, o) => L(lang, `${n.favoured} recebe ${f} golpes por minuto; ${n.other}, ${o}.`, `${n.favoured} absorbs ${f} strikes per minute; ${n.other}, ${o}.`, `${n.favoured} reçoit ${f} coups par minute ; ${n.other}, ${o}.`, `${n.favoured} recibe ${f} golpes por minuto; ${n.other}, ${o}.`),
  },
  td_acc_diff: {
    format: share,
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} completa ${f} das quedas que tenta; ${n.other}, ${o}.`, `${n.favoured} completes ${f} of takedown attempts; ${n.other}, ${o}.`, `${n.favoured} réussit ${f} de ses tentatives d’amenée au sol ; ${n.other}, ${o}.`, `${n.favoured} completa el ${f} de los derribos que intenta; ${n.other}, el ${o}.`),
  },
  td_def_diff: {
    format: share,
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} defende ${f} das quedas; ${n.other}, ${o}.`, `${n.favoured} stops ${f} of takedowns; ${n.other}, ${o}.`, `${n.favoured} défend ${f} des amenées au sol ; ${n.other}, ${o}.`, `${n.favoured} defiende el ${f} de los derribos; ${n.other}, el ${o}.`),
  },
  td_per_15_diff: {
    format: plain(1),
    better: 'high',
    say: (lang, n, f, o) => L(lang, `Quedas a cada 15 minutos: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Takedowns per 15 minutes: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Amenées au sol par 15 minutes : ${n.favoured}, ${f} ; ${n.other}, ${o}.`, `Derribos cada 15 minutos: ${n.favoured}, ${f}; ${n.other}, ${o}.`),
  },
  kd_per_15_diff: {
    format: plain(2),
    better: 'high',
    say: (lang, n, f, o) => L(lang, `Knockdowns a cada 15 minutos: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Knockdowns per 15 minutes: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Knock-downs par 15 minutes : ${n.favoured}, ${f} ; ${n.other}, ${o}.`, `Knockdowns cada 15 minutos: ${n.favoured}, ${f}; ${n.other}, ${o}.`),
  },
  control_share_diff: {
    format: share,
    better: 'high',
    say: (lang, n, f, o) => L(lang, `${n.favoured} passa ${f} do tempo de luta no controle; ${n.other}, ${o}.`, `${n.favoured} spends ${f} of fight time in control; ${n.other}, ${o}.`, `${n.favoured} passe ${f} du temps de combat en contrôle ; ${n.other}, ${o}.`, `${n.favoured} pasa el ${f} del tiempo de pelea en control; ${n.other}, el ${o}.`),
  },
  sub_per_15_diff: {
    format: plain(1),
    better: 'high',
    say: (lang, n, f, o) => L(lang, `Tentativas de finalização a cada 15 minutos: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Submission attempts per 15 minutes: ${n.favoured}, ${f}; ${n.other}, ${o}.`, `Tentatives de soumission par 15 minutes : ${n.favoured}, ${f} ; ${n.other}, ${o}.`, `Intentos de sumisión cada 15 minutos: ${n.favoured}, ${f}; ${n.other}, ${o}.`),
  },
}

/** "17-1 in the UFC, Elo 1712", for one fighter. */
function resultsOf(name: string, results: UfcResults, lang: string): string {
  const elo = results.elo.toLocaleString(localeTag(lang), { useGrouping: false })
  if (results.fights === 0) return L(lang, `${name} não tem luta no UFC (Elo inicial, ${elo})`, `${name} has no UFC fight (starting Elo, ${elo})`, `${name} n’a aucun combat à l’UFC (Elo de départ, ${elo})`, `${name} no tiene peleas en la UFC (Elo inicial, ${elo})`)
  // Word joiners keep the record on one line: it broke as "11-" and "2" on a phone.
  const record = `${results.wins}⁠-⁠${results.losses}`
  return L(lang, `${name} tem ${record} no UFC e Elo ${elo}`, `${name} is ${record} in the UFC with an Elo of ${elo}`, `${name} a ${record} à l’UFC et un Elo de ${elo}`, `${name} tiene ${record} en la UFC y un Elo de ${elo}`)
}

const alone = (lang: string, other: string) =>
  L(lang, ` Sozinho, isso apontaria para ${other}; o modelo lê junto com o resto.`, ` On its own this would point to ${other}; the model reads it with the rest.`, ` Pris seul, cela pencherait pour ${other} ; le modèle le lit avec le reste.`, ` Por sí solo, esto apuntaría a ${other}; el modelo lo lee junto con el resto.`)

function sharedSentence(factor: MainFactor, lang: string): string {
  const label = localizeFeature(factor.feature, lang)
  return L(
    lang,
    `${label}: é igual para os dois, mas muda o peso que o modelo dá aos outros números.`,
    `${label}: the same for both fighters, but it changes how much the model weighs the other numbers.`,
    `${label} : identique pour les deux, mais cela change le poids que le modèle donne aux autres chiffres.`,
    `${label}: es igual para los dos, pero cambia el peso que el modelo da a los otros números.`,
  )
}

/** One factor in words, or the plain "weighed in favour of" when the API does not say what the model read. */
export function factorSentence(factor: MainFactor, names: { a: string; b: string }, lang: string): string {
  const towardA = factor.impact === names.a
  const pair: Pair = towardA ? { favoured: names.a, other: names.b } : { favoured: names.b, other: names.a }

  // The same number on both sides: the factor is about the fight, not about one of them.
  if (factor.results_a?.fights === 0 && factor.results_b?.fights === 0) return sharedSentence(factor, lang)
  if (factor.results_a && factor.results_b) {
    const [favoured, other] = towardA ? [factor.results_a, factor.results_b] : [factor.results_b, factor.results_a]
    const said = `${resultsOf(pair.favoured, favoured, lang)}; ${resultsOf(pair.other, other, lang)}.`.replace('; ', lang.startsWith('fr') ? ' ; ' : '; ')
    const why = L(lang, ' O Elo sobe mais quando a vitória é sobre adversários fortes.', ' Elo rises more for beating strong opponents.', ' L’Elo monte davantage quand on bat des adversaires forts.', ' El Elo sube más cuando se gana a rivales fuertes.')
    return said + (favoured.elo < other.elo ? alone(lang, pair.other) : why)
  }

  const metric = factor.key ? METRICS[factor.key] : undefined
  if (metric) {
    const [favoured, other] = towardA ? [factor.value_a, factor.value_b] : [factor.value_b, factor.value_a]
    if (favoured == null || other == null) {
      const missing = [favoured == null ? pair.favoured : null, other == null ? pair.other : null].filter(Boolean).join(L(lang, ' nem de ', ' or ', ' ni pour ', ' ni de '))
      return L(lang, `Não há esse número de ${missing}: o modelo usou um valor típico.`, `There is no such number for ${missing}: the model used a typical value.`, `Ce chiffre manque pour ${missing} : le modèle a utilisé une valeur typique.`, `No hay ese número de ${missing}: el modelo usó un valor típico.`)
    }
    if (favoured === other) return sharedSentence(factor, lang)
    const same = metric.format(favoured, lang, 0) === metric.format(other, lang, 0)
    const extra = same ? 1 : 0
    const sentence = metric.say(lang, pair, metric.format(favoured, lang, extra), metric.format(other, lang, extra))
    const against = (metric.better === 'high' && favoured < other) || (metric.better === 'low' && favoured > other)
    return sentence + (against ? alone(lang, pair.other) : '')
  }

  if (factor.key) return sharedSentence(factor, lang)
  const label = localizeFeature(factor.feature, lang)
  return L(lang, `${label} pesou a favor de ${factor.impact}.`, factor.explanation, `${label} a pesé en faveur de ${factor.impact}.`, `${label} inclinó el pronóstico a favor de ${factor.impact}.`)
}

/** How often picks this confident were right on past fights, or null when there is nothing to compare with. */
export function trackRecordSentence(probability: number, evaluation: RecentEvaluation | null | undefined, lang: string): string | null {
  for (const band of evaluation?.calibration ?? []) {
    const limits = /^(\d+)%?-(\d+)%$/.exec(band.label)
    if (!limits || band.fights < 20) continue
    const [low, high] = [Number(limits[1]) / 100, Number(limits[2]) / 100]
    if (probability < low || probability >= high) continue
    const range = `${limits[1]}–${limits[2]}%`
    const fights = band.fights.toLocaleString(localeTag(lang))
    const tens = Math.round(band.accuracy * 10)
    return L(
      lang,
      `No teste com lutas passadas, palpites de ${range} acertaram cerca de ${tens} em cada 10 (${fights} lutas).`,
      `In the test on past fights, picks of ${range} were right about ${tens} times in 10 (${fights} fights).`,
      `Lors du test sur des combats passés, les pronostics de ${range} étaient justes environ ${tens} fois sur 10 (${fights} combats).`,
      `En la prueba con peleas pasadas, los pronósticos de ${range} acertaron unas ${tens} de cada 10 (${fights} peleas).`,
    )
  }
  return null
}

/**
 * The prediction in a few sentences: the heaviest factor for the favourite, the heaviest for the other fighter, and how
 * often picks like this one were right. The last one only for fighters whose numbers are the UFC's: it was measured there.
 */
export function matchupSummary(prediction: PredictionResponse, evaluation: RecentEvaluation | null | undefined, lang: string): string[] {
  // Exactly 50%: the model has nothing that tells the two apart, so there is nothing to explain.
  if (Math.abs(prediction.probability - 0.5) < 1e-9) return []
  const names = { a: prediction.fighter_a_profile.name, b: prediction.fighter_b_profile.name }
  const winner = prediction.predicted_winner
  const other = winner === names.a ? names.b : names.a
  const factors = prediction.main_factors.filter((factor) => factor.key && factor.magnitude > 0.002)
  const forWinner = factors.find((factor) => factor.impact === winner)
  const forOther = factors.find((factor) => factor.impact === other)
  const lines: string[] = []
  if (forWinner) {
    lines.push(`${L(lang, `O que mais pesa a favor de ${winner}:`, `What weighs most for ${winner}:`, `Ce qui pèse le plus pour ${winner} :`, `Lo que más pesa a favor de ${winner}:`)} ${lowerFirst(localizeFeature(forWinner.feature, lang))}. ${factorSentence(forWinner, names, lang)}`)
  }
  if (forOther) {
    lines.push(`${L(lang, `Do lado de ${other}:`, `On ${other}’s side:`, `Du côté de ${other} :`, `Del lado de ${other}:`)} ${lowerFirst(localizeFeature(forOther.feature, lang))}. ${factorSentence(forOther, names, lang)}`)
  }
  const outside = prediction.fighter_a_profile.data_origin || prediction.fighter_b_profile.data_origin
  const history = outside ? null : trackRecordSentence(prediction.probability, evaluation, lang)
  if (history) lines.push(history)
  return lines
}

/** "Diferença de idade" inside a sentence; a label that starts with an acronym stays as it is. */
function lowerFirst(text: string): string {
  return /^[A-ZÀ-Þ][A-Z]/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1)
}
