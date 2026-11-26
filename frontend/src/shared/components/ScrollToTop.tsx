import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** A new page opens at the top, or at the section its address names (/#organizations-grid). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      // The page may still be loading or fading in (lazy route, data, page transition): keep placing the section at the
      // top for up to about a second and a half, until two checks in a row find it there. Timers, not animation frames:
      // those stop in a tab that is in the background.
      let timer = 0
      let tries = 0
      let settled = 0
      const find = () => {
        const target = document.getElementById(id)
        if (target) {
          const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
          const top = target.getBoundingClientRect().top
          if (Math.abs(top - offset) <= 2) settled += 1
          else {
            settled = 0
            // Instant: the page sets scroll-behavior: smooth, and a smooth scroll restarted every check never arrives.
            target.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
          }
        }
        if (settled < 2 && ++tries < 30) timer = window.setTimeout(find, 50)
      }
      window.scrollTo(0, 0)
      timer = window.setTimeout(find, 0)
      return () => window.clearTimeout(timer)
    }
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return null
}
