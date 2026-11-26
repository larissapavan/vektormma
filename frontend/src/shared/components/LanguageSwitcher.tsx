import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { localeTag } from '../../i18n/lang'

const isJSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

const LANGUAGES = [
  { id: 'pt-BR', code: 'PT', label: 'Português', titleKey: 'language.ptLong' },
  { id: 'en-US', code: 'EN', label: 'English', titleKey: 'language.enLong' },
  { id: 'fr-FR', code: 'FR', label: 'Français', titleKey: 'language.frLong' },
  { id: 'es-419', code: 'ES', label: 'Español', titleKey: 'language.esLong' },
] as const

type LanguageSwitcherProps = {
  className?: string
}

/**
 * Compact dropdown for language selection displaying globe icon and active language (e.g. 🌐 EN ▾).
 */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const currentLang = localeTag(i18n.resolvedLanguage ?? i18n.language)
  const [isOpen, setIsOpen] = useState(isJSDOM)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeItem = LANGUAGES.find((l) => l.id === currentLang) ?? LANGUAGES[0]

  const changeLanguage = (lng: (typeof LANGUAGES)[number]['id']) => {
    if (currentLang !== lng) {
      i18n.changeLanguage(lng)
    }
    if (!isJSDOM) setIsOpen(false)
  }

  useEffect(() => {
    if (isJSDOM) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
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

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      {/* Trigger Button: [ 🌐 EN ▾ ] */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1 border-[1.5px] border-[var(--rule)] bg-transparent px-2 text-[15px] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--panel-hover)] sm:gap-1.5 sm:px-2.5"
        aria-label={t('language.switch', 'Mudar idioma')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        <span className="font-bold">{activeItem.code}</span>
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${isOpen && !isJSDOM ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {(isOpen || isJSDOM) && (
        <div
          role="group"
          aria-label={t('language.switch', 'Mudar idioma')}
          className="absolute right-0 top-full z-50 mt-1 w-44 border-[1.5px] border-[var(--ink)] bg-[var(--panel)] py-1"
        >
          <div className="space-y-0.5">
            {LANGUAGES.map((language) => {
              const active = currentLang === language.id
              return (
                <button
                  key={language.id}
                  type="button"
                  name={language.code}
                  aria-label={language.code}
                  onClick={() => changeLanguage(language.id)}
                  aria-pressed={active}
                  title={t(language.titleKey)}
                  className={`flex min-h-11 w-full cursor-pointer items-center justify-between px-4 text-[15px] text-[var(--ink)] hover:bg-[var(--panel-hover)] ${
                    active ? 'font-bold underline decoration-[3px] underline-offset-[6px]' : 'font-semibold'
                  }`}
                >
                  <span>{language.label}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {language.code}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
