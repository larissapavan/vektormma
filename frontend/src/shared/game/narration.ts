import { uiLang, type UiLang } from '../../i18n/lang'
import type { Edge, Method, RoundStory } from './career'

/**
 * What the commentary says in the career game. Each line has `{you}` (the player's fighter), `{opp}` and `{round}`; the
 * variant chosen when the fight was played is kept, so switching language does not rewrite a fight already shown.
 */

type Lines = Record<UiLang, string[]>

const EDGE: Record<Edge, Lines> = {
  you: {
    pt: [
      '{you} controla o centro do octógono e dita o ritmo.',
      '{you} encaixa golpes limpos e {opp} começa a recuar.',
      '{you} vence a briga no clinch e machuca por dentro.',
    ],
    en: [
      '{you} controls the center of the octagon and sets the pace.',
      '{you} lands clean shots and {opp} starts to back up.',
      '{you} wins the clinch exchanges and does damage on the inside.',
    ],
    fr: [
      '{you} contrôle le centre de l’octogone et impose le rythme.',
      '{you} place des coups propres et {opp} commence à reculer.',
      '{you} domine le clinch et fait des dégâts à mi-distance.',
    ],
    es: [
      '{you} domina el centro del octágono y marca el ritmo.',
      '{you} conecta golpes limpios y {opp} empieza a retroceder.',
      '{you} gana los intercambios en el clinch y hace daño por dentro.',
    ],
  },
  opp: {
    pt: [
      '{opp} pressiona e leva a melhor na troca.',
      '{opp} acerta o jab com frequência e {you} tem dificuldade para entrar.',
      '{opp} controla a luta contra a grade e leva o round.',
    ],
    en: [
      '{opp} pushes forward and gets the better of the exchanges.',
      '{opp} lands the jab again and again and {you} struggles to get in.',
      '{opp} controls the fight against the fence and takes the round.',
    ],
    fr: [
      '{opp} met la pression et a le dessus dans les échanges.',
      '{opp} touche au jab à répétition et {you} peine à rentrer.',
      '{opp} contrôle le combat contre la cage et prend le round.',
    ],
    es: [
      '{opp} presiona y se lleva los intercambios.',
      '{opp} conecta el jab una y otra vez y a {you} le cuesta entrar.',
      '{opp} controla la pelea contra la reja y se lleva el round.',
    ],
  },
  even: {
    pt: [
      'Round parelho: os dois acertam, ninguém se impõe.',
      'Estudo de distância, com poucos golpes limpos dos dois lados.',
      'Trocação franca e equilíbrio total até o gongo.',
    ],
    en: [
      'An even round: both land, neither takes over.',
      'Feeling out the distance, with few clean shots on either side.',
      'A frank exchange and total balance until the horn.',
    ],
    fr: [
      'Round équilibré : les deux touchent, personne ne s’impose.',
      'Étude de la distance, peu de coups propres de part et d’autre.',
      'Échanges francs et équilibre total jusqu’au gong.',
    ],
    es: [
      'Round parejo: los dos conectan, nadie se impone.',
      'Se miden la distancia, con pocos golpes limpios de ambos lados.',
      'Intercambio franco y equilibrio total hasta el campanazo.',
    ],
  },
}

