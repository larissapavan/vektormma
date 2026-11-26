import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { L } from '../../i18n/lang'
import { ORGS } from '../../shared/data/orgs'

/**
 * Two fighters squaring off under the arena light, drawn in flat shapes (no glow, no gradient): a cone of light, the cage
 * floor and two silhouettes whose gloves carry the red and blue corners. No organization's mark appears in it.
 */
function ArenaIllustration() {
  // One fighter in an orthodox stance, facing right; the other is the same figure mirrored.
  const fighter = (glove: string) => (
    <g>
      <g stroke="var(--ink)" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.92">
        {/* Legs: lead knee bent forward, rear leg pushing back */}
        <path d="M206 262 L236 302 L254 346" strokeWidth="27" />
        <path d="M184 262 L160 304 L132 346" strokeWidth="27" />
        {/* Torso, leaning in */}
        <path d="M218 184 L194 254" strokeWidth="50" />
        {/* Rear arm, glove by the chin */}
        <path d="M208 192 L228 218 L240 188" strokeWidth="19" />
        {/* Lead arm, jab half-out */}
        <path d="M226 190 L256 206 L280 180" strokeWidth="19" />
        {/* Neck */}
        <path d="M222 170 L220 182" strokeWidth="18" />
      </g>
      <circle cx="226" cy="150" r="23" fill="var(--ink)" opacity="0.92" />
      {/* Shorts in the corner colour */}
      <path d="M170 244 L220 252 L216 284 L172 278 Z" fill={glove} />
      <circle cx="242" cy="184" r="16" fill={glove} />
      <circle cx="284" cy="174" r="16" fill={glove} />
      <path d="M240 340 L270 340 L270 350 L238 350 Z" fill="var(--ink)" opacity="0.92" />
      <path d="M116 340 L146 340 L148 350 L116 350 Z" fill="var(--ink)" opacity="0.92" />
    </g>
  )

  return (
    <svg viewBox="0 0 600 420" role="presentation" aria-hidden="true" className="h-auto w-full" focusable="false">
      {/* Light from the rig above */}
      <polygon points="262,0 338,0 540,372 60,372" fill="var(--ink)" opacity="0.07" />
      <polygon points="284,0 316,0 420,372 180,372" fill="var(--ink)" opacity="0.06" />
      <rect x="236" y="0" width="128" height="10" fill="var(--ink)" opacity="0.5" />
      {/* Cage floor: a flattened octagon and its fence posts */}
      <polygon points="512,366 388,392 212,392 88,366 88,336 212,310 388,310 512,336" fill="var(--panel)" stroke="var(--rule)" strokeWidth="3" />
      <polygon points="460,358 370,377 230,377 140,358 140,342 230,324 370,324 460,342" fill="none" stroke="var(--rule)" strokeWidth="1.5" strokeDasharray="6 8" />
      {[88, 212, 388, 512].map((x) => (
        <line key={x} x1={x} y1={x === 212 || x === 388 ? 310 : 336} x2={x} y2={x === 212 || x === 388 ? 236 : 262} stroke="var(--rule)" strokeWidth="3" />
      ))}
      {/* Red corner on the left, blue corner on the right */}
      <g transform="translate(-28 0)">{fighter('var(--red)')}</g>
      <g transform="translate(628 0) scale(-1 1)">{fighter('var(--blue)')}</g>
    </svg>
  )
}

/** The opening: what Vektor MMA is, the promise in one line, and the way down to the organizations. */
export function LandingHero() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const orgCount = Object.keys(ORGS).length

  const goToOrganizations = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('organizations-grid')
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', '#organizations-grid')
  }

  return (
    <section className="grid items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none">
          <span className="font-black">Vektor</span> <span className="font-medium">MMA</span>
        </p>
        <h1 className="mt-4 text-[44px] leading-[0.98] sm:text-[60px] lg:text-[68px]">
          {L(lang, 'Explore o MMA. Entenda os confrontos.', 'Explore MMA. Understand the matchups.', 'Explorez le MMA. Comprenez les affrontements.', 'Explora el MMA. Entiende los enfrentamientos.')}
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[var(--muted)]">
          {L(
            lang,
            `Eventos, lutadores e resultados de ${orgCount} organizações, com a chance de vitória estimada pelo modelo em cada luta onde há dados para isso.`,
            `Events, fighters and results from ${orgCount} organizations, with the model’s estimated win chance for every fight it has the data for.`,
            `Événements, combattants et résultats de ${orgCount} organisations, avec la chance de victoire estimée par le modèle pour chaque combat où les données le permettent.`,
            `Eventos, peleadores y resultados de ${orgCount} organizaciones, con la probabilidad de victoria estimada por el modelo en cada pelea donde hay datos para ello.`,
          )}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="#organizations-grid" onClick={goToOrganizations} className="primary-action inline-flex min-h-[52px] items-center justify-center px-7 !text-[17px] max-xs:w-full">
            {L(lang, 'Explorar organizações', 'Explore organizations', 'Explorer les organisations', 'Explorar organizaciones')}
          </a>
          <Link to="/model" className="ghost-action inline-flex min-h-[52px] items-center justify-center px-7 !text-[17px] max-xs:w-full">
            {L(lang, 'Como o modelo funciona', 'How the model works', 'Comment marche le modèle', 'Cómo funciona el modelo')}
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[280px] sm:max-w-[420px] lg:max-w-none">
        <ArenaIllustration />
      </div>
    </section>
  )
}
