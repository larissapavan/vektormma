import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { localizeCountryName } from '../data/fightLabels'

type FlagIconProps = {
  /** Lowercase flag code from the API: ISO 3166-1 alpha-2 ("br") or a UK nation ("gb-eng"). */
  code: string | null | undefined
  country?: string | null
  className?: string
}

/**
 * Country flag as a small image. Flag emoji are not used because Windows renders them as two letters.
 * Images come from flagcdn.com; if one fails to load the flag is simply hidden.
 */
export function FlagIcon({ code, country, className = 'h-3.5 w-[21px]' }: FlagIconProps) {
  const { i18n } = useTranslation()
  const [failed, setFailed] = useState(false)
  if (!code || failed) return null
  const name = localizeCountryName(country, i18n.language)
  const label = name
    ? L(i18n.language, `Bandeira: ${name}`, `Flag of ${name}`, `Drapeau : ${name}`, `Bandera de ${name}`)
    : L(i18n.language, 'Bandeira do país', 'Country flag', 'Drapeau du pays', 'Bandera del país')

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      alt={label}
      title={name || undefined}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 rounded-sm border border-white/15 object-cover ${className}`}
    />
  )
}
