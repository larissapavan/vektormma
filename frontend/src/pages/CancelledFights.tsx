import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Ban, RotateCcw } from 'lucide-react'

import { L, localeTag, pick } from '../i18n/lang'
import { FighterAvatar } from '../shared/components/FighterAvatar'
import { FlagList, TitleFightBadge } from '../shared/components/FighterBadges'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { WinProbabilityBar } from '../shared/components/WinProbabilityBar'
import { METHOD_LABELS, REASON_LABELS, storyFor } from '../shared/data/cancelledFights'
import { getDivisionName } from '../shared/data/divisions'
import { useCancelledFights } from '../shared/hooks/useCancelledFights'
import { PICK_METHODS, useCancelledPicks, type CancelledPick } from '../shared/hooks/useCancelledPicks'
import type { CancelledFight, CancelledFighter } from '../shared/types/api'

type Picks = ReturnType<typeof useCancelledPicks>

/** The pick of a visitor, if it still names one of the two fighters (a stored pick for a renamed fighter is ignored). */
function pickFor(fight: CancelledFight, picks: Record<string, CancelledPick>): CancelledPick | null {
  const stored = picks[fight.id]
  return stored && (stored.winner === fight.fighter_1.name || stored.winner === fight.fighter_2.name) ? stored : null
}

export function CancelledFights() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fights, loading, error } = useCancelledFights()
  const picks = useCancelledPicks()

  const made = useMemo(() => fights.filter((fight) => pickFor(fight, picks.picks)), [fights, picks.picks])
  const scored = made.filter((fight) => fight.model)
  const agreed = scored.filter((fight) => pickFor(fight, picks.picks)?.winner === fight.model?.predicted_winner)

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <SectionHeading
          level={1}
          title={L(lang, 'As lutas que nunca aconteceram', 'The fights that never happened', 'Les combats qui n’ont jamais eu lieu', 'Las peleas que nunca ocurrieron')}
          description={L(
            lang,
            'Combates anunciados pelo UFC que caíram por lesão, peso ou cancelamento do evento e nunca foram realizados. Escolha quem venceria cada um, e como.',
            'Bouts the UFC announced that fell through to injury, weight or a cancelled event and were never fought. Pick who would have won each one, and how.',
            'Des combats annoncés par l’UFC, tombés à l’eau pour cause de blessure, de poids ou d’événement annulé, et jamais disputés. Choisissez qui l’aurait emporté, et comment.',
            'Peleas anunciadas por la UFC que se cayeron por lesión, peso o cancelación del evento y nunca se disputaron. Elige quién habría ganado cada una, y cómo.',
          )}
        />
        {fights.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border-subtle)] pt-3 text-sm">
            <p className="font-semibold text-[var(--text-main)]" data-testid="pick-count">
              {L(
                lang,
                `Você palpitou em ${made.length} de ${fights.length}`,
                `You have picked ${made.length} of ${fights.length}`,
                `Vous avez pronostiqué ${made.length} sur ${fights.length}`,
                `Has pronosticado ${made.length} de ${fights.length}`,
              )}
            </p>
            {scored.length ? (
              <p className="text-[var(--text-secondary)]">
                {L(
                  lang,
                  `Você bateu com o modelo em ${agreed.length} de ${scored.length}`,
                  `You matched the model in ${agreed.length} of ${scored.length}`,
                  `Vous êtes d’accord avec le modèle sur ${agreed.length} sur ${scored.length}`,
                  `Coincidiste con el modelo en ${agreed.length} de ${scored.length}`,
                )}
              </p>
            ) : null}
            {made.length ? (
              <button
                type="button"
                onClick={picks.clearAll}
                className="ml-auto inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--ink)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {L(lang, 'Limpar palpites', 'Clear picks', 'Effacer les pronostics', 'Borrar pronósticos')}
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          {L(
            lang,
            'Seus palpites ficam só neste navegador: não há conta nem ranking público. Como a luta não aconteceu, não existe resultado para conferir: vale pelo debate.',
            'Your picks stay in this browser only: there is no account and no public leaderboard. Since the fight never happened there is no result to check against, so this is for the debate.',
            'Vos pronostics restent dans ce navigateur : il n’y a ni compte ni classement public. Comme le combat n’a pas eu lieu, il n’y a aucun résultat à vérifier : c’est fait pour le débat.',
            'Tus pronósticos se quedan solo en este navegador: no hay cuenta ni ranking público. Como la pelea no se disputó, no hay resultado que comprobar: es para el debate.',
          )}
        </p>
      </header>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5">
          {fights.map((fight) => (
            <FightCard key={fight.id} fight={fight} pick={pickFor(fight, picks.picks)} picks={picks} />
          ))}
        </div>
      )}
    </div>
  )
}

