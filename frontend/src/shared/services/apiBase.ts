declare const __BUILD_ID__: string | undefined

/** Where the API is: the rewrite of the published site, or the local server while developing. */
export const apiBaseURL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000') : '/api'

/** The version of the site. Without the define (a stray config, tests) it is "dev". */
export const BUILD_ID = typeof __BUILD_ID__ === 'undefined' ? 'dev' : __BUILD_ID__
