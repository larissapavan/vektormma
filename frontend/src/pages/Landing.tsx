import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { AnimatedCounter } from '../shared/components/editorial/AnimatedCounter'
import { historyDecades, historyRange } from '../shared/data/history'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { SocialLinks } from '../shared/components/SocialLinks'
import { SiteLinks } from '../shared/components/SiteLinks'
import { sectionActionClass } from '../shared/components/ui/Section'
import { useDataInfo } from '../shared/hooks/useDataInfo'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { LandingHero } from './landing/LandingHero'
import { OrganizationsSection } from './landing/OrganizationsSection'

// Shown until the API answers (or if it never does): the last figures checked by hand.
const HISTORY_RANGE = historyRange()

/** The page column: the same width and side padding as the header. */
const COLUMN = 'mx-auto w-full max-w-[1376px] px-4 sm:px-6 lg:px-12'

export function Landing() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { dataInfo } = useDataInfo()
  const { modelInfo } = useModelInfo()
  // Counts come from the API; until it answers the cell shows a dash, never a number typed into the code.
  const count = (value: number | undefined) => (value != null ? <AnimatedCounter value={value} /> : '—')
  const accuracy = shownMetrics(modelInfo, lang)

  const figures = [
    { value: count(dataInfo?.fights_count), label: L(lang, 'Lutas catalogadas', 'Fights on file', 'Combats répertoriés', 'Peleas registradas') },
    { value: count(dataInfo?.fighters_count), label: L(lang, 'Lutadores', 'Fighters', 'Combattants', 'Peleadores') },
    { value: count(modelInfo?.feature_count), label: L(lang, 'Dados usados em cada previsão', 'Figures behind each prediction', 'Données utilisées pour chaque pronostic', 'Datos usados en cada pronóstico') },
    { value: <>{historyDecades()}+</>, label: L(lang, `Anos de histórico (${HISTORY_RANGE})`, `Years of history (${HISTORY_RANGE})`, `Ans d’historique (${HISTORY_RANGE})`, `Años de historia (${HISTORY_RANGE})`) },
  ]

  return (
    <div className="flex w-full flex-col bg-[var(--mat)] text-[var(--ink)]">
      {/* 1. What Vektor MMA is, and the way down to the organizations. */}
      <section className={`${COLUMN} pt-8 sm:pt-12`}>
        <LandingHero />
      </section>

      {/* 2. The organizations, each card with the same weight: the visitor picks one. */}
      <div className={`${COLUMN} pt-12 sm:pt-16`}>
        <OrganizationsSection />
      </div>

      {/* 3. What the site holds, and how often the model has been right. */}
      <section className={`${COLUMN} grid gap-x-[72px] gap-y-10 pt-14 sm:pt-20 lg:grid-cols-2`}>
        <div>
          <h2 className="text-[32px] leading-[1.05] sm:text-[40px]">{L(lang, 'O que está por trás das previsões', 'What the predictions draw on', 'Sur quoi reposent les pronostics', 'En qué se basan los pronósticos')}</h2>
          <dl className="mt-5 border-t-[3px] border-[var(--ink)]">
            {figures.map((figure) => (
              <div key={figure.label} className="flex items-baseline justify-between gap-6 border-b border-[var(--rule)] py-3.5">
                <dt className="text-base font-semibold">{figure.label}</dt>
                <dd className="font-display text-[32px] font-extrabold leading-none tabular-nums">{figure.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="self-start bg-[var(--panel)] p-6 sm:p-8">
          <h2 className="text-[28px] leading-[1.05] sm:text-[32px]">{L(lang, 'Quanto o modelo acerta', 'How often the model is right', 'À quelle fréquence le modèle a raison', 'Cuánto acierta el modelo')}</h2>
          {accuracy.accuracy != null ? (
            <>
              <p className="mt-2 font-display text-[80px] font-black leading-none tabular-nums sm:text-[96px]">
                {(accuracy.accuracy * 100).toLocaleString(lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%
              </p>
              <p className="mb-5 mt-1 max-w-[50ch] text-base text-[var(--muted)]">
                {L(
                  lang,
                  `de acerto em ${accuracy.caption}, lutas que o modelo não viu no treino.`,
                  `right in ${accuracy.caption}, fights the model did not see in training.`,
                  `de réussite sur ${accuracy.caption}, des combats que le modèle n’a pas vus à l’entraînement.`,
                  `de aciertos en ${accuracy.caption}, peleas que el modelo no vio en el entrenamiento.`,
                )}
              </p>
            </>
          ) : (
            <p className="mb-5 mt-3 max-w-[50ch] text-base text-[var(--muted)]">
              {L(lang, 'O número aparece assim que o servidor responder.', 'The figure shows as soon as the server answers.', 'Le chiffre s’affiche dès que le serveur répond.', 'La cifra aparece en cuanto responda el servidor.')}
            </p>
          )}
          <div className="flex flex-wrap gap-x-7">
            <Link to="/track-record" className={sectionActionClass}>
              {L(lang, 'Ver desempenho do modelo', 'See how the model has done', 'Voir le bilan du modèle', 'Ver el desempeño del modelo')}
            </Link>
            <Link to="/model" className={sectionActionClass}>
              {L(lang, 'Ver como o modelo funciona', 'See how the model works', 'Voir comment fonctionne le modèle', 'Ver cómo funciona el modelo')}
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Footer. */}
      <footer className="mt-10 border-t-[3px] border-[var(--ink)] sm:mt-12">
        <div className={`${COLUMN} pb-5 pt-3`}>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-display text-[22px] leading-none">
                <span className="font-black">Vektor</span> <span className="font-medium">MMA</span>
              </span>
              <span className="text-sm text-[var(--muted)]">
                {L(lang, 'Estatísticas e previsões de esportes de combate.', 'Combat sports stats and predictions.', 'Statistiques et pronostics de sports de combat.', 'Estadísticas y pronósticos de deportes de combate.')}
              </span>
            </p>
            {/* Both link lists share one line; "About" is already in the site links. */}
            <div className="flex flex-wrap items-center gap-x-6">
              <nav aria-label={L(lang, 'Links do rodapé', 'Footer links', 'Liens de bas de page', 'Enlaces del pie de página')} className="flex flex-wrap gap-x-6 text-[15px] font-semibold">
                <Link to="/data" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Dados', 'Data', 'Données', 'Datos')}</Link>
                <Link to="/model" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Como o modelo funciona', 'How the model works', 'Comment marche le modèle', 'Cómo funciona el modelo')}</Link>
                <Link to="/track-record" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Desempenho', 'Track record', 'Bilan', 'Desempeño')}</Link>
              </nav>
              <SiteLinks className="text-[15px] font-semibold" />
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-8 gap-y-1">
            <p className="max-w-[84ch] text-sm leading-6 text-[var(--muted)]">
              {L(
                lang,
                'Projeto analítico independente. Não afiliado ao UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight ou Invicta FC.',
                'Independent analytics project. Not affiliated with UFC, PFL, Bellator, ONE Championship, RIZIN, KSW, LFA, Cage Warriors, OKTAGON, Jungle Fight, or Invicta FC.',
                'Projet analytique indépendant. Non affilié à l’UFC, à la PFL, au Bellator, à ONE Championship, à RIZIN, à KSW, à la LFA, à Cage Warriors, à OKTAGON, au Jungle Fight ou à Invicta FC.',
                'Proyecto analítico independiente. No afiliado a la UFC, la PFL, Bellator, ONE Championship, RIZIN, KSW, la LFA, Cage Warriors, OKTAGON, Jungle Fight ni Invicta FC.',
              )}{' '}
              <Link to="/about" className="font-semibold text-[var(--ink)] underline decoration-1 underline-offset-4 hover:decoration-2">
                {L(lang, 'Ver a metodologia do projeto', 'See the project methodology', 'Voir la méthodologie du projet', 'Ver la metodología del proyecto')}
              </Link>
            </p>
            <SocialLinks />
          </div>
        </div>
      </footer>
    </div>
  )
}
