/**
 * The text of the Data page: the sources and what each covers, and the steps from the official sites to a prediction.
 * Kept apart from the page so the build can write the same text into the static HTML of /data (see src/seo/pages.ts).
 * No React here.
 */

import { L, localeTag } from '../../i18n/lang'
import { historyRange } from './history'

const HISTORY_RANGE = historyRange()

export const DATA_ECOSYSTEM_SOURCES = [
  {
    org: 'UFC',
    name: 'UFCStats.com & UFC.com',
    href: 'http://www.ufcstats.com',
    scopePt: `Estatísticas oficiais round a round: golpes significativos, tempo de controle no chão, altura, envergadura e idade dos lutadores (${HISTORY_RANGE}).`,
    scopeEn: `Official round-by-round stats: significant strikes, ground control time, and the fighters’ height, reach and age (${HISTORY_RANGE}).`,
    scopeFr: `Statistiques officielles round par round : frappes significatives, temps de contrôle au sol, taille, allonge et âge des combattants (${HISTORY_RANGE}).`,
    scopeEs: `Estadísticas oficiales round por round: golpes significativos, tiempo de control en el suelo, estatura, alcance y edad de los peleadores (${HISTORY_RANGE}).`,
  },
  {
    org: 'PFL',
    name: 'PFLMMA.com & SmartCage',
    href: 'https://pflmma.com',
    scopePt: 'Estrutura de torneio regular, pontuação do SmartCage, playoffs e campeonatos sazonais de US$ 1M.',
    scopeEn: 'Regular season tournament structure, SmartCage metrics, playoffs, and $1M championship brackets.',
    scopeFr: 'Structure de tournoi de saison régulière, métriques SmartCage, éliminatoires et finales à 1M$.',
    scopeEs: 'Estructura de torneo de temporada regular, métricas de SmartCage, playoffs y campeonatos de 1 millón de dólares.',
  },
  {
    org: 'ONE',
    name: 'ONEFC.com',
    href: 'https://www.onefc.com',
    scopePt: 'Regras globais de MMA, combates de Muay Thai com luvas abertas de 4oz e campeões mundiais.',
    scopeEn: 'Global martial arts ruleset, 4oz open-finger glove Muay Thai, and world title holders.',
    scopeFr: 'Règles globales de MMA, Muay Thai en gants 4oz à doigts ouverts et champions du monde.',
    scopeEs: 'Reglamento global de artes marciales mixtas, muay thai con guantes de 4 oz de dedos abiertos y campeones mundiales.',
  },
  {
    org: 'Bellator',
    name: 'Sherdog & Wikipedia',
    href: 'https://www.sherdog.com',
    scopePt: 'Acervo histórico completo do Bellator (2009–2023), torneios Grand Prix e linhagens oficiais de cinturões.',
    scopeEn: 'Full Bellator archive (2009–2023), Grand Prix tournament brackets, and title lineages.',
    scopeFr: 'Archives complètes du Bellator (2009–2023), tournois Grand Prix et lignées de ceintures.',
    scopeEs: 'Archivo completo de Bellator (2009–2023), llaves de torneos Grand Prix y linajes de cinturones.',
  },
  {
    org: 'RIZIN · KSW · LFA · Cage Warriors',
    name: 'ESPN',
    href: 'https://www.espn.com/mma/',
    scopePt: 'Perfis de atletas e resultados de eventos de RIZIN, KSW, LFA e Cage Warriors, conforme a cobertura do ESPN em cada liga (RIZIN e KSW de 2025 em diante vêm do Sherdog). Sem cinturões nem rankings.',
    scopeEn: "Fighter profiles and event results for RIZIN, KSW, the LFA and Cage Warriors, as far as ESPN covers each league (RIZIN and KSW from 2025 on come from Sherdog). No belts or rankings.",
    scopeFr: "Profils des combattants et résultats des événements de RIZIN, KSW, la LFA et Cage Warriors, dans la mesure où ESPN couvre chaque ligue (RIZIN et KSW à partir de 2025 viennent de Sherdog). Ni ceintures ni classements.",
    scopeEs: 'Perfiles de peleadores y resultados de eventos de RIZIN, KSW, la LFA y Cage Warriors, según la cobertura de ESPN en cada liga (RIZIN y KSW desde 2025 vienen de Sherdog). Sin cinturones ni rankings.',
  },
  {
    org: 'OKTAGON · Jungle Fight · Invicta FC',
    name: 'oktagonmma.com & Sherdog',
    href: 'https://www.sherdog.com',
    scopePt: 'Eventos, cards e resultados do OKTAGON (site oficial), do Jungle Fight e do Invicta FC (Sherdog), com lutas de título marcadas. Sem rankings.',
    scopeEn: "Events, cards and results for OKTAGON (its own site), Jungle Fight and Invicta FC (Sherdog), with title bouts flagged. No rankings.",
    scopeFr: "Événements, cartes et résultats d'OKTAGON (son site officiel), du Jungle Fight et d'Invicta FC (Sherdog), avec les combats de titre signalés. Pas de classements.",
    scopeEs: 'Eventos, carteleras y resultados de OKTAGON (su sitio oficial), Jungle Fight e Invicta FC (Sherdog), con las peleas de título marcadas. Sin rankings.',
  },
  {
    org: 'Camps & Gyms',
    name: 'FightHub & Tapology',
    href: 'https://www.fighthub.net',
    scopePt: 'Cartéis no circuito regional (LFA, Jungle Fight, Cage Warriors), mapeamento de academias e histórico de camps.',
    scopeEn: 'Regional circuit track records (LFA, Jungle Fight, Cage Warriors), camp affiliations, and gym directories.',
    scopeFr: 'Palmarès sur les circuits régionaux, affiliations aux camps et annuaire des salles d’entraînement.',
    scopeEs: 'Récords en circuitos regionales (LFA, Jungle Fight, Cage Warriors), afiliaciones a campamentos y directorio de gimnasios.',
  },
]

