import type { ByLang } from '../../i18n/lang'
import type { Advice, Tactic } from './career'

/** What the three tactics are called and what each one does, in the words of the corner. */
export const TACTIC_TEXT: Record<Tactic, { name: ByLang; hint: ByLang }> = {
  attack: {
    name: { pt: 'Atacar', en: 'Attack', fr: 'Attaquer', es: 'Atacar' },
    hint: {
      pt: 'Vai atrás da finalização. A luta tem mais chance de acabar no round, para os dois lados.',
      en: 'Goes for the finish. The fight is likelier to end in the round, for both fighters.',
      fr: 'Cherche la finition. Le combat a plus de chances de s’arrêter dans le round, pour les deux.',
      es: 'Va por el cierre. La pelea tiene más probabilidades de terminar en el round, para ambos.',
    },
  },
  steady: {
    name: { pt: 'Manter o plano', en: 'Stick to the plan', fr: 'Tenir le plan', es: 'Mantener el plan' },
    hint: {
      pt: 'Segue o plano de luta sem mudar nada.',
      en: 'Follows the game plan with no changes.',
      fr: 'Suit le plan de combat sans rien changer.',
      es: 'Sigue el plan de pelea sin cambiar nada.',
    },
  },
  cover: {
    name: { pt: 'Proteger', en: 'Cover up', fr: 'Se protéger', es: 'Protegerse' },
    hint: {
      pt: 'Joga seguro: menos risco de ser finalizado, mas fica mais difícil levar o round.',
      en: 'Plays it safe: less risk of being finished, but harder to win the round.',
      fr: 'Joue la sécurité : moins de risque d’être arrêté, mais plus difficile de gagner le round.',
      es: 'Juega seguro: menos riesgo de que te terminen, pero cuesta más ganar el round.',
    },
  },
}

/** What the corner says when asked, from the score on the cards. It says what the numbers favor; the call stays with the player. */
export const ADVICE_TEXT: Record<Advice, ByLang> = {
  protect: {
    pt: 'Você está na frente nos cartões e já não dá para perder na decisão. Só uma finalização tira a vitória de você: proteja o resultado.',
    en: 'You are ahead on the cards and can no longer lose on a decision. Only a finish can take the win away: protect the result.',
    fr: 'Vous menez aux cartons et ne pouvez plus perdre à la décision. Seule une finition peut vous enlever la victoire : protégez le résultat.',
    es: 'Vas arriba en las tarjetas y ya no puedes perder por decisión. Solo un cierre te quita la victoria: protege el resultado.',
  },
  finish: {
    pt: 'Nos cartões a luta já está perdida: só uma finalização salva você. Hora de arriscar tudo.',
    en: 'On the cards the fight is already lost: only a finish can save you. Time to risk everything.',
    fr: 'Aux cartons le combat est déjà perdu : seule une finition peut vous sauver. C’est le moment de tout risquer.',
    es: 'En las tarjetas la pelea ya está perdida: solo un cierre te salva. Es hora de arriesgarlo todo.',
  },
  attack: {
    pt: 'Vale arriscar: atacar aumenta suas chances neste ponto da luta.',
    en: 'Worth the risk: attacking raises your chances at this point of the fight.',
    fr: 'Le risque vaut le coup : attaquer augmente vos chances à ce stade du combat.',
    es: 'Vale la pena arriesgar: atacar aumenta tus probabilidades en este momento de la pelea.',
  },
  cover: {
    pt: 'Vale segurar: proteger o resultado aumenta suas chances neste ponto da luta.',
    en: 'Worth holding on: covering up raises your chances at this point of the fight.',
    fr: 'Mieux vaut tenir : se protéger augmente vos chances à ce stade du combat.',
    es: 'Conviene aguantar: protegerte aumenta tus probabilidades en este momento de la pelea.',
  },
  steady: {
    pt: 'Nenhuma tática se destaca agora: mantenha o plano.',
    en: 'No tactic stands out right now: stick to the plan.',
    fr: 'Aucune tactique ne se détache pour l’instant : tenez le plan.',
    es: 'Ninguna táctica destaca ahora: mantén el plan.',
  },
}
