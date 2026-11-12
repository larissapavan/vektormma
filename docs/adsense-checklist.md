# AdSense checklist

What the code already does, and what only the AdSense / Vercel dashboards can do.

## In the repository

- `frontend/index.html` loads the AdSense script (`ca-pub-7908516212960117`); `frontend/public/ads.txt` lists the publisher.
- Pages the program expects, in pt, en, fr and es (text in `frontend/src/shared/data/legal.ts`):
  `/about` (Sobre), `/contact` (Contato), `/privacy` (Privacidade), `/terms` (Termos) and `/guide` (how to read the predictions, original text).
  They are linked from the footer of every page, including the landing page.
- These text pages open at once, without waiting for the API (`frontend/src/shared/data/staticPages.ts`).
- The build writes one HTML file per route (`seoPages` in `frontend/vite.config.ts`) with its own title, description, canonical address **and the text of the page inside `<div id="root">`**, so a crawler that does not run scripts, or does not wait for data, still reads real content. The text pages carry their whole text; the others carry their heading and description. All of them are in `sitemap.xml`.
- Each athlete page also carries, in its HTML, the body data, the UFC career averages and one line per UFC fight (`frontend/src/seo/athleteDetails.json`, written by `scripts/build_seo_athletes.py` in the daily update and read by the build only). The home page lists the next announced fights with the model's pick. Each fight page sets the two fighters side by side, names the stats that weigh most on the pick (from the model, stored in `pages.json`) and lists each one's latest UFC fights.
- The list pages carry their substance in the HTML too (`frontend/src/seo/pages.ts`, data in `frontend/src/seo/pages.json`, written by `scripts/build_seo_pages.py` in the same daily step): rankings, champions, announced cards, latest results, settled picks, cancelled fights, record book leaders, gyms, and for each other organization its cards, results, champions, rankings and roster. `/about` carries its full text and every source; `/data` its numbers, steps and sources; `/model` the model's numbers, baselines, design and limits (the script loads the model for these, about half a minute, and keeps the last ones where the model cannot be loaded).
- Still heading and description only: `/career`. `/about-model` was removed and redirects to `/model`.
- An address that does not exist still answers 200 (the app decides what exists); the not-found page adds `noindex` so it is not indexed.
- Photos of fighters are **not** handled here: they still come from ESPN and ufc.com (see `data/raw/fighter_photos.csv`). The terms page promises to remove any image on request.

## Only you can do (dashboards)

1. **Contact email.** The contact page lists `vektormma@gmail.com` first (`CONTACT_EMAIL` in `legal.ts`). To use another address without a code change, set `VITE_CONTACT_EMAIL` in the Vercel project (Settings, Environment Variables) and redeploy.
2. **Consent message (EEA, UK, Switzerland).** AdSense, Privacy & messaging, create a GDPR message and publish it. Google then asks visitors for consent before it serves personalized ads. No code change is needed.
3. **Vercel Web Analytics.** Vercel project, Analytics tab, Enable. The script is already in the production build.
4. **Auto ads.** In AdSense, Sites, your site, Auto ads: leave off or exclude the pages that are only a loading screen, an error, or have little text, since Google does not allow ads on screens without content.
5. **Site status.** In AdSense, Sites, confirm `vektormma.com` (with and without `www`) and wait for the review. `ads.txt` must answer at `https://www.vektormma.com/ads.txt`.
