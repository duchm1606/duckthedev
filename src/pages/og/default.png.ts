// Site-wide fallback OG image (home, index pages, topics…).
import { site } from '../../config/site'
import { renderOgImage } from '../../lib/og'

export async function GET() {
  const png = await renderOgImage({
    title: 'I write down what I break.',
    kicker: site.tagline,
    footer: site.author,
  })
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}
