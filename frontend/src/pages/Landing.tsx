import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'
import { SiteFooter } from '../shared/components/SiteFooter'
import { sectionActionClass } from '../shared/components/ui/Section'
import { LandingHero } from './landing/LandingHero'
import { OrganizationsSection } from './landing/OrganizationsSection'

/** The page column: the same width and side padding as the header (and the footer rule lines up with it). */
const COLUMN = 'mx-auto w-full max-w-[1376px] px-4 sm:px-6 lg:px-12'

/**
 * The vertical rhythm between the page's sections, set here and nowhere else: the sections themselves carry no outer margin
 * or padding, so each gap is exactly one of these values (Tailwind's 4 px scale).
 * - `afterHero`: hero to the directory.
 * - `section`: directory to "About the project", measured from the last directory row (28–32 px phone, 44 px desktop).
 * - `footer`: the links to the footer rule. The links are 44 px touch targets with about 10 px of air under the text, so
 *   16 / 24 px of margin reads as about 26 / 34 px from the text.
 */
const GAP = {
  afterHero: 'mt-12 sm:mt-16',
  section: 'mt-8 lg:mt-11',
  footer: 'mt-4 lg:mt-6',
}

/**
 * The way into Vektor MMA: what it is, the organization directory and a short word on the project. Nothing on it waits for
 * the API, so a visitor can always pick an organization; counts, next events and the model's figures live on the pages
 * that explain them.
 */
export function Landing() {
  const { i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div className="flex w-full flex-col bg-[var(--mat)] text-[var(--ink)]">
      <div className={`${COLUMN} pt-8 sm:pt-12`}>
        <LandingHero />
      </div>

      <div className={`${COLUMN} ${GAP.afterHero}`}>
        <OrganizationsSection />
      </div>

      <section aria-labelledby="project-title" className={`${COLUMN} ${GAP.section}`}>
        {/* About 65 characters a line on a desktop; the links sit side by side and wrap on a narrow screen. */}
        <div className="max-w-[65ch]">
          <h2 id="project-title" className="text-[28px] leading-[1.05] sm:text-[34px]">
            {L(lang, 'Sobre o projeto', 'About the project', 'À propos du projet', 'Sobre el proyecto')}
          </h2>
          <p className="mt-2 text-base leading-7 sm:text-lg">
            {L(
              lang,
              'O Vektor MMA é um projeto independente que organiza dados públicos de eventos e lutadores. No UFC, na PFL e na ONE, um modelo estatístico estima a chance de vitória de cada lado antes da luta, e cada previsão fica registrada para ser conferida depois do evento.',
              'Vektor MMA is an independent project that organizes public data on events and fighters. In the UFC, the PFL and ONE, a statistical model estimates each side’s win chance before the fight, and every prediction is logged so it can be checked after the event.',
              'Vektor MMA est un projet indépendant qui organise les données publiques sur les événements et les combattants. À l’UFC, à la PFL et à ONE, un modèle statistique estime la chance de victoire de chaque camp avant le combat, et chaque pronostic est enregistré pour être vérifié après l’événement.',
              'Vektor MMA es un proyecto independiente que organiza datos públicos de eventos y peleadores. En la UFC, la PFL y ONE, un modelo estadístico estima la probabilidad de victoria de cada lado antes de la pelea, y cada pronóstico queda registrado para comprobarlo después del evento.',
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-7 gap-y-1">
            <Link to="/model" className={sectionActionClass}>
              {L(lang, 'Como o modelo funciona', 'How the model works', 'Comment marche le modèle', 'Cómo funciona el modelo')}
            </Link>
            <Link to="/track-record" className={sectionActionClass}>
              {L(lang, 'Histórico de previsões', 'Prediction record', 'Historique des pronostics', 'Historial de pronósticos')}
            </Link>
          </div>
        </div>
      </section>

      <div className={`${COLUMN} ${GAP.footer}`}>
        <SiteFooter />
      </div>
    </div>
  )
}
