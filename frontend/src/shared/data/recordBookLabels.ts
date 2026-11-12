/**
 * The names of the record book's categories, stats and notes in every language (the API sends them in English). Kept apart
 * from the page so the build can write the same names into the static HTML of /record-book (see src/seo/pages.ts).
 */

import { uiLang, type UiLang } from '../../i18n/lang'

export const CATEGORY_BLURBS: Record<string, string> = {
  Fights: 'Wins, finishes, streaks and title wins across a whole career.',
  Time: 'How long fights last and how much of that time a fighter spends in control.',
  Striking: 'Significant strikes, accuracy, defense and knockdowns.',
  Grappling: 'Takedowns, takedown defense and submission attempts.',
}

export const CATEGORY_NAMES_PT: Record<string, string> = {
  Fights: 'Lutas & Vitórias',
  Time: 'Tempo de Combate',
  Striking: 'Golpes & Trocação',
  Grappling: 'Quedas & Chão',
}

export const STAT_TITLES_PT: Record<string, string> = {
  TotalFights: 'Total de Lutas',
  Wins: 'Vitórias',
  Finishes: 'Vitórias pela Via Rápida (Nocautes e Finalizações)',
  KOTKOWins: 'Vitórias por Nocaute (KO/TKO)',
  SubmissionWins: 'Vitórias por Finalização',
  DecisionWins: 'Vitórias por Decisão',
  WinStreak: 'Maior Sequência de Vitórias',
  TitleFightWins: 'Vitórias em Disputas de Cinturão',
  TotalAwards: 'Total de Bônus da Noite',
  AverageFightTimeShort: 'Menor Média de Tempo de Luta',
  AverageFightTimeLong: 'Maior Média de Tempo de Luta',
  TotalFightTime: 'Tempo Total de Luta no Octógono',
  ControlTime: 'Tempo Total de Controle',
  ControlTimePercentage: 'Porcentagem de Tempo de Controle',
  TopPositionTime: 'Tempo de Controle por Cima no Chão',
  TopPositionTimePercentage: 'Porcentagem de Tempo por Cima no Chão',
  BottomPositionTime: 'Tempo de Chão por Baixo',
  BottomPositionTimePercentage: 'Porcentagem de Tempo por Baixo',
  Knockdowns: 'Knockdowns Aplicados',
  KnockdownsAverage: 'Média de Knockdowns (por 15 min)',
  SigStrikesLanded: 'Golpes Traumáticos Conectados',
  SigStrikesAccuracy: 'Precisão de Golpes Traumáticos',
  SLpM: 'Golpes Traumáticos Conectados por Minuto',
  SignificantStrikesDifferential: 'Saldo Diferencial de Golpes Traumáticos',
  SignificantStrikesDefense: 'Defesa de Golpes Traumáticos',
  SApM: 'Golpes Traumáticos Absorvidos por Minuto',
  TotalStrikesLanded: 'Total de Golpes Conectados',
  TakedownsLanded: 'Quedas Aplicadas',
  TakedownsAccuracy: 'Precisão de Quedas',
  TakedownsDefense: 'Defesa de Quedas',
  SubmissionsAttempted: 'Tentativas de Finalização',
  SubmissionsAverage: 'Média de Tentativas de Finalização (por 15 min)',
}

export const STAT_NOTES_PT: Record<string, string> = {
  'Minimum 5 UFC Fights': 'Mínimo de 5 lutas no UFC',
  'Minimum 5 UFC Fights and 500 Significant Strike Attempts': 'Mínimo de 5 lutas no UFC e 500 tentativas de golpes traumáticos',
  'Minimum 5 UFC Fights and 500 Strike Attempts by Opponents': 'Mínimo de 5 lutas no UFC e 500 tentativas de golpes pelos oponentes',
  'Minimum 5 UFC Fights and 20 Takedown Attempts': 'Mínimo de 5 lutas no UFC e 20 tentativas de queda',
  'Minimum 5 UFC Fights and 20 Takedown Attempts by Opponent': 'Mínimo de 5 lutas no UFC e 20 tentativas de queda pelo oponente',
}

export const CATEGORY_NAMES_FR: Record<string, string> = {
  Fights: 'Combats et victoires',
  Time: 'Temps de combat',
  Striking: 'Frappe',
  Grappling: 'Lutte au sol',
}

export const STAT_TITLES_FR: Record<string, string> = {
  TotalFights: 'Total de combats',
  Wins: 'Victoires',
  Finishes: 'Victoires avant la limite',
  KOTKOWins: 'Victoires par KO/TKO',
  SubmissionWins: 'Victoires par soumission',
  DecisionWins: 'Victoires par décision',
  WinStreak: 'Plus longue série de victoires',
  TitleFightWins: 'Victoires en combat de titre',
  TotalAwards: 'Total des bonus de la soirée',
  AverageFightTimeShort: 'Temps de combat moyen le plus court',
  AverageFightTimeLong: 'Temps de combat moyen le plus long',
  TotalFightTime: 'Temps de combat total dans l’octogone',
  ControlTime: 'Temps de contrôle total',
  ControlTimePercentage: 'Pourcentage de temps de contrôle',
  TopPositionTime: 'Temps de contrôle en position haute',
  TopPositionTimePercentage: 'Pourcentage de temps en position haute',
  BottomPositionTime: 'Temps au sol en position basse',
  BottomPositionTimePercentage: 'Pourcentage de temps en position basse',
  Knockdowns: 'Knockdowns infligés',
  KnockdownsAverage: 'Moyenne de knockdowns (par 15 min)',
  SigStrikesLanded: 'Coups significatifs réussis',
  SigStrikesAccuracy: 'Précision des coups significatifs',
  SLpM: 'Coups significatifs réussis par minute',
  SignificantStrikesDifferential: 'Différentiel de coups significatifs',
  SignificantStrikesDefense: 'Défense des coups significatifs',
  SApM: 'Coups significatifs absorbés par minute',
  TotalStrikesLanded: 'Total des coups réussis',
  TakedownsLanded: 'Amenées au sol réussies',
  TakedownsAccuracy: 'Précision des amenées au sol',
  TakedownsDefense: 'Défense des amenées au sol',
  SubmissionsAttempted: 'Tentatives de soumission',
  SubmissionsAverage: 'Moyenne des tentatives de soumission (par 15 min)',
}

