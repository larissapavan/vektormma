import { useEffect } from 'react'
import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L } from '../i18n/lang'

export function NotFound() {
  const { i18n } = useTranslation()

  // The server answers 200 for every address (the app decides what exists), so this page asks search engines not to index it.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-3 py-8">
      <div className="surface-card w-full max-w-md rounded-sm p-5 text-center">
        <div className="mx-auto inline-flex rounded-sm bg-[var(--panel)] p-3 text-[var(--ink)]">
          <Compass className="h-6 w-6" />
        </div>
        <p className="data-value mt-3 text-5xl font-bold text-[var(--ink)]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--ink)]">
          {L(i18n.language, 'Página não encontrada', 'Page not found', 'Page introuvable', 'Página no encontrada')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {L(
            i18n.language,
            'A página que você procura não existe ou foi movida.',
            "The page you're looking for doesn't exist or may have moved.",
            "La page que vous cherchez n’existe pas ou a été déplacée.",
            'La página que buscas no existe o pudo haberse movido.',
          )}
        </p>
        <Link
          to="/"
          className="primary-action mx-auto mt-4 inline-flex w-fit items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-xs font-semibold text-white"
        >
          {L(i18n.language, 'Voltar ao início', 'Back to home', "Retour à l’accueil", 'Volver al inicio')}
        </Link>
      </div>
    </div>
  )
}
