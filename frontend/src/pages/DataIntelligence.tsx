import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  Database,
  Layers,
  Cpu,
  ExternalLink,
  Sparkles,
} from 'lucide-react'

import { L, localeTag } from '../i18n/lang'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { historyRange } from '../shared/data/history'
import { useDataInfo } from '../shared/hooks/useDataInfo'

const HISTORY_RANGE = historyRange()

const DATA_ECOSYSTEM_SOURCES = [
  {
    org: 'UFC',
    name: 'UFCStats.com & UFC.com',
    href: 'http://www.ufcstats.com',
    accent: '#E11D48',
    scopePt: `Telemetria oficial round a round, golpes significativos, controle de solo e biometria dos lutadores (${HISTORY_RANGE}).`,
    scopeEn: `Official round-by-round fight telemetry, significant strikes, ground control time, and biometrics (${HISTORY_RANGE}).`,
    scopeFr: `Télémétrie officielle round par round, frappes significatives, contrôle au sol et biométrie (${HISTORY_RANGE}).`,
    scopeEs: `Telemetría oficial asalto por asalto, golpes significativos, control en el suelo y biometría de los peleadores (${HISTORY_RANGE}).`,
  },
  {
    org: 'PFL',
    name: 'PFLMMA.com & SmartCage',
    href: 'https://pflmma.com',
    accent: '#2563EB',
    scopePt: 'Estrutura de torneio regular, pontuação do SmartCage, playoffs e campeonatos sazonais de US$ 1M.',
    scopeEn: 'Regular season tournament structure, SmartCage metrics, playoffs, and $1M championship brackets.',
    scopeFr: 'Structure de tournoi de saison régulière, métriques SmartCage, éliminatoires et finales à 1M$.',
    scopeEs: 'Estructura de torneo de temporada regular, métricas de SmartCage, playoffs y campeonatos de 1 millón de dólares.',
  },
  {
    org: 'ONE',
    name: 'ONEFC.com',
    href: 'https://www.onefc.com',
    accent: '#D97706',
    scopePt: 'Regras globais de MMA, combates de Muay Thai com luvas abertas de 4oz e campeões mundiais.',
    scopeEn: 'Global martial arts ruleset, 4oz open-finger glove Muay Thai, and world title holders.',
    scopeFr: 'Règles globales de MMA, Muay Thai en gants 4oz à doigts ouverts et champions du monde.',
    scopeEs: 'Reglamento global de artes marciales mixtas, muay thai con guantes de 4 oz de dedos abiertos y campeones mundiales.',
  },
  {
    org: 'Bellator',
    name: 'Sherdog & Wikipedia',
    href: 'https://www.sherdog.com',
    accent: '#059669',
    scopePt: 'Acervo histórico completo do Bellator (2009–2023), torneios Grand Prix e linhagens oficiais de cinturões.',
    scopeEn: 'Full Bellator archive (2009–2023), Grand Prix tournament brackets, and title lineages.',
    scopeFr: 'Archives complètes du Bellator (2009–2023), tournois Grand Prix et lignées de ceintures.',
    scopeEs: 'Archivo completo de Bellator (2009–2023), llaves de torneos Grand Prix y linajes de cinturones.',
  },
  {
    org: 'RIZIN · KSW · LFA · Cage Warriors',
    name: 'ESPN',
    href: 'https://www.espn.com/mma/',
    accent: '#6366F1',
    scopePt: 'Perfis de atletas e resultados de eventos de RIZIN, KSW, LFA e Cage Warriors, conforme a cobertura do ESPN em cada liga (RIZIN e KSW de 2025 em diante vêm do Sherdog). Sem cinturões nem rankings.',
    scopeEn: "Fighter profiles and event results for RIZIN, KSW, the LFA and Cage Warriors, as far as ESPN covers each league (RIZIN and KSW from 2025 on come from Sherdog). No belts or rankings.",
    scopeFr: "Profils des combattants et résultats des événements de RIZIN, KSW, la LFA et Cage Warriors, dans la mesure où ESPN couvre chaque ligue (RIZIN et KSW à partir de 2025 viennent de Sherdog). Ni ceintures ni classements.",
    scopeEs: 'Perfiles de peleadores y resultados de eventos de RIZIN, KSW, la LFA y Cage Warriors, según la cobertura de ESPN en cada liga (RIZIN y KSW desde 2025 vienen de Sherdog). Sin cinturones ni rankings.',
  },
  {
    org: 'OKTAGON · Jungle Fight · Invicta FC',
    name: 'oktagonmma.com & Sherdog',
    href: 'https://www.sherdog.com',
    accent: '#14B8A6',
    scopePt: 'Eventos, cards e resultados do OKTAGON (site oficial), do Jungle Fight e do Invicta FC (Sherdog), com lutas de título marcadas. Sem rankings.',
    scopeEn: "Events, cards and results for OKTAGON (its own site), Jungle Fight and Invicta FC (Sherdog), with title bouts flagged. No rankings.",
    scopeFr: "Événements, cartes et résultats d'OKTAGON (son site officiel), du Jungle Fight et d'Invicta FC (Sherdog), avec les combats de titre signalés. Pas de classements.",
    scopeEs: 'Eventos, carteleras y resultados de OKTAGON (su sitio oficial), Jungle Fight e Invicta FC (Sherdog), con las peleas de título marcadas. Sin rankings.',
  },
  {
    org: 'Camps & Gyms',
    name: 'FightHub & Tapology',
    href: 'https://www.fighthub.net',
    accent: '#8B5CF6',
    scopePt: 'Cartéis no circuito regional (LFA, Jungle Fight, Cage Warriors), mapeamento de academias e histórico de camps.',
    scopeEn: 'Regional circuit track records (LFA, Jungle Fight, Cage Warriors), camp affiliations, and gym directories.',
    scopeFr: 'Palmarès sur les circuits régionaux, affiliations aux camps et annuaire des salles d’entraînement.',
    scopeEs: 'Récords en circuitos regionales (LFA, Jungle Fight, Cage Warriors), afiliaciones a campamentos y directorio de gimnasios.',
  },
]

