import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import type { Plugin } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { UI_LANGS, langPath, type UiLang } from './src/i18n/lang'
import { athleteBody, athleteText, fightBody, fightText, fightersListBody, type SeoData } from './src/seo/athletes'
import { bodyHtml, routeHtml, sitemapXml, type BodyLink, type RouteText, type SiteInfo } from './src/seo/htmlMeta'
import { athleteJsonLd, fightJsonLd, type Trail } from './src/seo/structuredData'
import { CONTACT_EMAIL, infoPage, INFO_PATHS, type InfoPageId } from './src/shared/data/legal'

interface PageMetaFile {
  site: SiteInfo
  homeTitle: Record<UiLang, string>
  defaultDescription: Record<UiLang, string>
  pages: Record<UiLang, Record<string, RouteText>>
}

// Where the static copies of the pages link to, so a crawler that stops at the HTML can still walk the site.
const NAV_PATHS = ['/predictor', '/head-to-head', '/cancelled-fights', '/career', '/fighters', '/events', '/rankings', '/champions', '/pfl', '/one', '/bellator', '/rizin', '/ksw', '/lfa', '/cage-warriors', '/oktagon', '/jungle-fight', '/invicta', '/guide', '/about', '/contact', '/privacy', '/terms']

const INFO_BY_PATH = Object.fromEntries(Object.entries(INFO_PATHS).map(([id, path]) => [path, id as InfoPageId]))

/**
 * After the build, writes one copy of index.html per route and per language (/fighters, /en/fighters, /fr/fighters,
 * /es/fighters) with that page's own title, description, share tags, canonical address, hreflang links and text, plus one
 * page per UFC athlete (/athlete/jon-jones) and per announced fight (/fight/a-vs-b), and the sitemap. The text comes from the
 * same tables the app uses (src/shared/data/pageMeta.json, src/seo/athletes.json). Link previews and the first pass of a
 * search crawler read the HTML as served, before any script runs, so without this every address would show the home page's
 * tags. The app still takes over on load.
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
      const seo = JSON.parse(readFileSync(resolve(root, 'src/seo/athletes.json'), 'utf8')) as SeoData
      const email = process.env.VITE_CONTACT_EMAIL?.trim() || CONTACT_EMAIL
      const paths = Object.keys(data.pages.pt)

      // The share images are drawn ahead of the build (scripts/build_og_images.py); a page without one keeps the site image.
      const imageFor = (kind: 'athletes' | 'fights', slug: string) => {
        const path = `/og/${kind}/${slug}.jpg`
        return existsSync(resolve(root, `public${path}`)) ? path : undefined
      }
      const write = (lang: UiLang, path: string, html: string) => {
        const file = join(distDir, langPath(lang, path), 'index.html')
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, html)
      }

      for (const lang of UI_LANGS) {
        const table = (path: string): RouteText => data.pages[lang][path] ?? data.pages.pt[path]
        const nav: BodyLink[] = NAV_PATHS.filter((path) => data.pages.pt[path]).map((path) => ({ label: table(path).title, href: langPath(lang, path) }))
        const siteDescription = data.defaultDescription[lang]

        for (const path of paths) {
          const text = table(path)
          const info = INFO_BY_PATH[path]
          // The text pages carry their whole text, the fighters page a link to every athlete, the others their heading and description.
          const body = info
            ? bodyHtml(infoPage(info, lang, email), nav)
            : path === '/fighters'
              ? bodyHtml(fightersListBody(lang, text, seo.athletes), nav)
              : bodyHtml({ title: text.title, intro: text.description }, nav)
          write(lang, path, routeHtml(template, data.site, path, text, body, { lang, siteDescription }))
        }

        // The home page: Portuguese keeps the text of the template, the other languages get their own title and description.
        const home = bodyHtml({ title: data.site.name, intro: siteDescription }, nav)
        const homeMeta = lang === 'pt' ? null : { title: data.homeTitle[lang], description: siteDescription }
        write(lang, '/', routeHtml(template, data.site, '/', homeMeta, home, { lang, siteDescription, rawTitle: true }))

        // Home > Fighters > athlete, and Home > Events > fight, for the breadcrumb of each page.
        const athleteTrail: Trail = { site: data.site.name, list: table('/fighters').title, listPath: '/fighters' }
        const fightTrail: Trail = { site: data.site.name, list: table('/events').title, listPath: '/events' }
        for (const athlete of seo.athletes) {
          const path = `/athlete/${athlete.slug}`
          const image = imageFor('athletes', athlete.slug)
          const text = athleteText(lang, athlete)
          const jsonLd = athleteJsonLd(data.site.url, lang, athlete, text, athleteTrail)
          write(lang, path, routeHtml(template, data.site, path, text, bodyHtml(athleteBody(lang, athlete, seo.fights), nav), { lang, siteDescription, image, jsonLd }))
        }
        for (const fight of seo.fights) {
          const path = `/fight/${fight.slug}`
          const image = imageFor('fights', fight.slug)
          const jsonLd = fightJsonLd(data.site.url, lang, fight, fightTrail, image)
          write(lang, path, routeHtml(template, data.site, path, fightText(lang, fight), bodyHtml(fightBody(lang, fight), nav), { lang, siteDescription, image, jsonLd }))
        }
      }

      const sitemapPaths = ['/', ...paths, ...seo.athletes.map((athlete) => `/athlete/${athlete.slug}`), ...seo.fights.map((fight) => `/fight/${fight.slug}`)]
      writeFileSync(join(distDir, 'sitemap.xml'), sitemapXml(data.site.url, sitemapPaths, UI_LANGS))
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
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
