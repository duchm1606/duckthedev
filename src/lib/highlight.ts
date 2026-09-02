// Build-time syntax highlighting via Shiki, themed with the letterpress CSS
// variables instead of a fixed palette so code follows the light/dim toggle.
// The theme uses placeholder hexes that colorReplacements swaps for var(--…).

import { codeToHtml } from 'shiki'

const PLACEHOLDER = {
  foreground: '#111110',
  background: '#222220',
  comment: '#333330',
  string: '#444440',
  keyword: '#555550',
  number: '#666660',
  function: '#777770',
} as const

const letterpress = {
  name: 'letterpress',
  settings: [
    { settings: { foreground: PLACEHOLDER.foreground, background: PLACEHOLDER.background } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: PLACEHOLDER.comment, fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted'], settings: { foreground: PLACEHOLDER.string } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control'], settings: { foreground: PLACEHOLDER.keyword } },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: PLACEHOLDER.number } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: PLACEHOLDER.function } },
  ],
}

// token classes: .kw → accent, .str → sage, .cm → ink-3
const colorReplacements: Record<string, string> = {
  [PLACEHOLDER.foreground]: 'var(--ink)',
  [PLACEHOLDER.background]: 'transparent',
  [PLACEHOLDER.comment]: 'var(--ink-3)',
  [PLACEHOLDER.string]: 'var(--sage)',
  [PLACEHOLDER.keyword]: 'var(--accent)',
  [PLACEHOLDER.number]: 'var(--gold)',
  [PLACEHOLDER.function]: 'var(--ink)',
}

// Notion language names that differ from Shiki ids
const LANG_ALIASES: Record<string, string> = {
  'plain text': 'text',
  'c++': 'cpp',
  'c#': 'csharp',
  'objective-c': 'objective-c',
  shell: 'shellscript',
}

export async function highlight(code: string, notionLang: string): Promise<string> {
  const lang = LANG_ALIASES[notionLang] ?? notionLang
  try {
    return await codeToHtml(code, { lang, theme: letterpress, colorReplacements })
  } catch {
    // unknown language — fall back to plain text rather than failing the build
    return await codeToHtml(code, { lang: 'text', theme: letterpress, colorReplacements })
  }
}
