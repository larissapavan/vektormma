import { useState, type ComponentType } from 'react'
import { AlertTriangle, Binary, ChartNoAxesCombined, FolderGit2, Globe2, ShieldAlert, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { YouTubeIcon, InstagramIcon, TikTokIcon } from '../shared/components/SocialLinks'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { localizeApiText } from '../shared/data/apiText'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { useModelInfo } from '../shared/hooks/useModelInfo'

const contactLinks = [
  {
    label: 'GitHub Repository',
    labelPt: 'Repositório GitHub',
    labelFr: 'Dépôt GitHub',
    labelEs: 'Repositorio de GitHub',
    href: 'https://github.com/larissapavan/vektormma',
    icon: FolderGit2,
  },
  {
    label: 'YouTube Channel',
    labelPt: 'Canal Oficial no YouTube (@Vektor-MMA)',
    labelFr: 'Chaîne Officielle YouTube (@Vektor-MMA)',
    labelEs: 'Canal oficial de YouTube (@Vektor-MMA)',
    href: 'https://www.youtube.com/@Vektor-MMA',
    icon: YouTubeIcon,
  },
  {
    label: 'Instagram',
    labelPt: 'Instagram Oficial (@vektormma)',
    labelFr: 'Instagram Officiel (@vektormma)',
    labelEs: 'Instagram oficial (@vektormma)',
    href: 'https://www.instagram.com/vektormma',
    icon: InstagramIcon,
  },
  {
    label: 'TikTok',
    labelPt: 'TikTok Oficial (@vektormma)',
    labelFr: 'TikTok Officiel (@vektormma)',
    labelEs: 'TikTok oficial (@vektormma)',
    href: 'https://www.tiktok.com/@vektormma',
    icon: TikTokIcon,
  },
  {
    label: 'GitHub Profile',
    labelPt: 'Perfil no GitHub',
    labelFr: 'Profil GitHub',
    labelEs: 'Perfil de GitHub',
    href: 'https://github.com/larissapavan',
    icon: Globe2,
  },
  {
    label: 'LinkedIn Profile',
    labelPt: 'Perfil no LinkedIn',
    labelFr: 'Profil LinkedIn',
    labelEs: 'Perfil de LinkedIn',
    href: 'https://www.linkedin.com/in/larissacpavan/',
    icon: Globe2,
  },
]

export function AboutModel() {
  const { i18n } = useTranslation()
  const { modelInfo, error, loading } = useModelInfo()
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const handleCopyLink = async (href: string) => {
    try {
      await navigator.clipboard.writeText(href)
      setCopiedLink(href)
      window.setTimeout(() => setCopiedLink(null), 1800)
    } catch {
      setCopiedLink(null)
    }
  }

  const handleOpenExternal = (href: string) => {
    window.location.assign(href)
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="page-hero rounded-[20px] px-3 py-3 sm:px-4 sm:py-4">
        <SectionHeading
          level={1}
          eyebrow={L(i18n.language, 'Sobre o Projeto', 'About', 'À propos', 'Acerca del proyecto')}
          title={L(i18n.language, 'Ciência de Dados aplicada ao MMA', 'A UFC analytics project built to learn', 'Un projet d’analyse UFC conçu pour apprendre', 'Ciencia de datos aplicada al MMA')}
          description={L(
            i18n.language,
            'Desenvolvido para aplicar aprendizado de máquina do dado bruto ao produto interativo na web.',
            'I built this to learn how to take a model from raw data to a working website.',
            'Je l’ai construit pour apprendre à faire passer un modèle des données brutes à un site qui fonctionne.',
            'Lo construí para aprender a llevar un modelo desde los datos en bruto hasta un sitio web que funciona.',
          )}
        />
      </section>

      {error ? <p className="rounded-xl border border-[#C8102E]/25 bg-[#C8102E]/8 px-3 py-2 text-sm font-semibold text-[var(--text-red)]">{error}</p> : null}

      <section className="grid gap-3 lg:grid-cols-4">
        <InfoCard
          icon={Trophy}
          title={L(i18n.language, 'Projeto Completo', 'Built to learn', 'Construit pour apprendre', 'Hecho para aprender')}
          description={L(
            i18n.language,
            'Muito além de um caderno de código: fluxo de dados, treinamento do modelo, API REST e interface reativa.',
            'A whole project instead of a notebook: data collection, a model, an API and a website.',
            'Un projet entier plutôt qu’un simple carnet de code : collecte des données, un modèle, une API et un site.',
            'Un proyecto completo en lugar de un cuaderno: recopilación de datos, un modelo, una API y un sitio web.',
          )}
        />
        <InfoCard
          icon={Binary}
          title={L(i18n.language, 'Como a Previsão Funciona', 'How a pick is made', 'Comment un choix est fait', 'Cómo se hace un pronóstico')}
          description={L(
            i18n.language,
            'O modelo calcula o diferencial estatístico entre os atletas e a API retorna as probabilidades com os fatores SHAP.',
            "The model compares the two fighters' stats before the fight, and the API returns the pick with the factors behind it.",
            'Le modèle compare les statistiques des deux combattants avant le combat, et l’API renvoie le choix avec les facteurs qui l’expliquent.',
            'El modelo compara las estadísticas de los dos peleadores antes de la pelea, y la API devuelve el pronóstico con los factores que lo explican.',
          )}
        />
        <InfoCard
          icon={ChartNoAxesCombined}
          title={L(i18n.language, 'Base Histórica', 'The data', 'Les données', 'Los datos')}
          description={L(
            i18n.language,
            'Milhares de lutas oficiais do UFC, cartéis completos e métricas detalhadas de trocação e luta no chão.',
            'Real UFC records and fighter stats, collected from public sources.',
            'De vrais palmarès de l’UFC et des statistiques de combattants, collectés auprès de sources publiques.',
            'Récords reales de la UFC y estadísticas de los peleadores, recopilados de fuentes públicas.',
          )}
        />
        <InfoCard
          icon={ShieldAlert}
          title={L(i18n.language, 'Uso Responsável', 'Responsible use', 'Usage responsable', 'Uso responsable')}
          description={L(
            i18n.language,
            'Probabilidades estatísticas não são conselho financeiro ou de apostas. MMA é dinâmico e imprevisível.',
            'Predictions are estimates from past data. They are not betting advice.',
            'Les pronostics sont des estimations tirées du passé. Ce ne sont pas des conseils de pari.',
            'Los pronósticos son estimaciones basadas en datos del pasado. No son consejos de apuestas.',
          )}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <article className="surface-card rounded-[20px] p-3 sm:p-4">
          <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{L(i18n.language, 'Tecnologias Principais', 'Core stack', 'Socle technique', 'Tecnologías principales')}</p>
          <h2 className="mt-1 text-2xl font-bold uppercase tracking-[0.03em] text-[var(--text-main)]">
            {L(i18n.language, 'Tecnologias Utilizadas', 'What it is built with', 'Avec quoi c’est construit', 'Con qué está hecho')}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              'FastAPI (Python)',
              'React + Vite + TypeScript',
              'Gradient Boosting (LightGBM/XGBoost)',
              L(i18n.language, 'Engenharia de Variáveis', 'Feature Engineering', 'Ingénierie des variables', 'Ingeniería de variables'),
              L(i18n.language, 'Explicabilidade com SHAP', 'SHAP Explainability', 'Explicabilité SHAP', 'Explicabilidad con SHAP'),
              'Tailwind CSS & Framer Motion',
              L(i18n.language, 'Recharts (visualização de dados)', 'Recharts (Data Viz)', 'Recharts (visualisation de données)', 'Recharts (visualización de datos)'),
              L(i18n.language, 'Testes Automatizados (Pytest & Vitest)', 'Automated Tests (Pytest & Vitest)', 'Tests automatisés (Pytest & Vitest)', 'Pruebas automatizadas (Pytest y Vitest)'),
            ].map((item) => (
              <div key={item} className="metric-tile rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text-main)]">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card rounded-[20px] p-3 sm:p-4">
          <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{L(i18n.language, 'Links e Contato', 'Links & contact', 'Liens et contact', 'Enlaces y contacto')}</p>
          <h2 className="mt-1 text-2xl font-bold uppercase tracking-[0.03em] text-[var(--text-main)]">
            {L(i18n.language, 'Código & Redes', 'Find the project', 'Retrouver le projet', 'Encuentra el proyecto')}
          </h2>
          <div className="mt-3 grid gap-2">
            {contactLinks.map(({ label, labelPt, labelFr, labelEs, href, icon: Icon }) => {
              const isLinkedIn = label === 'LinkedIn Profile'

              return (
                <div
                  key={label}
                  className="metric-tile rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-xl bg-[#C8102E]/10 p-1.5 text-[var(--accent-red)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      {L(i18n.language, labelPt, label, labelFr, labelEs)}
                    </span>
                    {!isLinkedIn ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="type-tech text-xs uppercase tracking-[0.14em] text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
                      >
                        {L(i18n.language, 'Abrir no navegador', 'Open in browser', 'Ouvrir dans le navigateur', 'Abrir en el navegador')}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenExternal(href)}
                        className="type-tech text-xs uppercase tracking-[0.14em] text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
                      >
                        {L(i18n.language, 'Acessar LinkedIn', 'Open LinkedIn', 'Ouvrir LinkedIn', 'Abrir LinkedIn')}
                      </button>
                    )}
                  </div>

                  {isLinkedIn ? (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="truncate text-xs text-[var(--text-muted)]">{href}</p>
                      <button
                        type="button"
                        onClick={() => void handleCopyLink(href)}
                        className="ghost-action inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#C8102E]"
                      >
                        {copiedLink === href ? L(i18n.language, 'Copiado!', 'Copied', 'Copié', '¡Copiado!') : L(i18n.language, 'Copiar URL', 'Copy URL', 'Copier l’URL', 'Copiar URL')}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </article>
      </section>

      {loading ? (
        <section className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
          <LoadingSkeleton className="h-[180px]" />
          <LoadingSkeleton className="h-[180px]" />
        </section>
      ) : modelInfo ? (
        <section className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="surface-card rounded-[20px] p-3 sm:p-4">
            <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{L(i18n.language, 'Ficha Técnica do Modelo', 'Technical snapshot', 'Fiche technique', 'Ficha técnica')}</p>
            <h2 className="mt-1 break-words text-xl sm:text-2xl font-bold uppercase tracking-[0.03em] text-[var(--text-main)]">{modelInfo.model_name}</h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Metric label={L(i18n.language, 'Variáveis', 'Features', 'Variables', 'Variables')} value={`${modelInfo.feature_count}`} />
              <Metric label={`${L(i18n.language, 'Acurácia', 'Accuracy', 'Précision', 'Precisión')} (${shownMetrics(modelInfo, i18n.language).caption})`} value={`${((shownMetrics(modelInfo, i18n.language).accuracy ?? 0) * 100).toFixed(1)}%`} />
              <Metric label="ROC AUC" value={(shownMetrics(modelInfo, i18n.language).rocAuc ?? 0).toFixed(3)} />
              <Metric label={L(i18n.language, 'Perda logarítmica', 'Log loss', 'Perte logarithmique', 'Pérdida logarítmica')} value={(shownMetrics(modelInfo, i18n.language).logLoss ?? 0).toFixed(3)} />
            </div>
            {modelInfo.metrics_note ? <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{localizeApiText(modelInfo.metrics_note, i18n.language)}</p> : null}
          </article>

          <article className="surface-card rounded-[20px] p-3 sm:p-4">
            <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{L(i18n.language, 'Aviso Importante', 'Important note', 'Note importante', 'Nota importante')}</p>
            <div className="mt-3 rounded-2xl border border-[#C8102E]/20 bg-[#C8102E]/8 p-3">
              <div className="mb-2 flex items-center gap-2 text-[#C8102E]">
                <AlertTriangle className="h-4 w-4" />
                <span className="type-tech text-xs font-semibold uppercase tracking-[0.18em]">
                  {L(i18n.language, 'Aviso Legal', 'Use disclaimer', 'Avertissement', 'Aviso legal')}
                </span>
              </div>
              <p className="text-xs leading-5 text-[var(--text-main)]">
                {L(
                  i18n.language,
                  'Os palpites são estimativas estatísticas baseadas em dados históricos. O modelo não acompanha lesões durante a preparação nem cortes de peso de última hora. Não utilize para apostas reais.',
                  'The picks are estimates from past data. The model knows nothing about injuries or weight cuts, so do not use it to bet.',
                  'Les choix sont des estimations tirées des données passées. Le modèle ignore les blessures et les coupes de poids, donc ne pariez pas avec.',
                  'Los pronósticos son estimaciones basadas en datos del pasado. El modelo no sabe nada de lesiones ni de cortes de peso, así que no lo uses para apostar.',
                )}
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {modelInfo.highlights.map((item) => (
                <motion.div
                  key={item}
                  className="metric-tile rounded-xl px-3 py-2.5 text-xs leading-5 text-[var(--text-main)]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {localizeApiText(item, i18n.language)}
                </motion.div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <article className="surface-card rounded-[20px] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--border-subtle)]">
      <div className="inline-flex rounded-xl bg-[#C8102E]/10 p-2.5 text-[var(--accent-red)]">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="mt-3 text-lg font-bold uppercase tracking-[0.03em] text-[var(--text-main)]">{title}</h2>
      <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile rounded-xl px-3 py-2.5">
      <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className="data-value mt-1 text-xl font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  )
}
