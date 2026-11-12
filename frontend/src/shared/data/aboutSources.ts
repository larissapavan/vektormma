/**
 * The sources the About page credits: what each one is used for, in every language. Kept apart from the page so the build
 * can write the same text into the static HTML of /about (see src/seo/pages.ts). No React here.
 */

import { L, pick, type ByLang } from '../../i18n/lang'

export const ABOUT_SOURCES: { name: string; href?: string; use: string; usePt: string }[] = [
  {
    name: 'UFCStats.com',
    href: 'http://ufcstats.com',
    use: 'Fighter profiles, events, fight results and career stats.',
    usePt: 'Perfis de lutadores, histórico de eventos, resultados oficiais e estatísticas de carreira.',
  },
  {
    name: 'ESPN',
    href: 'https://www.espn.com/mma/',
    use: 'Events, results, upcoming cards, fighter records, new-fighter profiles, fighter photos and the news headlines on the home and events pages (each links back to the original story). Also the whole Bellator archive: its events, results, fighter profiles and headshots.',
    usePt: 'Eventos, resultados, cards futuros, fotos e notícias esportivas conectadas às matérias originais.',
  },
  {
    name: 'UFC.com',
    href: 'https://www.ufc.com/rankings',
    use: 'Official rankings, the current champions’ photos and hometowns.',
    usePt: 'Rankings oficiais atualizados, fotos dos campeões em atividade e cidades natais.',
  },
  {
    name: 'UFC Stats Leaders',
    href: 'https://statleaders.ufc.com/en/career',
    use: 'The UFC’s official career Record Book: all-time leaders in wins, finishes, striking, grappling and more.',
    usePt: 'Livro oficial de recordes do UFC: líderes históricos em vitórias, nocautes, finalizações, golpes e quedas.',
  },
  {
    name: 'roster.watch',
    href: 'https://www.roster.watch/',
    use: 'The UFC roster, current and former: who is on it, nationalities, debut and last fight dates, and the origin and honor badges (Contender Series, TUF, Road to UFC, BMF, Hall of Fame).',
    usePt: 'Status do plantel do UFC (lutadores ativos e ex-lutadores), nacionalidades, datas de estreia e honrarias (Contender Series, TUF, Hall da Fama).',
  },
  {
    name: 'pflmma.com',
    href: 'https://pflmma.com',
    use: 'The Professional Fighters League’s own site: its events, results, fighter profiles, headshots and the official rankings. Only the pages its robots.txt allows are read; the headshots are stored here as small copies.',
    usePt: 'Dados e rankings da Professional Fighters League (PFL).',
  },
  {
    name: 'FightHub',
    href: 'https://fighthub-app.com/br/gyms/',
    use: 'The directory of gyms and teams and the fighters who train in each, shown on the Gyms pages and matched by name with the fighters of each organization. Only the pages its robots.txt allows are read.',
    usePt: 'Diretório de academias, centros de treinamento e vinculação de lutadores e equipes.',
  },
  {
    name: 'Next-Fight',
    href: 'https://next-fight.com',
    use: 'Fight announcements, upcoming fight cards, matchup confirmations and title fight notices (such as UFC 336: Prates vs. Morales).',
    usePt: 'Anúncios antecipados de lutas, confirmação de cards futuros e disputas de cinturão (como o UFC 336: Prates vs. Morales).',
  },
  {
    name: 'Tapology',
    href: 'https://www.tapology.com',
    use: 'Fighter career records, comprehensive fight histories across regional and global MMA circuits (Jungle Fight, Predador FC, LFA, etc.), and finish methods.',
    usePt: 'Cartéis completos de lutadores, histórico de lutas em circuitos regionais e internacionais de MMA (Jungle Fight, Predador FC, LFA, etc.) e métodos de encerramento.',
  },
  {
    name: 'ONE Championship',
    href: 'https://www.onefc.com',
    use: 'Official ONE Championship event cards, results, fighter profiles and photos, and divisional champions across MMA and Muay Thai.',
    usePt: 'Cards oficiais de eventos do ONE Championship, resultados, perfis e fotos de atletas e campeões das divisões de MMA e Muay Thai.',
  },
  {
    name: 'Sherdog',
    href: 'https://www.sherdog.com',
    use: 'Fighter career fight archives, historical records, physical attributes, and career lineages.',
    usePt: 'Arquivo histórico de lutas de carreira, cartéis oficiais, atributos físicos e fotos históricas de ex-lutadores.',
  },
  {
    name: 'Wikipedia',
    href: 'https://en.wikipedia.org',
    use: 'Complete professional MMA fight records, tournament Grand Prix brackets (Predador FC, Jungle Fight, PRIDE, WEC, Strikeforce), and historical title lineages (CC BY-SA 4.0).',
    usePt: 'Registros completos de lutas de MMA profissional, chaves de torneios Grand Prix e históricos de reinados de cinturão sob licença Creative Commons (CC BY-SA 4.0).',
  },
  {
    name: 'Published UFC title histories',
    use: 'Champions, title reigns and the list of BMF title fights, compiled by hand.',
    usePt: 'Compilação manual do histórico de disputas de cinturão e lutas pelo cinturão BMF.',
  },
  {
    name: 'UFC data by scarekrow (Kaggle)',
    href: 'https://www.kaggle.com/datasets/scarekrow/ufc-data',
    use: 'The referee, scheduled rounds, title-fight flag and judges’ scores shown on fight cards (UFC_full_data_silver_v2.csv).',
    usePt: 'Árbitros, rounds previstos e pontuações dos juízes em cards históricos.',
  },
  {
    name: 'flagcdn.com',
    href: 'https://flagcdn.com',
    use: 'Country flag images.',
    usePt: 'Bandeiras oficiais dos países de origem dos atletas.',
  },
  {
    name: 'Google Fonts',
    href: 'https://fonts.google.com',
    use: 'Big Shoulders Display and Hanken Grotesk, both under the SIL Open Font License.',
    usePt: 'Fontes Big Shoulders Display e Hanken Grotesk, ambas sob a SIL Open Font License.',
  },
  {
    name: 'UFC Historical Fight Dataset (1993–2026) (Kaggle)',
    href: 'https://www.kaggle.com/datasets/larissapavan/ufc-historical-fight-dataset-19942026',
    use: 'The author’s own dataset, published on Kaggle: the events, fights, fighters, rankings and title reigns this site is built on.',
    usePt: 'Dataset original publicado pela autora no Kaggle, servindo como base unificada de dados do projeto.',
  },
]

