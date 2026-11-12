import { describe, expect, it } from 'vitest'

import { GENERIC_ORGS } from '../shared/data/orgs'
import pageMeta from '../shared/data/pageMeta.json'
import app from '../App.tsx?raw'
import vercel from '../../vercel.json'

interface VercelConfig {
  rewrites: { source: string; destination: string }[]
}

const config = vercel as VercelConfig

/** The rewrite sources as regular expressions, the way Vercel reads them (":name" is one path segment, "(a|b)" a choice). */
const patterns = config.rewrites
  .filter((rewrite) => !rewrite.source.startsWith('/api/'))
  .map((rewrite) => new RegExp(`^${rewrite.source.replace(/:(\w+)\(([^)]+)\)/g, '($2)').replace(/:(\w+)/g, '[^/]+')}$`))

const rewritten = (path: string) => patterns.some((pattern) => pattern.test(path))

describe('vercel.json routes', () => {
  it('has no catch-all rewrite, so an unknown address gets a real 404', () => {
    expect(rewritten('/this-page-does-not-exist')).toBe(false)
    expect(rewritten('/en/this-page-does-not-exist')).toBe(false)
    expect(rewritten('/rizin/rankings')).toBe(false)
  })

  it('sends every address with a parameter to the app, in every language', () => {
    const samples = ['/athlete', '/athlete/someone-new', '/fight/a-vs-b', '/gyms/some-gym', ...GENERIC_ORGS.map((org) => `${org.basePath}/gyms/some-gym`)]
    for (const path of samples) {
      expect(rewritten(path), path).toBe(true)
      for (const lang of ['en', 'fr', 'es']) expect(rewritten(`/${lang}${path}`), `/${lang}${path}`).toBe(true)
    }
  })

  it('covers each route of the app either with a static page (pageMeta) or with a rewrite', () => {
    const routes = [...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]).filter((path) => path.startsWith('/') && path !== '/' && path !== '/matchup-intelligence')
    for (const route of routes) {
      const sample = route.replace(/:\w+/g, 'x')
      expect(sample in pageMeta.pages.pt || rewritten(sample), route).toBe(true)
    }
    // The organizations' pages (nested routes in App.tsx) are static pages; their gym pages, a rewrite.
    for (const org of GENERIC_ORGS) {
      const sections = ['', '/fighters', '/events', '/gyms', ...(org.hasRankings ? ['/rankings'] : []), ...(org.hasChampions ? ['/champions'] : []), ...(org.hasPredictions ? ['/predictor'] : [])]
      for (const section of sections) expect(`${org.basePath}${section}` in pageMeta.pages.pt, `${org.basePath}${section}`).toBe(true)
    }
  })
})
