import { localeTag, uiLang, type UiLang } from '../../i18n/lang'

/**
 * Sentences the API sends in English (the model's notes and limits, the baselines it is compared with), put in the
 * language on screen. A sentence that is not recognized comes back unchanged, so a new API text still shows up.
 */

type Entry = Record<Exclude<UiLang, 'en'>, string>

const FIXED: Record<string, Entry> = {
  'Pick at random': { pt: 'Escolher ao acaso', fr: 'Choisir au hasard', es: 'Elegir al azar' },
  'Pick the fighter with more UFC wins': {
    pt: 'Escolher o lutador com mais vitórias no UFC',
    fr: 'Choisir le combattant avec le plus de victoires à l’UFC',
    es: 'Elegir al peleador con más victorias en la UFC',
  },
  'Pick the fighter with the better rating (Elo)': {
    pt: 'Escolher o lutador com a melhor pontuação (Elo)',
    fr: 'Choisir le combattant avec la meilleure cote (Elo)',
    es: 'Elegir al peleador con la mejor puntuación (Elo)',
  },
  'It was tested on fights that came after the ones it trained on, as a real prediction would be.': {
    pt: 'Foi testado em lutas posteriores às que usou no treino, como seria uma previsão de verdade.',
    fr: 'Il a été testé sur des combats postérieurs à ceux de son entraînement, comme le serait une vraie prévision.',
    es: 'Se probó con peleas posteriores a las que usó para entrenar, como ocurriría con un pronóstico real.',
  },
  'Most inputs are differences between the two fighters, such as win rate, reach, age and striking accuracy.': {
    pt: 'A maioria das entradas são diferenças entre os dois lutadores, como taxa de vitória, envergadura, idade e precisão de golpes.',
    fr: 'La plupart des entrées sont des écarts entre les deux combattants, comme le taux de victoire, l’allonge, l’âge et la précision de frappe.',
    es: 'La mayoría de los datos de entrada son diferencias entre los dos peleadores, como el porcentaje de victorias, el alcance, la edad y la precisión de golpeo.',
  },
  'SHAP shows which stats pushed each prediction toward one fighter or the other.': {
    pt: 'O SHAP mostra quais estatísticas empurraram cada previsão para um lutador ou para o outro.',
    fr: 'SHAP montre quelles statistiques ont fait pencher chaque prévision vers un combattant ou l’autre.',
    es: 'SHAP muestra qué estadísticas inclinaron cada pronóstico hacia uno u otro peleador.',
  },
  'Predictions are estimates based on past fights and each fighter\'s career stats.': {
    pt: 'As previsões são estimativas baseadas em lutas passadas e nas estatísticas de carreira de cada lutador.',
    fr: 'Les prévisions sont des estimations fondées sur les combats passés et les statistiques de carrière de chaque combattant.',
    es: 'Los pronósticos son estimaciones basadas en peleas pasadas y en las estadísticas de carrera de cada peleador.',
  },
  'The model uses each fighter\'s current career numbers, not their numbers at the time of past fights.': {
    pt: 'O modelo usa os números atuais de carreira de cada lutador, não os números da época das lutas passadas.',
    fr: 'Le modèle utilise les chiffres de carrière actuels de chaque combattant, pas ceux de l’époque des combats passés.',
    es: 'El modelo usa las cifras actuales de carrera de cada peleador, no las que tenía en el momento de las peleas pasadas.',
  },
  'This is a personal project for learning, not betting advice.': {
    pt: 'Este é um projeto pessoal de estudo, não um conselho de apostas.',
    fr: 'Ceci est un projet personnel d’apprentissage, pas un conseil de pari.',
    es: 'Este es un proyecto personal de aprendizaje, no un consejo de apuestas.',
  },
  // The pre-fight model (PREDICTION_MODEL=prefight): backend/app/utils/constants.py
  'Each fight is described by what was known on the morning of the fight: only earlier fights count, never its own result or anything after it.': {
    pt: 'Cada luta é descrita pelo que se sabia na manhã do evento: só contam as lutas anteriores, nunca o resultado dela nem nada que veio depois.',
    fr: 'Chaque combat est décrit par ce que l’on savait le matin même : seuls comptent les combats précédents, jamais son propre résultat ni rien de ce qui a suivi.',
    es: 'Cada pelea se describe con lo que se sabía la mañana del evento: solo cuentan las peleas anteriores, nunca su propio resultado ni nada posterior.',
  },
  'It was tested on the newest fights, all later than every fight it trained on, and its confidence was calibrated on a separate block in between.': {
    pt: 'Foi testado nas lutas mais recentes, todas posteriores a qualquer luta do treino, e a confiança dele foi calibrada em um bloco separado, no meio do caminho.',
    fr: 'Il a été testé sur les combats les plus récents, tous postérieurs à ceux de son entraînement, et sa confiance a été calibrée sur un bloc distinct, entre les deux.',
    es: 'Se probó con las peleas más recientes, todas posteriores a las del entrenamiento, y su confianza se calibró con un bloque aparte, intermedio.',
  },
  'Every probability is the average of both fighter orders, so it does not change with who is listed first.': {
    pt: 'Toda probabilidade é a média das duas ordens dos lutadores, então não muda conforme quem aparece primeiro.',
    fr: 'Chaque probabilité est la moyenne des deux ordres de combattants : elle ne change pas selon qui est cité en premier.',
    es: 'Cada probabilidad es el promedio de los dos órdenes de peleadores, así que no cambia según quién aparece primero.',
  },
  'Only past UFC fights are counted. A fighter\'s record in other organizations is not in the model, so a debutant is read from age, height and reach alone.': {
    pt: 'Só contam lutas passadas no UFC. O cartel do lutador em outros eventos não entra no modelo, então um estreante é lido apenas por idade, altura e envergadura.',
    fr: 'Seuls les combats passés à l’UFC comptent. Le palmarès d’un combattant dans d’autres organisations n’entre pas dans le modèle : un débutant est donc lu à partir de son âge, sa taille et son allonge seulement.',
    es: 'Solo cuentan las peleas pasadas en la UFC. El récord de un peleador en otras organizaciones no entra en el modelo, así que un debutante se lee solo por edad, estatura y alcance.',
  },
  'Striking and takedown history only exists for fights with published statistics; where it is missing, the model fills in typical values.': {
    pt: 'O histórico de golpes e quedas só existe para lutas com estatísticas publicadas; onde falta, o modelo usa valores típicos.',
    fr: 'L’historique de frappes et d’amenées au sol n’existe que pour les combats dont les statistiques sont publiées ; là où il manque, le modèle utilise des valeurs typiques.',
    es: 'El historial de golpes y derribos solo existe para las peleas con estadísticas publicadas; donde falta, el modelo usa valores típicos.',
  },
  'Fights are hard to call: a pick is an estimate, and upsets are common.': {
    pt: 'Lutas são difíceis de prever: um palpite é uma estimativa, e zebras são comuns.',
    fr: 'Les combats sont difficiles à prévoir : un pronostic n’est qu’une estimation, et les surprises sont fréquentes.',
    es: 'Las peleas son difíciles de pronosticar: un pronóstico es una estimación y las sorpresas son comunes.',
  },
  'Always 50/50': { pt: 'Sempre 50/50', fr: 'Toujours 50/50', es: 'Siempre 50/50' },
  'Logistic regression': { pt: 'Regressão logística', fr: 'Régression logistique', es: 'Regresión logística' },
  'Random forest': { pt: 'Floresta aleatória', fr: 'Forêt aléatoire', es: 'Bosque aleatorio' },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "1,753" (as the API writes it) in the number format of the language. */
function number(text: string, language: string) {
  return Number(text.replaceAll(',', '')).toLocaleString(localeTag(language))
}

/** "62.7" (as the API writes it) with the decimal mark of the language. */
function decimal(text: string, language: string) {
  return Number(text).toLocaleString(localeTag(language), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** "June 2023" in the language on screen. */
function monthYear(text: string, language: string) {
  const [month, year] = text.split(' ')
  const index = MONTHS.indexOf(month)
  if (index === -1) return text
  return new Date(Date.UTC(Number(year), index, 1)).toLocaleDateString(localeTag(language), { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "2026-10-20" in the language on screen. */
function longDate(iso: string, language: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(localeTag(language), { day: 'numeric', month: 'long', year: 'numeric' })
}

type Template = {
  pattern: RegExp
  text: Record<Exclude<UiLang, 'en'>, (m: RegExpMatchArray, language: string) => string>
}

const TEMPLATES: Template[] = [
  {
    pattern: /^Measured once on ([\d,]+) fights \((\w+ \d{4}) to (\w+ \d{4})\), all later than the fights it trained on, each fighter described as of the morning of the fight\. It picked the winner ([\d.]+)% of the time; its confidence was calibrated on a separate block of earlier fights\.$/,
    text: {
      pt: (m, l) => `Medido uma única vez em ${number(m[1], l)} lutas (${monthYear(m[2], l)} a ${monthYear(m[3], l)}), todas posteriores às do treino, com cada lutador descrito como estava na manhã da luta. Ele acertou o vencedor em ${decimal(m[4], l)}% das vezes; a confiança dele foi calibrada em um bloco separado de lutas anteriores.`,
      fr: (m, l) => `Mesuré une seule fois sur ${number(m[1], l)} combats (${monthYear(m[2], l)} à ${monthYear(m[3], l)}), tous postérieurs à ceux de l’entraînement, chaque combattant étant décrit tel qu’il était le matin du combat. Il a trouvé le vainqueur ${decimal(m[4], l)} % du temps ; sa confiance a été calibrée sur un bloc distinct de combats antérieurs.`,
      es: (m, l) => `Medido una sola vez en ${number(m[1], l)} peleas (${monthYear(m[2], l)} a ${monthYear(m[3], l)}), todas posteriores a las del entrenamiento, con cada peleador descrito como estaba la mañana de la pelea. Acertó el ganador el ${decimal(m[4], l)} % de las veces; su confianza se calibró con un bloque aparte de peleas anteriores.`,
    },
  },
  {
    pattern: /^Measured on ([\d,]+) recent fights \((\w+ \d{4}) to (\w+ \d{4})\), given each fighter's age and record as of the fight\. The model's own file reports ([\d.]+)% accuracy, from when it was trained on data that is not in this repository; that could not be reproduced\. The picks it rated (\d+)% or more were right (\d+)% of the time\. Read its probabilities as rough\.$/,
    text: {
      pt: (m, l) => `Medido em ${number(m[1], l)} lutas recentes (${monthYear(m[2], l)} a ${monthYear(m[3], l)}), com a idade e o cartel de cada lutador na data da luta. O arquivo do próprio modelo informa ${m[4]}% de acerto, de quando foi treinado com dados que não estão neste repositório; isso não pôde ser reproduzido. Os palpites que ele classificou com ${m[5]}% ou mais acertaram ${m[6]}% das vezes. Trate as chances que ele dá como aproximadas.`,
      fr: (m, l) => `Mesuré sur ${number(m[1], l)} combats récents (${monthYear(m[2], l)} à ${monthYear(m[3], l)}), avec l’âge et le palmarès de chaque combattant à la date du combat. Le fichier du modèle annonce ${m[4]} % de précision, à l’époque où il a été entraîné sur des données absentes de ce dépôt ; cela n’a pas pu être reproduit. Les pronostics qu’il notait ${m[5]} % ou plus étaient justes ${m[6]} % du temps. Lisez ses probabilités comme approximatives.`,
      es: (m, l) => `Medido en ${number(m[1], l)} peleas recientes (${monthYear(m[2], l)} a ${monthYear(m[3], l)}), con la edad y el récord de cada peleador en la fecha de la pelea. El archivo del propio modelo informa un ${m[4]} % de precisión, de cuando se entrenó con datos que no están en este repositorio; eso no se pudo reproducir. Los pronósticos que calificó con ${m[5]} % o más acertaron el ${m[6]} % de las veces. Interpreta sus probabilidades como aproximadas.`,
    },
  },
  {
    pattern: /^The test accuracy it reports \(([\d.]+)%\) could not be reproduced: on ([\d,]+) recent fights it got (\d+)% right\.$/,
    text: {
      pt: (m, l) => `A taxa de acerto de teste que ele informa (${m[1]}%) não pôde ser reproduzida: em ${number(m[2], l)} lutas recentes ele acertou ${m[3]}%.`,
      fr: (m, l) => `La précision au test qu’il annonce (${m[1]} %) n’a pas pu être reproduite : sur ${number(m[2], l)} combats récents, il a eu ${m[3]} % de bonnes réponses.`,
      es: (m, l) => `La precisión de prueba que informa (${m[1]} %) no se pudo reproducir: en ${number(m[2], l)} peleas recientes acertó el ${m[3]} %.`,
    },
  },
  {
    pattern: /^Its probabilities are overconfident: picks it rated (\d+)% or more were right about (\d+)% of the time\.$/,
    text: {
      pt: (m) => `As probabilidades dele são exageradas: os palpites que ele classificou com ${m[1]}% ou mais acertaram cerca de ${m[2]}% das vezes.`,
      fr: (m) => `Ses probabilités sont trop confiantes : les pronostics qu’il notait ${m[1]} % ou plus étaient justes environ ${m[2]} % du temps.`,
      es: (m) => `Sus probabilidades son demasiado confiadas: los pronósticos que calificó con ${m[1]} % o más acertaron cerca del ${m[2]} % de las veces.`,
    },
  },
  {
    pattern: /^(\d+) of these picks were saved by the ([\w -]+), in use since (\d{4}-\d{2}-\d{2})\. Earlier picks came from the model it replaced and are kept exactly as they were shown\. The record of each model is counted separately below\.$/,
    text: {
      pt: (m, l) => `${m[1]} destes palpites foram salvos pelo ${MODEL_NAMES[m[2]]?.pt ?? m[2]}, em uso desde ${longDate(m[3], l)}. Os palpites anteriores vieram do modelo que ele substituiu e foram mantidos exatamente como foram exibidos. O histórico de cada modelo é contado separadamente abaixo.`,
      fr: (m, l) => `${m[1]} de ces pronostics ont été enregistrés par le ${MODEL_NAMES[m[2]]?.fr ?? m[2]}, utilisé depuis le ${longDate(m[3], l)}. Les pronostics précédents venaient du modèle qu’il a remplacé et sont conservés exactement tels qu’ils ont été affichés. Le bilan de chaque modèle est compté séparément ci-dessous.`,
      es: (m, l) => `${m[1]} de estos pronósticos los guardó el ${MODEL_NAMES[m[2]]?.es ?? m[2]}, en uso desde el ${longDate(m[3], l)}. Los pronósticos anteriores vinieron del modelo que reemplazó y se conservan exactamente como se mostraron. El historial de cada modelo se cuenta por separado más abajo.`,
    },
  },
  {
    pattern: /^(\d+) of these picks were saved before (\d{4}-\d{2}-\d{2}), by an earlier version of the model that gave a different answer depending on which fighter was listed first\. They are kept exactly as they were shown\. Picks saved from that day on use the corrected version\.$/,
    text: {
      pt: (m, l) => `${m[1]} destes palpites foram salvos antes de ${longDate(m[2], l)}, por uma versão anterior do modelo que dava respostas diferentes conforme o lutador listado primeiro. Eles foram mantidos exatamente como foram exibidos. Os palpites salvos a partir desse dia usam a versão corrigida.`,
      fr: (m, l) => `${m[1]} de ces pronostics ont été enregistrés avant le ${longDate(m[2], l)}, par une version antérieure du modèle qui donnait une réponse différente selon le combattant cité en premier. Ils sont conservés exactement tels qu’ils ont été affichés. Les pronostics enregistrés à partir de ce jour utilisent la version corrigée.`,
      es: (m, l) => `${m[1]} de estos pronósticos se guardaron antes del ${longDate(m[2], l)}, con una versión anterior del modelo que daba una respuesta distinta según qué peleador aparecía primero. Se conservan exactamente como se mostraron. Los pronósticos guardados desde ese día usan la versión corregida.`,
    },
  },
]

/** The model names the API puts in a sentence (lower case, as in "saved by the pre-fight model"). */
const MODEL_NAMES: Record<string, { pt: string; fr: string; es: string }> = {
  'pre-fight model': { pt: 'modelo pré-luta', fr: 'modèle pré-combat', es: 'modelo previo a la pelea' },
  'current model': { pt: 'modelo atual', fr: 'modèle actuel', es: 'modelo actual' },
}

/** An English sentence from the API, in the language on screen. */
export function localizeApiText(text: string | null | undefined, language: string | boolean = false): string {
  if (!text) return ''
  const lang = uiLang(language)
  if (lang === 'en') return text
  const fixed = FIXED[text]
  if (fixed) return fixed[lang]
  for (const template of TEMPLATES) {
    const match = text.match(template.pattern)
    if (match) return template.text[lang](match, typeof language === 'string' ? language : '')
  }
  return text
}

const BASELINE_NAMES: Record<string, Entry & { en: string }> = {
  dummy_most_frequent: { en: 'most frequent class', pt: 'classe mais frequente', fr: 'classe majoritaire', es: 'clase más frecuente' },
  dummy_prior: { en: 'always 50/50', pt: 'sempre 50/50', fr: 'toujours 50/50', es: 'siempre 50/50' },
  logistic_regression: { en: 'logistic regression', pt: 'regressão logística', fr: 'régression logistique', es: 'regresión logística' },
  random_forest: { en: 'random forest', pt: 'floresta aleatória', fr: 'forêt aléatoire', es: 'bosque aleatorio' },
}

/** The name of a baseline model ("dummy_most_frequent") in the language on screen. */
export function baselineName(key: string, language: string | boolean = false): string {
  const names = BASELINE_NAMES[key]
  if (!names) return key.replaceAll('_', ' ')
  return names[uiLang(language)]
}
