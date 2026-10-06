// Build-time helpers for turning a Notion block tree into what the templates need:
// list grouping, heading ids/TOC extraction, word counts. Pure functions, no I/O.

export type Heading = { id: string; text: string; level: 2 | 3 }

export const plainText = (richText: any[] | undefined): string =>
  (richText ?? []).map((t) => t.plain_text).join('')

const slugifyHeading = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'section'

/** Assigns a stable, de-duplicated `_id` to every heading block (recursively).
 *  Run once per page before rendering so the TOC and the <h2 id> agree. */
export function annotateHeadings(blocks: any[]): void {
  const used = new Map<string, number>()
  const walk = (list: any[]) => {
    for (const block of list) {
      if (block.type === 'heading_2' || block.type === 'heading_3') {
        const base = slugifyHeading(plainText(block[block.type].rich_text))
        const n = used.get(base) ?? 0
        used.set(base, n + 1)
        block._id = n === 0 ? base : `${base}-${n}`
      }
      if (block.children) walk(block.children)
    }
  }
  walk(blocks)
}

/** Top-level h2/h3 only — nested headings (inside toggles etc.) stay out of the TOC. */
export function extractHeadings(blocks: any[]): Heading[] {
  return blocks
    .filter((b) => b.type === 'heading_2' || b.type === 'heading_3')
    .map((b) => ({
      id: b._id,
      text: plainText(b[b.type].rich_text),
      level: b.type === 'heading_2' ? 2 : (3 as const),
    }))
}

/** Notion returns list items as loose siblings; templates want one <ul>/<ol>.
 *  Groups consecutive *_list_item blocks into synthetic wrapper nodes. */
export function groupLists(blocks: any[]): any[] {
  const out: any[] = []
  for (const block of blocks) {
    const wrapper =
      block.type === 'bulleted_list_item'
        ? 'bulleted_list'
        : block.type === 'numbered_list_item'
          ? 'numbered_list'
          : null
    if (!wrapper) {
      out.push(block)
      continue
    }
    const prev = out[out.length - 1]
    if (prev?.type === wrapper) prev.items.push(block)
    else out.push({ type: wrapper, id: `${block.id}-group`, items: [block] })
  }
  return out
}

export function wordCount(blocks: any[]): number {
  let words = 0
  const walk = (list: any[]) => {
    for (const block of list) {
      const rich = block[block.type]?.rich_text
      if (rich) words += plainText(rich).split(/\s+/).filter(Boolean).length
      if (block.children) walk(block.children)
    }
  }
  walk(blocks)
  return words
}

export const readingMinutes = (words: number): number => Math.max(1, Math.round(words / 200))

export function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** "24 Jul" — chapter stats, ser-note, next-out dates */
export function formatDayMonth(iso: string | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/** "24 Jul" for a scheduled chapter; once the date has slipped past (the
 *  build ran after it), a stale date reads as abandoned, so say "soon" */
export function upcomingDate(iso: string | undefined): string {
  if (!iso || new Date(iso) < new Date()) return 'soon'
  return formatDayMonth(iso)
}

/** Notion pages often open with the same sentence as the Description
 *  property, which the page head already shows as the deck. Drop it so the
 *  reader doesn't see it twice; returns whether it was dropped. */
export function dropDuplicateLede(grouped: any[], description: string | undefined): boolean {
  if (!description) return false
  const i = grouped.findIndex((b) => b.type === 'paragraph')
  if (i === -1) return false
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  if (norm(plainText(grouped[i].paragraph.rich_text)) !== norm(description)) return false
  grouped.splice(i, 1)
  return true
}

/** "Jul 30" — desk-log dates on the home hero */
export function formatMonthDay(iso: string | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

const ROMAN_STEPS: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
  [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
]
/** lower-case roman numeral — list numbers, part numbers, the masthead volume */
export function roman(n: number): string {
  if (!Number.isInteger(n) || n < 1) return String(n)
  let out = ''
  for (const [value, glyph] of ROMAN_STEPS) {
    while (n >= value) {
      out += glyph
      n -= value
    }
  }
  return out
}

/** "Tuesday, 6 October 2026" — the masthead's issue date */
export function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** "CS149" from "CS149 — Stanford parallel computing, lecture by lecture":
 *  the part of a series name before its subtitle, for tight spots */
export function shortSeriesName(name: string): string {
  return name.split(/\s+[—–-]\s+|,\s+/)[0]
}

/** "1 h 20" / "45 min" — part-meta durations */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** "≈ 5 h" — series total reading time */
export function approxHours(minutes: number): string {
  if (minutes < 60) return `≈ ${minutes} min`
  return `≈ ${Math.round(minutes / 60)} h`
}
