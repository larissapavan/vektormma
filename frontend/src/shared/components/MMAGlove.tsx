import { useState } from 'react'

interface MMAGloveProps {
  /** Public path of the glove photo (transparent WebP). */
  src: string
  /** Organisation colour: drives the neon rim/glow and the tint laid over the leather. */
  glow: string
  className?: string
}

/** Intrinsic size of the exported glove WebPs, so the box is reserved before the image loads. */
const WIDTH = 600
const HEIGHT = 656

/**
 * Decorative photo of an MMA glove. A tint layer, masked by the glove's own shape, lifts the
 * black leather towards the organisation colour; the glow is a stacked drop-shadow (see
 * `.glove-art` and `.glove-tint` in index.css). The image is purely ornamental.
 */
export function MMAGlove({ src, glow, className }: MMAGloveProps) {
  // The tint is masked by the photo itself, so it stays hidden until the photo has loaded.
  const [ready, setReady] = useState(false)

  return (
    <span
      aria-hidden="true"
      data-ready={ready || undefined}
      className={`glove-art relative inline-block ${className ?? ''}`}
      style={{ '--glove-glow': glow, '--glove-src': `url(${src})` } as React.CSSProperties}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={WIDTH}
        height={HEIGHT}
        decoding="async"
        draggable={false}
        ref={(el) => {
          if (el?.complete) setReady(true)
        }}
        onLoad={() => setReady(true)}
        className="block h-full w-auto select-none"
      />
      <span className="glove-tint" />
    </span>
  )
}
