import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, Scale, Target, X } from 'lucide-react'

import { L, formatDecimal, localeTag, uiLang } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SurprisesCard } from '../shared/components/SurprisesCard'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { Stat } from '../shared/components/ui/Stat'
import { localizeApiText } from '../shared/data/apiText'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { useTrackRecord } from '../shared/hooks/useTrackRecord'
import type { ConfidenceBand, ModelRecord, RecentEvaluation, Scores, TrackRecord as TrackRecordData, TrackedFight } from '../shared/types/api'

/** "entre 48% e 70%": the range the hit rate is in, given how few fights there are. */
function rangeText(scores: Pick<Scores, 'accuracy_low' | 'accuracy_high'>, lang: string): string | null {
  if (scores.accuracy_low == null || scores.accuracy_high == null) return null
  const low = percent(scores.accuracy_low)
  const high = percent(scores.accuracy_high)
  return L(lang, `entre ${low} e ${high}`, `between ${low} and ${high}`, `entre ${low} et ${high}`, `entre ${low} y ${high}`)
}

const percent = (value: number | null | undefined) => (value == null ? '—' : `${Math.round(value * 100)}%`)

function formatDate(date: string | null | undefined, lang: string = 'en-US') {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(localeTag(lang), { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TrackRecord() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useTrackRecord()
  const { modelInfo } = useModelInfo()
  const shown = shownMetrics(modelInfo, i18n.language)

  return (
    <div className="space-y-12">
      <PageHeader title={t('trackRecord.title')} description={t('trackRecord.description')} />

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <LoadingSkeleton className="h-[220px]" />
      ) : data ? (
        <>
          <section aria-label={L(i18n.language, 'Resumo de desempenho', 'Summary', 'Résumé', 'Resumen de rendimiento')}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t-[3px] border-[var(--ink)] pt-5 lg:grid-cols-4">
              <BigStat label={t('trackRecord.liveAccuracy')} value={percent(data.accuracy)} note={data.resolved ? L(i18n.language, `${data.correct} de ${data.resolved}, todos os modelos`, `${data.correct} of ${data.resolved}, every model`, `${data.correct} sur ${data.resolved}, tous modèles`, `${data.correct} de ${data.resolved}, todos los modelos`) : L(i18n.language, 'após o primeiro card', 'after the first card', 'après la première carte', 'después de la primera cartelera')} />
              <BigStat label={shown.source === 'recent' ? t('trackRecord.recentFights') : t('trackRecord.reported')} value={percent(shown.accuracy)} note={shown.source === 'recent' ? shown.caption : undefined} />
              <Stat label={t('trackRecord.picksLogged')} value={`${data.logged}`} />
              <Stat label={t('trackRecord.settled')} value={`${data.resolved}`} note={data.pending ? `${data.pending} ${t('trackRecord.waiting')}` : undefined} />
            </div>
            <p className="mt-5 max-w-[70ch] text-base leading-relaxed sm:text-lg">
              {L(
                i18n.language,
                'O acerto ao vivo conta só os palpites salvos antes de cada card, em lutas que aconteceram depois. O acerto nas lutas recentes é um teste em lutas já realizadas que o modelo não viu no treino. O ao vivo é o mais fiel, mas ainda tem poucas lutas.',
                'Live accuracy counts only the picks saved before each card, on fights that happened afterwards. Recent-fight accuracy is a test on fights already held that the model did not see in training. Live is the truer measure, but it still covers few fights.',
                'La précision en direct ne compte que les pronostics enregistrés avant chaque carte, sur des combats disputés ensuite. La précision sur les combats récents est un test sur des combats déjà disputés que le modèle n’a pas vus à l’entraînement. La mesure en direct est la plus fidèle, mais porte encore sur peu de combats.',
                'La precisión en vivo cuenta solo los pronósticos guardados antes de cada cartelera, en peleas que ocurrieron después. La precisión en peleas recientes es una prueba con peleas ya disputadas que el modelo no vio en el entrenamiento. La de en vivo es la medida más fiel, pero aún abarca pocas peleas.',
              )}
            </p>
            <LiveScores data={data} />
          </section>

          {data.resolved === 0 ? <WaitingCard data={data} /> : null}

          {data.bands.length ? (
            <CalibrationCard title={L(i18n.language, 'Palpites ao vivo: quando o modelo diz X%, quantas vezes acerta?', 'Live picks: when the model says X%, how often is it right?', 'Pronostics en direct : quand le modèle dit X %, à quelle fréquence a-t-il raison ?', 'Pronósticos en vivo: cuando el modelo dice X %, ¿con qué frecuencia acierta?')} bands={data.bands} />
          ) : null}

          {data.models && data.models.length > 1 ? <ModelsCard models={data.models} /> : null}

          {data.events?.length ? <EventsCard events={data.events} /> : null}

          {modelInfo?.recent_evaluation?.baselines?.length ? <BaselineCard evaluation={modelInfo.recent_evaluation} /> : null}

          {modelInfo?.recent_evaluation?.calibration?.length ? (
            <CalibrationCard
              title={L(i18n.language, 'Teste em lutas passadas: quando o modelo diz X%, quantas vezes acerta?', 'Back-test: when the model says X%, how often is it right?', 'Contrôle historique : quand le modèle dit X %, à quelle fréquence a-t-il raison ?', 'Prueba retrospectiva: cuando el modelo dice X %, ¿con qué frecuencia acierta?')}
              note={L(
                i18n.language,
                `Validação estatística em ${modelInfo.recent_evaluation.fights.toLocaleString('pt-BR')} combates recentes.`,
                `The same check on ${modelInfo.recent_evaluation.fights.toLocaleString('en-US')} recent fights.`,
                `Le même contrôle sur ${modelInfo.recent_evaluation.fights.toLocaleString(localeTag(i18n.language))} combats récents.`,
                `La misma verificación con ${modelInfo.recent_evaluation.fights.toLocaleString('es-419')} peleas recientes.`,
              )}
              bands={modelInfo.recent_evaluation.calibration}
            />
          ) : null}

          {modelInfo?.recent_evaluation?.segments?.length ? <SegmentsCard evaluation={modelInfo.recent_evaluation} /> : null}

          <SurprisesCard />

          {data.recent.length ? (
            <FightList title={t('trackRecord.recentResults')} fights={data.recent} />
          ) : null}
          {data.biggest_misses.length ? (
            <FightList title={t('trackRecord.biggestMisses')} note={t('trackRecord.biggestMissesNote')} fights={data.biggest_misses} />
          ) : null}

          <section className="border-t-[3px] border-[var(--ink)] pt-4">
            <h2 className="section-title">{t('trackRecord.howMeasured')}</h2>
            <ul className="mt-2 max-w-[70ch] list-disc space-y-2 pl-5 text-base leading-7">
              <li>{L(i18n.language, 'Cada combate anunciado tem seu palpite e probabilidade registrados antes do card, utilizando apenas os números históricos dos lutadores até aquela data.', "The daily update saves the model's pick and confidence for every announced fight, using each fighter's numbers that day.", 'La mise à jour quotidienne enregistre le choix et la confiance du modèle pour chaque combat annoncé, avec les chiffres de chaque combattant ce jour-là.', 'La actualización diaria guarda el pronóstico y la confianza del modelo para cada pelea anunciada, con los números que tenía cada peleador ese día.')}</li>
              <li>{L(i18n.language, 'Assim que o evento termina, o resultado oficial é confrontado com o palpite prévio. Empates e lutas sem resultado são desconsiderados.', 'After the event the result is matched to the saved pick. Draws and no contests count for neither side.', 'Après l’événement, le résultat est rapproché du choix enregistré. Les nuls et les sans-décision ne comptent pour personne.', 'Después del evento, el resultado se cruza con el pronóstico guardado. Los empates y las peleas sin resultado no cuentan para ningún lado.')}</li>
              <li>{L(i18n.language, 'As previsões ao vivo são o teste definitivo de desempenho no mundo real, sem qualquer viés retrospectivo.', 'Live picks are the true measure of predictive skill, evaluated strictly forward in time.', 'Les pronostics en direct sont la vraie mesure du modèle, évalués strictement vers l’avenir.', 'Los pronósticos en vivo son la verdadera medida de la capacidad predictiva, evaluados estrictamente hacia adelante en el tiempo.')}</li>
              <li>{L(i18n.language, 'Quando o modelo muda, os palpites das lutas que ainda não aconteceram são refeitos com o novo, antes da luta. Os das lutas que já passaram ficam como estavam.', 'When the model changes, the picks of fights still to come are made again with the new one, before the fight. Those of past fights stay as they were.', 'Quand le modèle change, les pronostics des combats à venir sont refaits avec le nouveau, avant le combat. Ceux des combats passés restent tels quels.', 'Cuando el modelo cambia, los pronósticos de las peleas que aún no ocurren se rehacen con el nuevo, antes de la pelea. Los de las peleas pasadas quedan como estaban.')}</li>
              {data.voided ? (
                <li>
                  {data.voided === 1
                    ? L(i18n.language, '1 palpite salvo não conta: a luta não aconteceu, mudou de data ou já tinha outro palpite salvo. Ele continua no registro.', '1 saved pick does not count: the fight never took place, moved to another date or already had a saved pick. It stays in the log.', '1 pronostic enregistré ne compte pas : le combat n’a pas eu lieu, a changé de date ou avait déjà un pronostic. Il reste dans le registre.', '1 pronóstico guardado no cuenta: la pelea no se realizó, cambió de fecha o ya tenía otro pronóstico. Sigue en el registro.')
                    : L(i18n.language, `${data.voided} palpites salvos não contam: a luta não aconteceu, mudou de data ou já tinha outro palpite salvo. Eles continuam no registro.`, `${data.voided} saved picks do not count: the fight never took place, moved to another date or already had a saved pick. They stay in the log.`, `${data.voided} pronostics enregistrés ne comptent pas : le combat n’a pas eu lieu, a changé de date ou avait déjà un pronostic. Ils restent dans le registre.`, `${data.voided} pronósticos guardados no cuentan: la pelea no se realizó, cambió de fecha o ya tenía otro pronóstico. Siguen en el registro.`)}
                </li>
              ) : null}
              {data.awaiting_result ? (
                <li>
                  {data.awaiting_result === 1
                    ? L(i18n.language, '1 luta já passou da data e ainda está sem resultado nos dados.', '1 fight is past its date and has no result in the data yet.', '1 combat a dépassé sa date et n’a pas encore de résultat dans les données.', '1 pelea ya pasó su fecha y aún no tiene resultado en los datos.')
                    : L(i18n.language, `${data.awaiting_result} lutas já passaram da data e ainda estão sem resultado nos dados.`, `${data.awaiting_result} fights are past their date and have no result in the data yet.`, `${data.awaiting_result} combats ont dépassé leur date et n’ont pas encore de résultat dans les données.`, `${data.awaiting_result} peleas ya pasaron su fecha y aún no tienen resultado en los datos.`)}
                </li>
              ) : null}
              {data.earlier_model_note ? <li>{localizeApiText(data.earlier_model_note, i18n.language)}</li> : null}
              {data.model_change_note ? <li>{localizeApiText(data.model_change_note, i18n.language)}</li> : null}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}

/** One of the two accuracy figures: the number large, so it reads first. */
function BigStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-[56px] font-black leading-none tabular-nums sm:text-[72px]">{value}</p>
      <p className="mt-1 text-base font-bold">{label}</p>
      {note ? <p className="text-[15px] text-[var(--muted)]">{note}</p> : null}
    </div>
  )
}

function WaitingCard({ data }: { data: NonNullable<ReturnType<typeof useTrackRecord>['data']> }) {
  const { t, i18n } = useTranslation()

  return (
    <section className="flex items-start gap-3 border-l-[3px] border-[var(--ink)] bg-[var(--panel)] p-5">
      <CalendarClock className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <h2 className="font-display text-2xl font-extrabold">{t('trackRecord.waitingTitle')}</h2>
        <p className="mt-1 text-[15px] leading-6 text-[var(--text-main)]">
          {data.pending
            ? L(
                i18n.language,
                `${data.pending} palpites gravados aguardando a realização das lutas${data.next_event ? `, começando por ${data.next_event.name} em ${formatDate(data.next_event.date, i18n.language)}` : ''}.`,
                `${data.pending} picks are saved and waiting for their fights${data.next_event ? `, starting with ${data.next_event.name} on ${formatDate(data.next_event.date, i18n.language)}` : ''}.`,
                `${data.pending} pronostics sont enregistrés et attendent leurs combats${data.next_event ? `, à commencer par ${data.next_event.name} le ${formatDate(data.next_event.date, i18n.language)}` : ''}.`,
                `${data.pending} pronósticos están guardados y esperan sus peleas${data.next_event ? `, empezando por ${data.next_event.name} el ${formatDate(data.next_event.date, i18n.language)}` : ''}.`,
              )
            : L(i18n.language, 'Nenhum palpite foi salvo ainda.', 'No picks have been saved yet.', 'Aucun pronostic n’a encore été enregistré.', 'Todavía no se ha guardado ningún pronóstico.')}{' '}
          {data.tracking_since ? L(i18n.language, `Rastreamento iniciado em ${formatDate(data.tracking_since, i18n.language)}.`, `Tracking began on ${formatDate(data.tracking_since, i18n.language)}.`, `Le suivi a commencé le ${formatDate(data.tracking_since, i18n.language)}.`, `El seguimiento comenzó el ${formatDate(data.tracking_since, i18n.language)}.`) : ''}
        </p>
      </div>
    </section>
  )
}

/** How much the live number can be trusted, and whether the percentages beat saying 50% every time. Says it when they do not. */
function LiveScores({ data }: { data: TrackRecordData }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const range = rangeText(data, lang)
  if (!range || data.brier == null || data.average_confidence == null || data.accuracy == null) return null
  const brier = formatDecimal(data.brier, 3, lang)
  const coin = formatDecimal(0.25, 3, lang)
  return (
    <ul className="mt-4 max-w-[70ch] list-disc space-y-2 pl-5 text-base leading-7">
      <li>
        {L(
          lang,
          `Com ${data.resolved} lutas, o acerto real pode estar ${range} (intervalo de 95%).`,
          `With ${data.resolved} fights, the true hit rate could be ${range} (95% interval).`,
          `Avec ${data.resolved} combats, la vraie précision peut se situer ${range} (intervalle à 95 %).`,
          `Con ${data.resolved} peleas, el acierto real puede estar ${range} (intervalo del 95 %).`,
        )}
      </li>
      <li>
        {L(
          lang,
          `A confiança média dos palpites foi de ${percent(data.average_confidence)}, e eles acertaram ${percent(data.accuracy)}.`,
          `The picks said ${percent(data.average_confidence)} on average, and ${percent(data.accuracy)} of them were right.`,
          `La confiance moyenne des pronostics était de ${percent(data.average_confidence)}, et ${percent(data.accuracy)} étaient justes.`,
          `La confianza media de los pronósticos fue de ${percent(data.average_confidence)}, y acertaron el ${percent(data.accuracy)}.`,
        )}
      </li>
      <li>
        {data.brier < 0.25
          ? L(lang, `Erro das probabilidades (Brier): ${brier}. Dizer sempre 50% daria ${coin}; quanto menor, melhor.`, `Error of the percentages (Brier): ${brier}. Saying 50% every time would score ${coin}; lower is better.`, `Erreur des probabilités (Brier) : ${brier}. Dire toujours 50 % donnerait ${coin} ; plus c’est bas, mieux c’est.`, `Error de las probabilidades (Brier): ${brier}. Decir siempre 50 % daría ${coin}; cuanto más bajo, mejor.`)
          : L(lang, `Erro das probabilidades (Brier): ${brier}. Dizer sempre 50% daria ${coin}, então até aqui as porcentagens ao vivo saíram piores que o cara ou coroa.`, `Error of the percentages (Brier): ${brier}. Saying 50% every time would score ${coin}, so the live percentages have done worse than a coin flip so far.`, `Erreur des probabilités (Brier) : ${brier}. Dire toujours 50 % donnerait ${coin} : jusqu’ici, les pourcentages en direct ont fait moins bien que pile ou face.`, `Error de las probabilidades (Brier): ${brier}. Decir siempre 50 % daría ${coin}, así que hasta ahora los porcentajes en vivo han sido peores que cara o cruz.`)}
      </li>
    </ul>
  )
}

/** Hits card by card, so a good or bad night can be seen in the total. */
function EventsCard({ events }: { events: NonNullable<TrackRecordData['events']> }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">{L(lang, 'Card a card', 'Card by card', 'Carte par carte', 'Cartelera por cartelera')}</h2>
      </div>
      <ul className="mt-2">
        {events.map((event) => (
          <li key={`${event.date}-${event.name}`} className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-3">
            <div className="min-w-0">
              <p className="text-base font-semibold leading-snug">{event.name}</p>
              <p className="text-[15px] text-[var(--muted)]">{formatDate(event.date, lang)}</p>
            </div>
            <p className="shrink-0 font-display text-xl font-extrabold tabular-nums">
              {L(lang, `${event.correct} de ${event.fights}`, `${event.correct} of ${event.fights}`, `${event.correct} sur ${event.fights}`, `${event.correct} de ${event.fights}`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The test on past fights by kind of fight: a good average can hide a weak spot. */
function SegmentsCard({ evaluation }: { evaluation: RecentEvaluation }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">{L(lang, 'Teste em lutas passadas, por tipo de luta', 'Back-test by kind of fight', 'Contrôle historique par type de combat', 'Prueba retrospectiva por tipo de pelea')}</h2>
      </div>
      <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">
        {L(lang, 'Grupos pequenos variam muito por acaso.', 'Small groups vary a lot by chance.', 'Les petits groupes varient beaucoup par hasard.', 'Los grupos pequeños varían mucho por azar.')}
      </p>
      <ul className="mt-3 grid gap-3">
        {(evaluation.segments ?? []).map((segment) => (
          <li key={segment.label}>
            <div className="flex items-baseline justify-between gap-2 text-base">
              <span className="font-bold">{localizeApiText(segment.label, lang)}</span>
              <span className="text-[15px] text-[var(--muted)]">{segment.fights.toLocaleString(localeTag(lang))} {L(lang, 'lutas', 'fights', 'combats', 'peleas')}</span>
            </div>
            <Bar label={L(lang, 'O modelo disse', 'Model said', 'Le modèle disait', 'El modelo decía')} value={segment.average_confidence} tone="muted" />
            <Bar label={L(lang, 'Acertou de fato', 'Actually right', 'Réellement juste', 'Acierto real')} value={segment.accuracy} tone="strong" />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CalibrationCard({ title, note, bands }: { title: string; note?: string; bands: ConfidenceBand[] }) {
  const { i18n } = useTranslation()
  const lang = uiLang(i18n.language)

  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">{title}</h2>
      </div>
      {note ? <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">{note}</p> : null}
      <ul className="mt-3 grid gap-3">
        {bands.map((band) => (
          <li key={band.label}>
            <div className="flex items-baseline justify-between gap-2 text-base">
              <span className="font-bold">{L(i18n.language, 'Quando o modelo diz', 'When the model says', 'Quand le modèle dit', 'Cuando el modelo dice')} {band.label}</span>
              <span className="text-[15px] text-[var(--muted)]">{band.fights} {L(lang, 'lutas', band.fights === 1 ? 'fight' : 'fights', band.fights === 1 ? 'combat' : 'combats', band.fights === 1 ? 'pelea' : 'peleas')}</span>
            </div>
            <Bar label={L(i18n.language, 'O modelo disse', 'Model said', 'Le modèle disait', 'El modelo decía')} value={band.average_confidence} tone="muted" />
            <Bar label={L(i18n.language, 'Acertou de fato', 'Actually right', 'Réellement juste', 'Acierto real')} value={band.accuracy} tone="strong" />
            {rangeText(band, i18n.language) ? (
              <p className="mt-1 text-[15px] text-[var(--muted)]">
                {L(i18n.language, 'Com tão poucas lutas, o acerto real pode estar', 'With so few fights, the true hit rate could be', 'Avec si peu de combats, la vraie précision peut se situer', 'Con tan pocas peleas, el acierto real puede estar')} {rangeText(band, i18n.language)}.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The record of each model that has made live picks, side by side: they are different models, so they are not averaged. */
function ModelsCard({ models }: { models: ModelRecord[] }) {
  const { i18n } = useTranslation()
  const lang = uiLang(i18n.language)
  const since = (model: ModelRecord) => formatDate(model.since, i18n.language)
  const name = (model: ModelRecord) =>
    model.model === 'prefight2'
      ? L(lang, 'Modelo pré-luta combinado', 'Combined pre-fight model', 'Modèle pré-combat combiné', 'Modelo combinado previo a la pelea')
      : model.model === 'prefight'
        ? L(lang, 'Modelo pré-luta', 'Pre-fight model', 'Modèle pré-combat', 'Modelo previo a la pelea')
        : L(lang, 'Primeiro modelo', 'First model', 'Premier modèle', 'Primer modelo')

  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">
          {L(lang, 'Palpites ao vivo por modelo', 'Live picks by model', 'Pronostics en direct par modèle', 'Pronósticos en vivo por modelo')}
        </h2>
      </div>
      <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">
        {L(
          lang,
          'Cada modelo é contado à parte: os números acima somam todos.',
          'Each model is counted on its own: the numbers above add them all together.',
          'Chaque modèle est compté à part : les chiffres ci-dessus les additionnent tous.',
          'Cada modelo se cuenta aparte: las cifras de arriba los suman todos.',
        )}
      </p>
      <ul className="mt-3 grid gap-3">
        {models.map((model) => (
          <li key={model.model}>
            <div className="flex items-baseline justify-between gap-2 text-base">
              <span className="font-bold">{name(model)}</span>
              <span className="text-[15px] text-[var(--muted)]">
                {L(lang, `desde ${since(model)}`, `since ${since(model)}`, `depuis le ${since(model)}`, `desde ${since(model)}`)}
              </span>
            </div>
            <p className="mt-0.5 text-[15px]">
              {model.resolved
                ? L(
                    lang,
                    `${model.correct} de ${model.resolved} certos (${percent(model.accuracy)}), ${model.pending ?? model.logged - model.resolved} ainda sem resultado.`,
                    `${model.correct} of ${model.resolved} right (${percent(model.accuracy)}), ${model.pending ?? model.logged - model.resolved} still to be settled.`,
                    `${model.correct} sur ${model.resolved} justes (${percent(model.accuracy)}), ${model.pending ?? model.logged - model.resolved} pas encore réglés.`,
                    `${model.correct} de ${model.resolved} acertados (${percent(model.accuracy)}), ${model.pending ?? model.logged - model.resolved} sin resultado aún.`,
                  )
                : L(
                    lang,
                    `${model.logged} palpites salvos, nenhum com resultado ainda.`,
                    `${model.logged} picks saved, none settled yet.`,
                    `${model.logged} pronostics enregistrés, aucun réglé pour l’instant.`,
                    `${model.logged} pronósticos guardados, ninguno con resultado aún.`,
                  )}
            </p>
            {rangeText(model, lang) ? (
              <p className="text-[15px] text-[var(--muted)]">
                {L(lang, 'Acerto real', 'True hit rate', 'Vraie précision', 'Acierto real')} {rangeText(model, lang)}
                {model.brier != null ? ` · Brier ${formatDecimal(model.brier, 3, i18n.language)} (${L(lang, 'cara ou coroa', 'coin flip', 'pile ou face', 'cara o cruz')}: ${formatDecimal(0.25, 3, i18n.language)})` : ''}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function BaselineCard({ evaluation }: { evaluation: RecentEvaluation }) {
  const { i18n } = useTranslation()
  // The 95% margin of a hit rate measured on this many fights, in whole points.
  const noise = Math.ceil(196 * Math.sqrt(0.25 / Math.max(evaluation.fights, 1)))

  const rows = [
    { label: L(i18n.language, 'O modelo', 'The model', 'Le modèle', 'El modelo'), accuracy: evaluation.accuracy, strong: true },
    ...(evaluation.baselines ?? []).map((rule) => ({ label: localizeApiText(rule.label, i18n.language), accuracy: rule.accuracy, strong: false })),
  ].sort((a, b) => b.accuracy - a.accuracy)

  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">
          {L(i18n.language, 'O modelo e os métodos mais simples', 'The model and simpler methods', 'Le modèle et les méthodes plus simples', 'El modelo y los métodos más simples')}
        </h2>
      </div>
      <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">
        {L(
          i18n.language,
          `Taxa de acerto nas mesmas ${evaluation.fights.toLocaleString('pt-BR')} lutas recentes. Diferenças de até ${noise} pontos podem ser acaso: nessa margem, um método não é melhor que o outro.`,
          `Accuracy on the same ${evaluation.fights.toLocaleString('en-US')} recent fights. A gap of up to ${noise} points can be chance: within it, no method is better than the other.`,
          `Précision sur les mêmes ${evaluation.fights.toLocaleString(localeTag(i18n.language))} combats récents. Un écart de ${noise} points ou moins peut être dû au hasard : dans cette marge, aucune méthode n’est meilleure que l’autre.`,
          `Precisión en las mismas ${evaluation.fights.toLocaleString('es-419')} peleas recientes. Una diferencia de hasta ${noise} puntos puede ser azar: dentro de ese margen, ningún método es mejor que otro.`,
        )}
      </p>
      <ul className="mt-3 grid gap-2">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-2 text-base">
              <span className={row.strong ? 'font-bold' : ''}>{row.label}</span>
              <span className="font-display text-xl font-extrabold tabular-nums">{percent(row.accuracy)}</span>
            </div>
            <div className="mt-1 h-3 bg-[var(--track)]">
              <div className={`h-full ${row.strong ? 'bg-[var(--ink)]' : 'bg-[var(--border-mid)]'}`} style={{ width: `${Math.round(row.accuracy * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Bar({ label, value, tone }: { label: string; value: number; tone: 'muted' | 'strong' }) {
  return (
    <div className="mt-1.5 grid grid-cols-[8.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-[15px]">
      <span className="font-semibold">{label}</span>
      <div className="h-3 bg-[var(--track)]">
        <div className={`h-full ${tone === 'strong' ? 'bg-[var(--ink)]' : 'bg-[var(--border-mid)]'}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-right font-display text-xl font-extrabold tabular-nums">{percent(value)}</span>
    </div>
  )
}

function FightList({ title, note, fights }: { title: string; note?: string; fights: TrackedFight[] }) {
  const { i18n } = useTranslation()

  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <h2 className="section-title">{title}</h2>
      {note ? <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">{note}</p> : null}
      <ul className="mt-2 grid gap-x-10 lg:grid-cols-2">
        {fights.map((fight) => (
          <li key={`${fight.event_date}-${fight.fighter_1}-${fight.fighter_2}`} className="flex items-center gap-3 border-b border-[var(--rule)] py-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center ${fight.correct ? 'border-[1.5px] border-[var(--ink)]' : 'bg-[var(--ink)] text-[var(--on-ink)]'}`}
              title={fight.correct ? L(i18n.language, 'Acerto', 'Right', 'Juste', 'Acierto') : L(i18n.language, 'Erro', 'Wrong', 'Faux', 'Error')}
            >
              {fight.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug">
                {fight.fighter_1} <span className="font-normal">vs.</span> {fight.fighter_2}
              </p>
              <p className="text-[15px] leading-6 text-[var(--muted)]">
                {L(i18n.language, 'Previu', 'Picked', 'A choisi', 'Pronosticó')} {fight.predicted_winner} ({percent(fight.confidence)}) · {L(i18n.language, 'vencedor', 'won by', 'vainqueur', 'ganador')} {fight.winner ?? '—'} · {formatDate(fight.event_date, i18n.language)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
