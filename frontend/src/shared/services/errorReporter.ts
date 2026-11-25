/**
 * Tells the API when a page breaks, so that an error in a visitor's browser is not only known to the visitor.
 *
 * What is sent: the technical message and stack, the address of the page without what comes after "?", the version of the site
 * and the language. Nothing about the person. Only in the production build, each error once per visit, and at most a handful.
 */

import { apiBaseURL, BUILD_ID } from './apiBase'

export type ErrorKind = 'render' | 'error' | 'promise' | 'chunk'

const MAX_REPORTS = 5
const RELOAD_KEY = 'vektor:chunk-reload'
const RELOAD_PAUSE_MS = 60_000

// Not bugs of the site: a browser quirk, another site's script, a visitor who lost the connection or left the page.
const NOISE = /ResizeObserver loop|^Script error\.?$|Network ?Error|Load failed|Failed to fetch$|NetworkError when attempting|timeout of \d+ms|Request aborted|AbortError|Request failed with status code/i
const CHUNK = /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i

let sent = new Set<string>()

/** Forget what was reported (tests start every case from scratch). */
export function resetErrorReports() {
  sent = new Set()
}

/** A part of the site that could not be loaded: nearly always a page open since before a new version was published. */
export function isChunkError(error: unknown): boolean {
  return CHUNK.test(messageOf(error))
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  return typeof error === 'string' ? error : ''
}

const withoutQuery = (text: string) => text.replace(/[?#][^\s)'"]*/g, '')

/** Our own code: an extension or an ad that throws is not something to fix here. */
function isOurs(stack: string, origin: string): boolean {
  if (/(chrome|moz|safari-web)-extension:\/\//.test(stack)) return false
  return stack === '' || stack.includes(origin)
}

/** Returns whether it was sent. `force` is for tests: outside a production build nothing is. */
export function reportError(kind: ErrorKind, error: unknown, details = '', force = false): boolean {
  if (!import.meta.env.PROD && !force) return false
  const message = messageOf(error).slice(0, 300)
  const stack = `${error instanceof Error ? (error.stack ?? '') : ''}${details}`
  if (!message || NOISE.test(message) || !isOurs(stack, window.location.origin)) return false
  const key = `${kind}|${message}`
  if (sent.has(key) || sent.size >= MAX_REPORTS) return false
  sent.add(key)
  const body = {
    kind,
    message: withoutQuery(message),
    stack: withoutQuery(stack).slice(0, 2000),
    path: window.location.pathname.slice(0, 200),
    build: BUILD_ID.slice(0, 40),
    language: document.documentElement.lang.slice(0, 10),
  }
  // keepalive: the report leaves even when the page is closed or reloaded right after. A failed report is not an error.
  void fetch(`${apiBaseURL}/client-errors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined)
  return true
}

/** Loads the new version of the site, once: if that did not fix it, the page shows its error instead of reloading for ever. */
export function reloadOnce(reload: () => void = () => window.location.reload(), now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (now - last < RELOAD_PAUSE_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    return false // no storage: no way to know whether it was already tried
  }
  reload()
  return true
}

/** What no component catches: an error in a handler, a promise nobody waited for, a chunk that could not be fetched. */
export function installErrorReporting(target: Window = window) {
  target.addEventListener('error', (event) => {
    if (event.error) reportError('error', event.error)
  })
  target.addEventListener('unhandledrejection', (event) => {
    reportError('promise', event.reason)
  })
  // Vite says so before React sees the failure; reloading here keeps the visitor from seeing an error page at all.
  target.addEventListener('vite:preloadError', (event) => {
    if (reloadOnce()) event.preventDefault()
  })
}
