import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, RefreshCw, Scale, Target, X } from 'lucide-react'

import { L, localeTag, uiLang } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { Stat } from '../shared/components/ui/Stat'
import { localizeApiText } from '../shared/data/apiText'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { useTrackRecord } from '../shared/hooks/useTrackRecord'
import { syncTrackRecord } from '../shared/services/api'
import type { ConfidenceBand, ModelRecord, RecentEvaluation, TrackedFight } from '../shared/types/api'

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
  const { data, loading, error, reload } = useTrackRecord()
  const { modelInfo } = useModelInfo()
  const shown = shownMetrics(modelInfo, i18n.language)

  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await syncTrackRecord()
      const msg = L(
        i18n.language,
        `Sincronização concluída: ${res.settled_count} lutas resolvidas, ${res.new_logged_count} novas lutas registradas. Total resolvidas: ${res.total_resolved}.`,
        `Sync complete: ${res.settled_count} fights settled, ${res.new_logged_count} new logged. Total settled: ${res.total_resolved}.`,
        `Synchronisation terminée : ${res.settled_count} combats réglés, ${res.new_logged_count} nouveaux enregistrés. Total réglé : ${res.total_resolved}.`,
        `Sincronización completa: ${res.settled_count} peleas resueltas, ${res.new_logged_count} nuevas registradas. Total resueltas: ${res.total_resolved}.`,
      )
      setSyncMessage({ type: 'success', text: msg })
      await reload()
    } catch (err) {
      console.error(err)
      setSyncMessage({
        type: 'error',
        text: L(i18n.language, 'Falha ao sincronizar resultados com o servidor.', 'Failed to sync results with the server.', 'Échec de la synchronisation des résultats avec le serveur.', 'No se pudieron sincronizar los resultados con el servidor.'),
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-12">
      <PageHeader eyebrow={t('trackRecord.eyebrow')} title={t('trackRecord.title')} description={t('trackRecord.description')}>
        <button type="button" onClick={handleSync} disabled={syncing} className="ghost-action inline-flex cursor-pointer items-center gap-2 px-5 disabled:cursor-wait disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {syncing ? t('trackRecord.syncing') : t('trackRecord.syncButton')}
        </button>
      </PageHeader>

      {syncMessage ? (
        <p role="status" className="border-l-[3px] border-[var(--ink)] bg-[var(--panel)] px-4 py-3 text-base">
          {syncMessage.text}
        </p>
      ) : null}

      {error ? <p className="border-l-[3px] border-[var(--ink)] bg-[var(--panel)] px-4 py-3 text-base font-semibold">{error}</p> : null}

      {loading ? (
        <LoadingSkeleton className="h-[220px]" />
      ) : data ? (
        <>
          <section aria-label={L(i18n.language, 'Resumo de desempenho', 'Summary', 'Résumé', 'Resumen de rendimiento')}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t-[3px] border-[var(--ink)] pt-5 lg:grid-cols-4">
              <BigStat label={t('trackRecord.liveAccuracy')} value={percent(data.accuracy)} note={data.resolved ? L(i18n.language, `${data.correct} de ${data.resolved}`, `${data.correct} of ${data.resolved}`, `${data.correct} sur ${data.resolved}`, `${data.correct} de ${data.resolved}`) : L(i18n.language, 'após o primeiro card', 'after the first card', 'après la première carte', 'después de la primera cartelera')} />
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
          </section>

          {data.resolved === 0 ? <WaitingCard data={data} /> : null}

          {data.bands.length ? (
            <CalibrationCard title={L(i18n.language, 'Palpites ao vivo: quando o modelo diz X%, quantas vezes acerta?', 'Live picks: when the model says X%, how often is it right?', 'Pronostics en direct : quand le modèle dit X %, à quelle fréquence a-t-il raison ?', 'Pronósticos en vivo: cuando el modelo dice X %, ¿con qué frecuencia acierta?')} bands={data.bands} />
          ) : null}

          {data.models && data.models.length > 1 ? <ModelsCard models={data.models} /> : null}

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
  const name = (model: ModelRecord) =>
    model.model === 'prefight'
      ? L(lang, 'Modelo pré-luta', 'Pre-fight model', 'Modèle pré-combat', 'Modelo previo a la pelea')
      : L(lang, 'Modelo atual', 'Current model', 'Modèle actuel', 'Modelo actual')

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
          'Cada modelo é contado à parte: os números acima somam os dois.',
          'Each model is counted on its own: the numbers above add both together.',
          'Chaque modèle est compté à part : les chiffres ci-dessus additionnent les deux.',
          'Cada modelo se cuenta aparte: las cifras de arriba suman los dos.',
        )}
      </p>
      <ul className="mt-3 grid gap-3">
        {models.map((model) => (
          <li key={model.model}>
            <div className="flex items-baseline justify-between gap-2 text-base">
              <span className="font-bold">{name(model)}</span>
              <span className="text-[15px] text-[var(--muted)]">
                {L(lang, `desde ${model.since}`, `since ${model.since}`, `depuis le ${model.since}`, `desde ${model.since}`)}
              </span>
            </div>
            <p className="mt-0.5 text-[15px]">
              {model.resolved
                ? L(
                    lang,
                    `${model.correct} de ${model.resolved} certos (${percent(model.accuracy)}), ${model.logged - model.resolved} ainda sem resultado.`,
                    `${model.correct} of ${model.resolved} right (${percent(model.accuracy)}), ${model.logged - model.resolved} still to be settled.`,
                    `${model.correct} sur ${model.resolved} justes (${percent(model.accuracy)}), ${model.logged - model.resolved} pas encore réglés.`,
                    `${model.correct} de ${model.resolved} acertados (${percent(model.accuracy)}), ${model.logged - model.resolved} sin resultado aún.`,
                  )
                : L(
                    lang,
                    `${model.logged} palpites salvos, nenhum com resultado ainda.`,
                    `${model.logged} picks saved, none settled yet.`,
                    `${model.logged} pronostics enregistrés, aucun réglé pour l’instant.`,
                    `${model.logged} pronósticos guardados, ninguno con resultado aún.`,
                  )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BaselineCard({ evaluation }: { evaluation: RecentEvaluation }) {
  const { i18n } = useTranslation()

  const rows = [
    { label: L(i18n.language, 'O modelo', 'The model', 'Le modèle', 'El modelo'), accuracy: evaluation.accuracy, strong: true },
    ...(evaluation.baselines ?? []).map((rule) => ({ label: localizeApiText(rule.label, i18n.language), accuracy: rule.accuracy, strong: false })),
  ].sort((a, b) => b.accuracy - a.accuracy)

  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">
          {L(i18n.language, 'Supera métodos estatísticos tradicionais?', 'Does it beat simple rules?', 'Bat-il les règles simples ?', '¿Supera a las reglas simples?')}
        </h2>
      </div>
      <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">
        {L(
          i18n.language,
          `Taxa de acerto nas mesmas ${evaluation.fights.toLocaleString('pt-BR')} lutas recentes. Um modelo só vale alguma coisa se acertar mais que essas referências.`,
          `Accuracy on the same ${evaluation.fights.toLocaleString('en-US')} recent fights. A model is only worth something if it beats these.`,
          `Précision sur les mêmes ${evaluation.fights.toLocaleString(localeTag(i18n.language))} combats récents. Un modèle n’a d’intérêt que s’il bat ces repères.`,
          `Precisión en las mismas ${evaluation.fights.toLocaleString('es-419')} peleas recientes. Un modelo solo vale algo si supera estas referencias.`,
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
