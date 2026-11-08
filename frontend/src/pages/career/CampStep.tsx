import { useTranslation } from 'react-i18next'
import { ArrowRight, HeartPulse } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import { canRetire, COACHES, previewCamp, type Career, type CoachId } from '../../shared/game/career'
import { COACH_TEXT } from '../../shared/game/coaches'
import { Chip, Emblem, GhostButton, useFocusOnMount } from './ui'

export interface CampNote {
  injured: boolean
  declined: boolean
}

/** One coach: who they are, what they are good at, and exactly what a camp with them would do to this fighter. */
function CoachCard({ coachId, career, onTrain }: { coachId: CoachId; career: Career; onTrain: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const text = COACH_TEXT[coachId]
  const preview = previewCamp(career, COACHES[coachId])
  const injury = Math.round(preview.injury * 100)
  return (
    <article aria-label={text.name} className="flex w-full flex-col gap-3 border-2 border-[var(--rule)] bg-[var(--bg-surface)] p-4 text-left">
      <span className="flex items-center gap-3">
        <Emblem name={text.name.replace('Coach ', '')} className="h-12 w-12 text-lg" />
        <span className="min-w-0">
          <span className="block break-words font-display text-base font-extrabold uppercase leading-tight text-[var(--text-main)]">{text.name}</span>
          <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-red)]">{pick(lang, text.specialty)}</span>
        </span>
      </span>
      <span className="text-xs leading-5 text-[var(--text-secondary)]">{pick(lang, text.blurb)}</span>
      <span className="mt-auto flex flex-wrap gap-1.5">
        <Chip tone={preview.striking >= 2 ? 'green' : 'neutral'}>{L(lang, 'Golpes', 'Striking', 'Frappe', 'Golpeo')} +{preview.striking.toFixed(1)}</Chip>
        <Chip tone={preview.takedowns >= 2 ? 'green' : 'neutral'}>{L(lang, 'Quedas', 'Takedowns', 'Amenées', 'Derribos')} +{preview.takedowns.toFixed(1)}</Chip>
        <Chip tone={injury >= 14 ? 'red' : injury <= 5 ? 'green' : 'neutral'}>{L(lang, `Lesão ${injury}%`, `Injury ${injury}%`, `Blessure ${injury} %`, `Lesión ${injury} %`)}</Chip>
        <Chip>{L(lang, `+${preview.age} ano`, `+${preview.age} yr`, `+${preview.age} an`, `+${preview.age} año`)}</Chip>
        {preview.scout > 0 ? <Chip tone="gold">{L(lang, 'Vantagem na próxima luta', 'Edge in the next fight', 'Avantage au prochain combat', 'Ventaja en la próxima pelea')}</Chip> : null}
      </span>
      <button
        type="button"
        onClick={onTrain}
        aria-label={L(lang, `Treinar com ${text.name}`, `Train with ${text.name}`, `S’entraîner avec ${text.name}`, `Entrenar con ${text.name}`)}
        className="ghost-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs uppercase hover:!border-[var(--accent-red)]"
      >
        {L(lang, 'Treinar', 'Train', 'S’entraîner', 'Entrenar')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </article>
  )
}

/** Between fights: three coaches on offer, each with its own "Train" button: one touch chooses and starts the camp. */
export function CampStep({ career, coaches, note, onTrain, onRetire, retirable = true }: { career: Career; coaches: CoachId[]; note: CampNote | null; onTrain: (coach: CoachId) => void; onRetire: () => void; retirable?: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const heading = useFocusOnMount<HTMLHeadingElement>()

  return (
    <section className="surface-card rounded-2xl space-y-5 p-4 sm:space-y-6 sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-red)]">{L(lang, 'Preparação', 'Preparation', 'Préparation', 'Preparación')}</p>
        <h2 ref={heading} tabIndex={-1} className="game-title mt-1 text-xl focus:outline-none sm:text-3xl">
          {career.ufcFights === 0
            ? L(lang, 'Camp para a estreia no UFC', 'Camp for your UFC debut', 'Préparation pour vos débuts à l’UFC', 'Campamento para tu debut en la UFC')
            : L(lang, `Camp para a luta ${career.ufcFights + 1} no UFC`, `Camp for UFC fight ${career.ufcFights + 1}`, `Préparation pour le combat n° ${career.ufcFights + 1} à l’UFC`, `Campamento para la pelea ${career.ufcFights + 1} en la UFC`)}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{L(lang, 'Cada técnico muda o que você ganha e o que arrisca. O camp começa assim que você escolhe.', 'Each coach changes what you gain and what you risk. The camp starts as soon as you choose.', 'Chaque entraîneur change ce que vous gagnez et ce que vous risquez. La préparation commence dès que vous choisissez.', 'Cada técnico cambia lo que ganas y lo que arriesgas. El campamento empieza en cuanto eliges.')}</p>
      </div>

      {note?.injured ? (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 px-4 py-3 text-sm font-semibold text-[var(--text-main)]">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-red)]" aria-hidden="true" />
          {L(lang, 'Você se machucou no camp anterior e perdeu tempo e um pouco de rendimento.', 'You got hurt in the last camp and lost time and some sharpness.', 'Vous vous êtes blessé lors de la dernière préparation et avez perdu du temps et un peu de rendement.', 'Te lesionaste en el campamento anterior y perdiste tiempo y algo de nivel.')}
        </p>
      ) : null}
      {note?.declined ? (
        <p className="text-xs text-[var(--text-muted)]">{L(lang, 'Os anos pesam: seus golpes e quedas perdem um pouco a cada camp.', 'The years show: your striking and takedowns slip a little every camp.', 'Les années se font sentir : votre frappe et vos amenées perdent un peu à chaque préparation.', 'Los años pesan: tu golpeo y tus derribos bajan un poco en cada campamento.')}</p>
      ) : null}
      {career.rival ? (
        <p className="rounded-xl bg-[var(--bg-surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {L(lang, `Seu rival: ${career.rival}. Ele pode aparecer como revanche.`, `Your rival: ${career.rival}. A rematch may be on offer.`, `Votre rival : ${career.rival}. Une revanche peut vous être proposée.`, `Tu rival: ${career.rival}. Puede ofrecerse una revancha.`)}
        </p>
      ) : null}

      <fieldset>
        <legend className="sr-only">{L(lang, 'Técnicos disponíveis', 'Coaches on offer', 'Entraîneurs proposés', 'Técnicos disponibles')}</legend>
        <div className="grid gap-3 md:grid-cols-3 sm:gap-4">
          {coaches.map((coachId) => (
            <CoachCard key={coachId} coachId={coachId} career={career} onTrain={() => onTrain(coachId)} />
          ))}
        </div>
      </fieldset>

      {retirable && canRetire(career) ? (
        <div className="flex flex-wrap items-center gap-3">
          <GhostButton onClick={onRetire}>{L(lang, 'Aposentar', 'Retire', 'Prendre sa retraite', 'Retirarse')}</GhostButton>
        </div>
      ) : null}
    </section>
  )
}