const SOURCE_USE_FR: Record<string, string> = {
  'UFCStats.com': 'Profils des combattants, événements, résultats et statistiques de carrière.',
  ESPN: "Événements, résultats, cartes à venir, palmarès, profils des nouveaux combattants, photos et les titres d'actualité des pages d'accueil et d'événements (chacun renvoie vers l'article d'origine). Aussi l'ensemble des archives du Bellator : événements, résultats, profils et portraits.",
  'UFC.com': "Classements officiels, photos des champions en titre et villes d'origine.",
  'UFC Stats Leaders': "Le livre des records officiel de l'UFC : leaders historiques en victoires, victoires avant la limite, frappe, lutte et plus encore.",
  'roster.watch': "L'effectif de l'UFC, actuel et ancien : qui en fait partie, nationalités, dates de début et de dernier combat, et les badges d'origine et d'honneur (Contender Series, TUF, Road to UFC, BMF, Temple de la renommée).",
  'pflmma.com': "Le site de la Professional Fighters League : événements, résultats, profils, portraits et classements officiels. Seules les pages autorisées par son robots.txt sont lues ; les portraits sont stockés ici en petites copies.",
  FightHub: "L'annuaire des salles et des équipes, et les combattants qui s'y entraînent, affiché sur les pages Salles et rapproché par le nom avec les combattants de chaque organisation. Seules les pages autorisées par son robots.txt sont lues.",
  'Next-Fight': 'Annonces de combats, cartes à venir, confirmations d’affrontements et avis de combats de titre (comme UFC 336: Prates vs. Morales).',
  Tapology: "Palmarès complets des combattants, historiques des combats à travers les circuits régionaux et mondiaux de MMA (Jungle Fight, Predador FC, LFA, etc.) et méthodes de victoire.",
  'ONE Championship': "Cartes officielles d'événements du ONE Championship, résultats, profils et photos d'athlètes et champions des divisions de MMA et Muay Thai.",
  Sherdog: "Archives des combats de carrière, palmarès officiels, attributs physiques et photos d'archives.",
  Wikipedia: "Registres complets des combats professionnels de MMA, tableaux de tournois Grand Prix et historiques des règnes de titres (CC BY-SA 4.0).",
  'Published UFC title histories': 'Champions, règnes et la liste des combats pour le titre BMF, compilés à la main.',
  'UFC data by scarekrow (Kaggle)': 'L’arbitre, les rounds prévus, l’indicateur de combat de titre et les notes des juges affichés sur les cartes (UFC_full_data_silver_v2.csv).',
  'flagcdn.com': 'Images des drapeaux.',
  'Google Fonts': 'Big Shoulders Display et Hanken Grotesk, toutes deux sous la SIL Open Font License.',
  'UFC Historical Fight Dataset (1993–2026) (Kaggle)': "Le jeu de données de l'autrice, publié sur Kaggle : les événements, combats, combattants, classements et règnes de titre sur lesquels ce site est construit.",
}

