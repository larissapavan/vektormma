import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import type { DataConfidence } from '../types/api'

/** The level names the API sends (backend/app/services/data_confidence.py), in the language on screen. */
function levelLabel(level: DataConfidence['level'], fallback: string, lang: string): string {
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

/** The reasons the API writes, as patterns, so a fighter's name and numbers carry over into every language. */
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
    /^(.+) last fought in the UFC about (\d+) (years?|months?) ago; the model sees no sign of ring rust\.$/,
    (lang, [, name, amount, unit]) =>
      L(
        lang,
        `${name} lutou no UFC pela última vez há cerca de ${duration(lang, amount, unit)}; o modelo não leva em conta o tempo parado.`,
        `${name} last fought in the UFC about ${amount} ${unit} ago; the model sees no sign of ring rust.`,
        `${name} a combattu à l’UFC pour la dernière fois il y a environ ${duration(lang, amount, unit)} ; le modèle ne tient pas compte de l’inactivité.`,
        `${name} peleó en la UFC por última vez hace unos ${duration(lang, amount, unit)}; el modelo no tiene en cuenta la inactividad.`,
      ),
  ],
  [
    /^(.+) has no striking or takedown numbers on file outside the UFC, so the model used averages for them\.$/,
    (lang, [, name]) =>
      L(
        lang,
        `${name} não tem números de golpes nem de quedas fora do UFC, então o modelo usou médias.`,
        `${name} has no striking or takedown numbers on file outside the UFC, so the model used averages for them.`,
        `${name} n’a pas de chiffres de frappe ni de takedown hors de l’UFC : le modèle a utilisé des moyennes.`,
        `${name} no tiene números de golpes ni de derribos fuera de la UFC, así que el modelo usó promedios.`,
      ),
  ],
  [
    /^(.+) has no (.+) on record, so the model filled it in with an average\.$/,
    (lang, [, name, fields]) => {
      const words: Record<string, [string, string, string]> = { age: ['idade', 'âge', 'edad'], height: ['altura', 'taille', 'estatura'], reach: ['envergadura', 'allonge', 'alcance'] }
      const list = (index: 0 | 1 | 2, or: string) => fields.split(' or ').map((field) => words[field]?.[index] ?? field).join(` ${or} `)
      return L(
        lang,
        `${name} não tem ${list(0, 'nem')} registrada, então o modelo usou uma média.`,
        `${name} has no ${fields} on record, so the model filled it in with an average.`,
        `${name} n’a pas d’${list(1, 'ni')} enregistrée : le modèle a utilisé une moyenne.`,
        `${name} no tiene ${list(2, 'ni')} registrada, así que el modelo usó un promedio.`,
      )
    },
  ],
]

function translateReason(reason: string, lang: string): string {
  for (const [pattern, translate] of REASONS) {
    const match = reason.match(pattern)
    if (match) return translate(lang, match)
  }
  return reason
}

/**
 * Says how much the prediction had to go on, so a percentage built on a few fights is not read like one built on a full
 * career. Silent when the data is solid, so it only appears when it matters.
 */
export function DataConfidenceNote({ confidence }: { confidence: DataConfidence | null | undefined }) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  if (!confidence || confidence.level === 'solid') return null

  return (
    <aside
      aria-label={L(lang, 'Dados por trás desta previsão', 'Data behind this prediction', 'Données derrière ce pronostic', 'Datos detrás de este pronóstico')}
      className="flex items-start gap-3 border-l-4 border-[var(--error)] bg-[var(--panel)] px-4 py-3"
    >
      <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[var(--error)]" />
      <div>
        <p className="text-base font-bold text-[var(--error)]">{levelLabel(confidence.level, confidence.label, lang)}</p>
        <ul className="mt-1 space-y-1 text-[15px] leading-6">
          {confidence.reasons.map((reason) => (
            <li key={reason}>{translateReason(reason, lang)}</li>
          ))}
        </ul>
        <p className="mt-1 text-[15px] leading-6 text-[var(--muted)]">
          {L(lang, 'Leia a porcentagem com mais cautela.', 'Read the percentage with extra caution.', 'Lisez le pourcentage avec plus de prudence.', 'Lee el porcentaje con más cautela.')}
        </p>
      </div>
    </aside>
  )
}
