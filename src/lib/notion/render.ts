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
