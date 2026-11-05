import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, HeartPulse } from 'lucide-react'

import { L, pick } from '../../i18n/lang'
import { canRetire, COACHES, previewCamp, type Career, type CoachId } from '../../shared/game/career'
import { COACH_TEXT } from '../../shared/game/coaches'
import { Chip, Emblem, GhostButton, PrimaryButton } from './ui'

export interface CampNote {
  injured: boolean
  declined: boolean
}

/** One coach: who they are, what they are good at, and exactly what a camp with them would do to this fighter. */
function CoachCard({ coachId, career, selected, onChoose }: { coachId: CoachId; career: Career; selected: boolean; onChoose: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const text = COACH_TEXT[coachId]
  const preview = previewCamp(career, COACHES[coachId])
  const injury = Math.round(preview.injury * 100)
  return (
    <button type="button" aria-pressed={selected} onClick={onChoose} className="game-pick game-card flex w-full flex-col gap-3 p-4 text-left">
      <span className="flex items-center gap-3">
        <Emblem name={text.name.replace('Coach ', '')} className="h-12 w-12 text-lg" />
        <span className="min-w-0">
          <span className="block truncate font-display text-base font-extrabold uppercase leading-tight text-[var(--text-main)]">{text.name}</span>
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
    </button>
  )
}

/** Between fights: three coaches on offer; the player picks who to train with. */
export function CampStep({ career, coaches, note, onTrain, onRetire }: { career: Career; coaches: CoachId[]; note: CampNote | null; onTrain: (coach: CoachId) => void; onRetire: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [chosen, setChosen] = useState<CoachId | null>(null)

  return (
    <section className="game-card space-y-5 p-4 sm:space-y-6 sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-red)]">{L(lang, 'Preparação', 'Preparation', 'Préparation', 'Preparación')}</p>
        <h2 className="game-title mt-1 text-xl sm:text-3xl">
          {career.ufcFights === 0
            ? L(lang, 'Camp para a estreia no UFC', 'Camp for your UFC debut', 'Préparation pour vos débuts à l’UFC', 'Campamento para tu debut en la UFC')
            : L(lang, `Camp para a luta ${career.ufcFights + 1} no UFC`, `Camp for UFC fight ${career.ufcFights + 1}`, `Préparation pour le combat n° ${career.ufcFights + 1} à l’UFC`, `Campamento para la pelea ${career.ufcFights + 1} en la UFC`)}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{L(lang, 'Escolha com quem treinar. Cada técnico muda o que você ganha e o que arrisca.', 'Choose who to train with. Each coach changes what you gain and what you risk.', 'Choisissez avec qui vous entraîner. Chaque entraîneur change ce que vous gagnez et ce que vous risquez.', 'Elige con quién entrenar. Cada técnico cambia lo que ganas y lo que arriesgas.')}</p>
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
            <CoachCard key={coachId} coachId={coachId} career={career} selected={chosen === coachId} onChoose={() => setChosen(coachId)} />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton disabled={!chosen} onClick={() => chosen && onTrain(chosen)}>
          {chosen
            ? L(lang, `Treinar com ${COACH_TEXT[chosen].name}`, `Train with ${COACH_TEXT[chosen].name}`, `S’entraîner avec ${COACH_TEXT[chosen].name}`, `Entrenar con ${COACH_TEXT[chosen].name}`)
            : L(lang, 'Escolha um técnico', 'Choose a coach', 'Choisissez un entraîneur', 'Elige un técnico')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
        {canRetire(career) ? <GhostButton onClick={onRetire}>{L(lang, 'Aposentar', 'Retire', 'Prendre sa retraite', 'Retirarse')}</GhostButton> : null}
      </div>
    </section>
  )
}
