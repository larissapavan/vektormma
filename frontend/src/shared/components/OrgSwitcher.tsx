import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { DIRECTORY_HASH, DIRECTORY_ORDER, LANDING_PATH, orgCoverageLabel, switchOrgPath } from '../data/orgs'
import { useOrg } from '../hooks/useOrg'

const isJSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

/**
 * The organization being followed, in the header of every inner page, and the quick way to another one. Choosing an
 * organization keeps the visitor on the matching page when it has one (PFL fighters -> ONE fighters).
 */
export function OrgSwitcher({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const current = useOrg()
  const { pathname } = useLocation()
  const [isOpen, setIsOpen] = useState(isJSDOM)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isJSDOM) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // A link followed inside the menu closes it (the component stays mounted across pages).
  const close = () => {
    if (!isJSDOM) setIsOpen(false)
    onNavigate?.()
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div role="group" aria-label={L(lang, 'Organização', 'Organization', 'Organisation', 'Organización')} className="inline-flex max-w-full items-center">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-11 max-w-full cursor-pointer items-center gap-1.5 border-[1.5px] border-[var(--ink)] bg-transparent px-3 text-[15px] font-bold text-[var(--ink)] hover:bg-[var(--panel-hover)]"
          aria-expanded={isOpen}
          aria-controls="org-switcher-menu"
        >
          <span className="sr-only">{L(lang, 'Organização: ', 'Organization: ', 'Organisation : ', 'Organización: ')}</span>
          <span className="truncate">{current.shortName}</span>
          <span className="sr-only">{L(lang, '. Trocar de organização', '. Switch organization', '. Changer d’organisation', '. Cambiar de organización')}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen && !isJSDOM ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isOpen || isJSDOM ? (
          <div
            id="org-switcher-menu"
            className="absolute left-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] border-[1.5px] border-[var(--ink)] bg-[var(--panel)] py-1"
          >
            <ul>
              {DIRECTORY_ORDER.map((org) => {
                const active = org.id === current.id
                return (
                  <li key={org.id}>
                    <Link
                      to={switchOrgPath(org, pathname)}
                      onClick={close}
                      aria-label={org.shortName}
                      aria-current={active ? 'true' : undefined}
                      title={org.name}
                      className={`flex min-h-11 items-baseline justify-between gap-3 px-4 py-2 text-[var(--ink)] hover:bg-[var(--panel-hover)] ${active ? 'underline decoration-[3px] underline-offset-[6px]' : ''}`}
                    >
                      <span className="font-bold">{org.shortName}</span>
                      <span aria-hidden="true" className="text-right text-sm text-[var(--muted)]">
                        {orgCoverageLabel(org, lang)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link
              to={{ pathname: LANDING_PATH, hash: DIRECTORY_HASH }}
              onClick={close}
              className="mt-1 flex min-h-11 items-center border-t border-[var(--rule)] px-4 text-[15px] font-semibold text-[var(--ink)] underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              {L(lang, 'Ver todas no diretório', 'See all in the directory', 'Voir l’annuaire complet', 'Ver todas en el directorio')}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
