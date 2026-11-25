import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Share2, X } from 'lucide-react'

import { L, langPath, uiLang } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { Section, sectionActionClass } from '../shared/components/ui/Section'
import { getDivisionName } from '../shared/data/divisions'
import { findPick, isOpenCard, pastCards, sameName, score, wasRight, type MyPick, type PastCard } from '../shared/data/myCard'
import { cardDay, myCardRules, outOf, picksMessage, resultMessage, scoreReading } from '../shared/data/myCardText'
import { formatProbability } from '../shared/data/probability'
import { useMyPicks } from '../shared/hooks/useMyPicks'
import { useUpcomingEvents } from '../shared/hooks/useUpcomingEvents'
import { useUpcomingPicks } from '../shared/hooks/useUpcomingPicks'
import { useUrlParam } from '../shared/hooks/useUrlParam'
import type { EventSummary, FightResult } from '../shared/types/api'
import { copyText } from '../shared/utils/copyText'

const quietButton = 'inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[15px] font-bold text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]'

type DatedEvent = EventSummary & { date: string }

export function MyCard() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { events, loading, error } = useUpcomingEvents()
  const { picks, today, settling, failed, toggle, remove } = useMyPicks(events)
  const [chosen, setChosen] = useUrlParam('card')

  const cards = events.filter((event): event is DatedEvent => event.date != null && event.fights.length > 0 && isOpenCard(event.date, today))
  const card = cards.find((event) => event.date === chosen) ?? cards[0]
  const past = pastCards(picks, today)
  const total = score(picks)

  return (
    <div className="space-y-8">
      <PageHeader
        title={L(lang, 'Meu card', 'My card', 'Ma carte', 'Mi cartelera')}
        description={L(
          lang,
          'Seus palpites para o próximo card do UFC contra os do modelo, conferidos luta por luta quando sai o resultado oficial.',
          'Your picks for the next UFC card against the model’s, checked fight by fight once the official results are in.',
          'Vos pronostics pour la prochaine carte de l’UFC face à ceux du modèle, vérifiés combat par combat une fois les résultats officiels connus.',
          'Tus pronósticos para la próxima cartelera de la UFC frente a los del modelo, revisados pelea por pelea cuando sale el resultado oficial.',
        )}
        stats={
          total.fights
            ? [
                { label: L(lang, 'acertos seus', 'your right picks', 'vos pronostics justes', 'aciertos tuyos'), value: outOf(lang, total.you, total.fights) },
                { label: L(lang, 'acertos do modelo', 'the model’s right picks', 'ceux du modèle', 'aciertos del modelo'), value: outOf(lang, total.model, total.fights) },
              ]
            : undefined
        }
      />

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <LoadingSkeleton className="h-[320px]" />
      ) : card ? (
        <OpenCard
          key={card.date}
          card={card}
          picks={picks}
          onToggle={toggle}
          onClear={() => remove((pick) => !pick.result && (pick.date === card.date || cardPicks(card, [pick]).length > 0))}
          selector={
            cards.length > 1 ? (
              <label className="block text-[15px] font-bold">
                {L(lang, 'Card', 'Card', 'Carte', 'Cartelera')}
                <select value={card.date} onChange={(event) => setChosen(event.target.value)} className="soft-input mt-1 block w-full max-w-full px-3 text-base font-normal sm:w-auto">
                  {cards.map((event) => (
                    <option key={event.date} value={event.date}>
                      {cardDay(event.date, lang, 'short')} · {event.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />
      ) : error ? null : (
        <p className="bg-[var(--panel)] px-6 py-10 text-base text-[var(--muted)]">
          {L(lang, 'Nenhum card do UFC anunciado no momento.', 'No UFC card is announced at the moment.', 'Aucune carte de l’UFC n’est annoncée pour le moment.', 'No hay ninguna cartelera de la UFC anunciada por ahora.')}
        </p>
      )}

      {past.length ? (
        <Section title={L(lang, 'Seu histórico', 'Your record', 'Votre bilan', 'Tu historial')} rows>
          <div className="space-y-2 border-b border-[var(--rule)] py-4">
            {total.fights ? <p className="max-w-[70ch] text-base leading-7">{scoreReading(total, lang)}</p> : null}
            {total.alone ? (
              <p className="max-w-[70ch] text-[15px] text-[var(--muted)]">
                {L(
                  lang,
                  `Fora dessa conta, lutas em que o modelo não tinha palpite: você acertou ${outOf(lang, total.aloneRight, total.alone)}.`,
                  `Not counted there, fights where the model had no pick: you got ${outOf(lang, total.aloneRight, total.alone)} right.`,
                  `Hors de ce compte, les combats sans pronostic du modèle : ${outOf(lang, total.aloneRight, total.alone)} de justes pour vous.`,
                  `Fuera de esa cuenta, peleas en las que el modelo no tenía pronóstico: acertaste ${outOf(lang, total.aloneRight, total.alone)}.`,
                )}
              </p>
            ) : null}
            <p role="status" className="text-[15px] text-[var(--muted)]">
              {settling
                ? L(lang, 'Conferindo os resultados…', 'Checking the results…', 'Vérification des résultats…', 'Revisando los resultados…')
                : failed
                  ? L(
                      lang,
                      'Não foi possível conferir os resultados agora. Seus palpites continuam salvos; tente de novo mais tarde.',
                      'The results could not be checked right now. Your picks are still saved; try again later.',
                      'Impossible de vérifier les résultats pour l’instant. Vos pronostics restent enregistrés ; réessayez plus tard.',
                      'No se pudieron revisar los resultados ahora. Tus pronósticos siguen guardados; inténtalo más tarde.',
                    )
                  : ''}
            </p>
          </div>
          {past.map((entry, index) => (
            <PastCardRow key={`${entry.date}-${entry.event}`} card={entry} open={index === 0} />
          ))}
        </Section>
      ) : null}

      <Section title={L(lang, 'Como funciona', 'How it works', 'Comment ça marche', 'Cómo funciona')}>
        <ul className="max-w-[70ch] list-disc space-y-2 pl-5 text-base leading-7">
          {myCardRules(lang).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link to="/track-record" className={sectionActionClass}>
            {L(lang, 'Ver o desempenho do modelo', 'See the model’s track record', 'Voir le bilan du modèle', 'Ver el desempeño del modelo')}
          </Link>
          {picks.length ? <EraseAll onErase={() => remove(() => true)} /> : null}
        </div>
      </Section>
    </div>
  )
}

/** The picks made on a card's fights, in the order of the card. */
function cardPicks(card: DatedEvent, picks: MyPick[]): MyPick[] {
  return card.fights.flatMap((fight) => findPick(picks, card.date, fight.fighter_1, fight.fighter_2) ?? [])
}

function OpenCard({
  card,
  picks,
  onToggle,
  onClear,
  selector,
}: {
  card: DatedEvent
  picks: MyPick[]
  onToggle: (pick: Omit<MyPick, 'result'>) => void
  onClear: () => void
  selector: React.ReactNode
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const pickFor = useUpcomingPicks()
  const mine = cardPicks(card, picks)
  // The model's pick of today, over the one on show when the visitor chose.
  const withModel = mine.map((pick) => {
    const model = pickFor(card.name, pick.a, pick.b) ?? pickFor(card.name, pick.b, pick.a)
    return model ? { ...pick, model: { winner: model.predicted_winner, probability: model.probability } } : pick
  })
  const compared = withModel.filter((pick) => pick.model)
  const same = compared.filter((pick) => pick.model && sameName(pick.model.winner, pick.winner)).length
  // A pick of this card on a fight that is no longer on it.
  const gone = picks.filter((pick) => !pick.result && pick.date === card.date && !mine.includes(pick))

  return (
    <Section title={card.name} rows>
      <div className="space-y-3 border-b border-[var(--rule)] py-4">
        {selector}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p role="status" className="text-base">
            <strong className="font-bold">
              {L(
                lang,
                `${mine.length} de ${card.fights.length} palpites feitos.`,
                `${mine.length} of ${card.fights.length} picks made.`,
                `${mine.length} pronostics faits sur ${card.fights.length}.`,
                `${mine.length} de ${card.fights.length} pronósticos hechos.`,
              )}
            </strong>{' '}
            {compared.length
              ? L(
                  lang,
                  `Você concorda com o modelo em ${outOf(lang, same, compared.length)}.`,
                  `You agree with the model on ${outOf(lang, same, compared.length)}.`,
                  `D’accord avec le modèle : ${outOf(lang, same, compared.length)}.`,
                  `Coincides con el modelo en ${outOf(lang, same, compared.length)}.`,
                )
              : null}
          </p>
          {mine.length ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button type="button" onClick={onClear} className={quietButton}>
                {L(lang, 'Limpar este card', 'Clear this card', 'Effacer cette carte', 'Borrar esta cartelera')}
              </button>
              <ShareButton text={picksMessage(card.name, withModel, lang)} />
            </div>
          ) : null}
        </div>
        {gone.length ? (
          <p className="text-[15px] text-[var(--muted)]">
            {L(lang, 'Saíram do card depois do seu palpite: ', 'Off the card since you picked: ', 'Retirés de la carte depuis votre pronostic : ', 'Salieron de la cartelera después de tu pronóstico: ')}
            {gone.map((pick) => `${pick.a} vs. ${pick.b}`).join(', ')}.
          </p>
        ) : null}
      </div>
      <ul>
        {card.fights.map((fight) => (
          <FightRow
            key={`${fight.fighter_1}-${fight.fighter_2}`}
            fight={fight}
            pick={findPick(withModel, card.date, fight.fighter_1, fight.fighter_2)}
            onChoose={(winner) => {
              const model = pickFor(card.name, fight.fighter_1, fight.fighter_2)
              onToggle({
                event: card.name,
                date: card.date,
                a: fight.fighter_1,
                b: fight.fighter_2,
                winner,
                model: model ? { winner: model.predicted_winner, probability: model.probability } : null,
              })
            }}
          />
        ))}
      </ul>
    </Section>
  )
}

function FightRow({ fight, pick, onChoose }: { fight: FightResult; pick: MyPick | undefined; onChoose: (winner: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  // On the night, a fight that already has its winner takes no more picks.
  const over = Boolean(fight.winner) || Boolean(pick?.result)
  const facts = [fight.title_fight ? L(lang, 'Luta pelo cinturão', 'Title fight', 'Combat pour le titre', 'Pelea por el título') : null, fight.weight_class ? getDivisionName(fight.weight_class, lang) : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="border-b border-[var(--rule)] py-4">
      <fieldset disabled={over}>
        <legend className="pb-2 text-[15px] text-[var(--muted)]">
          <span className="sr-only">
            {L(
              lang,
              `Quem vence, ${fight.fighter_1} ou ${fight.fighter_2}?`,
              `Who wins, ${fight.fighter_1} or ${fight.fighter_2}?`,
              `Qui gagne, ${fight.fighter_1} ou ${fight.fighter_2} ?`,
              `¿Quién gana, ${fight.fighter_1} o ${fight.fighter_2}?`,
            )}{' '}
          </span>
          {facts}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Corner name={fight.fighter_1} corner="red" chosen={pick ? sameName(pick.winner, fight.fighter_1) : false} onChoose={onChoose} />
          <Corner name={fight.fighter_2} corner="blue" chosen={pick ? sameName(pick.winner, fight.fighter_2) : false} onChoose={onChoose} />
        </div>
      </fieldset>
      {pick ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 text-[15px]">
          <ModelView pick={pick} />
          <Link to={`/predictor?a=${encodeURIComponent(fight.fighter_1)}&b=${encodeURIComponent(fight.fighter_2)}`} className={sectionActionClass}>
            {L(lang, 'Ver a análise', 'See the analysis', 'Voir l’analyse', 'Ver el análisis')}
          </Link>
        </p>
      ) : null}
    </li>
  )
}

function Corner({ name, corner, chosen, onChoose }: { name: string; corner: 'red' | 'blue'; chosen: boolean; onChoose: (winner: string) => void }) {
  const fill = corner === 'red' ? 'border-[var(--red)] bg-[var(--red)] text-white' : 'border-[var(--blue)] bg-[var(--blue)] text-white'
  const edge = corner === 'red' ? 'border-l-[var(--red)]' : 'border-l-[var(--blue)]'
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={() => onChoose(name)}
      className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border-[1.5px] border-l-[6px] px-4 text-left text-base font-bold disabled:cursor-default ${
        chosen ? fill : `border-[var(--rule)] ${edge} enabled:hover:bg-[var(--panel-hover)]`
      }`}
    >
      <span className="min-w-0">{name}</span>
      {chosen ? <Check className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
    </button>
  )
}

/** The model's side, shown only once the visitor has chosen. */
function ModelView({ pick }: { pick: MyPick }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  if (!pick.model) {
    return <span className="text-[var(--muted)]">{L(lang, 'O modelo não tem palpite para esta luta.', 'The model has no pick for this fight.', 'Le modèle n’a pas de pronostic pour ce combat.', 'El modelo no tiene pronóstico para esta pelea.')}</span>
  }
  const side = `${pick.model.winner} (${formatProbability(pick.model.probability)})`
  return (
    <span>
      {sameName(pick.model.winner, pick.winner)
        ? L(lang, `O modelo concorda: ${side}.`, `The model agrees: ${side}.`, `Le modèle est d’accord : ${side}.`, `El modelo coincide: ${side}.`)
        : L(lang, `O modelo discorda: ${side}.`, `The model disagrees: ${side}.`, `Le modèle n’est pas d’accord : ${side}.`, `El modelo no coincide: ${side}.`)}
    </span>
  )
}

/** One card already fought: its score in a line, and its fights on request. */
function PastCardRow({ card, open }: { card: PastCard; open: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const total = score(card.picks)
  const counted = total.fights + total.alone
  return (
    <details open={open} className="group border-b border-[var(--rule)]">
      <summary className="row-link flex min-h-11 cursor-pointer items-center gap-4 px-3 py-4 hover:bg-[var(--panel)]">
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight">{card.event}</span>
            <span className="text-[15px] text-[var(--muted)]">{cardDay(card.date, lang)}</span>
          </span>
          <span className="text-base">
            {counted ? (
              <>
                {L(lang, 'Você', 'You', 'Vous', 'Tú')} <strong className="font-bold tabular-nums">{outOf(lang, total.you + total.aloneRight, counted)}</strong>
                {total.fights ? (
                  <>
                    {' · '}
                    {L(lang, 'Modelo', 'Model', 'Modèle', 'Modelo')} <strong className="font-bold tabular-nums">{outOf(lang, total.model, total.fights)}</strong>
                  </>
                ) : null}
              </>
            ) : card.picks.every((pick) => pick.result) ? (
              <span className="text-[var(--muted)]">{L(lang, 'Nada contou neste card', 'Nothing counted on this card', 'Rien n’a compté sur cette carte', 'Nada contó en esta cartelera')}</span>
            ) : (
              <span className="text-[var(--muted)]">{L(lang, 'Aguardando resultados', 'Waiting for results', 'En attente des résultats', 'Esperando resultados')}</span>
            )}
          </span>
        </span>
        <ChevronDown className="h-6 w-6 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-3 pb-5">
        <ul className="border-t border-[var(--rule)]">
          {card.picks.map((pick) => (
            <li key={`${pick.a}-${pick.b}`} className="grid gap-x-6 gap-y-1 border-b border-[var(--rule)] py-3 text-base sm:grid-cols-[1.4fr_1fr_1fr]">
              <p className="min-w-0">
                <Outcome pick={pick} />
              </p>
              <p>
                <span className="text-[var(--muted)]">{L(lang, 'Você: ', 'You: ', 'Vous : ', 'Tú: ')}</span>
                {pick.winner} <Verdict right={wasRight(pick, pick.winner)} />
              </p>
              <p>
                <span className="text-[var(--muted)]">{L(lang, 'Modelo: ', 'Model: ', 'Modèle : ', 'Modelo: ')}</span>
                {pick.model ? (
                  <>
                    {pick.model.winner} ({formatProbability(pick.model.probability)}) <Verdict right={wasRight(pick, pick.model.winner)} />
                  </>
                ) : (
                  <span className="text-[var(--muted)]">{L(lang, 'sem palpite', 'no pick', 'pas de pronostic', 'sin pronóstico')}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
        {counted ? (
          <div className="mt-4">
            <ShareButton text={resultMessage(card.event, card.picks, lang)} />
          </div>
        ) : null}
      </div>
    </details>
  )
}

function Outcome({ pick }: { pick: MyPick }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const name = (value: string) => (pick.result?.outcome === 'win' && pick.result.winner && sameName(pick.result.winner, value) ? <strong className="font-bold">{value}</strong> : <span className="text-[var(--muted)]">{value}</span>)
  const note = !pick.result
    ? L(lang, 'sem resultado ainda', 'no result yet', 'pas encore de résultat', 'sin resultado todavía')
    : pick.result.outcome === 'void'
      ? L(lang, 'não aconteceu', 'did not happen', 'n’a pas eu lieu', 'no se realizó')
      : pick.result.outcome === 'none'
        ? L(lang, 'sem vencedor', 'no winner', 'sans vainqueur', 'sin ganador')
        : null
  return (
    <>
      {name(pick.a)} <span className="text-[var(--muted)]">vs</span> {name(pick.b)}
      {note ? <span className="block text-[15px] text-[var(--muted)]">{note}</span> : null}
    </>
  )
}

/** Right or wrong, as an icon and a word: never a colour alone. */
function Verdict({ right }: { right: boolean | null }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  if (right == null) return null
  return (
    <span className={`inline-flex items-center gap-1 align-bottom font-bold ${right ? 'text-[var(--positive)]' : ''}`}>
      {right ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
      {right ? L(lang, 'acertou', 'right', 'juste', 'acertó') : L(lang, 'errou', 'wrong', 'faux', 'falló')}
    </span>
  )
}

/** Opens the device's share sheet; where there is none, copies the message with the page's link. */
function ShareButton({ text }: { text: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const share = async () => {
    const url = new URL(langPath(uiLang(lang), '/my-card'), window.location.origin).toString()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, url })
        return
      } catch (error) {
        // The visitor closed the share sheet: nothing to do. Any other failure falls back to copying.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    setState((await copyText(`${text}\n${url}`)) ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2200)
  }

  return (
    <button type="button" onClick={() => void share()} className="ghost-action inline-flex cursor-pointer items-center gap-2 px-4">
      {state === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      <span role="status">
        {state === 'copied'
          ? L(lang, 'Texto copiado', 'Text copied', 'Texte copié', 'Texto copiado')
          : state === 'failed'
            ? L(lang, 'Falha ao copiar', 'Copy failed', 'Échec de la copie', 'No se pudo copiar')
            : L(lang, 'Compartilhar', 'Share', 'Partager', 'Compartir')}
      </span>
    </button>
  )
}

/** Erasing is for good (there is no copy anywhere), so it is asked twice. */
function EraseAll({ onErase }: { onErase: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={quietButton}>
        {L(lang, 'Apagar todos os meus palpites', 'Erase all my picks', 'Effacer tous mes pronostics', 'Borrar todos mis pronósticos')}
      </button>
    )
  }
  return (
    <span role="group" className="flex flex-wrap items-center gap-x-5 gap-y-1">
      <span className="text-[15px]">{L(lang, 'Isso apaga também o seu histórico e não tem volta.', 'This erases your record too, and cannot be undone.', 'Cela efface aussi votre bilan, définitivement.', 'Esto también borra tu historial y no se puede deshacer.')}</span>
      <button type="button" autoFocus onClick={() => setAsking(false)} className={quietButton}>
        {L(lang, 'Cancelar', 'Cancel', 'Annuler', 'Cancelar')}
      </button>
      <button
        type="button"
        onClick={() => {
          onErase()
          setAsking(false)
        }}
        className={quietButton}
      >
        {L(lang, 'Apagar tudo', 'Erase everything', 'Tout effacer', 'Borrar todo')}
      </button>
    </span>
  )
}
