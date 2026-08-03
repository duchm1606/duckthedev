#!/usr/bin/env node
/**
 * Smoke-test kết nối Notion: đọc .env, gọi tới từng NOTION_DB_*,
 * resolve data_source_id và query thử 1 trang từ Posts.
 *
 *   node scripts/check-notion.mjs
 */
import { readFileSync } from 'node:fs'

// parse .env thủ công — script chạy độc lập, không cần dotenv
const env = {}
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch {
  console.error('✗ Không đọc được .env ở root repo')
  process.exit(1)
}

const TOKEN = env.NOTION_TOKEN
if (!TOKEN || TOKEN.includes('xxx')) {
  console.error('✗ NOTION_TOKEN chưa được điền trong .env')
  process.exit(1)
}

const DBS = ['POSTS', 'SERIES', 'PARTS', 'TOPICS', 'CV', 'SKILLS', 'SITE']

async function notion(path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return { ok: res.ok, status: res.status, json }
}

let failed = false
const dataSources = {}

for (const key of DBS) {
  const id = env[`NOTION_DB_${key}`]
  process.stdout.write(`  ${key.padEnd(7)} `)
  if (!id) {
    console.log('✗ thiếu biến NOTION_DB_' + key)
    failed = true
    continue
  }
  const { ok, status, json } = await notion(`/databases/${id}`)
  if (!ok) {
    console.log(`✗ ${status} ${json.code ?? ''} — ${json.message?.slice(0, 90) ?? ''}`)
    if (json.code === 'object_not_found')
      console.log('           → integration chưa được connect vào page cha? (⋯ → Connections)')
    failed = true
    continue
  }
  const ds = json.data_sources?.[0]
  dataSources[key] = ds?.id
  const title = json.title?.map((t) => t.plain_text).join('') || '(không tên)'
  console.log(`✓ "${title}" — data_source ${ds?.id?.slice(0, 8)}…`)
}

if (!failed && dataSources.POSTS) {
  process.stdout.write('  query   ')
  const { ok, status, json } = await notion(`/data_sources/${dataSources.POSTS}/query`, {
    page_size: 1,
    filter: { property: 'Status', select: { equals: 'published' } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  })
  if (ok) {
    const p = json.results?.[0]
    const t = p?.properties?.Title?.title?.map((x) => x.plain_text).join('')
    console.log(`✓ bài mới nhất: "${t}" (${p?.properties?.Date?.date?.start})`)
  } else {
    console.log(`✗ ${status} — ${json.message?.slice(0, 120)}`)
    failed = true
  }
}

console.log(failed ? '\n✗ Có lỗi, xem trên.' : '\n✓ Tất cả OK — sẵn sàng build.')
process.exit(failed ? 1 : 0)
