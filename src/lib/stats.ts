// Per-post reading stats derived from the block tree. Memoized so list pages
// (archive rows, series maps, featured cards) and the detail page itself all
// reuse one block fetch per post.

import { getBlocks } from './notion/client'
import { readingMinutes, wordCount } from './notion/render'

export type PostStats = { words: number; minutes: number }

const memo = new Map<string, Promise<PostStats>>()

export function getPostStats(postId: string): Promise<PostStats> {
  let hit = memo.get(postId)
  if (!hit) {
    hit = getBlocks(postId).then((blocks) => {
      const words = wordCount(blocks)
      return { words, minutes: readingMinutes(words) }
    })
    memo.set(postId, hit)
  }
  return hit
}

/** Stats for a set of posts at once (archive pages, series totals). */
export async function getManyStats(postIds: string[]): Promise<Map<string, PostStats>> {
  const entries = await Promise.all(
    postIds.map(async (id) => [id, await getPostStats(id)] as const),
  )
  return new Map(entries)
}