const SOURCE_USE_ES: Record<string, string> = {
  'UFCStats.com': 'Perfiles de peleadores, eventos, resultados de peleas y estadísticas de carrera.',
  ESPN: 'Eventos, resultados, próximas carteleras, récords de los peleadores, perfiles de peleadores nuevos, fotos y los titulares de noticias de las páginas de inicio y de eventos (cada uno enlaza a la nota original). También todo el archivo de Bellator: sus eventos, resultados, perfiles de peleadores y retratos.',
  'UFC.com': 'Ranking oficial, fotos de los campeones actuales y ciudades de origen.',
  'UFC Stats Leaders': 'El libro oficial de récords de carrera de la UFC: líderes históricos en victorias, finalizaciones, golpeo, lucha en el suelo y más.',
  'roster.watch': 'El plantel de la UFC, actual y anterior: quién forma parte de él, nacionalidades, fechas de debut y de última pelea, y las insignias de origen y de honor (Contender Series, TUF, Road to UFC, BMF, Salón de la Fama).',
  'pflmma.com': 'El sitio de la Professional Fighters League: sus eventos, resultados, perfiles de peleadores, retratos y el ranking oficial. Solo se leen las páginas que permite su robots.txt; los retratos se guardan aquí como copias pequeñas.',
  FightHub: 'El directorio de gimnasios y equipos y de los peleadores que entrenan en cada uno, que se muestra en las páginas de Gimnasios y se cruza por nombre con los peleadores de cada organización. Solo se leen las páginas que permite su robots.txt.',
  'Next-Fight': 'Anuncios de peleas, próximas carteleras, confirmaciones de enfrentamientos y avisos de peleas por el título (como UFC 336: Prates vs. Morales).',
  Tapology: 'Récords completos de los peleadores, historiales de peleas en circuitos de MMA regionales y mundiales (Jungle Fight, Predador FC, LFA, etc.) y métodos de victoria.',
  'ONE Championship': 'Carteleras oficiales de eventos de ONE Championship, resultados, perfiles y fotos de peleadores y campeones de las divisiones de MMA y muay thai.',
  Sherdog: 'Archivo de peleas de carrera, récords históricos, atributos físicos y linajes de carrera.',
  Wikipedia: 'Récords completos de peleas de MMA profesional, llaves de torneos Grand Prix (Predador FC, Jungle Fight, PRIDE, WEC, Strikeforce) y linajes históricos de títulos (CC BY-SA 4.0).',
  'Published UFC title histories': 'Campeones, reinados y la lista de peleas por el título BMF, recopilados a mano.',
  'UFC data by scarekrow (Kaggle)': 'El árbitro, los asaltos programados, la marca de pelea por el título y las puntuaciones de los jueces que se muestran en las carteleras (UFC_full_data_silver_v2.csv).',
  'flagcdn.com': 'Imágenes de las banderas de los países.',
  'Google Fonts': 'Big Shoulders Display y Hanken Grotesk, ambas con la licencia SIL Open Font License.',
  'UFC Historical Fight Dataset (1993–2026) (Kaggle)': 'El conjunto de datos de la autora, publicado en Kaggle: los eventos, peleas, peleadores, rankings y reinados de título sobre los que se construye este sitio.',
}

const SOURCE_NAMES: Record<string, ByLang> = {
  'Published UFC title histories': {
    en: 'Published UFC title histories',
    pt: 'Históricos de títulos do UFC publicados',
    fr: 'Historiques de titres UFC publiés',
    es: 'Historiales de títulos de la UFC publicados',
  },
  'UFC data by scarekrow (Kaggle)': {
    en: 'UFC data by scarekrow (Kaggle)',
    pt: 'Dados do UFC por scarekrow (Kaggle)',
    fr: 'Données UFC par scarekrow (Kaggle)',
    es: 'Datos de la UFC por scarekrow (Kaggle)',
  },
  'UFC Historical Fight Dataset (1993–2026) (Kaggle)': {
    en: 'UFC Historical Fight Dataset (1993–2026) (Kaggle)',
    pt: 'Base histórica de lutas do UFC (1993–2026) (Kaggle)',
    fr: 'Jeu de données historique des combats UFC (1993–2026) (Kaggle)',
    es: 'Conjunto de datos histórico de peleas de la UFC (1993–2026) (Kaggle)',
  },
}

export function sourceName(name: string, language: string) {
  const names = SOURCE_NAMES[name]
  return names ? pick(language, names) : name
}

/** What a source is used for, in the active language. */
export function sourceUse(source: { name: string; use: string; usePt: string }, language: string): string {
  return L(language, source.usePt, source.use, SOURCE_USE_FR[source.name], SOURCE_USE_ES[source.name])
}
