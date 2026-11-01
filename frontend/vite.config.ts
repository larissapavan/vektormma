import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { bodyHtml, routeHtml, sitemapXml, type BodyLink, type RouteText, type SiteInfo } from './src/seo/htmlMeta'
import { CONTACT_EMAIL, infoPage, INFO_PATHS, type InfoPageId } from './src/shared/data/legal'

interface PageMetaFile {
  site: SiteInfo
  defaultDescription: { pt: string }
  pages: { pt: Record<string, RouteText> }
}

// Where the static copies of the pages link to, so a crawler that stops at the HTML can still walk the site.
const NAV_PATHS = ['/predictor', '/head-to-head', '/fighters', '/events', '/rankings', '/champions', '/pfl', '/one', '/bellator', '/guide', '/about', '/contact', '/privacy', '/terms']

const INFO_BY_PATH = Object.fromEntries(Object.entries(INFO_PATHS).map(([id, path]) => [path, id as InfoPageId]))

/**
 * After the build, writes one copy of index.html per route with that route's own title, description, share tags and
 * canonical address (in Portuguese, the language the site opens in), and the sitemap, from the same table the app uses
 * (src/shared/data/pageMeta.json). Link previews and the first pass of a search crawler read the HTML as served, before
 * any script runs, so without this every address would show the home page's tags. The app still takes over on load.
 */
function seoPages(): Plugin {
  let distDir = ''
  let root = ''
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      root = config.root
      distDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const template = readFileSync(join(distDir, 'index.html'), 'utf8')
      const data = JSON.parse(readFileSync(resolve(root, 'src/shared/data/pageMeta.json'), 'utf8')) as PageMetaFile
      const paths = Object.keys(data.pages.pt)

      const nav: BodyLink[] = NAV_PATHS.filter((path) => data.pages.pt[path]).map((path) => ({ label: data.pages.pt[path].title, href: path }))
      // The text pages carry their whole text; the others carry their heading and description.
      const email = process.env.VITE_CONTACT_EMAIL?.trim() || CONTACT_EMAIL
      const bodyOf = (path: string, text: RouteText) => {
        const info = INFO_BY_PATH[path]
        return info ? bodyHtml(infoPage(info, 'pt', email), nav) : bodyHtml({ title: text.title, intro: text.description }, nav)
      }

      for (const path of paths) {
        const file = join(distDir, path, 'index.html')
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, routeHtml(template, data.site, path, data.pages.pt[path], bodyOf(path, data.pages.pt[path])))
      }
      const home = bodyHtml({ title: data.site.name, intro: data.defaultDescription.pt }, nav)
      writeFileSync(join(distDir, 'index.html'), routeHtml(template, data.site, '/', null, home))
      writeFileSync(join(distDir, 'sitemap.xml'), sitemapXml(data.site.url, ['/', ...paths]))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoPages()],
  define: {
    // Sent as ?v= with every API call (see api.ts): the API answers are cached by the browser for minutes to an hour,
    // and a new deploy must not read answers shaped for the old one. Vercel gives the commit; locally it is the start time.
    __BUILD_ID__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? String(Date.now())),
  },
  server: {
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 20000,
  },
})