export type DataSource = (typeof DATA_ECOSYSTEM_SOURCES)[number]

/** The organizations a source covers; the only one that is not a proper name is translated. */
export function sourceOrg(source: DataSource, language: string): string {
  return source.org === 'Camps & Gyms' ? L(language, 'Academias', 'Gyms', 'Salles', 'Gimnasios') : source.org
}

export function sourceScope(source: DataSource, language: string): string {
  return L(language, source.scopePt, source.scopeEn, source.scopeFr, source.scopeEs)
}

export interface DataStep {
  title: string
  text: string
  groups?: string[][]
}

export interface DataStepNumbers {
  fights: number
  fighters: number
  /** How many numbers the model reads for each fight, when known. */
  featureCount: number | null
  /** True when the pre-fight model is the one in use: the breakdown of its numbers is written for it. */
  prefight: boolean
}

/** The way from the official sites to a prediction, step by step. The counts come from the data, never typed in. */
export function dataSteps(lang: string, { fights, fighters, featureCount, prefight }: DataStepNumbers): DataStep[] {
  const n = (value: number) => value.toLocaleString(localeTag(lang))
  return [
    {
      title: L(lang, 'Coleta', 'Collection', 'Collecte', 'Recolección'),
      text: L(
        lang,
        'Os dados vêm dos sites oficiais das organizações e de arquivos públicos, listados abaixo. A coleta segue as regras de cada site (robots.txt).',
        'The data comes from the organizations’ official sites and from public archives, listed below. Collection follows each site’s rules (robots.txt).',
        'Les données viennent des sites officiels des organisations et d’archives publiques, listés plus bas. La collecte suit les règles de chaque site (robots.txt).',
        'Los datos vienen de los sitios oficiales de las organizaciones y de archivos públicos, listados abajo. La recolección sigue las reglas de cada sitio (robots.txt).',
      ),
    },
    {
      title: L(lang, 'Registro', 'Storage', 'Stockage', 'Registro'),
      text: L(
        lang,
        `${n(fights)} lutas e ${n(fighters)} lutadores, com checagem de formato e de duplicados a cada atualização.`,
        `${n(fights)} fights and ${n(fighters)} fighters, with format and duplicate checks on every update.`,
        `${n(fights)} combats et ${n(fighters)} combattants, avec un contrôle du format et des doublons à chaque mise à jour.`,
        `${n(fights)} peleas y ${n(fighters)} peleadores, con revisión de formato y de duplicados en cada actualización.`,
      ),
    },
    {
      title: L(lang, 'Limpeza', 'Cleaning', 'Nettoyage', 'Limpieza'),
      text: L(
        lang,
        'O mesmo lutador às vezes aparece com nomes diferentes em cada organização; os registros são unidos num cartel só, e as categorias de peso seguem um padrão.',
        'The same fighter sometimes shows up under different names in each organization; the entries are merged into one record, and weight classes follow one standard.',
        'Un même combattant apparaît parfois sous des noms différents selon l’organisation ; les fiches sont fusionnées en un seul palmarès et les catégories de poids suivent une même norme.',
        'El mismo peleador a veces aparece con nombres distintos en cada organización; los registros se unen en un solo récord y las categorías de peso siguen un mismo estándar.',
      ),
    },
    {
      title:
        featureCount != null
          ? L(lang, `Os ${featureCount} números de cada luta`, `The ${featureCount} numbers behind each fight`, `Les ${featureCount} chiffres de chaque combat`, `Los ${featureCount} números de cada pelea`)
          : L(lang, 'Os números de cada luta', 'The numbers behind each fight', 'Les chiffres de chaque combat', 'Los números de cada pelea'),
      text: prefight
        ? L(
        lang,
        'Tudo é medido como estava antes da luta. 22 números comparam os dois lutadores, e 7 descrevem a luta em si (mesma base ou não, número de rounds, disputa de título, categoria).',
        'Everything is measured as it stood before the fight. 22 numbers compare the two fighters, and 7 describe the fight itself (same stance or not, number of rounds, title fight, weight class).',
        'Tout est mesuré tel que c’était avant le combat. 22 chiffres comparent les deux combattants et 7 décrivent le combat lui-même (même garde ou non, nombre de rounds, combat pour le titre, catégorie).',
        'Todo se mide como estaba antes de la pelea. 22 números comparan a los dos peleadores y 7 describen la pelea en sí (misma guardia o no, número de rounds, pelea por el título, categoría).',
      )
        : L(
            lang,
            'Números dos dois lutadores, como estavam antes da luta: idade, altura, envergadura, cartel, precisão de golpes e de quedas, base.',
            'Numbers for both fighters as they stood before the fight: age, height, reach, record, striking and takedown accuracy, stance.',
            'Les chiffres des deux combattants tels qu’ils étaient avant le combat : âge, taille, allonge, palmarès, précision des frappes et des amenées au sol, garde.',
            'Números de ambos peleadores como estaban antes de la pelea: edad, estatura, alcance, récord, precisión de golpes y de derribos, guardia.',
          ),
      groups: !prefight ? undefined : [
        [L(lang, 'Corpo e idade', 'Body and age', 'Physique et âge', 'Cuerpo y edad'), L(lang, 'Diferença de envergadura, altura e idade.', 'Reach, height and age gaps.', 'Écarts d’allonge, de taille et d’âge.', 'Diferencia de alcance, estatura y edad.')],
        [L(lang, 'Trocação', 'Striking', 'Pieds-poings', 'Striking'), L(lang, 'Golpes significativos acertados e sofridos por minuto, precisão, defesa e knockdowns.', 'Significant strikes landed and absorbed per minute, accuracy, defense and knockdowns.', 'Frappes significatives portées et encaissées par minute, précision, défense et knockdowns.', 'Golpes significativos conectados y recibidos por minuto, precisión, defensa y knockdowns.')],
        [L(lang, 'Luta agarrada', 'Grappling', 'Lutte', 'Lucha'), L(lang, 'Quedas por 15 minutos, precisão e defesa de quedas, tempo de controle e tentativas de finalização.', 'Takedowns per 15 minutes, takedown accuracy and defense, control time and submission attempts.', 'Amenées au sol par 15 minutes, précision et défense, temps de contrôle et tentatives de soumission.', 'Derribos por 15 minutos, precisión y defensa de derribos, tiempo de control e intentos de sumisión.')],
        [L(lang, 'Experiência e momento', 'Experience and form', 'Expérience et forme', 'Experiencia y momento'), L(lang, 'Lutas e vitórias no UFC, sequência atual, dias parado, nota Elo e forma recente.', 'UFC fights and wins, current streak, days out, Elo rating and recent form.', 'Combats et victoires à l’UFC, série en cours, jours d’inactivité, cote Elo et forme récente.', 'Peleas y victorias en la UFC, racha actual, días inactivo, puntuación Elo y forma reciente.')],
      ],
    },
    {
      title: L(lang, 'Teste', 'Testing', 'Test', 'Prueba'),
      text: L(
        lang,
        'O modelo aprende só com lutas anteriores e é testado nas que vieram depois, do jeito que acontece de verdade antes de um evento.',
        'The model learns only from earlier fights and is tested on the ones that came after, the way it works for real before an event.',
        'Le modèle apprend uniquement sur les combats passés et il est testé sur ceux qui ont suivi, comme en conditions réelles avant un événement.',
        'El modelo aprende solo con peleas anteriores y se prueba con las que vinieron después, tal como pasa de verdad antes de un evento.',
      ),
    },
    {
      title: L(lang, 'Previsão', 'Prediction', 'Pronostic', 'Pronóstico'),
      text: L(
        lang,
        'Um modelo de árvores de decisão (gradient boosting) estima a chance de vitória de cada lutador. Em cada luta, o site mostra quais números mais puxaram a chance para um lado (valores SHAP).',
        'A decision-tree model (gradient boosting) estimates each fighter’s win chance. For every fight, the site shows which numbers pulled the chance most to one side (SHAP values).',
        'Un modèle d’arbres de décision (gradient boosting) estime la chance de victoire de chaque combattant. Pour chaque combat, le site montre les chiffres qui ont le plus tiré la chance d’un côté (valeurs SHAP).',
        'Un modelo de árboles de decisión (gradient boosting) estima la probabilidad de victoria de cada peleador. En cada pelea, el sitio muestra qué números inclinaron más la balanza (valores SHAP).',
      ),
    },
  ]
}
