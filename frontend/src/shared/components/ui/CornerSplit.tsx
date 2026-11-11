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

/** The surname as the corner block prints it: the last word of the name. */
export function surnameOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? name
}

function CornerBlock({ corner, side, headingLevel }: { corner: Corner; side: 'red' | 'blue'; headingLevel: 'h2' | 'h3' | 'p' }) {
  const red = side === 'red'
  const surname = surnameOf(corner.name)
  const Name = headingLevel
  // The surname fills the block without ever breaking: its size is the design's clamp, capped by the width one letter
  // can take inside the block (Big Shoulders Display at 900 runs about 0.52em per capital).
  const fit = `${(100 / (Math.max(surname.length, 3) * 0.54)).toFixed(1)}cqw`

  return (
    <div className={`flex min-w-0 flex-1 basis-0 flex-col justify-between gap-4 p-4 text-white sm:min-h-[380px] sm:basis-[420px] sm:gap-6 sm:p-7 lg:px-8 ${red ? 'bg-[var(--red)]' : 'bg-[var(--blue)] text-right'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${red ? '' : 'flex-row-reverse'}`}>
        <p className="text-sm font-bold sm:text-base">{corner.label}</p>
        {corner.action ? <div className="max-sm:hidden">{corner.action}</div> : null}
      </div>
      <div className={`flex flex-col gap-3 sm:items-end sm:justify-between sm:gap-5 ${red ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
        <div className="min-w-0 flex-1 [container-type:inline-size]">
          <Name className="!font-sans text-[17px] !font-bold !leading-tight sm:text-[22px]">{corner.name}</Name>
          <span
            aria-hidden="true"
            className="caps mt-2 block whitespace-nowrap font-display font-black leading-[0.8] tracking-[-0.01em]"
            style={{ fontSize: `min(clamp(68px, 11vw, 152px), ${fit})` }}
          >
            {surname}
          </span>
        </div>
        {corner.photo ? <div className="shrink-0 max-sm:w-full">{corner.photo}</div> : null}
      </div>
      {/* On a phone the corner's control sits under the photo, full width. */}
      {corner.action ? <div className="sm:hidden [&>button]:w-full [&>button]:justify-center">{corner.action}</div> : null}
    </div>
  )
}

/**
 * The two corners of a fight as straight blocks side by side: red on the left, blue on the right, each fighter's surname
 * large in white and the photos on the inner edges, so the eye lands on the middle of the matchup.
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
  'h-[130px] w-full sm:h-[220px] sm:w-[150px] lg:h-[250px] lg:w-[170px] !rounded-none !border !border-white/55 !bg-black/20 !shadow-none'