const FINISH: Record<`${Exclude<Method, 'dec'>}-${'win' | 'loss'}`, Lines> = {
  'ko-win': {
    pt: [
      '{you} encontra o queixo de {opp} com um cruzado e ele desaba! Nocaute no round {round}!',
      'Uma joelhada e uma sequência pesada: o árbitro para a luta. TKO de {you} no round {round}!',
      '{opp} cai após um gancho e {you} termina com golpes no chão. TKO no round {round}!',
    ],
    en: [
      '{you} finds {opp}’s chin with a cross and he goes down! Knockout in round {round}!',
      'A knee and a heavy flurry: the referee steps in. TKO for {you} in round {round}!',
      '{opp} drops from a hook and {you} finishes it with ground strikes. TKO in round {round}!',
    ],
    fr: [
      '{you} trouve le menton de {opp} d’un direct et il s’écroule ! KO au round {round} !',
      'Un genou puis une série lourde : l’arbitre arrête le combat. TKO pour {you} au round {round} !',
      '{opp} tombe sur un crochet et {you} conclut au sol. TKO au round {round} !',
    ],
    es: [
      '{you} encuentra la mandíbula de {opp} con un cruzado y cae al piso. ¡Nocaut en el round {round}!',
      'Un rodillazo y una ráfaga pesada: el árbitro detiene la pelea. ¡TKO de {you} en el round {round}!',
      '{opp} cae por un gancho y {you} lo remata en el suelo. ¡TKO en el round {round}!',
    ],
  },
  'ko-loss': {
    pt: [
      '{opp} acerta em cheio e {you} cai. Nocaute no round {round}.',
      'Sequência pesada de {opp} e o árbitro interrompe a luta. TKO no round {round}.',
      'Um cruzado pega {you} desprevenido e a luta termina no round {round}.',
    ],
    en: [
      '{opp} connects flush and {you} goes down. Knockout in round {round}.',
      'A heavy flurry from {opp} and the referee stops it. TKO in round {round}.',
      'A cross catches {you} off guard and the fight ends in round {round}.',
    ],
    fr: [
      '{opp} touche en plein et {you} s’écroule. KO au round {round}.',
      'Grosse série de {opp} et l’arbitre arrête le combat. TKO au round {round}.',
      'Un direct surprend {you} et le combat s’arrête au round {round}.',
    ],
    es: [
      '{opp} conecta de lleno y {you} cae. Nocaut en el round {round}.',
      'Ráfaga pesada de {opp} y el árbitro detiene la pelea. TKO en el round {round}.',
      'Un cruzado sorprende a {you} y la pelea termina en el round {round}.',
    ],
  },
  'sub-win': {
    pt: [
      '{you} leva ao chão, pega as costas e fecha o mata-leão! {opp} bate. Finalização no round {round}!',
      '{you} encaixa uma chave de braço e {opp} é obrigado a bater. Finalização no round {round}!',
      'Triângulo bem encaixado: {opp} bate e a luta acaba no round {round}!',
    ],
    en: [
      '{you} takes it to the mat, takes the back and sinks in the rear-naked choke! {opp} taps. Submission in round {round}!',
      '{you} locks in an armbar and {opp} has to tap. Submission in round {round}!',
      'A tight triangle: {opp} taps and it is over in round {round}!',
    ],
    fr: [
      '{you} amène au sol, prend le dos et place l’étranglement arrière ! {opp} tape. Soumission au round {round} !',
      '{you} verrouille une clé de bras et {opp} doit taper. Soumission au round {round} !',
      'Un triangle bien serré : {opp} tape et c’est terminé au round {round} !',
    ],
    es: [
      '{you} lo lleva al suelo, toma la espalda y cierra la estrangulación por detrás. {opp} golpea la lona. ¡Sumisión en el round {round}!',
      '{you} encaja una llave de brazo y {opp} tiene que rendirse. ¡Sumisión en el round {round}!',
      'Triángulo bien apretado: {opp} se rinde y todo termina en el round {round}.',
    ],
  },
  'sub-loss': {
    pt: [
      '{opp} pega as costas e fecha o mata-leão. {you} bate no round {round}.',
      'Chave de braço de {opp}: {you} não tem saída e bate. Finalização no round {round}.',
      'Guilhotina de {opp} no meio de uma queda; {you} bate no round {round}.',
    ],
    en: [
      '{opp} takes the back and sinks in the rear-naked choke. {you} taps in round {round}.',
      '{opp} locks in an armbar: {you} has no way out and taps. Submission in round {round}.',
      '{opp} catches a guillotine in the middle of a takedown; {you} taps in round {round}.',
    ],
    fr: [
      '{opp} prend le dos et place l’étranglement arrière. {you} tape au round {round}.',
      'Clé de bras de {opp} : {you} n’a aucune issue et tape. Soumission au round {round}.',
      '{opp} saisit une guillotine en pleine amenée au sol ; {you} tape au round {round}.',
    ],
    es: [
      '{opp} toma la espalda y cierra la estrangulación por detrás. {you} se rinde en el round {round}.',
      'Llave de brazo de {opp}: {you} no tiene salida y se rinde. Sumisión en el round {round}.',
      '{opp} pesca una guillotina en plena derribada; {you} se rinde en el round {round}.',
    ],
  },
}

const DECISION: Record<'win' | 'win-split' | 'loss' | 'loss-split', Record<UiLang, string>> = {
  win: {
    pt: 'A luta vai aos cartões: decisão unânime para {you}!',
    en: 'It goes to the scorecards: unanimous decision for {you}!',
    fr: 'Direction les cartons : décision unanime pour {you} !',
    es: 'Se va a las tarjetas: ¡decisión unánime para {you}!',
  },
  'win-split': {
    pt: 'Cartões divididos, mas {you} leva por decisão dividida!',
    en: 'The cards are split, but {you} takes a split decision!',
    fr: 'Les cartons sont partagés, mais {you} l’emporte par décision partagée !',
    es: 'Las tarjetas se dividen, ¡pero {you} se lleva la decisión dividida!',
  },
  loss: {
    pt: 'A luta vai aos cartões: decisão unânime para {opp}.',
    en: 'It goes to the scorecards: unanimous decision for {opp}.',
    fr: 'Direction les cartons : décision unanime pour {opp}.',
    es: 'Se va a las tarjetas: decisión unánime para {opp}.',
  },
  'loss-split': {
    pt: 'Cartões divididos, e {opp} leva por decisão dividida.',
    en: 'The cards are split, and {opp} takes a split decision.',
    fr: 'Les cartons sont partagés, et {opp} l’emporte par décision partagée.',
    es: 'Las tarjetas se dividen y {opp} se lleva la decisión dividida.',
  },
}

function fill(line: string, you: string, opp: string, round: number) {
  return line.replace(/\{you\}/g, you).replace(/\{opp\}/g, opp).replace(/\{round\}/g, String(round))
}

/** The commentary for one round: the finish if this round ended the fight, otherwise who had the better of it. */
export function roundText(language: string, story: RoundStory, method: Method, won: boolean, you: string, opp: string): string {
  const lang = uiLang(language)
  if (story.finish && method !== 'dec') {
    const lines = FINISH[`${method}-${won ? 'win' : 'loss'}` as keyof typeof FINISH][lang]
    return fill(lines[story.variant % lines.length], you, opp, story.round)
  }
  const lines = EDGE[story.edge][lang]
  return fill(lines[story.variant % lines.length], you, opp, story.round)
}

/** The line after the last round of a fight that went the distance. */
export function decisionText(language: string, won: boolean, split: boolean, you: string, opp: string): string {
  const key = `${won ? 'win' : 'loss'}${split ? '-split' : ''}` as keyof typeof DECISION
  return fill(DECISION[key][uiLang(language)], you, opp, 0)
}
