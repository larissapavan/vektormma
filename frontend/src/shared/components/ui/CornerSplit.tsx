import type { ReactNode } from 'react'

export type Corner = {
  /** The fighter's full name; the last word is set large as the surname. */
  name: string
  /** "Red corner" / "Blue corner", in the language on screen. */
  label: string
  /** The fighter's photo (or the initials that stand in for it). */
  photo?: ReactNode
  /** A control for this corner, such as "Change fighter". */
  action?: ReactNode
}

/** Lowercase particles that belong to the surname: "Rafael dos Anjos" is printed "Rafael" over "dos Anjos". */
const PARTICLES = new Set(['da', 'das', 'de', 'del', 'della', 'der', 'di', 'do', 'dos', 'du', 'la', 'le', 'van', 'von'])

/** The name split as the corner block prints it: given names small on top, the surname large below. */
export function splitName(name: string): { given: string; surname: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return { given: '', surname: parts[0] ?? name }
  let start = parts.length - 1
  while (start > 1 && PARTICLES.has(parts[start - 1])) start -= 1
  return { given: parts.slice(0, start).join(' '), surname: parts.slice(start).join(' ') }
}

/** The surname as the corner block prints it. */
export function surnameOf(name: string) {
  return splitName(name).surname
}

function CornerBlock({ corner, side, headingLevel }: { corner: Corner; side: 'red' | 'blue'; headingLevel: 'h2' | 'h3' | 'p' }) {
  const red = side === 'red'
  const { given, surname } = splitName(corner.name)
  const Name = headingLevel
  // The surname fills the block without ever breaking: its size is the design's clamp, capped by the width one letter
  // can take inside the block (Big Shoulders Display at 900 runs about 0.52em per capital).
  const fit = `${(100 / (Math.max(surname.length, 3) * 0.54)).toFixed(1)}cqw`

  return (
    <div className={`flex min-w-0 flex-1 basis-0 flex-col justify-between gap-3 p-4 text-white sm:basis-[420px] sm:gap-4 sm:p-6 lg:px-7 ${red ? 'bg-[var(--red)]' : 'bg-[var(--blue)] text-right'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${red ? '' : 'flex-row-reverse'}`}>
        <p className="text-sm font-bold sm:text-base">{corner.label}</p>
        {corner.action ? <div className="max-sm:hidden">{corner.action}</div> : null}
      </div>
      <div className={`flex flex-col gap-3 sm:items-end sm:justify-between sm:gap-5 ${red ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
        <div className="min-w-0 flex-1 [container-type:inline-size]">
          {/* One heading reads the whole name; on screen the given names sit small over the large surname. */}
          <Name className="!leading-none">
            {given ? (
              <>
                <span className="block !font-sans text-[17px] font-bold leading-tight sm:text-[22px]">{given}</span>{' '}
              </>
            ) : null}
            <span
              className="caps mt-1.5 block whitespace-nowrap font-display font-black leading-[0.8]"
              style={{ fontSize: `min(clamp(56px, 8.5vw, 112px), ${fit})` }}
            >
              {surname}
            </span>
          </Name>
        </div>
        {corner.photo ? <div className="shrink-0 max-sm:w-full">{corner.photo}</div> : null}
      </div>
      {/* On a phone the corner's control sits under the photo, full width. */}
      {corner.action ? <div className="sm:hidden [&>button]:w-full [&>button]:justify-center">{corner.action}</div> : null}
    </div>
  )
}

/**
 * The two corners of a fight as straight blocks side by side: red on the left, blue on the right, each fighter's given
 * names small over the surname large in white and the photos on the inner edges, so the eye lands on the middle of the matchup.
 */
export function CornerSplit({
  red,
  blue,
  headingLevel = 'p',
  testId,
}: {
  red: Corner
  blue: Corner
  headingLevel?: 'h2' | 'h3' | 'p'
  testId?: string
}) {
  return (
    <div className="flex sm:flex-wrap" data-testid={testId}>
      <CornerBlock corner={red} side="red" headingLevel={headingLevel} />
      <CornerBlock corner={blue} side="blue" headingLevel={headingLevel} />
    </div>
  )
}

/** A corner photo: straight edges, a thin light rule, sized for the block. */
export const cornerPhotoClass =
  'h-[120px] w-full sm:h-[170px] sm:w-[124px] lg:h-[190px] lg:w-[138px] !rounded-none !border !border-white/55 !bg-black/20'
