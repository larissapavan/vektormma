import { useTranslation } from 'react-i18next'

import { photoCreditText, photoRightsText, usePhotoCredit } from '../hooks/usePhotoCredit'

/**
 * "Foto: ESPN" along the left edge of a photo, for the photos that belong to ESPN. Put it inside the box that holds the
 * photo (the box must be positioned: relative). It has its own dark backing, so it reads on any photo and in both themes.
 */
export function PhotoCredit({ imageUrl, className = 'left-1.5 top-3' }: { imageUrl: string | null | undefined; className?: string }) {
  const { i18n } = useTranslation()
  const credit = usePhotoCredit(imageUrl)
  if (!credit) return null

  return (
    <span
      title={photoRightsText(credit, i18n.language)}
      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      className={`absolute z-20 bg-black/70 px-[3px] py-1.5 text-label font-semibold leading-none text-white ${className}`}
    >
      {photoCreditText(credit, i18n.language)}
    </span>
  )
}
