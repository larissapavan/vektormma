import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { L } from '../../i18n/lang'
import { DIRECTORY_HASH, DIRECTORY_ORDER } from '../../shared/data/orgs'

/** The anchor of the predictions preview, further down the home page. */
const PREDICTIONS_HASH = '#predictions'

/**
 * Two fighters squaring off in an arena under a single, sober light, drawn in flat shapes (no glow, no gradient): the stands
 * in the dark, the cage fence, a cone of light, the canvas and two silhouettes whose gloves carry the red and blue corners.
 * No organization's mark appears in it. It fills its frame (`slice`), so a phone shows a lower crop of the same scene.
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
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true" className="h-full w-full" focusable="false">
      <defs>
        <pattern id="arena-fence" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="var(--ink)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="600" height="420" fill="var(--panel)" />
      {/* The stands, three tiers fading into the dark */}
      {[60, 100, 140].map((y, index) => (
        <rect key={y} x="0" y={y} width="600" height="26" fill="var(--ink)" opacity={0.1 - index * 0.025} />
      ))}
      {/* The fence behind the fighters */}
      <rect x="40" y="170" width="520" height="160" fill="url(#arena-fence)" opacity="0.1" />
      <line x1="40" y1="170" x2="560" y2="170" stroke="var(--rule)" strokeWidth="3" />
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

/**
 * The home page's own opening: the promise, a short line on what the site holds, the way to the directory and the way to
 * the predictions. On a phone the text and the actions come first and the picture follows in a lower crop, so the
 * directory is one short scroll away.
 */
export function LandingHero() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const action = 'inline-flex min-h-[52px] items-center justify-center px-7 !text-[17px] max-xs:w-full'

  return (
    <section aria-labelledby="landing-title" className="grid items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h1 id="landing-title" className="text-[40px] leading-[0.98] sm:text-[60px] lg:text-[68px]">
          {L(lang, 'Explore o MMA pelos dados', 'Explore MMA through the data', 'Explorez le MMA par les données', 'Explora el MMA con datos')}
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-[var(--muted)] sm:mt-5">
          {L(
            lang,
            `Acompanhe eventos e resultados de ${DIRECTORY_ORDER.length} organizações. Veja as estimativas de vitória do modelo para lutas do UFC, da PFL e da ONE.`,
            `Follow events and results from ${DIRECTORY_ORDER.length} organizations. See the model’s win estimates for UFC, PFL and ONE fights.`,
            `Suivez les événements et les résultats de ${DIRECTORY_ORDER.length} organisations. Consultez les estimations de victoire du modèle pour les combats de l’UFC, de la PFL et de ONE.`,
            `Sigue los eventos y resultados de ${DIRECTORY_ORDER.length} organizaciones. Mira las estimaciones de victoria del modelo para las peleas de la UFC, la PFL y ONE.`,
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 sm:mt-7">
          <Link to={{ hash: DIRECTORY_HASH }} className={`primary-action ${action}`}>
            {L(lang, 'Explorar organizações', 'Explore organizations', 'Explorer les organisations', 'Explorar organizaciones')}
          </Link>
          <Link to={{ hash: PREDICTIONS_HASH }} className={`ghost-action ${action}`}>
            {L(lang, 'Ver previsões', 'See predictions', 'Voir les pronostics', 'Ver pronósticos')}
          </Link>
        </div>
      </div>
      {/* A fixed frame (16:9 on a phone, a lower 21:9 crop on a tablet, 10:8 beside the text), so nothing below moves while the page settles. */}
      <div className="aspect-[16/9] w-full overflow-hidden border border-[var(--rule)] sm:aspect-[21/9] lg:aspect-[10/8]">
        <ArenaIllustration />
      </div>
    </section>
  )
}
