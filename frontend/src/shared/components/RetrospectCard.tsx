import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Download, Share2 } from 'lucide-react'

import { L, langPath, uiLang } from '../../i18n/lang'
import { encodeRetrospect, type Retrospect } from '../game/career'
import { cardLabels } from '../game/labels'
import { canvasToBlob, CARD_HEIGHT, CARD_WIDTH, drawRetrospect } from '../game/shareImage'

/** The address that opens this career card for anyone: the career travels in the address, nothing is stored on a server. */
export function shareUrl(card: Retrospect, language: string, origin = window.location.origin) {
  return `${origin}${langPath(uiLang(language), '/career')}?c=${encodeRetrospect(card)}`
}

function fileName(card: Retrospect) {
  const slug = card.n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `vektor-mma-${slug || 'career'}.png`
}

/** The career picture with the ways to take it away: save it, share it, or copy a link that shows the same card. */
export function RetrospectCard({ card, actions = true }: { card: Retrospect; actions?: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawn, setDrawn] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const link = useMemo(() => shareUrl(card, lang), [card, lang])
  const labels = useMemo(() => cardLabels(lang, card), [card, lang])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let active = true
    void drawRetrospect(canvas, labels).then((ok) => active && setDrawn(ok))
    return () => {
      active = false
    }
  }, [labels])

  const alt = L(
    lang,
    `Retrospecto de ${card.n}: cartel ${labels.record}`,
    `Career retrospect of ${card.n}: record ${labels.record}`,
    `Bilan de carrière de ${card.n} : ${labels.record}`,
    `Balance de carrera de ${card.n}: récord ${labels.record}`,
  )
  const message = L(
    lang,
    `Simulei minha carreira no UFC e terminei com ${labels.record}. Faça a sua:`,
    `I simulated my UFC career and finished ${labels.record}. Build yours:`,
    `J’ai simulé ma carrière à l’UFC et fini avec ${labels.record}. Faites la vôtre :`,
    `Simulé mi carrera en la UFC y terminé ${labels.record}. Haz la tuya:`,
  )

  const save = async () => {
    const canvas = canvasRef.current
    const blob = canvas ? await canvasToBlob(canvas) : null
    if (!blob) return setNotice(L(lang, 'Não foi possível gerar a imagem neste navegador. Use o link.', 'This browser could not make the image. Use the link instead.', 'Ce navigateur n’a pas pu créer l’image. Utilisez le lien.', 'Este navegador no pudo crear la imagen. Usa el enlace.'))
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName(card)
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(null)
  }

  const share = async () => {
    const canvas = canvasRef.current
    const blob = canvas ? await canvasToBlob(canvas) : null
    try {
      const file = blob ? new File([blob], fileName(card), { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${message} ${link}`, url: link })
      else await navigator.share({ text: message, url: link })
    } catch {
      // The visitor closed the share sheet, or this browser cannot share: the buttons below still work.
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setNotice(link)
    }
  }

  const encoded = encodeURIComponent(link)
  const text = encodeURIComponent(message)
  const socials = [
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${text}&url=${encoded}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${text}%20${encoded}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
  ]
  const button =
    'inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--rule)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-main)] transition hover:border-[var(--accent-red)]'

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        className={`mx-auto w-full max-w-md rounded-xl border border-[var(--border-subtle)] ${drawn ? '' : 'hidden'}`}
      />
      {!drawn ? (
        <div className="mx-auto max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-5 text-center" data-testid="card-fallback">
          <p className="font-display text-2xl font-extrabold uppercase text-[var(--text-main)]">{card.n}</p>
          <p className="data-value mt-1 text-4xl font-bold text-[var(--accent-red)]">{labels.record}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{labels.ending}</p>
        </div>
      ) : null}

      {actions ? (
        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
          {drawn ? (
            <button type="button" onClick={save} className={`${button} bg-[var(--accent-red-solid)] !border-[var(--accent-red-solid)] text-white`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {L(lang, 'Salvar imagem', 'Save image', 'Enregistrer l’image', 'Guardar imagen')}
            </button>
          ) : null}
          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <button type="button" onClick={share} className={button}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {L(lang, 'Compartilhar', 'Share', 'Partager', 'Compartir')}
            </button>
          ) : null}
          <button type="button" onClick={copy} className={button}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? L(lang, 'Link copiado', 'Link copied', 'Lien copié', 'Enlace copiado') : L(lang, 'Copiar link', 'Copy link', 'Copier le lien', 'Copiar enlace')}
          </button>
          {socials.map((social) => (
            <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className={button}>
              {social.name}
            </a>
          ))}
        </div>
      ) : null}
      {notice ? <p className="mx-auto max-w-md break-all text-center text-xs text-[var(--text-secondary)]">{notice}</p> : null}
    </div>
  )
}
