import { L, uiLang, type UiLang } from '../../i18n/lang'

/** Win-method buckets used by the performance charts, as shown to the user. */
const METHOD_LABELS: Record<UiLang, Record<string, string>> = {
  en: {
    'KO/TKO': 'KO/TKO',
    Submission: 'Submission',
    Decision: 'Decision',
    'U-DEC': 'Unanimous Decision',
    'S-DEC': 'Split Decision',
    'M-DEC': 'Majority Decision',
    Disqualification: 'Disqualification',
    DQ: 'Disqualification',
    Overturned: 'No Contest (NC)',
    Other: 'Other',
  },
  pt: {
    'KO/TKO': 'Nocaute (KO/TKO)',
    Submission: 'Finalização',
    Decision: 'Decisão',
    'U-DEC': 'Decisão Unânime',
    'S-DEC': 'Decisão Dividida',
    'M-DEC': 'Decisão Majoritária',
    Disqualification: 'Desqualificação (DQ)',
    DQ: 'Desqualificação (DQ)',
    Overturned: 'Sem Resultado (NC)',
    Other: 'Outro',
  },
  fr: {
    'KO/TKO': 'KO/TKO',
    Submission: 'Soumission',
    Decision: 'Décision',
    'U-DEC': 'Décision unanime',
    'S-DEC': 'Décision partagée',
    'M-DEC': 'Décision majoritaire',
    Disqualification: 'Disqualification',
    DQ: 'Disqualification',
    Overturned: 'Sans résultat (NC)',
    Other: 'Autre',
  },
  es: {
    'KO/TKO': 'Nocaut (KO/TKO)',
    Submission: 'Sumisión',
    Decision: 'Decisión',
    'U-DEC': 'Decisión unánime',
    'S-DEC': 'Decisión dividida',
    'M-DEC': 'Decisión mayoritaria',
    Disqualification: 'Descalificación (DQ)',
    DQ: 'Descalificación (DQ)',
    Overturned: 'Sin resultado (NC)',
    Other: 'Otro',
  },
}

const TECHNIQUES_PT: Record<string, string> = {
  'rear-naked choke': 'mata-leão',
  'rear naked choke': 'mata-leão',
  'guillotine choke': 'guilhotina',
  guillotine: 'guilhotina',
  armbar: 'chave de braço',
  'arm-bar': 'chave de braço',
  'triangle choke': 'triângulo',
  triangle: 'triângulo',
  'arm-triangle choke': 'katagatame',
  'arm-triangle': 'katagatame',
  'arm triangle': 'katagatame',
  kimura: 'kimura',
  americana: 'americana',
  kneebar: 'chave de joelho',
  'heel hook': 'chave de calcanhar',
  'ankle lock': 'chave de tornozelo',
  'calf slicer': 'chave de panturrilha',
  'neck crank': 'trava de pescoço',
  twister: 'twister',
  omoplata: 'omoplata',
  "d'arce choke": "d'arce",
  'darce choke': "d'arce",
  "von flue choke": 'von flue',
  'anaconda choke': 'anaconda',
  'peruvian necktie': 'gravata peruana',
  'inverted triangle': 'triângulo invertido',
  'triangle armbar': 'triângulo com chave de braço',
  punches: 'socos',
  punch: 'soco',
  elbows: 'cotoveladas',
  elbow: 'cotovelada',
  knees: 'joelhadas',
  knee: 'joelhada',
  'flying knee': 'joelhada voadora',
  'head kick': 'chute na cabeça',
  'body kick': 'chute no corpo',
  'leg kick': 'chute na perna',
  'leg kicks': 'chutes na perna',
  'spinning back fist': 'soco rodado',
  'spinning back kick': 'chute rodado',
  'spinning wheel kick': 'chute em gancho rodado',
  slam: 'bate-estaca',
  'ground and pound': 'ground and pound',
  'doctor stoppage': 'interrupção médica',
  "doctor's stoppage": 'interrupção médica',
  'corner stoppage': 'desistência do córner',
  retirement: 'desistência',
  injury: 'lesão',
}

