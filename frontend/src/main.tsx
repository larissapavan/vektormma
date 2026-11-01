import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {/* Vercel Web Analytics: page views and countries, no cookies. Only in the production build, and it only records
        once Web Analytics is turned on for the project in the Vercel dashboard (until then the script answers 404). */}
    {import.meta.env.PROD ? <Analytics /> : null}
  </StrictMode>,
)
