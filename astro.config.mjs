// @ts-check
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

export default defineConfig({
  site: PUBLIC_SITE_URL || 'https://duckthedev.com',
  // Full SSG — fresh content means a rebuild (cron/manual), no runtime server
  output: 'static',
})
