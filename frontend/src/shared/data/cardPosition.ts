import { L } from '../../i18n/lang'

/**
 * Where a fight sits on its card (1 is the main event, 2 the co-main), named the way the MMA community does in each
 * language. Pure text, no React, so the build can use it for the static pages too.
 */
export function cardPositionLabel(position: number | null | undefined, language: string | boolean): string {
  if (position === 1) return L(language, 'Main event', 'Main event', 'Main event', 'Pelea estelar')
  if (position === 2) return L(language, 'Co-main', 'Co-main event', 'Co-main event', 'Co-estelar')
  return L(language, 'Luta do card', 'Fight on the card', 'Combat du card', 'Pelea de la cartelera')
}
