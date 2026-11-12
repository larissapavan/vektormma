import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** After this long since the page opened, suggest that the server may be down. */
const SLOW_NOTICE_MS = 15000

export function ServerLoadingState() {
  const { t } = useTranslation()
  const [slowNotice, setSlowNotice] = useState(false)

  // Counted from the page load, so the notice does not restart when this screen remounts.
  useEffect(() => {
    const timer = window.setTimeout(() => setSlowNotice(true), Math.max(0, SLOW_NOTICE_MS - performance.now()))
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section
      className="flex items-center justify-center py-2 sm:py-6"
      role="status"
      aria-live="polite"
      aria-label={t('common.pageLoadingLabel')}
    >
      <div className="w-full max-w-[620px] border-[3px] border-[var(--rule)] bg-[var(--card-bg)] p-3.5 sm:p-5">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse bg-[var(--gold-fill)] ring-2 ring-[var(--ink)]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.04em] text-[var(--text-main)] sm:text-base">
              {t('common.pageLoading')}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
              {t('common.serverFast')}
            </p>
            {slowNotice ? (
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)] sm:text-xs">
                {t('common.serverSlow')}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