function FightCard({ fight, pick: current, picks }: { fight: CancelledFight; pick: CancelledPick | null; picks: Picks }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const date = new Date(`${fight.event_date}T00:00:00Z`).toLocaleDateString(localeTag(lang), { dateStyle: 'long', timeZone: 'UTC' })
  const headingId = `cancelled-${fight.id}`
  const names = `${fight.fighter_1.name} vs. ${fight.fighter_2.name}`
  const canAnalyze = Boolean(fight.fighter_1.profile_name && fight.fighter_2.profile_name)

  return (
    <article aria-labelledby={headingId} className="surface-card overflow-hidden rounded-sm border border-[var(--border-subtle)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-4 py-2.5 sm:px-6">
        <Ban className="h-4 w-4 shrink-0 text-[var(--ink)]" aria-hidden="true" />
        <p className="text-xs font-bold text-[var(--text-main)]">
          {fight.event_name} <span className="font-medium text-[var(--text-muted)]">· {date}</span>
        </p>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{getDivisionName(fight.weight_class, lang)}</span>
        <TitleFightBadge fight={{ title_fight: fight.title_fight, weight_class: fight.weight_class }} />
        <span className="ml-auto border border-[var(--ink)] px-2 py-0.5 text-label font-bold text-[var(--ink)]">
          {pick(lang, REASON_LABELS[fight.reason])}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <h2 id={headingId} className="font-display text-xl font-extrabold text-[var(--text-main)] sm:text-2xl">
            {names}
          </h2>
          {fight.attempts > 1 ? (
            <p className="mt-1 text-xs font-bold text-[var(--ink)]">
              {L(lang, `Marcada ${fight.attempts} vezes`, `Booked ${fight.attempts} times`, `Programmé ${fight.attempts} fois`, `Programada ${fight.attempts} veces`)}
            </p>
          ) : null}
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{storyFor(lang, fight.id, fight.reason, fight.withdrew)}</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-[var(--text-muted)]">
            {L(lang, 'Quem vence?', 'Who wins?', 'Qui l’emporte ?', '¿Quién gana?')}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[fight.fighter_1, fight.fighter_2].map((fighter) => (
              <FighterOption
                key={fighter.name}
                fighter={fighter}
                selected={current?.winner === fighter.name}
                onChoose={() => picks.chooseWinner(fight.id, fighter.name)}
              />
            ))}
          </div>
        </fieldset>

        {current ? (
          <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4">
            <fieldset>
              <legend className="mb-2 text-xs font-bold text-[var(--text-muted)]">
                {L(lang, 'Como? (opcional)', 'How? (optional)', 'Comment ? (facultatif)', '¿Cómo? (opcional)')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {PICK_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={current.method === method}
                    onClick={() => picks.chooseMethod(fight.id, method)}
                    className={`min-h-10 border-2 px-3.5 text-xs font-bold transition ${
                      current.method === method
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]'
                        : 'border-[var(--rule)] text-[var(--text-secondary)] hover:border-[var(--ink)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {pick(lang, METHOD_LABELS[method])}
                  </button>
                ))}
              </div>
            </fieldset>

            <p className="text-sm font-semibold text-[var(--text-main)]" data-testid={`your-pick-${fight.id}`}>
              {current.method
                ? L(
                    lang,
                    `Seu palpite: ${current.winner} por ${pick(lang, METHOD_LABELS[current.method])}`,
                    `Your pick: ${current.winner} by ${pick(lang, METHOD_LABELS[current.method])}`,
                    `Votre pronostic : ${current.winner} par ${pick(lang, METHOD_LABELS[current.method])}`,
                    `Tu pronóstico: ${current.winner} por ${pick(lang, METHOD_LABELS[current.method])}`,
                  )
                : L(lang, `Seu palpite: ${current.winner}`, `Your pick: ${current.winner}`, `Votre pronostic : ${current.winner}`, `Tu pronóstico: ${current.winner}`)}
            </p>

            <ModelView fight={fight} winner={current.winner} />

            <button
              type="button"
              onClick={() => picks.clear(fight.id)}
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--ink)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {L(lang, 'Refazer palpite', 'Change my pick', 'Refaire mon pronostic', 'Rehacer mi pronóstico')}
            </button>
          </div>
        ) : (
          <p className="border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
            {fight.model
              ? L(
                  lang,
                  'Escolha um lutador para ver o que o modelo diria.',
                  'Pick a fighter to see what the model would say.',
                  'Choisissez un combattant pour voir ce que dirait le modèle.',
                  'Elige a un peleador para ver qué diría el modelo.',
                )
              : null}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          {canAnalyze ? (
            <Link
              to={`/matchup-intelligence?a=${encodeURIComponent(fight.fighter_1.name)}&b=${encodeURIComponent(fight.fighter_2.name)}`}
              className="inline-flex min-h-10 items-center gap-1 font-bold text-[var(--ink)]"
            >
              {L(lang, 'Analisar o confronto', 'Analyze the matchup', 'Analyser le duel', 'Analizar el cruce')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
          <a
            href={`https://www.reddit.com/r/MMA/search/?q=${encodeURIComponent(`${fight.fighter_1.name} ${fight.fighter_2.name}`)}&restrict_sr=1&sort=top`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1 font-semibold text-[var(--text-secondary)] underline-offset-2 hover:underline"
          >
            {L(lang, 'Debater no r/MMA', 'Discuss on r/MMA', 'En discuter sur r/MMA', 'Debatir en r/MMA')}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          {fight.source_url ? (
            <a
              href={fight.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1 font-semibold text-[var(--text-secondary)] underline-offset-2 hover:underline"
            >
              {L(lang, 'Fonte', 'Source', 'Source', 'Fuente')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function FighterOption({ fighter, selected, onChoose }: { fighter: CancelledFighter; selected: boolean; onChoose: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onChoose}
      className={`flex min-h-20 items-center gap-3 border-2 p-3 text-left transition ${
        selected
          ? 'border-[var(--ink)] bg-[var(--panel)]'
          : 'border-[var(--rule)] hover:border-[var(--ink)] hover:bg-[var(--bg-surface-subtle)]'
      }`}
    >
      <FighterAvatar name={fighter.name} imageUrl={fighter.image_url} className="h-16 w-16" highlight={selected} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-[var(--text-main)]">{fighter.name}</span>
        <span className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <FlagList fighter={{ country_code: fighter.country_code }} />
          {fighter.record ? (
            <span title={L(lang, 'Cartel atual, não o da época da luta marcada', 'Record today, not at the time the fight was booked', 'Bilan actuel, pas celui de l’époque où le combat était prévu', 'Récord actual, no el de cuando se programó la pelea')}>
              {fighter.record}
            </span>
          ) : null}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border-2 ${selected ? 'border-[var(--ink)] bg-[var(--ink)]' : 'border-[var(--rule)]'}`}
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-sm bg-white" /> : null}
      </span>
    </button>
  )
}

/** The model's side of the fight, shown only after the visitor has chosen (so the model does not steer the pick). */
function ModelView({ fight, winner }: { fight: CancelledFight; winner: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  if (!fight.model) {
    const retired = [fight.fighter_1, fight.fighter_2].filter((fighter) => fighter.ufc_status !== 'active').map((fighter) => fighter.name)
    const many = retired.length > 1
    return (
      <p className="rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
        {retired.length
          ? L(
              lang,
              `O modelo fica de fora desta: ele lê só os números atuais de cada lutador, e ${retired.join(' e ')} ${many ? 'já não competem' : 'já não compete'} no UFC.`,
              `The model sits this one out: it reads only each fighter’s current numbers, and ${retired.join(' and ')} no longer ${many ? 'compete' : 'competes'} in the UFC.`,
              `Le modèle s’abstient ici : il ne lit que les chiffres actuels de chaque combattant, et ${retired.join(' et ')} ne ${many ? 'combattent' : 'combat'} plus à l’UFC.`,
              `El modelo se abstiene aquí: solo lee las cifras actuales de cada peleador, y ${retired.join(' y ')} ya no ${many ? 'compiten' : 'compite'} en la UFC.`,
            )
          : L(lang, 'O modelo não tem um palpite para esta luta.', 'The model has no pick for this fight.', 'Le modèle n’a pas de pronostic pour ce combat.', 'El modelo no tiene pronóstico para esta pelea.')}
      </p>
    )
  }

  const model = fight.model
  const same = model.predicted_winner === winner
  return (
    <div className="space-y-3 rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-3">
      <p className="text-xs font-bold text-[var(--text-muted)]">
        {L(lang, 'O modelo, se lutassem hoje', 'The model, if they fought today', 'Le modèle, s’ils combattaient aujourd’hui', 'El modelo, si pelearan hoy')}
      </p>
      <WinProbabilityBar
        nameA={fight.fighter_1.name}
        nameB={fight.fighter_2.name}
        probabilityA={model.fighter_1_probability}
        probabilityB={1 - model.fighter_1_probability}
        predictedWinner={model.predicted_winner}
        compact
      />
      <p className="text-sm font-semibold text-[var(--text-main)]" data-testid={`agreement-${fight.id}`}>
        {same
          ? L(lang, 'Você e o modelo escolheram o mesmo lutador.', 'You and the model picked the same fighter.', 'Vous et le modèle avez choisi le même combattant.', 'Tú y el modelo eligieron al mismo peleador.')
          : L(lang, 'Você discorda do modelo.', 'You disagree with the model.', 'Vous n’êtes pas d’accord avec le modèle.', 'No coincides con el modelo.')}
      </p>
    </div>
  )
}
