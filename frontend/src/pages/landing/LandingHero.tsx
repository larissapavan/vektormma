import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { L } from '../../i18n/lang'
import { DIRECTORY_HASH, DIRECTORY_ORDER } from '../../shared/data/orgs'

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

/** The opening: the promise in one line and the way to the organization directory. The picture is static. */
export function LandingHero() {
  const { i18n } = useTranslation()
  const lang = i18n.language

  return (
    <section aria-labelledby="landing-title" className="grid items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h1 id="landing-title" className="text-[44px] leading-[0.98] sm:text-[60px] lg:text-[68px]">
          {L(lang, 'Explore o MMA pelos dados', 'Explore MMA through the data', 'Explorez le MMA par les données', 'Explora el MMA con datos')}
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[var(--muted)]">
          {L(
            lang,
            `Eventos, lutadores e resultados de ${DIRECTORY_ORDER.length} organizações, com a chance de vitória estimada por um modelo estatístico onde há dados para isso.`,
            `Events, fighters and results from ${DIRECTORY_ORDER.length} organizations, with a statistical model’s estimated win chance wherever the data allows.`,
            `Événements, combattants et résultats de ${DIRECTORY_ORDER.length} organisations, avec la chance de victoire estimée par un modèle statistique quand les données le permettent.`,
            `Eventos, peleadores y resultados de ${DIRECTORY_ORDER.length} organizaciones, con la probabilidad de victoria estimada por un modelo estadístico donde hay datos para ello.`,
          )}
        </p>
        <Link
          to={{ hash: DIRECTORY_HASH }}
          className="primary-action mt-7 inline-flex min-h-[52px] items-center justify-center px-7 !text-[17px] max-xs:w-full"
        >
          {L(lang, 'Escolher organização', 'Choose an organization', 'Choisir une organisation', 'Elegir organización')}
        </Link>
      </div>
      {/* Fixed proportions (the SVG viewBox), so nothing below moves while the page settles. */}
      <div className="mx-auto w-full max-w-[300px] sm:max-w-[420px] lg:max-w-none">
        <ArenaIllustration />
      </div>
    </section>
  )
}
