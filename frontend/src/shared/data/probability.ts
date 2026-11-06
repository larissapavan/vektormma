import { L, uiLang, type UiLang } from '../../i18n/lang'

/**
 * How the model's probabilities are put on screen.
 *
 * The model that served the site earlier was overconfident: on recent fights its picks rated 90% or more were right about
 * 71% of the time. The current one is calibrated, but it has almost no fights above 80% to be checked on, so a probability
 * past 90% is still shown as "90%+" (and its mirror as "<10%") instead of a number that looks exact.
 */
const CAP = 0.9
const EPSILON = 1e-9 // 1 - 0.9 is 0.09999999999999998 in floating point

/** "63%", or "90%+" / "<10%" at the extremes. */
export function formatProbability(value: number): string {
  if (value >= CAP - EPSILON) return '90%+'
  if (value <= 1 - CAP + EPSILON) return '<10%'
  return `${Math.round(value * 100)}%`
}

/** How big the favorite's edge is, in words. `favorite` is the favorite's probability (0.5 to 1). */
export function edgeLabel(favorite: number, language: string | boolean = false): string {
  const edge = favorite < 0.55 ? 0 : favorite < 0.65 ? 1 : favorite < 0.8 ? 2 : 3
  return L(
    language,
    ['Luta parelha', 'Leve vantagem', 'Vantagem clara', 'Amplo favoritismo'][edge],
    ['Toss-up', 'Slight edge', 'Clear edge', 'Strong edge'][edge],
    ['Combat équilibré', 'Léger avantage', 'Avantage net', 'Large favori'][edge],
    ['Pelea pareja', 'Ligera ventaja', 'Ventaja clara', 'Amplio favoritismo'][edge],
  )
}

type Confidence = 'strong' | 'moderate' | 'competitive'

const PREDICTION_MESSAGES: Record<UiLang, Record<Confidence, (name: string) => string> | null> = {
  en: null,
  pt: {
    strong: (name) => `O modelo aponta amplo favoritismo para ${name} neste confronto.`,
    moderate: (name) => `O modelo aponta vantagem moderada para ${name} neste confronto.`,
    competitive: (name) => `O modelo aponta leve vantagem para ${name} em um combate equilibrado.`,
  },
  fr: {
    strong: (name) => `Le modèle donne un large avantage à ${name} pour ce combat.`,
    moderate: (name) => `Le modèle donne un avantage modéré à ${name} pour ce combat.`,
    competitive: (name) => `Le modèle donne un léger avantage à ${name} dans un combat serré.`,
  },
  es: {
    strong: (name) => `El modelo da una amplia ventaja a ${name} en este enfrentamiento.`,
    moderate: (name) => `El modelo da una ventaja moderada a ${name} en este enfrentamiento.`,
    competitive: (name) => `El modelo da una ligera ventaja a ${name} en una pelea cerrada.`,
  },
}

/** Localizes the backend prediction message ("The model gives X a [confidence] edge in this matchup."). */
export function localizePredictionMessage(message: string | null | undefined, winner: string, language: string | boolean = false): string {
  if (!message) return ''
  const messages = PREDICTION_MESSAGES[uiLang(language)]
  if (!messages) return message
  if (message.includes('a strong edge')) return messages.strong(winner)
  if (message.includes('a moderate edge')) return messages.moderate(winner)
  if (message.includes('a competitive edge')) return messages.competitive(winner)
  return message.replace(/The model gives (.+?) a (\w+) edge in this matchup\./, (_match, name: string, confidence: string) =>
    (messages[confidence as Confidence] ?? messages.competitive)(name),
  )
}