export function DataIntelligence() {
  const { t, i18n } = useTranslation()
  const { dataInfo, loading, error } = useDataInfo()

  const formattedDate = dataInfo?.last_updated
    ? new Date(`${dataInfo.last_updated}T00:00:00`).toLocaleDateString(localeTag(i18n.language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="page-hero rounded-[20px] px-3 py-3 sm:px-4 sm:py-4">
        <SectionHeading
          level={1}
          eyebrow={t('dataIntelligence.eyebrow')}
          title={t('dataIntelligence.title')}
          description={t('dataIntelligence.description')}
        />
      </section>

      {error ? (
        <p className="rounded-xl border border-[#C8102E]/25 bg-[#C8102E]/8 px-3 py-2 text-sm text-[#FFFFFF]">
          {error}
        </p>
      ) : null}

      {loading || !dataInfo ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[96px]" />
          ))}
        </section>
      ) : (
        <>
          {/* Métricas Globais da Base */}
          <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('dataIntelligence.lastUpdate')} value={formattedDate} />
            <StatCard
              label={t('dataIntelligence.fighters')}
              value={dataInfo.fighters_count.toLocaleString(localeTag(i18n.language))}
            />
            <StatCard
              label={t('dataIntelligence.events')}
              value={dataInfo.events_count.toLocaleString(localeTag(i18n.language))}
            />
            <StatCard
              label={t('dataIntelligence.fights')}
              value={dataInfo.fights_count.toLocaleString(localeTag(i18n.language))}
            />
          </section>

          {/* Diagrama Completo do Pipeline */}
          <section className="surface-card rounded-[20px] p-4 sm:p-6 lg:p-8">
            <div className="mb-6 border-b border-[var(--border-subtle)] pb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#E11D48] font-bold">
                {L(i18n.language, 'ARQUITETURA DE DADOS', 'DATA ARCHITECTURE', 'ARCHITECTURE DES DONNÉES', 'ARQUITECTURA DE DATOS')}
              </span>
              <h2 className="mt-1 font-display font-black text-xl sm:text-2xl uppercase tracking-tight text-[var(--text-primary)] dark:text-white">
                {t('dataIntelligence.pipelineTitle')}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] dark:text-neutral-400 max-w-3xl">
                {t('dataIntelligence.pipelineDesc')}
              </p>
            </div>

            <ModernDataPipeline />
          </section>

          {/* Catálogo Detalhado de Fontes */}
          <section className="surface-card rounded-[20px] p-4 sm:p-6">
            <div className="mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#E11D48] font-bold">
                {L(i18n.language, 'ECOSSISTEMA', 'ECOSYSTEM', 'ÉCOSYSTÈME', 'ECOSISTEMA')}
              </span>
              <h3 className="mt-1 font-display font-bold text-lg sm:text-xl uppercase tracking-tight text-[var(--text-primary)] dark:text-white">
                {L(i18n.language, 'Fontes de Dados & Cobertura Analítica', 'Data Sources & Coverage', 'Sources de données & couverture', 'Fuentes de datos y cobertura analítica')}
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DATA_ECOSYSTEM_SOURCES.map((src) => (
                <div
                  key={src.name}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3.5 transition-all duration-200 hover:border-white/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${src.accent}15`, color: src.accent }}
                    >
                      {src.org === 'Camps & Gyms' ? L(i18n.language, 'Academias & Camps', 'Camps & Gyms', 'Salles & camps', 'Gimnasios y campamentos') : src.org}
                    </span>
                    <a
                      href={src.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted)] hover:text-white transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h4 className="mt-2 font-display font-bold text-sm text-[var(--text-primary)] dark:text-white truncate">
                    {src.name}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] dark:text-neutral-400">
                    {L(i18n.language, src.scopePt, src.scopeEn, src.scopeFr, src.scopeEs)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function ModernDataPipeline() {
  const { i18n } = useTranslation()

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4 max-w-4xl mx-auto py-2">
      {/* 1. Camada de Fontes Ingestadas */}
      <div className="w-full">
        <div className="mb-2 text-center">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
            {L(i18n.language, '01. FONTES PRIMÁRIAS DE INGESTÃO', '01. PRIMARY INGESTION SOURCES', '01. SOURCES PRIMAIRES D’INGESTION', '01. FUENTES PRIMARIAS DE INGESTA')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
          {DATA_ECOSYSTEM_SOURCES.map((s) => (
            <div
              key={s.name}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/80 p-2.5 text-center transition hover:border-white/20"
            >
              <span
                className="inline-block rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
                style={{ backgroundColor: `${s.accent}20`, color: s.accent }}
              >
                {s.org}
              </span>
              <p className="mt-1 font-mono text-[11px] font-semibold text-[var(--text-primary)] dark:text-neutral-200 truncate">
                {s.name.split(' & ')[0]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <PipelineFlowDown label={L(i18n.language, 'ETL em lote e coleta web em conformidade com robots.txt', 'Batch ETL & robots.txt Compliant Ingestion', 'ETL par lots et collecte conforme à robots.txt', 'ETL por lotes y recopilación web conforme a robots.txt')} />

      {/* 2. Camada de Dados Brutos */}
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 sm:p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Database className="h-4 w-4 text-[#38BDF8]" />
          <h4 className="font-display font-bold text-sm uppercase tracking-wider text-[var(--text-primary)] dark:text-white">
            {L(i18n.language, 'Ingestão de Dados Brutos', 'Raw Ingestion Layer', 'Couche de données brutes', 'Capa de ingesta de datos en bruto')}
          </h4>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)] dark:text-neutral-400">
          {L(
            i18n.language,
            'Mais de 18.000 combates e 11.500 perfis registrados com controle de esquemas CSV e hashes de integridade.',
            'Over 18,000 bouts and 11,500 profiles recorded with CSV schema validation and uniqueness hashing.',
            'Plus de 18 000 combats et 11 500 profils enregistrés avec contrôle de schéma CSV et hachages d’intégrité.',
            'Más de 18.000 combates y 11.500 perfiles registrados, con validación de esquemas CSV y hashes de integridad.',
          )}
        </p>
      </div>

      <PipelineFlowDown />

      {/* 3. Camada de Limpeza & Resolução de Entidades */}
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 sm:p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Layers className="h-4 w-4 text-[#A855F7]" />
          <h4 className="font-display font-bold text-sm uppercase tracking-wider text-[var(--text-primary)] dark:text-white">
            {L(i18n.language, 'Tratamento & Resolução de Entidades', 'Cleansing & Entity Resolution', 'Nettoyage & résolution d’entités', 'Depuración y resolución de entidades')}
          </h4>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)] dark:text-neutral-400">
          {L(
            i18n.language,
            'Fusão de homônimos entre organizações, padronização de categorias de peso e unificação de cartéis de carreira.',
            'Cross-organization deduplication, standardizing weight divisions, and merging multi-circuit fight records.',
            'Fusion des doublons entre organisations, harmonisation des catégories de poids et consolidation des palmarès.',
            'Fusión de homónimos entre organizaciones, estandarización de divisiones de peso y unificación de récords de carrera.',
          )}
        </p>
      </div>

      <PipelineFlowDown />

      {/* 4. Engenharia de Atributos (46 Features ML) */}
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 sm:p-5">
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2">
            <Cpu className="h-4 w-4 text-[#F59E0B]" />
            <h4 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-[var(--text-primary)] dark:text-white">
              {L(i18n.language, 'Engenharia de Variáveis (46 Variáveis Preditivas)', 'Feature Engineering (46 Predictive Features)', 'Ingénierie des variables (46 variables prédictives)', 'Ingeniería de variables (46 variables predictivas)')}
            </h4>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)] dark:text-neutral-400">
            {L(
              i18n.language,
              'Variáveis diferenciais computadas entre os dois oponentes imediatamente antes de cada luta.',
              'Differential metrics computed between the two opposing corners right before fight night.',
              'Variables différentielles calculées entre les deux combattants avant chaque affrontement.',
              'Variables diferenciales calculadas entre los dos oponentes justo antes de cada pelea.',
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          <div className="rounded-xl border border-[var(--border-subtle)]/60 bg-black/10 dark:bg-white/[0.02] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase text-[#F59E0B] block">
              {L(i18n.language, '📏 Biometria & Base', '📏 Biometrics & Stance', '📏 Biométrie & Garde', '📏 Biometría y guardia')}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] dark:text-neutral-300 leading-tight block mt-0.5">
              {L(i18n.language, 'Diferencial de envergadura, alcance de pernas, idade, altura e base (Destro vs Canhoto).', 'Reach, leg reach, age, height advantage, and stance matchups (Orthodox vs Southpaw).', 'Écarts d’allonge, allonge de jambes, âge, taille et garde (Droitier vs Gaucher).', 'Diferencia de alcance, alcance de piernas, edad, estatura y guardia (ortodoxo vs. zurdo).')}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)]/60 bg-black/10 dark:bg-white/[0.02] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase text-[#E11D48] block">
              {L(i18n.language, '🥊 Trocação', '🥊 Striking Telemetry', '🥊 Télémétrie de frappe', '🥊 Telemetría de golpeo')}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] dark:text-neutral-300 leading-tight block mt-0.5">
              {L(i18n.language, 'Golpes significativos conectados/min (SLpM), absorvidos (SApM), precisão e defesa.', 'Significant strikes landed/min (SLpM), absorbed/min (SApM), striking accuracy and defense %.', 'Frappes significatives/min (SLpM), absorbées (SApM), précision et défense %.', 'Golpes significativos conectados/min (SLpM), recibidos (SApM), precisión y defensa.')}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)]/60 bg-black/10 dark:bg-white/[0.02] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase text-[#38BDF8] block">
              {L(i18n.language, '🤼 Luta no Chão & Quedas', '🤼 Grappling & Control', '🤼 Lutte au sol & Contrôle', '🤼 Lucha en el suelo y derribos')}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] dark:text-neutral-300 leading-tight block mt-0.5">
              {L(i18n.language, 'Média de quedas/15min, precisão de quedas, defesa de quedas e finalizações/15min.', 'Takedown avg/15min, takedown accuracy, takedown defense %, and submission attempts.', 'Moyenne d’amenées/15min, précision, défense de lutte et tentatives de soumission.', 'Promedio de derribos/15 min, precisión de derribos, defensa de derribos e intentos de sumisión/15 min.')}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)]/60 bg-black/10 dark:bg-white/[0.02] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase text-[#10B981] block">
              {L(i18n.language, '📈 Pontuação Elo & Momento', '📈 Elo Rating & Momentum', '📈 Cote Elo & Dynamique', '📈 Puntuación Elo y momento')}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] dark:text-neutral-300 leading-tight block mt-0.5">
              {L(i18n.language, 'Pontuação Elo ponderada pelo nível da oposição, sequência de vitórias e dias de inatividade.', 'Opponent-quality adjusted Elo rating, win/loss streaks, and days since last fight.', 'Cote Elo ajustée selon l’opposition, séries de victoires et jours d’inactivité.', 'Puntuación Elo ajustada por la calidad de los rivales, rachas de victorias y días de inactividad.')}
            </span>
          </div>
        </div>
      </div>

      <PipelineFlowDown label={L(i18n.language, 'Validação Temporal com Janela Expansiva (Sem Vazamento de Dados)', 'Chronological Walk-Forward Split (Zero Lookahead)', 'Validation temporelle sans fuite de données', 'Validación temporal con ventana expansiva (sin fuga de datos)')} />

      {/* 5. Previsão & Explicabilidade */}
      <div className="w-full max-w-xl rounded-2xl border border-[#C8102E]/30 bg-[#C8102E]/10 p-4 sm:p-5 text-center shadow-lg shadow-[#C8102E]/5">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-[#FF2E54]" />
          <h4 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white">
            {L(i18n.language, 'Previsão de Vitória & Explicabilidade SHAP', 'Win Probability & SHAP Explainability', 'Probabilité de victoire & explicabilité SHAP', 'Probabilidad de victoria y explicabilidad SHAP')}
          </h4>
        </div>
        <p className="mt-1 text-[11px] sm:text-xs text-neutral-300 leading-relaxed max-w-lg mx-auto">
          {L(
            i18n.language,
            'Conjunto de Gradient Boosting com probabilidades calibradas. Os valores SHAP revelam exatamente quais fatores justificam o favoritismo de cada canto.',
            'Calibrated Gradient Boosting ensemble outputting true probabilities. TreeSHAP explains exactly which features drove the odds for each corner.',
            'Ensemble de Gradient Boosting calibré en probabilités. Les valeurs SHAP explicitent les variables clés favorisant chaque coin.',
            'Conjunto de Gradient Boosting calibrado estadísticamente por probabilidad. Los valores SHAP revelan exactamente qué factores justifican el favoritismo de cada esquina.',
          )}
        </p>
      </div>
    </div>
  )
}

function PipelineFlowDown({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-0.5">
      <div className="w-[1.5px] h-3 bg-neutral-600 dark:bg-neutral-700" />
      <ArrowDown className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 my-0.5" />
      {label ? (
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-app)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] my-0.5 text-center">
          {label}
        </span>
      ) : null}
      <div className="w-[1.5px] h-2 bg-neutral-600 dark:bg-neutral-700" />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-tile rounded-2xl p-3 sm:p-4">
      <p className="broadcast-label text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className="data-value mt-1 text-xl sm:text-2xl font-bold text-[#FFFFFF]">{value}</p>
    </article>
  )
}
