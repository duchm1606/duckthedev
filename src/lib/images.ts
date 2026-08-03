// Notion-hosted files are served via signed S3 URLs that expire after ~1h,
// so every image is downloaded into public/ at build time and referenced
// by a stable local path. The block id keys the filename, which also makes
// re-downloads a no-op across builds.

import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const DIR = join(process.cwd(), 'public', 'images', 'notion')

export async function localizeImage(url: string, blockId: string): Promise<string> {
  try {
    const parsed = new URL(url)
    // Unsplash and other CDN links are stable — no need to copy them
    if (!/amazonaws\.com|notion/.test(parsed.hostname)) return url
    const ext = extname(parsed.pathname) || '.png'
    const name = `${blockId}${ext}`
    const file = join(DIR, name)
    if (!existsSync(file)) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      mkdirSync(DIR, { recursive: true })
      await writeFile(file, Buffer.from(await res.arrayBuffer()))
    }
    return `/images/notion/${name}`
  } catch (err) {
    // A dead signed URL in a stale dev cache should not kill the build;
    // fall back to the original URL and let the browser show what it can.
    console.warn(`[images] could not localize image ${blockId}:`, err)
    return url
  }
}
