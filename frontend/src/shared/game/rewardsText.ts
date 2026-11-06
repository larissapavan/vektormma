import type { ByLang } from '../../i18n/lang'
import type { AchievementId } from './achievements'
import type { GoalId } from './goals'

/** The names of the achievements and what each one asks for. */
export const ACHIEVEMENT_TEXT: Record<AchievementId, { name: ByLang; hint: ByLang }> = {
  debut: {
    name: { pt: 'Estreia vitoriosa', en: 'Winning debut', fr: 'Débuts victorieux', es: 'Debut ganador' },
    hint: { pt: 'Vença a sua primeira luta no UFC.', en: 'Win your first UFC fight.', fr: 'Gagnez votre premier combat à l’UFC.', es: 'Gana tu primera pelea en la UFC.' },
  },
  knockout_artist: {
    name: { pt: 'Artista do nocaute', en: 'Knockout artist', fr: 'Artiste du KO', es: 'Artista del nocaut' },
    hint: { pt: 'Vença 3 lutas por nocaute.', en: 'Win 3 fights by knockout.', fr: 'Gagnez 3 combats par KO.', es: 'Gana 3 peleas por nocaut.' },
  },
  submission_hunter: {
    name: { pt: 'Caçador de finalizações', en: 'Submission hunter', fr: 'Chasseur de soumissions', es: 'Cazador de sumisiones' },
    hint: { pt: 'Vença 3 lutas por finalização.', en: 'Win 3 fights by submission.', fr: 'Gagnez 3 combats par soumission.', es: 'Gana 3 peleas por sumisión.' },
  },
  lightning: {
    name: { pt: 'Relâmpago', en: 'Lightning', fr: 'Éclair', es: 'Relámpago' },
    hint: { pt: 'Termine uma luta ainda no round 1.', en: 'Finish a fight in round 1.', fr: 'Terminez un combat dès le round 1.', es: 'Termina una pelea en el round 1.' },
  },
  hot_streak: {
    name: { pt: 'Em chamas', en: 'On fire', fr: 'En feu', es: 'En llamas' },
    hint: { pt: 'Emende 5 vitórias seguidas.', en: 'Win 5 fights in a row.', fr: 'Enchaînez 5 victoires de suite.', es: 'Encadena 5 victorias seguidas.' },
  },
  giant_killer: {
    name: { pt: 'Mata-gigantes', en: 'Giant killer', fr: 'Tombeur de géants', es: 'Matagigantes' },
    hint: { pt: 'Vença uma luta em que você era grande azarão.', en: 'Win a fight you were a heavy underdog in.', fr: 'Gagnez un combat où vous étiez très outsider.', es: 'Gana una pelea en la que eras gran desfavorito.' },
  },
  revenge: {
    name: { pt: 'Revanche cobrada', en: 'Revenge served', fr: 'Revanche prise', es: 'Revancha cobrada' },
    hint: { pt: 'Vença quem derrotou você.', en: 'Beat the fighter who beat you.', fr: 'Battez celui qui vous a battu.', es: 'Vence a quien te derrotó.' },
  },
  all_in: {
    name: { pt: 'Tudo ou nada', en: 'All in', fr: 'Quitte ou double', es: 'Todo o nada' },
    hint: {
      pt: 'Termine uma luta atacando quando estava perdendo nos cartões.',
      en: 'Finish a fight by attacking while you were behind on the cards.',
      fr: 'Terminez un combat en attaquant alors que vous étiez mené aux cartons.',
      es: 'Termina una pelea atacando cuando ibas perdiendo en las tarjetas.',
    },
  },
  lock_down: {
    name: { pt: 'Cadeado', en: 'Lockdown', fr: 'Verrouillage', es: 'Candado' },
    hint: {
      pt: 'Vença na decisão protegendo o resultado no último round.',
      en: 'Win on the cards by covering up in the last round.',
      fr: 'Gagnez aux points en vous protégeant au dernier round.',
      es: 'Gana por decisión protegiendo el resultado en el último round.',
    },
  },
  champion: {
    name: { pt: 'Campeão', en: 'Champion', fr: 'Champion', es: 'Campeón' },
    hint: { pt: 'Conquiste o cinturão.', en: 'Win the belt.', fr: 'Remportez la ceinture.', es: 'Conquista el cinturón.' },
  },
  defender: {
    name: { pt: 'Reinado', en: 'Long reign', fr: 'Long règne', es: 'Reinado' },
    hint: { pt: 'Defenda o cinturão 3 vezes.', en: 'Defend the belt 3 times.', fr: 'Défendez la ceinture 3 fois.', es: 'Defiende el cinturón 3 veces.' },
  },
  top5: {
    name: { pt: 'Entre os cinco melhores', en: 'Top five', fr: 'Top 5', es: 'Entre los cinco mejores' },
    hint: { pt: 'Chegue ao top 5 da divisão.', en: 'Reach the division’s top 5.', fr: 'Atteignez le top 5 de la catégorie.', es: 'Llega al top 5 de la división.' },
  },
  unbeaten: {
    name: { pt: 'Invicto', en: 'Unbeaten', fr: 'Invaincu', es: 'Invicto' },
    hint: {
      pt: 'Termine a carreira sem derrotas, com pelo menos 5 lutas no UFC.',
      en: 'End the career without a loss, after at least 5 UFC fights.',
      fr: 'Terminez la carrière sans défaite, avec au moins 5 combats à l’UFC.',
      es: 'Termina la carrera sin derrotas, con al menos 5 peleas en la UFC.',
    },
  },
  veteran: {
    name: { pt: 'Veterano', en: 'Veteran', fr: 'Vétéran', es: 'Veterano' },
    hint: { pt: 'Dispute 15 lutas no UFC.', en: 'Fight 15 times in the UFC.', fr: 'Disputez 15 combats à l’UFC.', es: 'Disputa 15 peleas en la UFC.' },
  },
  survivor: {
    name: { pt: 'Sobrevivente', en: 'Survivor', fr: 'Survivant', es: 'Superviviente' },
    hint: {
      pt: 'Vença depois de duas derrotas seguidas, a um passo de ser dispensado.',
      en: 'Win right after two straight losses, one step from being released.',
      fr: 'Gagnez juste après deux défaites de suite, à un pas d’être libéré.',
      es: 'Gana justo después de dos derrotas seguidas, a un paso de que te despidan.',
    },
  },
}

