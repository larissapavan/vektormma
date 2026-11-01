import { uiLang, type UiLang } from '../../i18n/lang'

export const DIVISION_NAMES_PT: Record<string, string> = {
  Flyweight: 'Peso Mosca',
  Bantamweight: 'Peso Galo',
  Featherweight: 'Peso Pena',
  Lightweight: 'Peso Leve',
  Welterweight: 'Peso Meio-Médio',
  Middleweight: 'Peso Médio',
  'Super Middleweight': 'Peso Super-Médio',
  'Light Heavyweight': 'Peso Meio-Pesado',
  Cruiserweight: 'Peso Cruzador',
  Heavyweight: 'Peso Pesado',
  "Women's Strawweight": 'Peso Palha Feminino',
  "Women's Flyweight": 'Peso Mosca Feminino',
  "Women's Bantamweight": 'Peso Galo Feminino',
  "Women's Featherweight": 'Peso Pena Feminino',
  "Women's Lightweight": 'Peso Leve Feminino',
  "Women's Atomweight": 'Peso Átomo Feminino',
  'Catch Weight': 'Peso Combinado',
  Catchweight: 'Peso Combinado',
  'Open Class': 'Peso Aberto',
  'Open Class / Unclassified': 'Peso Aberto / Outros',
}

export const DIVISION_NAMES_FR: Record<string, string> = {
  Flyweight: 'Poids mouche',
  Bantamweight: 'Poids coq',
  Featherweight: 'Poids plume',
  Lightweight: 'Poids léger',
  Welterweight: 'Poids mi-moyen',
  Middleweight: 'Poids moyen',
  'Super Middleweight': 'Poids super-moyen',
  'Light Heavyweight': 'Poids mi-lourd',
  Cruiserweight: 'Poids lourd-léger',
  Heavyweight: 'Poids lourd',
  "Women's Strawweight": 'Poids paille féminin',
  "Women's Flyweight": 'Poids mouche féminin',
  "Women's Bantamweight": 'Poids coq féminin',
  "Women's Featherweight": 'Poids plume féminin',
  "Women's Lightweight": 'Poids léger féminin',
  "Women's Atomweight": 'Poids atome féminin',
  'Catch Weight': 'Poids convenu',
  Catchweight: 'Poids convenu',
  'Open Class': 'Poids libre',
  'Open Class / Unclassified': 'Poids libre / autres',
}

export const DIVISION_NAMES_ES: Record<string, string> = {
  Flyweight: 'Peso Mosca',
  Bantamweight: 'Peso Gallo',
  Featherweight: 'Peso Pluma',
  Lightweight: 'Peso Ligero',
  Welterweight: 'Peso Wélter',
  Middleweight: 'Peso Medio',
  'Super Middleweight': 'Peso Supermedio',
  'Light Heavyweight': 'Peso Semipesado',
  Cruiserweight: 'Peso Crucero',
  Heavyweight: 'Peso Pesado',
  "Women's Strawweight": 'Peso Paja Femenino',
  "Women's Flyweight": 'Peso Mosca Femenino',
  "Women's Bantamweight": 'Peso Gallo Femenino',
  "Women's Featherweight": 'Peso Pluma Femenino',
  "Women's Lightweight": 'Peso Ligero Femenino',
  "Women's Atomweight": 'Peso Átomo Femenino',
  'Catch Weight': 'Peso Pactado',
  Catchweight: 'Peso Pactado',
  'Open Class': 'Peso Abierto',
  'Open Class / Unclassified': 'Peso Abierto / Otros',
}

const DIVISION_NAMES: Record<UiLang, Record<string, string> | null> = {
  pt: DIVISION_NAMES_PT,
  fr: DIVISION_NAMES_FR,
  es: DIVISION_NAMES_ES,
  en: null,
}

export function getDivisionName(division: string | null | undefined, language: string | boolean = false): string {
  if (!division) return ''
  const trimmed = division.trim()
  const names = DIVISION_NAMES[uiLang(language)]
  if (!names) return trimmed
  const lower = trimmed.toLowerCase()
  const key = Object.keys(names).find((k) => k.toLowerCase() === lower)
  return key ? names[key] : trimmed
}

const POUND_FOR_POUND: Record<Exclude<UiLang, 'en'>, { men: string; women: string; any: string }> = {
  pt: { men: 'Peso por Peso Masculino', women: 'Peso por Peso Feminino', any: 'Peso por Peso' },
  fr: { men: 'Livre pour livre masculin', women: 'Livre pour livre féminin', any: 'Livre pour livre' },
  es: { men: 'Libra por Libra Masculino', women: 'Libra por Libra Femenino', any: 'Libra por Libra' },
}

/** "Men's Pound-for-Pound" in the active language (the ranking categories come from the API in English). */
export function poundForPoundLabel(category: string, language: string | boolean = false): string {
  const lang = uiLang(language)
  if (lang === 'en') return category.replace('Pound-for-Pound ', '')
  const names = POUND_FOR_POUND[lang]
  return category
    .replace("Men's Pound-for-Pound", names.men)
    .replace("Women's Pound-for-Pound", names.women)
    .replace('Pound-for-Pound', names.any)
}

/** Official weight limits (lb) and the order the UFC lists its divisions in, lightest first, men then women. */
const LIMITS_LB: Record<string, number> = {
  Flyweight: 125,
  Bantamweight: 135,
  Featherweight: 145,
  Lightweight: 155,
  Welterweight: 170,
  Middleweight: 185,
  'Super Middleweight': 168,
  'Light Heavyweight': 205,
  Cruiserweight: 200,
  Heavyweight: 265,
  "Women's Strawweight": 115,
  "Women's Flyweight": 125,
  "Women's Bantamweight": 135,
  "Women's Featherweight": 145,
}

const ORDER = Object.keys(LIMITS_LB)

export function divisionOrder(division: string) {
  const index = ORDER.indexOf(division)
  return index === -1 ? ORDER.length : index
}

/** "125 lb (56.7 kg)", or null for a division without an official limit. */
export function divisionLimit(division: string): string | null {
  const pounds = LIMITS_LB[division]
  return pounds ? `${pounds} lb (${(pounds * 0.45359237).toFixed(1)} kg)` : null
}
