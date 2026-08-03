// @ts-check
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

export default defineConfig({
  site: PUBLIC_SITE_URL || 'https://duckthedev.com',
  // SSG toàn phần — nội dung mới = rebuild (cron/manual), không có runtime server
  output: 'static',
})