const TECHNIQUES_FR: Record<string, string> = {
  'rear-naked choke': 'étranglement arrière',
  'rear naked choke': 'étranglement arrière',
  'guillotine choke': 'guillotine',
  guillotine: 'guillotine',
  armbar: 'clé de bras',
  'arm-bar': 'clé de bras',
  'triangle choke': 'étranglement triangle',
  triangle: 'triangle',
  'arm-triangle choke': 'étranglement bras-tête',
  'arm-triangle': 'étranglement bras-tête',
  'arm triangle': 'étranglement bras-tête',
  kimura: 'kimura',
  americana: 'americana',
  kneebar: 'clé de genou',
  'heel hook': 'clé de talon',
  'ankle lock': 'clé de cheville',
  'calf slicer': 'clé de mollet',
  'neck crank': 'clé de cou',
  twister: 'twister',
  omoplata: 'omoplata',
  "d'arce choke": "étranglement d'arce",
  'darce choke': "étranglement d'arce",
  'anaconda choke': 'anaconda',
  'peruvian necktie': 'cravate péruvienne',
  'inverted triangle': 'triangle inversé',
  'triangle armbar': 'triangle avec clé de bras',
  'von flue choke': 'étranglement von flue',
  punches: 'coups de poing',
  punch: 'coup de poing',
  elbows: 'coups de coude',
  elbow: 'coup de coude',
  knees: 'coups de genou',
  knee: 'coup de genou',
  'flying knee': 'coup de genou sauté',
  'head kick': 'coup de pied à la tête',
  'body kick': 'coup de pied au corps',
  'leg kick': 'coup de pied bas',
  'leg kicks': 'coups de pied bas',
  'spinning back fist': 'revers tournant',
  'spinning back kick': 'coup de pied retourné',
  'spinning wheel kick': 'coup de pied circulaire retourné',
  slam: 'projection',
  'ground and pound': 'ground and pound',
  'doctor stoppage': 'arrêt du médecin',
  "doctor's stoppage": 'arrêt du médecin',
  'corner stoppage': 'abandon du coin',
  retirement: 'abandon',
  injury: 'blessure',
}

const TECHNIQUES_ES: Record<string, string> = {
  'rear-naked choke': 'mataleón',
  'rear naked choke': 'mataleón',
  'guillotine choke': 'guillotina',
  guillotine: 'guillotina',
  armbar: 'llave de brazo',
  'arm-bar': 'llave de brazo',
  'triangle choke': 'triángulo',
  triangle: 'triángulo',
  'arm-triangle choke': 'estrangulación de brazo y cabeza',
  'arm-triangle': 'estrangulación de brazo y cabeza',
  'arm triangle': 'estrangulación de brazo y cabeza',
  kimura: 'kimura',
  americana: 'americana',
  kneebar: 'llave de rodilla',
  'heel hook': 'llave de talón',
  'ankle lock': 'llave de tobillo',
  'calf slicer': 'llave de pantorrilla',
  'neck crank': 'torsión de cuello',
  twister: 'twister',
  omoplata: 'omoplata',
  "d'arce choke": "d'arce",
  'darce choke': "d'arce",
  'anaconda choke': 'anaconda',
  'peruvian necktie': 'corbata peruana',
  'inverted triangle': 'triángulo invertido',
  'triangle armbar': 'triángulo con llave de brazo',
  'von flue choke': 'von flue',
  punches: 'puñetazos',
  punch: 'puñetazo',
  elbows: 'codazos',
  elbow: 'codazo',
  knees: 'rodillazos',
  knee: 'rodillazo',
  'flying knee': 'rodillazo volador',
  'head kick': 'patada a la cabeza',
  'body kick': 'patada al cuerpo',
  'leg kick': 'patada a la pierna',
  'leg kicks': 'patadas a la pierna',
  'spinning back fist': 'revés giratorio',
  'spinning back kick': 'patada giratoria hacia atrás',
  'spinning wheel kick': 'patada giratoria de gancho',
  slam: 'azote',
  'ground and pound': 'ground and pound',
  'doctor stoppage': 'detención médica',
  "doctor's stoppage": 'detención médica',
  'corner stoppage': 'abandono desde la esquina',
  retirement: 'abandono',
  injury: 'lesión',
}

