#!/usr/bin/env node
/**
 * Pulls fresh content from Notion into a running dev server.
 *
 * Two layers make dev fast but stale, and this clears both:
 *  1. the on-disk response cache (.cache/notion/)
 *  2. the in-memory memos inside the data layer — cleared indirectly by
 *     bumping src/lib/notion/sync-stamp.json, which client.ts imports;
 *     Vite sees the change and reloads the whole data-layer module graph.
 *
 * With `npm run dev` running, just reload the browser afterwards.
 */
import { rmSync, writeFileSync } from 'node:fs'

rmSync(new URL('../.cache/notion', import.meta.url), { recursive: true, force: true })
writeFileSync(
  new URL('../src/lib/notion/sync-stamp.json', import.meta.url),
  JSON.stringify({ syncedAt: new Date().toISOString() }, null, 2) + '\n',
)
console.log('✓ Notion cache cleared and sync stamp bumped.')
console.log('  Dev server running → reload the page (first load refetches, ~5-10s).')
console.log('  Static build      → run `npm run build` again.')
