/**
 * The sentences the API writes about how much a prediction has to go on (backend/app/services/data_confidence.py), in every
 * language. Kept apart from the note that shows them so the build can write the same sentences into the static fight pages.
 * No React here.
 */

import { L } from '../../i18n/lang'
import type { DataConfidence } from '../types/api'

/** The level names the API sends (backend/app/services/data_confidence.py), in the language on screen. */
export function levelLabel(level: DataConfidence['level'], fallback: string, lang: string): string {
  if (level === 'thin') return L(lang, 'Poucos dados', 'Thin data', 'Peu de données', 'Pocos datos')
  if (level === 'some_gaps') return L(lang, 'Faltam alguns dados', 'Some gaps in the data', 'Il manque des données', 'Faltan algunos datos')
  return fallback
}

type Translator = (lang: string, match: RegExpMatchArray) => string

/** "about 2 years" -> the same span in the language on screen. */
function duration(lang: string, amount: string, unit: string) {
  const years = unit.startsWith('year')
  const one = amount === '1'
  return L(
    lang,
    `${amount} ${years ? (one ? 'ano' : 'anos') : one ? 'mês' : 'meses'}`,
    `${amount} ${unit}`,
    `${amount} ${years ? (one ? 'an' : 'ans') : 'mois'}`,
    `${amount} ${years ? (one ? 'año' : 'años') : one ? 'mes' : 'meses'}`,
  )
}

/**
 * The reasons the API writes, as patterns, so a fighter's name and numbers carry over into every language. Three of them also
 * match the wording used until November 2026, which a saved pages.json or an API not yet redeployed still sends; that wording
 * did not describe the served model, so it is shown with the current sentence, in English too.
 */
const REASONS: [RegExp, Translator][] = [
  [
    /^(.+) has only (\d+) recorded fights?, so their numbers are not settled yet\.$/,
    (lang, [, name, n]) =>
      L(
        lang,
        `${name} tem só ${n} ${n === '1' ? 'luta registrada' : 'lutas registradas'}, então os números ainda não são estáveis.`,
        `${name} has only ${n} recorded fight${n === '1' ? '' : 's'}, so their numbers are not settled yet.`,
        `${name} ne compte que ${n} combat${n === '1' ? '' : 's'} enregistré${n === '1' ? '' : 's'} : ses chiffres ne sont pas encore stables.`,
        `${name} tiene solo ${n} ${n === '1' ? 'pelea registrada' : 'peleas registradas'}, así que sus números aún no son estables.`,
      ),
  ],
  [
    /^(.+) has only (\d+) recorded fights\.$/,
    (lang, [, name, n]) =>
      L(lang, `${name} tem só ${n} lutas registradas.`, `${name} has only ${n} recorded fights.`, `${name} ne compte que ${n} combats enregistrés.`, `${name} tiene solo ${n} peleas registradas.`),
  ],
  [
    /^(.+) last fought in the UFC about (\d+) (years?|months?) ago(?:, so their numbers may not show how they fight today|; the model sees no sign of ring rust)\.$/,
    (lang, [, name, amount, unit]) =>
      L(
        lang,
        `${name} lutou no UFC pela última vez há cerca de ${duration(lang, amount, unit)}; os números podem não mostrar o nível atual.`,
        `${name} last fought in the UFC about ${amount} ${unit} ago, so their numbers may not show how they fight today.`,
        `${name} a combattu à l’UFC pour la dernière fois il y a environ ${duration(lang, amount, unit)} ; ses chiffres ne reflètent peut-être plus son niveau actuel.`,
        `${name} peleó en la UFC por última vez hace cerca de ${duration(lang, amount, unit)}; es posible que sus números ya no reflejen su nivel actual.`,
      ),
  ],
  [
    /^(.+) has no striking or takedown numbers (?:for fights outside the UFC; where they are missing, the model uses typical values|on file outside the UFC, so the model used averages for them)\.$/,
    (lang, [, name]) =>
      L(
        lang,
        `${name} não tem números de golpes nem de quedas das lutas fora do UFC; onde faltam, o modelo usa valores típicos.`,
        `${name} has no striking or takedown numbers for fights outside the UFC; where they are missing, the model uses typical values.`,
        `${name} n’a pas de chiffres de frappe ni de takedown pour ses combats hors de l’UFC ; là où ils manquent, le modèle utilise des valeurs typiques.`,
        `${name} no tiene números de golpes ni de derribos de sus peleas fuera de la UFC; donde faltan, el modelo usa valores típicos.`,
      ),
  ],
  [
    /^(.+) has no (.+) on record, so the model (?:used a typical value|used typical values|filled it in with an average)\.$/,
    (lang, [, name, fields]) => {
      const words: Record<string, [string, string, string]> = { age: ['idade', 'âge', 'edad'], height: ['altura', 'taille', 'estatura'], reach: ['envergadura', 'allonge', 'alcance'] }
      const missing = fields.split(' or ')
      const one = missing.length === 1
      const list = (index: 0 | 1 | 2, separator: string) => missing.map((field) => words[field]?.[index] ?? field).join(separator)
      return L(
        lang,
        `${name} não tem ${list(0, ' nem ')} ${one ? 'registrada' : 'registradas'}, então o modelo usou ${one ? 'um valor típico' : 'valores típicos'}.`,
        `${name} has no ${fields} on record, so the model used ${one ? 'a typical value' : 'typical values'}.`,
        `Données manquantes pour ${name} (${list(1, ', ')}) : le modèle a utilisé ${one ? 'une valeur typique' : 'des valeurs typiques'}.`,
        `Faltan datos de ${name} (${list(2, ', ')}): el modelo usó ${one ? 'un valor típico' : 'valores típicos'}.`,
      )
    },
  ],
]

export function translateReason(reason: string, lang: string): string {
  for (const [pattern, translate] of REASONS) {
    const match = reason.match(pattern)
    if (match) return translate(lang, match)
  }
  return reason
}