const TECHNIQUES: Record<UiLang, Record<string, string> | null> = { en: null, pt: TECHNIQUES_PT, fr: TECHNIQUES_FR, es: TECHNIQUES_ES }

/** The words a method is built from ("Submission", "Decision", ...) in each language. */
export const METHOD_WORDS: Record<Exclude<UiLang, 'en'>, { submission: string; decision: string; unanimous: string; split: string; majority: string; noContest: string; disqualification: string }> = {
  pt: { submission: 'Finalização', decision: 'Decisão', unanimous: 'Decisão Unânime', split: 'Decisão Dividida', majority: 'Decisão Majoritária', noContest: 'Sem Resultado (NC)', disqualification: 'Desqualificação (DQ)' },
  fr: { submission: 'Soumission', decision: 'Décision', unanimous: 'Décision unanime', split: 'Décision partagée', majority: 'Décision majoritaire', noContest: 'Sans résultat (NC)', disqualification: 'Disqualification (DQ)' },
  es: { submission: 'Sumisión', decision: 'Decisión', unanimous: 'Decisión unánime', split: 'Decisión dividida', majority: 'Decisión mayoritaria', noContest: 'Sin resultado (NC)', disqualification: 'Descalificación (DQ)' },
}

/** A submission or strike name ("rear-naked choke") in the active language; unknown names are returned as they came. */
export function translateTechnique(detail: string, language: string | boolean = false): string {
  return TECHNIQUES[uiLang(language)]?.[detail.trim().toLowerCase()] ?? detail
}

/** Translates detailed fight outcome methods like 'Submission (rear-naked choke)' or 'TKO (punches)' */
export function translateFightMethod(
  method: string | null | undefined,
  language: string | boolean = false,
): string {
  if (!method) return ''
  const trimmed = method.trim()
  const lang = uiLang(language)
  if (lang === 'en') return trimmed

  const words = METHOD_WORDS[lang]

  // Check known direct labels
  const directMap = METHOD_LABELS[lang]
  if (directMap[trimmed]) return directMap[trimmed]

  // Handle Decision formats: "Decision - Unanimous", "Unanimous Decision", etc.
  const lower = trimmed.toLowerCase()
  if (lower.includes('unanimous')) return words.unanimous
  if (lower.includes('split')) return words.split
  if (lower.includes('majority')) return words.majority
  if (lower === 'overturned' || lower === 'no contest' || lower === 'nc') return words.noContest
  if (lower.includes('disqualification') || lower === 'dq') return words.disqualification

  // Handle "Method (Detail)" pattern, e.g. "Submission (rear-naked choke)", "TKO (punches)", "KO (head kick)"
  const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/)
  if (parenMatch) {
    const rawBase = parenMatch[1].trim()
    const rawDetail = parenMatch[2].trim().toLowerCase()
    const detailTranslated = TECHNIQUES[lang]?.[rawDetail] ?? rawDetail

    let baseTranslated = rawBase
    const lowerBase = rawBase.toLowerCase()
    if (lowerBase.includes('submission')) {
      baseTranslated = words.submission
    } else if (lowerBase.includes('tko')) {
      baseTranslated = 'TKO'
    } else if (lowerBase.includes('ko')) {
      baseTranslated = 'KO'
    }

    return `${baseTranslated} (${detailTranslated})`
  }

  if (lower.includes('submission')) return words.submission
  if (lower.includes('decision')) return words.decision

  return trimmed
}

const STANCES: Record<UiLang, Record<string, string> | null> = {
  en: null,
  pt: { orthodox: 'Destro', southpaw: 'Canhoto', switch: 'Ambidestro', 'open stance': 'Base aberta', sidestance: 'Base lateral', sideways: 'Base lateral', unknown: 'Desconhecida' },
  fr: { orthodox: 'Droitier', southpaw: 'Gaucher', switch: 'Ambidextre', 'open stance': 'Garde ouverte', sidestance: 'Garde de profil', sideways: 'Garde de profil', unknown: 'Inconnue' },
  es: { orthodox: 'Ortodoxo', southpaw: 'Zurdo', switch: 'Ambidiestro', 'open stance': 'Guardia abierta', sidestance: 'Guardia lateral', sideways: 'Guardia lateral', unknown: 'Desconocida' },
}

