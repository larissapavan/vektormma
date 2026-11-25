import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { L, formatDecimal, formatShare } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { MetricsNote } from '../shared/components/MetricsNote'
import { SectionHeading } from '../shared/components/SectionHeading'
import { baselineName, localizeApiText } from '../shared/data/apiText'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { localizeFeature } from '../shared/utils/localizeFeature'

export function Model() {
  const { t, i18n } = useTranslation()
  const { modelInfo, health, loading, error } = useModelInfo()
  const shown = shownMetrics(modelInfo, i18n.language)

  const baselineChart =
    modelInfo == null
      ? []
      : Object.entries(modelInfo.baseline_metrics).map(([key, value]) => ({
          name: baselineName(key, i18n.language),
          accuracy: Number(value.accuracy.toFixed(3)),
          rocAuc: Number(value.roc_auc.toFixed(3)),
        }))

  // How much worse the test predictions get without each factor. Nothing is drawn when it was not measured.
  const importance = (modelInfo?.recent_evaluation?.importance ?? [])
    .filter((row) => row.extra_log_loss > 0.0005)
    .slice(0, 10)
    .map((row) => ({ feature: localizeFeature(row.label, i18n.language), score: row.extra_log_loss }))

  return (
    <div className="space-y-3 sm:space-y-4">
      <section>
        <SectionHeading
          level={1}
          title={t('model.title')}
          description={t('model.description')}
        />
      </section>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading || !modelInfo ? (
        <section className="grid gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[96px]" />
          ))}
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t('model.modelCard')} value={modelInfo.model_name} />
            <MetricCard label={`${L(i18n.language, 'Taxa de acerto', 'Accuracy', 'Précision', 'Precisión')} (${shown.caption})`} value={shown.accuracy != null ? formatShare(shown.accuracy, i18n.language) : '—'} />
            <MetricCard label={t('model.rocAuc')} value={shown.rocAuc != null ? formatDecimal(shown.rocAuc, 3, i18n.language) : '—'} />
            <MetricCard label={L(i18n.language, 'Perda logarítmica', 'Log loss', 'Perte logarithmique', 'Pérdida logarítmica')} value={shown.logLoss != null ? formatDecimal(shown.logLoss, 3, i18n.language) : '—'} />
          </section>

          <MetricsNote note={modelInfo.metrics_note} />

          <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
            <article className="border-t-[3px] border-[var(--ink)] pt-5">
              <SectionHeading
                eyebrow={L(i18n.language, 'Comparação com referências', 'Baseline comparison', 'Comparaison aux références', 'Comparación con referencias')}
                title={t('model.baselines')}
                description={L(i18n.language, 'Métodos mais simples medidos nas mesmas lutas do teste.', 'Simpler methods measured on the same test fights.', 'Des méthodes plus simples mesurées sur les mêmes combats du test.', 'Métodos más simples medidos en las mismas peleas de la prueba.')}
              />
              <div className="mt-3 h-[210px] min-w-0 sm:h-[250px]">
                {/* initialDimension is only what the first render uses before the container is measured; without it Recharts warns "width(-1) and height(-1)" */}
                <ResponsiveContainer width="100%" height="100%" minWidth={280} initialDimension={{ width: 320, height: 210 }}>
                  <BarChart data={baselineChart}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel)',
                        border: '1.5px solid var(--ink)',
                        borderRadius: '4px',
                        color: 'var(--ink)',
                      }}
                    />
                    <Bar dataKey="accuracy" fill="var(--ink)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="rocAuc" fill="var(--muted)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            {importance.length ? (
              <article className="border-t-[3px] border-[var(--ink)] pt-5">
                <SectionHeading
                  eyebrow={L(i18n.language, 'Medido no teste', 'Measured on the test', 'Mesuré sur le test', 'Medido en la prueba')}
                  title={t('model.featureImportance')}
                  description={L(i18n.language, 'Quanto as previsões pioram quando cada informação é embaralhada entre as lutas.', 'How much worse the predictions get when each piece of information is shuffled among the fights.', 'À quel point les prévisions se dégradent quand chaque information est mélangée entre les combats.', 'Cuánto empeoran los pronósticos cuando cada dato se mezcla entre las peleas.')}
                />
                <ul className="mt-3 grid gap-2.5">
                  {importance.map((row) => (
                    <li key={row.feature}>
                      <p className="text-base">{row.feature}</p>
                      <div className="mt-1 h-3 bg-[var(--track)]">
                        <div className="h-full bg-[var(--ink)]" style={{ width: `${Math.max((row.score / importance[0].score) * 100, 1)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </section>

          <section className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="flex flex-col border-t-[3px] border-[var(--ink)] pt-5">
              <SectionHeading
                eyebrow={L(i18n.language, 'Arquitetura do sistema', 'System design', 'Conception du système', 'Diseño del sistema')}
                title={L(i18n.language, 'Do dado bruto ao site', 'From data to this site', 'Des données à ce site', 'De los datos a este sitio')}
                description={L(i18n.language, 'Os dados são limpos, transformados em atributos e servidos via API.', 'Fight data is cleaned, turned into features and served by the API to this site.', 'Les données de combat sont nettoyées, transformées en variables et servies par l’API à ce site.', 'Los datos de las peleas se limpian, se convierten en variables y la API los sirve a este sitio.')}
              />
              <BulletPanel items={modelInfo.highlights.map((item) => localizeApiText(item, i18n.language))} />
            </article>

            <article className="flex flex-col border-t-[3px] border-[var(--ink)] pt-5">
              <SectionHeading
                eyebrow={L(i18n.language, 'Limitações', 'Limitations', 'Limites', 'Limitaciones')}
                title={L(i18n.language, 'O que o modelo não prevê', "What it can't do", 'Ce qu’il ne peut pas faire', 'Lo que no puede hacer')}
                description={L(i18n.language, 'Fatores intangíveis e limites da abordagem estatística.', 'Where the model falls short.', 'Là où le modèle atteint ses limites.', 'Dónde se queda corto el modelo.')}
              />
              <BulletPanel items={modelInfo.limitations.map((item) => localizeApiText(item, i18n.language))} tone="warning" />
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <MetricCard label="API status" value={health?.model_loaded ? L(i18n.language, 'Online', 'Online', 'En ligne', 'En línea') : L(i18n.language, 'Offline', 'Offline', 'Hors ligne', 'Sin conexión')} compact />
                <MetricCard label={L(i18n.language, 'Lutadores no modelo', 'Fighters loaded', 'Combattants chargés', 'Peleadores cargados')} value={`${health?.fighters_loaded ?? 0}`} compact />
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}

/** A long class name such as "HistGradientBoostingClassifier" has no spaces; offer a line break before each capital so it wraps by word. */
function breakCamelCase(value: string) {
  return value.split(/(?=[A-Z][a-z])/).flatMap((part, index) => (index === 0 ? [part] : [<wbr key={index} />, part]))
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  // Long values get a smaller size so they stay inside the card; the break opportunities above do the rest.
  const size = compact ? 'text-xl' : value.length > 16 ? 'text-lg sm:text-xl' : 'text-2xl'
  return (
    <article className="metric-tile min-w-0 rounded-sm p-3">
      <p className="broadcast-label text-label text-[var(--text-muted)]">{label}</p>
      <p className={`data-value mt-1.5 break-words font-bold text-[var(--ink)] ${size}`}>{breakCamelCase(value)}</p>
    </article>
  )
}

/** Same bulleted panel for every list on this page; "warning" only tints it red. The marker hangs, so wrapped lines stay aligned. */
function BulletPanel({ items, tone = 'neutral' }: { items: string[]; tone?: 'neutral' | 'warning' }) {
  // A limitation gets an ink rule on its left; a highlight stays plain.
  const surface = tone === 'warning' ? 'border-l-[3px] border-[var(--ink)] bg-[var(--panel)] p-4' : 'pt-1'
  return (
    <div className={`mt-3 flex-1 ${surface}`}>
      <ul className="list-disc space-y-2 pl-5 text-base leading-7">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
