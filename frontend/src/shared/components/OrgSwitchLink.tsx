import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { LANDING_PATH } from '../data/orgs'
import { useOrg } from '../hooks/useOrg'

/** Back to the organization picker on the landing page, naming the one being followed now. */
export function OrgSwitchLink() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const org = useOrg()

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
      <Link
        to={{ pathname: LANDING_PATH, hash: '#organizations-grid' }}
        className="inline-flex min-h-11 items-center gap-1.5 font-bold text-[var(--ink)] underline decoration-2 underline-offset-[5px] hover:decoration-[3px]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {L(lang, 'Trocar de organização', 'Switch organization', 'Changer d’organisation', 'Cambiar de organización')}
      </Link>
      <span className="text-[var(--muted)]">
        {L(lang, 'Você está acompanhando', 'You are following', 'Vous suivez', 'Estás siguiendo')} <strong className="text-[var(--ink)]">{org.shortName}</strong>
      </span>
    </p>
  )
}