/** Translates fighter stances (e.g. Orthodox -> Destro) */
export function translateStance(
  stance: string | null | undefined,
  language: string | boolean = false,
): string {
  if (!stance) return ''
  const trimmed = stance.trim()
  return STANCES[uiLang(language)]?.[trimmed.toLowerCase()] ?? trimmed
}

/** The parts of the United Kingdom that fighters list as their country but that are not ISO regions. */
const UK_NATIONS: Record<string, ByLangNames> = {
  england: { pt: 'Inglaterra', fr: 'Angleterre', es: 'Inglaterra' },
  scotland: { pt: 'Escócia', fr: 'Écosse', es: 'Escocia' },
  wales: { pt: 'País de Gales', fr: 'Pays de Galles', es: 'Gales' },
  'northern ireland': { pt: 'Irlanda do Norte', fr: 'Irlande du Nord', es: 'Irlanda del Norte' },
}
type ByLangNames = Record<Exclude<UiLang, 'en'>, string>

/** Other spellings of a country that the data uses, mapped to the English name Intl knows it by. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  'u.s.a.': 'United States',
  us: 'United States',
  uk: 'United Kingdom',
  'czech republic': 'Czechia',
  'ivory coast': 'Côte d’Ivoire',
  turkey: 'Türkiye',
  holland: 'Netherlands',
  myanmar: 'Myanmar (Burma)',
  burma: 'Myanmar (Burma)',
  'republic of ireland': 'Ireland',
  'dr congo': 'Congo - Kinshasa',
  'democratic republic of the congo': 'Congo - Kinshasa',
  'republic of the congo': 'Congo - Brazzaville',
  'hong kong': 'Hong Kong SAR China',
  macau: 'Macao SAR China',
}

let englishCountryCodes: Map<string, string> | null = null

/** English country name (lower case) -> ISO 3166 code, built once from the browser's own region names. */
function countryCodes(): Map<string, string> {
  if (englishCountryCodes) return englishCountryCodes
  const codes = new Map<string, string>()
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (const a of letters) {
      for (const b of letters) {
        const name = names.of(a + b)
        // The first code wins: later ones for the same name are legacy codes (SU for Russia, ZR for Congo).
        if (name && name !== a + b && !codes.has(name.toLowerCase())) codes.set(name.toLowerCase(), a + b)
      }
    }
  } catch {
    // No Intl.DisplayNames: country names stay in English.
  }
  englishCountryCodes = codes
  return codes
}

/** A country's name in the active language ("Brazil" -> "Brasil"); anything that is not a country is returned as is. */
export function localizeCountryName(name: string | null | undefined, language: string | boolean = false): string {
  if (!name) return ''
  const trimmed = name.trim()
  const lang = uiLang(language)
  if (lang === 'en') return trimmed
  const key = trimmed.toLowerCase()
  const nation = UK_NATIONS[key]
  if (nation) return nation[lang]
  const codes = countryCodes()
  const code = codes.get(key) ?? codes.get((COUNTRY_ALIASES[key] ?? '').toLowerCase())
  if (!code) return trimmed
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? trimmed
  } catch {
    return trimmed
  }
}

/** Formats and translates fighter hometown (e.g. 'State of São Paulo, Brazil' -> 'São Paulo, Brasil') */
export function translateHometown(
  hometown: string | null | undefined,
  language: string | boolean = false,
): string {
  if (!hometown) return ''
  const cleaned = hometown.trim().replace(/^State of\s+/i, '')
  if (uiLang(language) === 'en') return cleaned
  return cleaned
    .split(',')
    .map((part) => localizeCountryName(part, language))
    .join(', ')
}

export function getMethodLabel(method: string | null | undefined, language: string | boolean = false): string {
  if (!method) return L(language, 'A definir', 'Pending', 'À définir', 'Por definir')
  return METHOD_LABELS[uiLang(language)][method] ?? translateFightMethod(method, language)
}

export function formatPercent(value: number | null | undefined) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)}%`
}