/** What each career goal asks for. */
export const GOAL_TEXT: Record<GoalId, ByLang> = {
  wins4: { pt: 'Vencer 4 lutas no UFC', en: 'Win 4 UFC fights', fr: 'Gagner 4 combats à l’UFC', es: 'Ganar 4 peleas en la UFC' },
  finishes3: { pt: 'Terminar 3 lutas antes do gongo final', en: 'Finish 3 fights before the final bell', fr: 'Terminer 3 combats avant la fin', es: 'Terminar 3 peleas antes del final' },
  streak3: { pt: 'Emendar 3 vitórias seguidas', en: 'Win 3 fights in a row', fr: 'Enchaîner 3 victoires de suite', es: 'Encadenar 3 victorias seguidas' },
  upset: { pt: 'Vencer uma luta como azarão', en: 'Win a fight as the underdog', fr: 'Gagner un combat en tant qu’outsider', es: 'Ganar una pelea como desfavorito' },
  round1: { pt: 'Terminar uma luta no round 1', en: 'Finish a fight in round 1', fr: 'Terminer un combat au round 1', es: 'Terminar una pelea en el round 1' },
  top15: { pt: 'Chegar ao top 15', en: 'Reach the top 15', fr: 'Atteindre le top 15', es: 'Llegar al top 15' },
  kos2: { pt: 'Vencer 2 lutas por nocaute', en: 'Win 2 fights by knockout', fr: 'Gagner 2 combats par KO', es: 'Ganar 2 peleas por nocaut' },
  subs2: { pt: 'Vencer 2 lutas por finalização', en: 'Win 2 fights by submission', fr: 'Gagner 2 combats par soumission', es: 'Ganar 2 peleas por sumisión' },
}
