import type { ByLang } from '../../i18n/lang'
import type { DealId } from './events'

/** The sponsors are made-up brands (no real company), so a card never claims anything about one. */
export const DEAL_TEXT: Record<DealId, { sponsor: string; ask: ByLang }> = {
  winner: {
    sponsor: 'Rede Ponto Forte',
    ask: { pt: 'Vença a próxima luta.', en: 'Win the next fight.', fr: 'Gagnez le prochain combat.', es: 'Gana la próxima pelea.' },
  },
  finisher: {
    sponsor: 'Linha Octógono',
    ask: { pt: 'Vença a próxima luta por nocaute ou finalização.', en: 'Win the next fight by knockout or submission.', fr: 'Gagnez le prochain combat par KO ou soumission.', es: 'Gana la próxima pelea por nocaut o sumisión.' },
  },
  underdog: {
    sponsor: 'Energético Faísca',
    ask: {
      pt: 'Vença a próxima luta sendo azarão (chance abaixo de 45%).',
      en: 'Win the next fight as an underdog (chance below 45%).',
      fr: 'Gagnez le prochain combat en étant outsider (probabilité sous 45 %).',
      es: 'Gana la próxima pelea siendo desfavorito (probabilidad por debajo del 45 %).',
    },
  },
}
