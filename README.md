# duckthedev

Personal blog/notebook at [duckthedev.com](https://duckthedev.com) — notes & essays of a working engineer. Fully static: Astro 7 reads content from a Notion workspace at build time, so production has no runtime server and no client framework.

## Stack

- **Astro 7** (SSG, `output: 'static'`), no UI framework — one small vanilla JS file for theme/progress/TOC.
- **Notion official API** (`2025-09-03`) as the CMS: 7 databases (Posts, Series, Parts, Topics, CV, Skills, Site KV). Schema lives in `docs/notion-cms.md`.
- **Shiki** for code highlighting, themed through CSS variables.
- Self-hosted fonts (Fraunces, Newsreader, JetBrains Mono — latin + vietnamese variable subsets in `public/fonts/`).
- OG images drawn as SVG → PNG at build time (`src/lib/og.ts`), no browser needed.

## Running locally

Requires Node ≥ 22.12 (`.nvmrc` is set up for nvm).

```bash
nvm use
npm install
cp .env.example .env   # then fill it in — see below
npm run dev            # http://localhost:4321
```

`.env` needs a read-only Notion integration token plus the 7 database ids; `.env.example` documents every variable and where to find the values. The integration must be connected to the parent Notion page (⋯ → Connections).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve `dist/` as production would |
| `npm run notion:check` | Verify the token can reach all 7 databases |
| `npm run cache:clear` | Drop the Notion dev cache (`.cache/notion/`, makes rebuilds ~100ms) |

`ENV_MODE=dev` (the default) also renders draft posts and chapters for preview; production builds run with `ENV_MODE=prod`, which hides them.

## Deploying

Vercel's Git integration builds and deploys on every push to `main` (framework: Astro, with the `NOTION_*` variables and `ENV_MODE=prod` set as project env vars). Content edited only in Notion reaches production via `.github/workflows/deploy.yml`: a cron that fires a Vercel Deploy Hook every 3 days (also runnable by hand from the Actions tab).

One-time setup:

1. Import the repo in the Vercel dashboard and add the 8 `NOTION_*` values from `.env` plus `ENV_MODE=prod` as project environment variables.
2. Create a Deploy Hook (Vercel project → Settings → Git → Deploy Hooks) and store its URL as the `VERCEL_DEPLOY_HOOK` repository secret on GitHub.

## Content model, briefly

- **Posts** are articles or notes; posts with a Series relation become chapters, ordered into Parts.
- Draft chapters show up as locked rows in the series map, with their scheduled date.
- Every post is filed under Topics; the About page's CV lives in `src/config/cv.ts` (the Notion `Site` KV still supplies availability and the CV PDF link).
- Notion images are downloaded into the build (signed URLs expire; the workspace is private).
