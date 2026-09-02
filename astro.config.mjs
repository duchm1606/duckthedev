// @ts-check
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

// Canonical/OG/RSS URLs must point at a domain that actually resolves, or
// link previews silently show no image. Preference order: explicit override →
// the Vercel production domain (this is the custom domain once one is
// attached) → the intended domain for builds outside Vercel.
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
const site = PUBLIC_SITE_URL || (vercelProd ? `https://${vercelProd}` : 'https://duckthedev.com')

export default defineConfig({
  site,
  // Full SSG — fresh content means a rebuild (cron/manual), no runtime server
  output: 'static',
  integrations: [
    sitemap({
      // OG images are assets, not pages
      filter: (page) => !page.includes('/og/'),
    }),
  ],
})
