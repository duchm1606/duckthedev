// Client Notion official API (2025-09-03), dùng chung cho build Astro và script node.
// - throttle ~3 req/s (rate limit thật của Notion)
// - retry với backoff cho 408/429/5xx, tôn trọng Retry-After
// - phân trang tự động (query database, block children)
// - dev-cache ra .cache/notion/ để save-file không thành một đợt gọi API
// - env chỉ giữ database_id; data_source_id (API mới) được resolve ở đây

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { env, isProd, requireEnv } from '../env'

const API = 'https://api.notion.com/v1'
const VERSION = '2025-09-03'
const THROTTLE_MS = Number(env('NOTION_THROTTLE_MS') ?? 340)
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 5

export type DbKey = 'posts' | 'series' | 'parts' | 'topics' | 'cv' | 'skills' | 'site'

const DB_ENV: Record<DbKey, string> = {
  posts: 'NOTION_DB_POSTS',
  series: 'NOTION_DB_SERIES',
  parts: 'NOTION_DB_PARTS',
  topics: 'NOTION_DB_TOPICS',
  cv: 'NOTION_DB_CV',
  skills: 'NOTION_DB_SKILLS',
  site: 'NOTION_DB_SITE',
}

// ── throttle: xếp hàng mọi request, giãn cách tối thiểu THROTTLE_MS ──
let queue: Promise<unknown> = Promise.resolve()
let lastAt = 0
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastAt + THROTTLE_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastAt = Date.now()
    return fn()
  })
  queue = run.catch(() => {})
  return run
}

// ── dev-cache: tắt ở prod hoặc khi NOTION_CACHE=off ──
const CACHE_DIR = join(process.cwd(), '.cache', 'notion')
const cacheEnabled = () => !isProd() && env('NOTION_CACHE') !== 'off'

function cachePath(key: string): string {
  return join(CACHE_DIR, createHash('sha1').update(key).digest('hex') + '.json')
}

async function request(path: string, body?: unknown, method?: string): Promise<any> {
  const key = `${method ?? (body ? 'POST' : 'GET')} ${path} ${body ? JSON.stringify(body) : ''}`
  if (cacheEnabled()) {
    const file = cachePath(key)
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).response
  }

  const token = requireEnv('NOTION_TOKEN')
  let lastError = ''
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await throttled(() =>
      fetch(API + path, {
        method: method ?? (body ? 'POST' : 'GET'),
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': VERSION,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    )
    if (res.ok) {
      const json = await res.json()
      if (cacheEnabled()) {
        mkdirSync(CACHE_DIR, { recursive: true })
        writeFileSync(cachePath(key), JSON.stringify({ key, response: json }))
      }
      return json
    }
    const errBody = await res.json().catch(() => ({}))
    lastError = `${res.status} ${errBody.code ?? ''} — ${errBody.message ?? ''}`
    if (!RETRYABLE.has(res.status)) break
    const retryAfter = Number(res.headers.get('retry-after'))
    const delay = retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error(`Notion API lỗi: ${lastError} (${path})`)
}

// ── data source resolution ──
const dataSourceIds = new Map<DbKey, string>()

async function dataSourceId(db: DbKey): Promise<string> {
  const hit = dataSourceIds.get(db)
  if (hit) return hit
  const dbId = requireEnv(DB_ENV[db])
  const res = await request(`/databases/${dbId}`)
  const id = res.data_sources?.[0]?.id
  if (!id) throw new Error(`Database ${db} (${dbId}) không có data source nào`)
  dataSourceIds.set(db, id)
  return id
}

/** Query toàn bộ page của một database, tự phân trang. */
export async function queryAll(db: DbKey, body: Record<string, unknown> = {}): Promise<any[]> {
  const ds = await dataSourceId(db)
  const results: any[] = []
  let cursor: string | undefined
  do {
    const res = await request(`/data_sources/${ds}/query`, {
      ...body,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    results.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return results
}

/** Lấy toàn bộ block con của một page/block, đệ quy, tự phân trang.
 *  Block có con được gắn thêm mảng `children`. */
export async function getBlocks(blockId: string): Promise<any[]> {
  const blocks: any[] = []
  let cursor: string | undefined
  do {
    const res = await request(
      `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`,
    )
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  for (const block of blocks) {
    if (block.has_children) block.children = await getBlocks(block.id)
  }
  return blocks
}

export async function retrievePage(pageId: string): Promise<any> {
  return request(`/pages/${pageId}`)
}
