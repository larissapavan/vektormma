import { uiLang, type UiLang } from '../../i18n/lang'

const FEATURE_NAMES_PT: Record<string, string> = {
  'Age difference': 'Diferença de idade',
  'Height difference': 'Diferença de altura',
  'Reach difference': 'Diferença de envergadura',
  'Wins difference': 'Diferença de vitórias',
  'Losses difference': 'Diferença de derrotas',
  'Striking accuracy gap': 'Diferença na precisão de golpes',
  'Takedown accuracy gap': 'Diferença no aproveitamento de quedas',
  'Win rate difference': 'Diferença na taxa de vitória',
  'Same stance': 'Mesma base',
  'Fight month': 'Mês do combate',
  'Fight year': 'Ano do combate',
  'Fighter A win rate': 'Taxa de vitória (Lutador A)',
  'Fighter B win rate': 'Taxa de vitória (Lutador B)',
  'Fighter A striking accuracy': 'Precisão de golpes (Lutador A)',
  'Fighter B striking accuracy': 'Precisão de golpes (Lutador B)',
  'Fighter A takedown accuracy': 'Aproveitamento de quedas (Lutador A)',
  'Fighter B takedown accuracy': 'Aproveitamento de quedas (Lutador B)',
}

const FEATURE_NAMES_FR: Record<string, string> = {
  'Age difference': "Écart d'âge",
  'Height difference': 'Écart de taille',
  'Reach difference': "Écart d'allonge",
  'Wins difference': 'Écart de victoires',
  'Losses difference': 'Écart de défaites',
  'Striking accuracy gap': 'Écart de précision en frappe',
  'Takedown accuracy gap': 'Écart de précision aux amenées au sol',
  'Win rate difference': 'Écart de taux de victoire',
  'Same stance': 'Même garde',
  'Fight month': 'Mois du combat',
  'Fight year': 'Année du combat',
  'Fighter A win rate': 'Taux de victoire (combattant A)',
  'Fighter B win rate': 'Taux de victoire (combattant B)',
  'Fighter A striking accuracy': 'Précision en frappe (combattant A)',
  'Fighter B striking accuracy': 'Précision en frappe (combattant B)',
  'Fighter A takedown accuracy': 'Précision aux amenées (combattant A)',
  'Fighter B takedown accuracy': 'Précision aux amenées (combattant B)',
}

const FEATURE_NAMES_ES: Record<string, string> = {
  'Age difference': 'Diferencia de edad',
  'Height difference': 'Diferencia de estatura',
  'Reach difference': 'Diferencia de alcance',
  'Wins difference': 'Diferencia de victorias',
  'Losses difference': 'Diferencia de derrotas',
  'Striking accuracy gap': 'Diferencia de precisión en golpeo',
  'Takedown accuracy gap': 'Diferencia de precisión en derribos',
  'Win rate difference': 'Diferencia en el porcentaje de victorias',
  'Same stance': 'Misma guardia',
  'Fight month': 'Mes de la pelea',
  'Fight year': 'Año de la pelea',
  'Fighter A win rate': 'Porcentaje de victorias (peleador A)',
  'Fighter B win rate': 'Porcentaje de victorias (peleador B)',
  'Fighter A striking accuracy': 'Precisión de golpeo (peleador A)',
  'Fighter B striking accuracy': 'Precisión de golpeo (peleador B)',
  'Fighter A takedown accuracy': 'Precisión en derribos (peleador A)',
  'Fighter B takedown accuracy': 'Precisión en derribos (peleador B)',
}

const FEATURE_NAMES: Record<UiLang, Record<string, string> | null> = {
  pt: FEATURE_NAMES_PT,
  fr: FEATURE_NAMES_FR,
  es: FEATURE_NAMES_ES,
  en: null,
}

export function localizeFeature(name: string, language: string | boolean = false): string {
  return FEATURE_NAMES[uiLang(language)]?.[name] ?? name
}
