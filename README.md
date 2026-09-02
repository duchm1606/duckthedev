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

`.github/workflows/deploy.yml` builds with the Notion secrets and ships the prebuilt output to Vercel (`vercel build` + `vercel deploy --prebuilt`). It runs on every push to `main`, every 3 days by cron (so content edited only in Notion reaches production), and manually via *Actions → deploy → Run workflow*.

One-time setup:

1. Create the Vercel project: `npx vercel link` in a checkout (or import the repo in the Vercel dashboard) — this yields the org and project ids in `.vercel/project.json`.
2. Add the repository secrets listed at the top of the workflow file: the 8 `NOTION_*` values from `.env`, plus `VERCEL_TOKEN` (vercel.com → Account Settings → Tokens), `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

## Content model, briefly

- **Posts** are articles or notes; posts with a Series relation become chapters, ordered into Parts.
- Draft chapters show up as locked rows in the series map, with their scheduled date.
- Every post is filed under Topics; the About page's CV lives in `src/config/cv.ts` (the Notion `Site` KV still supplies availability and the CV PDF link).
- Notion images are downloaded into the build (signed URLs expire; the workspace is private).
