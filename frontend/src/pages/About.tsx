import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Compass, Database, ExternalLink, Library, Mail, Users } from 'lucide-react'

import { L } from '../i18n/lang'
import { ABOUT_SOURCES, sourceName, sourceUse } from '../shared/data/aboutSources'
import { YouTubeIcon, InstagramIcon, TikTokIcon } from '../shared/components/SocialLinks'

const GITHUB_PROFILE = 'https://github.com/larissapavan'
const LINKEDIN_PROFILE = 'https://www.linkedin.com/in/larissacpavan/'

export function About() {
  const { t, i18n } = useTranslation()

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="" aria-labelledby="about-title">
        <p className="broadcast-label text-label text-[var(--text-muted)]">{t('about.eyebrow')}</p>
        <h1 id="about-title" className="mt-1.5 text-2xl font-bold text-[var(--text-main)] min-[390px]:text-3xl md:text-4xl">
          {t('about.title')}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7">
          {t('about.description')}
        </p>
      </section>

      <AboutSection id="who" icon={Users} title={t('about.who')}>
        <ul className="list-disc space-y-2 pl-5 ">
          <li>{t('about.whoText1')}</li>
          <li>{t('about.whoText2')}</li>
          <li>{t('about.whoText3')}</li>
        </ul>
      </AboutSection>

      <AboutSection id="name" icon={Compass} title={t('about.name')}>
        <ul className="list-disc space-y-2 pl-5 ">
          <li>{t('about.nameText1')}</li>
          <li>{t('about.nameText2')}</li>
        </ul>
      </AboutSection>

      <AboutSection id="data" icon={Database} title={t('about.dataAndSystem')}>
        <p>
          {L(
            i18n.language,
            'Perfis de atletas, eventos, resultados e rankings são coletados de fontes públicas (UFCStats.com, ESPN, Next-Fight e UFC.com; pflmma.com para a PFL; ESPN e Wikipedia para o Bellator; ESPN para RIZIN, KSW, LFA e Cage Warriors (e Sherdog para RIZIN e KSW de 2025 em diante); oktagonmma.com para o OKTAGON; Sherdog para Jungle Fight e Invicta FC; FightHub para as academias). O histórico de títulos é compilado à mão a partir de registros publicados do UFC, e tudo é salvo em arquivos CSV que uma rotina automática atualiza todos os dias. A cada confronto, o sistema compara os dois atletas e entrega essas diferenças ao modelo, que estima a chance de vitória de cada um.',
            "Fighter profiles, events, results and rankings are collected from public sources (UFCStats.com, ESPN, Next-Fight and UFC.com; pflmma.com for the PFL; ESPN and Wikipedia for Bellator; ESPN for RIZIN, KSW, the LFA and Cage Warriors (and Sherdog for RIZIN and KSW from 2025 on); oktagonmma.com for OKTAGON; Sherdog for Jungle Fight and Invicta FC; FightHub for the gyms). The title history is compiled by hand from published UFC title records, and everything is saved as CSV files that an automated job refreshes daily. For each matchup the system compares the two fighters and feeds those differences into the model, which estimates each fighter's chance of winning.",
            "Les profils des combattants, les événements, les résultats et les classements sont collectés à partir de sources publiques (UFCStats.com, ESPN, Next-Fight et UFC.com ; pflmma.com pour la PFL ; ESPN et Wikipedia pour le Bellator ; ESPN pour RIZIN, KSW, la LFA et Cage Warriors (et Sherdog pour RIZIN et KSW à partir de 2025) ; oktagonmma.com pour OKTAGON ; Sherdog pour Jungle Fight et Invicta FC ; FightHub pour les salles). L’historique des titres est compilé à la main à partir des historiques de titres UFC publiés, et le tout est enregistré en fichiers CSV qu’une tâche automatisée actualise chaque jour. Pour chaque affrontement, le système compare les deux combattants et transmet ces écarts au modèle, qui estime les chances de victoire de chacun.",
            'Los perfiles de peleadores, los eventos, los resultados y el ranking se recopilan de fuentes públicas (UFCStats.com, ESPN, Next-Fight y UFC.com; pflmma.com para la PFL; ESPN y Wikipedia para Bellator; ESPN para RIZIN, KSW, la LFA y Cage Warriors (y Sherdog para RIZIN y KSW desde 2025); oktagonmma.com para OKTAGON; Sherdog para Jungle Fight e Invicta FC; FightHub para los gimnasios). El historial de títulos se compila a mano a partir de los registros de títulos de la UFC publicados, y todo se guarda en archivos CSV que un proceso automático actualiza a diario. Para cada enfrentamiento, el sistema compara a los dos peleadores y alimenta con esas diferencias al modelo, que estima la probabilidad de victoria de cada uno.',
          )}
        </p>
      </AboutSection>

      <AboutSection id="disclaimer" icon={AlertTriangle} title={t('about.disclaimer')}>
        <ul className="list-disc space-y-2 pl-5 ">
          <li>{t('about.disclaimerText1')}</li>
          <li>{t('about.disclaimerText2')}</li>
        </ul>
      </AboutSection>

      <AboutSection id="contact" icon={Mail} title={t('about.contact')}>
        <p>
          {t('about.contactText')}{' '}
          <ExternalAnchor href={GITHUB_PROFILE}>github.com/larissapavan</ExternalAnchor>{' '}
          {L(i18n.language, 'ou', 'or', 'ou', 'o')}{' '}
          <ExternalAnchor href={LINKEDIN_PROFILE}>LinkedIn</ExternalAnchor>.
        </p>

        <div className="mt-4">
          <p className="mb-1 text-base font-bold text-[var(--ink)]">
            {L(i18n.language, 'Canais oficiais', 'Official channels', 'Canaux officiels', 'Canales oficiales')}
          </p>
          <div className="flex flex-wrap gap-x-6 text-base font-medium">
            <a
              href="https://www.youtube.com/@Vektor-MMA"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline decoration-[var(--rule)] underline-offset-4 hover:decoration-[var(--ink)]"
            >
              <YouTubeIcon className="h-4 w-4 text-[var(--ink)]" />
              <span>YouTube: @Vektor-MMA</span>
            </a>
            <a
              href="https://www.instagram.com/vektormma"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline decoration-[var(--rule)] underline-offset-4 hover:decoration-[var(--ink)]"
            >
              <InstagramIcon className="h-4 w-4 text-[var(--ink)]" />
              <span>Instagram: @vektormma</span>
            </a>
            <a
              href="https://www.tiktok.com/@vektormma"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[var(--ink)] underline decoration-[var(--rule)] underline-offset-4 hover:decoration-[var(--ink)]"
            >
              <TikTokIcon className="h-4 w-4 text-[var(--ink)]" />
              <span>TikTok: @vektormma</span>
            </a>
          </div>
        </div>
      </AboutSection>

      <AboutSection id="sources" icon={Library} title={t('about.sources')} wide>
        <ul className="grid border-t-[3px] border-[var(--ink)] sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-3">
          {ABOUT_SOURCES.map((source) => (
            <li key={source.name} className="border-b border-[var(--rule)] py-3">
              <p className="text-base font-semibold text-[var(--ink)]">
                {source.href ? <ExternalAnchor href={source.href}>{sourceName(source.name, i18n.language)}</ExternalAnchor> : sourceName(source.name, i18n.language)}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{sourceUse(source, i18n.language)}</p>
            </li>
          ))}
        </ul>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          {L(
            i18n.language,
            'Feito com software de código aberto: React, Vite, Tailwind CSS, Recharts, Framer Motion e Lucide na interface; FastAPI, pandas, scikit-learn e SHAP no servidor.',
            'Built with open-source software: React, Vite, Tailwind CSS, Recharts, Framer Motion and Lucide on the front end; FastAPI, pandas, scikit-learn and SHAP on the back end.',
            'Construit avec des logiciels open source : React, Vite, Tailwind CSS, Recharts, Framer Motion et Lucide côté interface ; FastAPI, pandas, scikit-learn et SHAP côté serveur.',
            'Creado con software de código abierto: React, Vite, Tailwind CSS, Recharts, Framer Motion y Lucide en la interfaz; FastAPI, pandas, scikit-learn y SHAP en el servidor.',
          )}
        </p>
      </AboutSection>
    </div>
  )
}

function AboutSection({
  id,
  icon: Icon,
  title,
  children,
  wide = false,
}: {
  id: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  children: ReactNode
  /** Lists and grids take the full width; running text stays in a readable column. */
  wide?: boolean
}) {
  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-5" aria-labelledby={`about-${id}`}>
      <div className="flex items-center gap-2.5">
        <div className="rounded-sm bg-[var(--panel)] p-2 text-[var(--ink)]">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <h2 id={`about-${id}`} className="section-title">
          {title}
        </h2>
      </div>
      <div className={`mt-3 space-y-3 text-base leading-7 ${wide ? '' : 'max-w-3xl'}`}>{children}</div>
    </section>
  )
}

function ExternalAnchor({ href, children }: { href: string; children: ReactNode }) {
  const { i18n } = useTranslation()
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[var(--text-main)] underline decoration-[var(--rule)] underline-offset-4 transition hover:decoration-[var(--ink)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
      <span className="sr-only">{L(i18n.language, '(abre em nova aba)', '(opens in a new tab)', '(s’ouvre dans un nouvel onglet)', '(se abre en una pestaña nueva)')}</span>
    </a>
  )
}
