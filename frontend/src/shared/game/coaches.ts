import type { ByLang } from '../../i18n/lang'
import type { CoachId } from './career'

/**
 * The coaches of the career game. They are made up (no real person or gym), so each camp can say what the coach is good at
 * without claiming anything about anyone. What a coach does to the numbers is in career.ts (COACHES).
 */

interface CoachText {
  name: string
  specialty: ByLang
  blurb: ByLang
}

export const COACH_TEXT: Record<CoachId, CoachText> = {
  striker: {
    name: 'Coach Duarte',
    specialty: { pt: 'Trocação', en: 'Striking', fr: 'Frappe', es: 'Golpeo' },
    blurb: {
      pt: 'Só pensa em trocação: seus golpes sobem muito, as quedas ficam de lado e o treino pesado cobra o corpo.',
      en: 'Lives for striking: your striking jumps, takedowns are left aside and the hard work takes a toll on the body.',
      fr: 'Ne pense qu’à la frappe : la vôtre progresse nettement, les amenées sont laissées de côté et le travail intense fatigue le corps.',
      es: 'Solo piensa en el golpeo: tu golpeo sube mucho, los derribos quedan de lado y el trabajo duro pasa factura al cuerpo.',
    },
  },
  wrestler: {
    name: 'Coach Petrov',
    specialty: { pt: 'Wrestling', en: 'Wrestling', fr: 'Lutte', es: 'Wrestling' },
    blurb: {
      pt: 'Ex-wrestler: suas quedas sobem muito, os golpes ficam parados e o treino pesado cobra o corpo.',
      en: 'A former wrestler: your takedowns jump, striking stands still and the hard work takes a toll on the body.',
      fr: 'Ancien lutteur : vos amenées progressent nettement, la frappe fait du surplace et le travail intense fatigue le corps.',
      es: 'Exwrestler: tus derribos suben mucho, el golpeo se queda quieto y el trabajo duro pasa factura al cuerpo.',
    },
  },
  allround: {
    name: 'Coach Lima',
    specialty: { pt: 'MMA completo', en: 'Full MMA', fr: 'MMA complet', es: 'MMA completo' },
    blurb: {
      pt: 'Treino equilibrado e sem sustos: melhora golpes e quedas por igual, com risco de lesão baixo.',
      en: 'Balanced work with no surprises: improves striking and takedowns equally, at a low injury risk.',
      fr: 'Un travail équilibré, sans surprise : améliore la frappe et les amenées à parts égales, avec un faible risque de blessure.',
      es: 'Trabajo equilibrado y sin sorpresas: mejora golpeo y derribos por igual, con bajo riesgo de lesión.',
    },
  },
  conditioning: {
    name: 'Coach Costa',
    specialty: { pt: 'Preparação física', en: 'Conditioning', fr: 'Préparation physique', es: 'Preparación física' },
    blurb: {
      pt: 'Cuida do corpo: você evolui pouco, mas quase não se machuca e envelhece menos. Bom depois de uma fase ruim.',
      en: 'Looks after the body: you improve a little, but you rarely get hurt and you age less. Good after a rough stretch.',
      fr: 'Prend soin du corps : vous progressez peu, mais vous vous blessez rarement et vieillissez moins. Idéal après une mauvaise passe.',
      es: 'Cuida el cuerpo: mejoras poco, pero casi no te lesionas y envejeces menos. Bueno tras una mala racha.',
    },
  },
  sparring: {
    name: 'Coach Ferreira',
    specialty: { pt: 'Sparring pesado', en: 'Hard sparring', fr: 'Sparring intense', es: 'Sparring pesado' },
    blurb: {
      pt: 'Sparrings duros com lutadores de elite: a evolução é a maior de todas, e o risco de lesão também.',
      en: 'Hard sparring with elite fighters: the biggest improvement of all, and the biggest injury risk too.',
      fr: 'Sparrings durs avec des combattants d’élite : la plus forte progression de toutes, et le plus gros risque de blessure aussi.',
      es: 'Sparrings duros con peleadores de élite: la mayor mejora de todas, y también el mayor riesgo de lesión.',
    },
  },
  scout: {
    name: 'Coach Tanaka',
    specialty: { pt: 'Estudo de vídeo', en: 'Film study', fr: 'Étude vidéo', es: 'Estudio de video' },
    blurb: {
      pt: 'Passa o camp estudando o adversário: você evolui um pouco menos, mas a próxima luta começa com uma vantagem.',
      en: 'Spends the camp studying the opponent: you improve a little less, but the next fight starts with an edge.',
      fr: 'Passe la préparation à étudier l’adversaire : vous progressez un peu moins, mais le prochain combat commence avec un avantage.',
      es: 'Pasa el campamento estudiando al rival: mejoras un poco menos, pero la próxima pelea empieza con ventaja.',
    },
  },
}
