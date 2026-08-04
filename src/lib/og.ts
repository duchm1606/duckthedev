// Open Graph card rendering: a hand-built letterpress SVG rasterized to PNG
// with sharp (already a dependency of Astro's image pipeline). No headless
// browser, no font downloads — serif rendering falls back to Georgia.

import sharp from 'sharp'

const W = 1200
const H = 630

const escapeXml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Greedy word wrap tuned for the 64px serif title. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,3}$/, '…')
  }
  return lines
}

export type OgCard = {
  title: string
  /** small mono line above the title, e.g. "ESSAY · KUBERNETES" */
  kicker?: string
  /** small line at the bottom next to the brand */
  footer?: string
}

export async function renderOgImage({ title, kicker, footer }: OgCard): Promise<Buffer> {
  const titleLines = wrap(title, 30, 3)
  const titleSize = titleLines.length > 2 ? 56 : 64
  const lineHeight = titleSize * 1.18
  const titleY = 250

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#f4efe7"/>
  <rect x="0" y="0" width="${W}" height="10" fill="#8c2f24"/>
  <rect x="72" y="150" width="64" height="3" fill="#8c2f24"/>
  ${kicker ? `<text x="72" y="120" font-family="Courier New, monospace" font-size="24" letter-spacing="4" fill="#7a6f60">${escapeXml(kicker.toUpperCase())}</text>` : ''}
  ${titleLines
    .map(
      (line, i) =>
        `<text x="72" y="${titleY + i * lineHeight}" font-family="Georgia, serif" font-weight="bold" font-size="${titleSize}" fill="#1c1a17">${escapeXml(line)}</text>`,
    )
    .join('\n  ')}
  <text x="72" y="${H - 64}" font-family="Georgia, serif" font-weight="bold" font-size="32" fill="#8c2f24">D.</text>
  <text x="128" y="${H - 64}" font-family="Georgia, serif" font-size="28" fill="#1c1a17">duckthedev</text>
  ${footer ? `<text x="${W - 72}" y="${H - 64}" text-anchor="end" font-family="Courier New, monospace" font-size="22" fill="#7a6f60">${escapeXml(footer)}</text>` : ''}
</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
