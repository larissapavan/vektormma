import { useEffect, useState } from 'react'

import { L } from '../../i18n/lang'
import { getPhotoCredits } from '../services/api'

/** Photo address (without the origin or the ?v= version) -> credit line, such as "ESPN". Asked of the API once. */
type Credits = Map<string, string>

const RETRY_AFTER_MS = 30_000
let loading: Promise<Credits> | null = null
let failedAt = 0

function loadCredits(): Promise<Credits> {
  if (loading && (failedAt === 0 || Date.now() - failedAt < RETRY_AFTER_MS)) return loading
  failedAt = 0
  loading = getPhotoCredits()
    .then(({ credits }) => new Map(Object.entries(credits).flatMap(([credit, paths]) => paths.map((path): [string, string] => [path, credit]))))
    .catch(() => {
      // The credit is a nicety: if the API cannot say, the photo shows without one and the request is tried again later.
      failedAt = Date.now()
      return new Map<string, string>()
    })
  return loading
}

function photoPath(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
}

/** The credit line of a stored photo ("ESPN"), or null when it has none (or the photo is missing). */
export function usePhotoCredit(imageUrl: string | null | undefined): string | null {
  const [credits, setCredits] = useState<Credits | null>(null)

  useEffect(() => {
    if (!imageUrl) return
    let active = true
    void loadCredits().then((loaded) => active && setCredits(loaded))
    return () => {
      active = false
    }
  }, [imageUrl])

  return imageUrl && credits ? (credits.get(photoPath(imageUrl)) ?? null) : null
}

/** "Foto: ESPN", in the language on screen. */
export function photoCreditText(credit: string, language: string): string {
  return L(language, `Foto: ${credit}`, `Photo: ${credit}`, `Photo : ${credit}`, `Foto: ${credit}`)
}

/** The tooltip on a credited photo: whose it is and that the rights are theirs. */
export function photoRightsText(credit: string, language: string): string {
  return L(
    language,
    `Imagem © ${credit}. Todos os direitos reservados.`,
    `Image © ${credit}. All rights reserved.`,
    `Image © ${credit}. Tous droits réservés.`,
    `Imagen © ${credit}. Todos los derechos reservados.`,
  )
}
