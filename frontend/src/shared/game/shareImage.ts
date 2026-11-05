/**
 * Draws the career retrospect as a picture the visitor can save or post (a 4:5 card, the size social apps show without
 * cropping). It is drawn in the browser on a canvas from the same numbers a shared link carries: nothing is uploaded.
 */

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

export interface CardLabels {
  brand: string
  heading: string
  division: string
  standing: string
  recordLabel: string
  record: string
  stats: { value: string; label: string }[]
  details: { label: string; value: string }[]
  ending: string
  footer: string
  note: string
}

const FONT = "'Syne', 'Inter', 'Segoe UI', system-ui, sans-serif"
const RED = '#E3262F'
const GOLD = '#F2C230'
const INK = '#F4F4F5'
const MUTED = '#9CA3AF'

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: number, min = 28) {
  let current = size
  while (current > min) {
    ctx.font = `${weight} ${current}px ${FONT}`
    if (ctx.measureText(text).width <= maxWidth) break
    current -= 2
  }
  ctx.font = `${weight} ${current}px ${FONT}`
  return current
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = attempt
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s*\S*$/, '')}…`
    return kept
  }
  return lines
}

/** Paints the card. Resolves false when the browser gives no 2D canvas (the caller then hides the picture and keeps the link). */
export async function drawRetrospect(canvas: HTMLCanvasElement, card: { name: string } & CardLabels): Promise<boolean> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  try {
    // The headline font is loaded by the page's CSS; wait for it so the picture does not use the fallback by accident.
    await document.fonts?.ready
  } catch {
    // Without the font API the fallback font is used.
  }
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const pad = 80
  const inner = CARD_WIDTH - pad * 2

  const background = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  background.addColorStop(0, '#15171C')
  background.addColorStop(1, '#0A0B0E')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.fillStyle = RED
  ctx.fillRect(0, 0, 18, CARD_HEIGHT)
  ctx.fillStyle = GOLD
  ctx.fillRect(18, 0, 6, CARD_HEIGHT)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  ctx.fillStyle = RED
  ctx.font = `800 34px ${FONT}`
  ctx.fillText(card.brand, pad, 110)
  ctx.fillStyle = MUTED
  ctx.font = `600 26px ${FONT}`
  ctx.fillText(card.heading, pad, 156)

  ctx.fillStyle = INK
  fit(ctx, card.name.toUpperCase(), inner, 104, 800)
  ctx.fillText(card.name.toUpperCase(), pad, 290)

  ctx.fillStyle = GOLD
  ctx.font = `700 34px ${FONT}`
  ctx.fillText(`${card.division.toUpperCase()}  ·  ${card.standing.toUpperCase()}`, pad, 346)

  ctx.fillStyle = MUTED
  ctx.font = `600 26px ${FONT}`
  ctx.fillText(card.recordLabel.toUpperCase(), pad, 440)
  ctx.fillStyle = INK
  fit(ctx, card.record, inner, 250, 800, 120)
  ctx.fillText(card.record, pad, 640)

  const columnWidth = inner / card.stats.length
  card.stats.forEach((stat, index) => {
    const x = pad + index * columnWidth
    ctx.fillStyle = RED
    ctx.fillRect(x, 700, columnWidth - 24, 4)
    ctx.fillStyle = INK
    ctx.font = `800 84px ${FONT}`
    ctx.fillText(stat.value, x, 800)
    ctx.fillStyle = MUTED
    ctx.font = `600 26px ${FONT}`
    ctx.fillText(stat.label.toUpperCase(), x, 842)
  })

  let y = 900
  for (const detail of card.details.slice(0, 3)) {
    ctx.fillStyle = MUTED
    ctx.font = `600 24px ${FONT}`
    ctx.fillText(detail.label.toUpperCase(), pad, y)
    ctx.fillStyle = INK
    fit(ctx, detail.value, inner, 40, 700, 26)
    ctx.fillText(detail.value, pad, y + 42)
    y += 90
  }

  ctx.fillStyle = INK
  ctx.font = `600 28px ${FONT}`
  wrap(ctx, card.ending, inner, 2).forEach((line, index) => ctx.fillText(line, pad, y + 20 + index * 38))

  ctx.fillStyle = MUTED
  ctx.font = `500 22px ${FONT}`
  ctx.fillText(card.note, pad, CARD_HEIGHT - 90)
  ctx.fillStyle = RED
  ctx.font = `800 30px ${FONT}`
  ctx.fillText(card.footer, pad, CARD_HEIGHT - 44)
  return true
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    } catch {
      resolve(null)
    }
  })
}
