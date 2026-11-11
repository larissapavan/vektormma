import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { AnimatedCounter } from '../shared/components/editorial/AnimatedCounter'
import { historyDecades, historyRange } from '../shared/data/history'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { SocialLinks } from '../shared/components/SocialLinks'
import { SiteLinks } from '../shared/components/SiteLinks'
import { FeaturedMatchup } from '../shared/components/FeaturedMatchup'
import { FightLoop } from '../shared/components/fightScene/FightLoop'
import { sectionActionClass } from '../shared/components/ui/Section'
import { useDataInfo } from '../shared/hooks/useDataInfo'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { OrganizationsSection } from './landing/OrganizationsSection'

// Shown until the API answers (or if it never does): the last figures checked by hand.
const FALLBACK_FIGHTS = 8985
const FALLBACK_FIGHTERS = 2796
const FALLBACK_FEATURES = 46
const HISTORY_RANGE = historyRange()

/** The page column: the same width and side padding as the header. */
const COLUMN = 'mx-auto w-full max-w-[1376px] px-4 sm:px-6 lg:px-12'

export function Landing() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { dataInfo } = useDataInfo()
  const { modelInfo } = useModelInfo()
  const fightsCount = dataInfo?.fights_count ?? FALLBACK_FIGHTS
  const fightersCount = dataInfo?.fighters_count ?? FALLBACK_FIGHTERS
  const featureCount = modelInfo?.feature_count ?? FALLBACK_FEATURES
  const accuracy = shownMetrics(modelInfo, lang)

  const figures = [
    { value: <AnimatedCounter value={fightsCount} />, label: L(lang, 'lutas catalogadas', 'fights on file', 'combats répertoriés', 'peleas registradas') },
    { value: <AnimatedCounter value={fightersCount} />, label: L(lang, 'lutadores', 'fighters', 'combattants', 'peleadores') },
    { value: <AnimatedCounter value={featureCount} />, label: L(lang, 'dados usados em cada previsão', 'figures behind each prediction', 'données utilisées pour chaque pronostic', 'datos usados en cada pronóstico') },
    { value: <>{historyDecades()}+</>, label: L(lang, `anos de histórico (${HISTORY_RANGE})`, `years of history (${HISTORY_RANGE})`, `ans d’historique (${HISTORY_RANGE})`, `años de historia (${HISTORY_RANGE})`) },
  ]

  return (
    <div className="flex w-full flex-col bg-[var(--mat)] text-[var(--ink)]">
      {/* 1. The promise, the main action and the featured fight. */}
      <section className={`${COLUMN} pt-8 sm:pt-10`}>
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
          <h1 className="max-w-[760px] text-[36px] leading-[1.02] sm:text-[44px]">
            {L(
              lang,
              'Compare lutadores e veja a chance de vitória estimada pelo modelo em cada luta',
              'Compare fighters and see the model’s estimated win chance for every fight',
              'Comparez les combattants et voyez la chance de victoire estimée par le modèle pour chaque combat',
              'Compara peleadores y mira la probabilidad de victoria estimada por el modelo en cada pelea',
            )}
          </h1>
          <Link to="/head-to-head" className="primary-action inline-flex min-h-[52px] items-center px-7 !text-[17px] max-xs:w-full max-xs:justify-center">
            {L(lang, 'Comparar lutadores', 'Compare fighters', 'Comparer les combattants', 'Comparar peleadores')}
          </Link>
        </div>

        <div className="mt-9">
          <FeaturedMatchup />
        </div>
      </section>

      {/* 2. What the site holds, and how often the model has been right. */}
      <section className={`${COLUMN} grid gap-x-[72px] gap-y-12 pt-16 sm:pt-[72px] lg:grid-cols-2`}>
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
          <div className="mt-8 max-w-[440px]">
            <FightLoop className="aspect-square w-full" />
          </div>
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

      {/* 3. The organizations, as rows. */}
      <div className={`${COLUMN} pt-20 sm:pt-[88px]`}>
        <OrganizationsSection />
      </div>

      {/* 4. Footer. */}
      <footer className="mt-20 border-t-[3px] border-[var(--ink)] sm:mt-28">
        <div className={`${COLUMN} pb-10 pt-8`}>
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
            <div>
              <p className="font-display text-[28px] leading-none">
                <span className="font-black">Vektor</span> <span className="font-medium">MMA</span>
              </p>
              <p className="mt-1.5 text-[15px] text-[var(--muted)]">
                {L(lang, 'Estatísticas e previsões de esportes de combate.', 'Combat sports stats and predictions.', 'Statistiques et pronostics de sports de combat.', 'Estadísticas y pronósticos de deportes de combate.')}
              </p>
            </div>
            <nav aria-label={L(lang, 'Links do rodapé', 'Footer links', 'Liens de bas de page', 'Enlaces del pie de página')} className="flex flex-wrap gap-x-6 text-[15px] font-semibold">
              <Link to="/about" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Sobre', 'About', 'À propos', 'Acerca de')}</Link>
              <Link to="/data" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Dados', 'Data', 'Données', 'Datos')}</Link>
              <Link to="/model" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Como o modelo funciona', 'How the model works', 'Comment marche le modèle', 'Cómo funciona el modelo')}</Link>
              <Link to="/track-record" className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline">{L(lang, 'Desempenho', 'Track record', 'Bilan', 'Desempeño')}</Link>
            </nav>
          </div>
          <SiteLinks className="mt-2 text-[15px] font-semibold" />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-10 gap-y-3">
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