export const STAT_NOTES_FR: Record<string, string> = {
  'Minimum 5 UFC Fights': 'Au moins 5 combats à l’UFC',
  'Minimum 5 UFC Fights and 500 Significant Strike Attempts': 'Au moins 5 combats à l’UFC et 500 tentatives de coups significatifs',
  'Minimum 5 UFC Fights and 500 Strike Attempts by Opponents': 'Au moins 5 combats à l’UFC et 500 tentatives de coups des adversaires',
  'Minimum 5 UFC Fights and 20 Takedown Attempts': 'Au moins 5 combats à l’UFC et 20 tentatives d’amenée au sol',
  'Minimum 5 UFC Fights and 20 Takedown Attempts by Opponent': 'Au moins 5 combats à l’UFC et 20 tentatives d’amenée au sol de l’adversaire',
}

export const CATEGORY_NAMES_ES: Record<string, string> = {
  Fights: 'Peleas y victorias',
  Time: 'Tiempo de pelea',
  Striking: 'Golpeo',
  Grappling: 'Lucha en el suelo',
}

export const STAT_TITLES_ES: Record<string, string> = {
  TotalFights: 'Total de peleas',
  Wins: 'Victorias',
  Finishes: 'Victorias antes del límite',
  KOTKOWins: 'Victorias por KO/TKO',
  SubmissionWins: 'Victorias por sumisión',
  DecisionWins: 'Victorias por decisión',
  WinStreak: 'Mayor racha de victorias',
  TitleFightWins: 'Victorias en peleas por el título',
  TotalAwards: 'Total de bonos de la noche',
  AverageFightTimeShort: 'Menor tiempo promedio de pelea',
  AverageFightTimeLong: 'Mayor tiempo promedio de pelea',
  TotalFightTime: 'Tiempo total de pelea en el octágono',
  ControlTime: 'Tiempo total de control',
  ControlTimePercentage: 'Porcentaje de tiempo de control',
  TopPositionTime: 'Tiempo de control en posición superior',
  TopPositionTimePercentage: 'Porcentaje de tiempo en posición superior',
  BottomPositionTime: 'Tiempo en el suelo en posición inferior',
  BottomPositionTimePercentage: 'Porcentaje de tiempo en posición inferior',
  Knockdowns: 'Knockdowns conseguidos',
  KnockdownsAverage: 'Promedio de knockdowns (por 15 min)',
  SigStrikesLanded: 'Golpes significativos conectados',
  SigStrikesAccuracy: 'Precisión de golpes significativos',
  SLpM: 'Golpes significativos conectados por minuto',
  SignificantStrikesDifferential: 'Diferencial de golpes significativos',
  SignificantStrikesDefense: 'Defensa de golpes significativos',
  SApM: 'Golpes significativos recibidos por minuto',
  TotalStrikesLanded: 'Total de golpes conectados',
  TakedownsLanded: 'Derribos conseguidos',
  TakedownsAccuracy: 'Precisión de derribos',
  TakedownsDefense: 'Defensa de derribos',
  SubmissionsAttempted: 'Intentos de sumisión',
  SubmissionsAverage: 'Promedio de intentos de sumisión (por 15 min)',
}

export const STAT_NOTES_ES: Record<string, string> = {
  'Minimum 5 UFC Fights': 'Mínimo de 5 peleas en la UFC',
  'Minimum 5 UFC Fights and 500 Significant Strike Attempts': 'Mínimo de 5 peleas en la UFC y 500 intentos de golpes significativos',
  'Minimum 5 UFC Fights and 500 Strike Attempts by Opponents': 'Mínimo de 5 peleas en la UFC y 500 intentos de golpes de los rivales',
  'Minimum 5 UFC Fights and 20 Takedown Attempts': 'Mínimo de 5 peleas en la UFC y 20 intentos de derribo',
  'Minimum 5 UFC Fights and 20 Takedown Attempts by Opponent': 'Mínimo de 5 peleas en la UFC y 20 intentos de derribo del rival',
}

export type Tables = Record<Exclude<UiLang, 'en'>, Record<string, string>>

export function localizedLabel(language: string, english: string, tables: Tables, key: string) {
  const lang = uiLang(language)
  return lang === 'en' ? english : (tables[lang][key] ?? english)
}

export const CATEGORY_TABLES: Tables = { pt: CATEGORY_NAMES_PT, fr: CATEGORY_NAMES_FR, es: CATEGORY_NAMES_ES }
export const STAT_TITLE_TABLES: Tables = { pt: STAT_TITLES_PT, fr: STAT_TITLES_FR, es: STAT_TITLES_ES }
export const STAT_NOTE_TABLES: Tables = { pt: STAT_NOTES_PT, fr: STAT_NOTES_FR, es: STAT_NOTES_ES }
