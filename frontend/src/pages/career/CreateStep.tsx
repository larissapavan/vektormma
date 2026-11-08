import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../../shared/data/divisions'
import { budgetLeft, CREATE_BUDGET, GAME_DIVISIONS, SKILL_MAX, SKILL_MIN, START_RECORD, validBuild, type Build, type Stance } from '../../shared/game/career'
import { Chip, Emblem, PrimaryButton, Radar } from './ui'

const STANCES: Stance[] = ['Orthodox', 'Southpaw', 'Switch']

type Skill = 'striking' | 'takedowns' | 'reach'

const ARCHETYPES: { id: string; skills: Record<Skill, number> }[] = [
  { id: 'striker', skills: { striking: 65, takedowns: 30, reach: 55 } },
  { id: 'wrestler', skills: { striking: 30, takedowns: 65, reach: 55 } },
  { id: 'balanced', skills: { striking: 50, takedowns: 50, reach: 50 } },
  { id: 'rangy', skills: { striking: 40, takedowns: 40, reach: 70 } },
]

const field = 'mt-1.5 block min-h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-3.5 text-base font-semibold normal-case tracking-normal text-[var(--text-main)] transition focus:border-[var(--accent-red)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/30'

/** Building the fighter: a name, a division, a stance and 150 points to split between three skills, with the fighter drawn as it changes. */
export function CreateStep({ onStart }: { onStart: (build: Build) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [build, setBuild] = useState<Build>({ name: '', division: 'Lightweight', stance: 'Orthodox', striking: 40, takedowns: 40, reach: 40 })
  const left = budgetLeft(build)

  const setSkill = (skill: Skill, wanted: number) =>
    setBuild((current) => {
      // A skill cannot take more than the points that are still free.
      const others = CREATE_BUDGET - (current.striking + current.takedowns + current.reach - current[skill])
      return { ...current, [skill]: Math.min(wanted, others, SKILL_MAX) }
    })

  const labels: [string, string, string] = [L(lang, 'Golpes', 'Striking', 'Frappe', 'Golpeo'), L(lang, 'Quedas', 'Takedowns', 'Amenées', 'Derribos'), L(lang, 'Alcance', 'Reach', 'Allonge', 'Alcance')]
  const skills: { key: Skill; label: string; hint: string }[] = [
    { key: 'striking', label: labels[0], hint: L(lang, 'Precisão dos golpes, em comparação com os lutadores reais do UFC.', 'Striking accuracy, compared with real UFC fighters.', 'Précision de frappe, comparée aux vrais combattants de l’UFC.', 'Precisión de golpeo, comparada con peleadores reales de la UFC.') },
    { key: 'takedowns', label: labels[1], hint: L(lang, 'Precisão nas quedas, em comparação com os lutadores reais do UFC.', 'Takedown accuracy, compared with real UFC fighters.', 'Précision des amenées au sol, comparée aux vrais combattants de l’UFC.', 'Precisión en los derribos, comparada con peleadores reales de la UFC.') },
    { key: 'reach', label: labels[2], hint: L(lang, 'Envergadura (e altura) dentro da sua divisão: o modelo dá peso a ela.', 'Reach (and height) within your division: the model gives it weight.', 'Allonge (et taille) dans votre catégorie : le modèle y accorde du poids.', 'Alcance (y estatura) dentro de tu división: el modelo le da peso.') },
  ]
  const archetypeName: Record<string, string> = {
    striker: L(lang, 'Trocador', 'Striker', 'Frappeur', 'Golpeador'),
    wrestler: L(lang, 'Lutador de queda', 'Wrestler', 'Lutteur', 'Luchador'),
    balanced: L(lang, 'Equilibrado', 'Balanced', 'Équilibré', 'Equilibrado'),
    rangy: L(lang, 'Braços longos', 'Long reach', 'Grande allonge', 'Alcance largo'),
  }
  const stanceName = { Orthodox: L(lang, 'Ortodoxo', 'Orthodox', 'Orthodoxe', 'Ortodoxo'), Southpaw: L(lang, 'Canhoto', 'Southpaw', 'Gaucher', 'Zurdo'), Switch: L(lang, 'Alternado', 'Switch', 'Switch', 'Alternado') }

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]"
      onSubmit={(event) => {
        event.preventDefault()
        if (validBuild(build)) onStart(build)
      }}
    >
      <div className="game-card space-y-6 p-5 sm:p-7">
        <div>
          <h2 className="game-title text-xl sm:text-3xl">{L(lang, 'Crie seu lutador', 'Create your fighter', 'Créez votre combattant', 'Crea a tu peleador')}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{L(lang, 'Escolha um perfil pronto ou monte o seu.', 'Pick a ready-made style or build your own.', 'Choisissez un profil prêt à l’emploi ou composez le vôtre.', 'Elige un perfil listo o arma el tuyo.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ARCHETYPES.map((archetype) => (
              <button
                key={archetype.id}
                type="button"
                onClick={() => setBuild((current) => ({ ...current, ...archetype.skills }))}
                className="min-h-10 rounded-full border border-[var(--border-default)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)] transition hover:border-[var(--accent-red)] hover:text-[var(--text-main)]"
              >
                {archetypeName[archetype.id]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {L(lang, 'Nome', 'Name', 'Nom', 'Nombre')}
            <input value={build.name} maxLength={24} onChange={(event) => setBuild({ ...build, name: event.target.value })} className={field} />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {L(lang, 'Divisão', 'Division', 'Catégorie', 'División')}
            <select value={build.division} onChange={(event) => setBuild({ ...build, division: event.target.value })} className={field}>
              {GAME_DIVISIONS.map((division) => (
                <option key={division} value={division}>
                  {getDivisionName(division, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {L(lang, 'Base', 'Stance', 'Garde', 'Guardia')}
            <select value={build.stance} onChange={(event) => setBuild({ ...build, stance: event.target.value as Stance })} className={field}>
              {STANCES.map((stance) => (
                <option key={stance} value={stance}>
                  {stanceName[stance]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-5">
          <legend className="flex w-full items-baseline justify-between text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            <span>{L(lang, 'Distribua os pontos', 'Spend your points', 'Répartissez vos points', 'Reparte tus puntos')}</span>
            <span className="data-value rounded-full bg-[var(--accent-red)]/12 px-3 py-1 text-sm text-[var(--text-red)]" data-testid="points-left">
              {L(lang, `${left} livres`, `${left} left`, `${left} restants`, `${left} libres`)}
            </span>
          </legend>
          {skills.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="flex items-baseline justify-between text-sm font-bold text-[var(--text-main)]" htmlFor={`skill-${key}`}>
                <span>{label}</span>
                <span className="data-value text-lg">{build[key]}</span>
              </label>
              <input
                id={`skill-${key}`}
                type="range"
                min={SKILL_MIN}
                max={SKILL_MAX}
                value={build[key]}
                onChange={(event) => setSkill(key, Number(event.target.value))}
                className="mt-1 block h-8 w-full cursor-pointer accent-[var(--accent-red)]"
              />
              <p className="text-xs text-[var(--text-muted)]">{hint}</p>
            </div>
          ))}
        </fieldset>
      </div>

      <aside className="game-card flex flex-col items-center gap-4 p-5 text-center sm:p-7 lg:sticky lg:top-4 lg:self-start" aria-label={L(lang, 'Prévia do lutador', 'Fighter preview', 'Aperçu du combattant', 'Vista previa del peleador')}>
        <Emblem name={build.name || '?'} className="h-24 w-24 text-4xl" />
        <div>
          <p className="game-title text-2xl">{build.name || L(lang, 'Seu nome', 'Your name', 'Votre nom', 'Tu nombre')}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Chip tone="red">{getDivisionName(build.division, lang)}</Chip>
            <Chip>{stanceName[build.stance]}</Chip>
          </div>
        </div>
        <Radar values={[build.striking, build.takedowns, build.reach]} labels={labels} />
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          {L(
            lang,
            `Você começa aos 24 anos, com ${START_RECORD.wins}-${START_RECORD.losses} no circuito regional e a estreia no UFC marcada.`,
            `You start at 24 with a ${START_RECORD.wins}-${START_RECORD.losses} regional record and a UFC debut booked.`,
            `Vous débutez à 24 ans avec un bilan régional de ${START_RECORD.wins}-${START_RECORD.losses} et vos débuts à l’UFC programmés.`,
            `Empiezas a los 24 años con un récord regional de ${START_RECORD.wins}-${START_RECORD.losses} y tu debut en la UFC pactado.`,
          )}
        </p>
        <PrimaryButton type="submit" disabled={!validBuild(build)}>
          {L(lang, 'Começar a carreira', 'Start the career', 'Commencer la carrière', 'Empezar la carrera')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
      </aside>
    </form>
  )
}
