#!/usr/bin/env node
/**
 * Seeds the whole mock CMS into Notion: 1 page holding 7 databases + data matching mock/*.html
 *
 *   NOTION_TOKEN=ntn_xxx NOTION_PARENT_PAGE_ID=xxxxxxxx node scripts/seed-notion.mjs
 *
 * See docs/notion-cms.md for the schema. This script is NOT idempotent —
 * a second run creates a new page; delete the old one by hand.
 */

const TOKEN = process.env.NOTION_TOKEN
const PARENT = (process.env.NOTION_PARENT_PAGE_ID || '').replace(/-/g, '')

if (!TOKEN || !PARENT) {
  console.error(`
Missing env.

  NOTION_TOKEN           https://www.notion.so/my-integrations → New integration → copy Internal Secret
  NOTION_PARENT_PAGE_ID  open the parent page in Notion → Share → Connect → pick your integration,
                         then take the trailing 32 hex chars from the URL

  NOTION_TOKEN=ntn_xxx NOTION_PARENT_PAGE_ID=1a2b... node scripts/seed-notion.mjs
`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────── API

const API = 'https://api.notion.com/v1'
const VERSION = '2022-06-28'
let calls = 0

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const THROTTLE = Number(process.env.NOTION_THROTTLE_MS ?? 340)

async function notion(path, body, method = 'POST') {
  // Notion's real rate limit is ~3 req/s
  await sleep(THROTTLE)
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  calls++
  if (!res.ok) {
    console.error(`\n✗ ${method} ${path} → ${res.status}`)
    console.error(JSON.stringify(json, null, 2).slice(0, 1200))
    process.exit(1)
  }
  return json
}

// ─────────────────────────────────────────────────────────── property builders

const txt = (content) => [{ type: 'text', text: { content: String(content).slice(0, 2000) } }]
const title = (v) => ({ title: txt(v) })
const rt = (v) => ({ rich_text: v ? txt(v) : [] })
const sel = (v) => ({ select: v ? { name: v } : null })
const num = (v) => ({ number: v ?? null })
const date = (v) => ({ date: v ? { start: v } : null })
const cb = (v) => ({ checkbox: !!v })
const url = (v) => ({ url: v || null })
const rel = (ids) => ({ relation: (ids || []).filter(Boolean).map((id) => ({ id })) })

const options = (...names) => ({
  options: names.map((n, i) => ({
    name: n,
    color: ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'brown', 'red'][i % 8],
  })),
})

const relation = (database_id, dual = true) => ({
  relation: dual
    ? { database_id, type: 'dual_property', dual_property: {} }
    : { database_id, type: 'single_property', single_property: {} },
})

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[''’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

// ─────────────────────────────────────────────────────────── block builders

const h2 = (t) => ({ type: 'heading_2', heading_2: { rich_text: txt(t) } })
const h3 = (t) => ({ type: 'heading_3', heading_3: { rich_text: txt(t) } })
const p = (t) => ({ type: 'paragraph', paragraph: { rich_text: txt(t) } })
const li = (t) => ({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: txt(t) } })
const quote = (t) => ({ type: 'quote', quote: { rich_text: txt(t) } })
const callout = (t) => ({
  type: 'callout',
  callout: { rich_text: txt(t), icon: { type: 'emoji', emoji: '⚠️' } },
})
const code = (content, language, caption) => ({
  type: 'code',
  code: { rich_text: txt(content), language, caption: caption ? txt(caption) : [] },
})

/** shared body for posts that don't need real content yet — still has enough headings to test the level-2 TOC */
const genericBody = (lede) => [
  p(lede),
  h2('The shape of the problem'),
  p('Mock content. Đoạn này tồn tại để renderer có block thật mà parse: heading cấp 2 và cấp 3 sẽ thành TOC ở cột phải, đoạn đầu tiên thành .lede với drop cap.'),
  h3('A narrower case'),
  p('Heading cấp 3 vào TOC dưới dạng .sub — thụt vào một bậc.'),
  callout('Callout của Notion map sang .callout, icon emoji thành ô .ico vuông bên trái.'),
  h2('What it cost us'),
  p('Đoạn cuối. Bên dưới build sẽ tự chèn "Filed under" từ relation Topics và khối prev/next.'),
]

/** full body for chapter 05 — copied from mock/chapter.html for pixel comparison */
const chapter05Body = [
  p('Adding one cache node should invalidate roughly one node\'s worth of keys. Ours invalidated ninety-four percent of them, at 11:40 on a Thursday, while a marketing campaign was running.'),
  p('The mechanism is not subtle once you see it. With four nodes, key user:9021 lands on 9021 % 4 = 1. Add a fifth node and the same key lands on 9021 % 5 = 1 — by luck. Almost every other key moves. The modulus is part of the address, so changing the modulus rewrites every address at once.'),
  h2('What we actually needed'),
  p('Before reaching for a known answer, it is worth writing the requirement down. We needed a mapping from keys to nodes where adding or removing a node moves only the keys that node is responsible for — and nothing else.'),
  li('Deterministic: any client computes the same mapping without coordination.'),
  li('Balanced: no node holds a wildly disproportionate share.'),
  li('Stable: a membership change of one node moves ≈ 1/n of keys, not all of them.'),
  callout('That third property is the whole chapter. If you only remember one sentence: consistent hashing is not about hashing better, it\'s about making the address independent of the number of nodes.'),
  h3('Why "add a node" is the hard case'),
  p('Removal is easier to reason about — the keys have to go somewhere, and any neighbour will do. Addition is where naive schemes fail, because a new node has to steal a fair share from everyone without anyone coordinating the theft.'),
  h2('Deriving the ring'),
  p('Stop hashing to a node index and start hashing to a fixed space — say, all 32-bit integers. Nodes hash into that same space. A key belongs to the first node clockwise from it. Now the address of a key never mentions n at all.'),
  code(
    `// Ring maps a key to the first node clockwise on a 32-bit circle.
type Ring struct {
    points []uint32          // sorted virtual node positions
    owner  map[uint32]string // position -> node name
}

func (r *Ring) Add(node string, vnodes int) {
    for i := 0; i < vnodes; i++ {
        p := crc32.ChecksumIEEE([]byte(fmt.Sprintf("%s#%d", node, i)))
        r.points = append(r.points, p)
        r.owner[p] = node
    }
    slices.Sort(r.points)
}

func (r *Ring) Get(key string) string {
    h := crc32.ChecksumIEEE([]byte(key))
    i, _ := slices.BinarySearch(r.points, h)
    if i == len(r.points) {
        i = 0 // wrap around the circle
    }
    return r.owner[r.points[i]]
}`,
    'go',
    'ring.go',
  ),
  h3('Virtual nodes, and why 150 is the usual number'),
  p('With one point per node the distribution is bad — random placement leaves gaps, and one node can own a third of the circle. Giving each node 100–200 virtual positions averages the variance away. We measured 150 as the point where the marginal improvement stopped paying for the memory.'),
  h2('Measuring the rebalance'),
  p('The satisfying part: with the ring in place, adding a fifth node to our four-node cluster moved 19.4% of keys. The theoretical figure is 20%. The old scheme, on the same key set, moved 94.2%.'),
  h2('What this doesn\'t solve'),
  p('Hot keys. If one key gets a tenth of your traffic, the ring routes all of it to one node with perfect consistency. That\'s chapter 7\'s problem, and the fix is not in the hash function.'),
]

// ─────────────────────────────────────────────────────────── DATA

// name, glyph, group, pinned, description
const TOPICS = [
  ['Golang', 'Go', 'lang', true, 'The runtime, the scheduler, error handling that doesn\'t lie, and why I still write my own HTTP handlers.'],
  ['Postgres', 'Pg', 'data', true, 'Indexes, MVCC, connection pools, migrations that don\'t lock the table. The database I trust most.'],
  ['Kubernetes', 'K8', 'infra', true, 'Operators, probes that mean something, and the small subset of the API you actually need.'],
  ['Docker', 'Dk', 'infra', true, 'Layer caching, multi-stage builds, distroless images and why your CI is slow.'],
  ['TypeScript', 'Ts', 'lang', true, 'Types that describe the domain, the parts of the compiler worth knowing, and Node in production.'],
  ['Observability', 'Ob', 'infra', true, 'Traces, structured logs, and the difference between a dashboard and knowing what happened.'],
  ['Linux', 'Lx', 'infra', true, 'Sockets, file descriptors, cgroups, and the commands I re-learn every eighteen months.'],
  ['Architecture', 'Ar', 'data', true, 'Outbox, sagas, idempotency, and the boring patterns that let a system survive its authors.'],
  ['Career & craft', 'Cr', 'practice', true, 'Code review, mentoring, writing design docs people read, and staying employable without burning out.'],
  ['API design', 'Ap', 'practice', false, ''],
  ['AWS', 'Aw', 'infra', false, ''],
  ['Bash', 'Bs', 'lang', false, ''],
  ['Book notes', 'Bk', 'practice', false, ''],
  ['ClickHouse', 'Ch', 'data', false, ''],
  ['CI/CD', 'Ci', 'infra', false, ''],
  ['Debugging', 'Db', 'practice', false, ''],
  ['Git', 'Gi', 'infra', false, ''],
  ['gRPC', 'Gr', 'infra', false, ''],
  ['htmx', 'Hx', 'lang', false, ''],
  ['Interviews', 'In', 'practice', false, ''],
  ['Job hunting', 'Jb', 'practice', false, ''],
  ['Kafka', 'Ka', 'data', false, ''],
  ['Next.js', 'Nx', 'lang', false, ''],
  ['Notion', 'Nt', 'infra', false, ''],
  ['On-call', 'Op', 'practice', false, ''],
  ['Ops', 'Os', 'infra', false, ''],
  ['Performance', 'Pf', 'data', false, ''],
  ['Python', 'Py', 'lang', false, ''],
  ['Redis', 'Rd', 'data', false, ''],
  ['Runtime', 'Rt', 'lang', false, ''],
  ['Rust', 'Rs', 'lang', false, ''],
  ['SQLite', 'Sq', 'data', false, ''],
  ['Terraform', 'Tf', 'infra', false, ''],
  ['Testing', 'Te', 'practice', false, ''],
  ['Tooling', 'Tm', 'infra', false, ''],
  ['Neovim', 'Vi', 'infra', false, ''],
]

/**
 * Topic logos: public links, nothing self-hosted. Simple Icons returns one-color SVGs in the right
 * brand color. AWS + gRPC are missing from Simple Icons, so they come from devicon.
 * [url, iconClass] — iconClass 'invert' marks pure-black logos (invisible on the dark theme).
 * Topics without a brand are not listed here and fall back to Glyph.
 */
const si = (slug) => `https://cdn.simpleicons.org/${slug}`
const dev = (p) => `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${p}.svg`

const TOPIC_ICONS = {
  Golang: [si('go')],
  Postgres: [si('postgresql')],
  Kubernetes: [si('kubernetes')],
  Docker: [si('docker')],
  TypeScript: [si('typescript')],
  Observability: [si('opentelemetry'), 'invert'],
  Linux: [si('linux')],
  AWS: [dev('amazonwebservices/amazonwebservices-plain-wordmark'), 'wide'],
  Bash: [si('gnubash')],
  ClickHouse: [si('clickhouse')],
  'CI/CD': [si('githubactions')],
  Git: [si('git')],
  gRPC: [dev('grpc/grpc-plain'), 'invert'],
  htmx: [si('htmx')],
  Kafka: [si('apachekafka'), 'invert'],
  'Next.js': [si('nextdotjs'), 'invert'],
  Notion: [si('notion'), 'invert'],
  Python: [si('python')],
  Redis: [si('redis')],
  Rust: [si('rust'), 'invert'],
  SQLite: [si('sqlite')],
  Terraform: [si('terraform')],
  Neovim: [si('neovim')],
}

// name, group, showInSkills, note
const SKILLS = [
  ['go', 'Languages', true, ''], ['typescript', 'Languages', true, ''],
  ['python', 'Languages', true, ''], ['sql', 'Languages', true, ''],
  ['bash', 'Languages', true, ''], ['rust', 'Languages', true, '(learning)'],
  ['postgres', 'Data', true, ''], ['postgis', 'Data', true, ''],
  ['redis', 'Data', true, ''], ['kafka', 'Data', true, ''],
  ['clickhouse', 'Data', true, ''], ['sqlite', 'Data', true, ''],
  ['kubernetes', 'Infrastructure', true, ''], ['docker', 'Infrastructure', true, ''],
  ['terraform', 'Infrastructure', true, ''], ['aws', 'Infrastructure', true, ''],
  ['gcp', 'Infrastructure', true, ''], ['github-actions', 'Infrastructure', true, ''],
  ['opentelemetry', 'Observability', true, ''], ['grafana', 'Observability', true, ''],
  ['prometheus', 'Observability', true, ''], ['loki', 'Observability', true, ''],
  ['sentry', 'Observability', true, ''],
  ['design-docs', 'Practices', true, ''], ['incident-review', 'Practices', true, ''],
  ['code-review', 'Practices', true, ''], ['mentoring', 'Practices', true, ''],
  ['on-call', 'Practices', true, ''],
  ['react', 'Front-end', true, ''], ['nextjs', 'Front-end', true, ''],
  ['tailwind', 'Front-end', true, ''], ['htmx', 'Front-end', true, ''],
  // used only on the CV, never on the Skills grid
  ['grpc', 'Infrastructure', false, ''], ['debezium', 'Data', false, ''],
  ['gitlab-ci', 'Infrastructure', false, ''], ['nodejs', 'Languages', false, ''],
  ['mysql', 'Data', false, ''], ['nginx', 'Infrastructure', false, ''],
  ['tui', 'Front-end', false, ''],
]

// name, state, level, order, cadence, plannedChapters, topics, description
const SERIES = [
  ['System Design, from first principles', 'ongoing', 'intermediate', 1, 'publishing weekly', null,
    ['Architecture', 'Postgres', 'Observability', 'Kafka', 'Interviews'],
    'Most system design material is a vocabulary list: here is a load balancer, here is a cache, here is a queue. This series does the opposite — we start with one server and a laptop, break it on purpose, and derive each component from the failure that demands it.'],
  ['Reading Designing Data-Intensive Applications', 'ongoing', 'advanced', 2, 'ongoing', null,
    ['Book notes', 'Architecture', 'Kafka', 'Postgres'],
    'One chapter of Kleppmann per entry: what it says, what I disagree with, and what it looks like in a codebase I actually maintain. Twelve chapters, one book club of one.'],
  ['Postgres internals, one query at a time', 'complete', 'advanced', 3, 'complete', null,
    ['Postgres', 'Performance', 'Debugging'],
    'How a row becomes a result: the parser, the planner, MVCC, the buffer pool and the WAL — explained with experiments you can reproduce on a laptop.'],
  ['Go concurrency, chapter by chapter', 'ongoing', 'intermediate', 4, 'ongoing', null,
    ['Golang', 'Runtime', 'Testing'],
    'Goroutines, channels, the memory model and the patterns that survive production — each chapter ends with a race you can reproduce and then fix.'],
  ['Building a CDC pipeline you can read in one sitting', 'complete', 'intermediate', 5, 'complete', null,
    ['Kafka', 'Postgres', 'Golang', 'Architecture'],
    'Six chapters, six hundred lines: Postgres logical replication into Kafka into a warehouse, with every failure mode handled explicitly and nothing hidden in a framework.'],
  ['The on-call handbook I wish I\'d been given', 'planned', 'beginner', 6, 'starts September 2026', 7,
    ['On-call', 'Observability', 'Career & craft'],
    'Alerts that mean something, runbooks nobody hates writing, incident reviews without blame, and how to hand a rotation over to a new team.'],
]

// series index 0 only — enough to build the 3-column reader
const PARTS = [
  ['One box, and what breaks it', 1, ''],
  ['Spreading the load', 2, ''],
  ['Living with it', 3, 'publishing'],
]

// order, title, date, status, partOrder, description, topics
const CHAPTERS = [
  [1, 'The whole system on one machine', '2026-03-12', 'published', 1,
    'A Go binary, Postgres, and 40,000 users. Where the first ceiling actually is — and it isn\'t CPU.', ['Architecture', 'Golang']],
  [2, 'Measuring before deciding', '2026-03-26', 'published', 1,
    'Latency percentiles, saturation, and the four numbers that justify every later chapter.', ['Observability', 'Performance']],
  [3, 'Vertical scaling is underrated', '2026-04-09', 'published', 1,
    'What a $400/month machine buys you in 2026, and the point at which it stops being the answer.', ['Architecture', 'Ops']],
  [4, 'Statelessness, and the lie of the session', '2026-04-23', 'published', 1,
    'Why the second box is hard, and what you have to move out of process before it works.', ['Architecture', 'Redis']],
  [5, 'Consistent hashing, and why your cache ring rotates', '2026-05-14', 'published', 2,
    'Deriving the ring from a modulo that betrayed us, with the rebalance cost measured on real data.', ['Architecture', 'Golang', 'Performance']],
  [6, 'Read replicas and the lag you forgot to handle', '2026-06-04', 'published', 2,
    'Read-your-writes, sticky routing, and the three bugs replication lag always produces first.', ['Postgres', 'Architecture']],
  [7, 'Queues: making slow things someone else\'s problem', '2026-06-25', 'published', 2,
    'Backpressure, retries, dead letters, and why "just add a queue" moves the failure rather than removing it.', ['Kafka', 'Architecture']],
  [8, 'Idempotency as a design constraint', '2026-07-09', 'published', 2,
    'Once retries exist, every write needs an identity. The data model that gives it one.', ['Architecture', 'API design']],
  [9, 'Sharding: the decision you can\'t take back', '2026-07-24', 'published', 3,
    'Picking a key, living with the wrong one, and the migration nobody budgets for.', ['Postgres', 'Architecture']],
  [10, 'Observability for a system you didn\'t design', '2026-08-07', 'draft', 3,
    'Traces first, logs second, dashboards last.', ['Observability']],
  [11, 'Failure drills and the runbook that survives them', '2026-08-14', 'draft', 3,
    'Killing things on purpose, on a Tuesday afternoon.', ['On-call', 'Ops']],
  [12, 'The interview version of all this', '2026-08-21', 'draft', 3,
    'Compressing twelve chapters into forty-five minutes on a whiteboard.', ['Interviews', 'Architecture']],
]

// title, type, date, pinned, featuredOrder, description, topics
const POSTS = [
  ['Postgres LISTEN/NOTIFY at 4k messages per second', 'note', '2026-07-30', false, null,
    'Where it breaks, what the payload limit really costs you, and when to give up and use a table.', ['Postgres']],
  ['Go 1.24 tool directives, in practice', 'note', '2026-07-28', false, null,
    'Replacing tools.go with go.mod tool lines across six repos, and the one CI break it caused.', ['Golang', 'Tooling']],
  ['Rewriting our Kubernetes operator in 400 lines of Go', 'article', '2026-07-26', true, 1,
    'Deleting the framework left us with a reconcile loop we can read out loud — and an on-call rotation that finally sleeps.', ['Kubernetes', 'Golang']],
  ['kubectl debug for distroless images', 'note', '2026-07-22', false, null,
    'Ephemeral containers, the flags that matter, and a shell alias so I stop looking it up.', ['Kubernetes']],
  ['What actually happens when Postgres runs out of connections', 'article', '2026-07-14', false, 2,
    'From pgbouncer\'s pool down to the kernel accept queue, with a reproduction script you can run on a laptop.', ['Postgres', 'Linux']],
  ['Why our p99 is a histogram lie', 'note', '2026-07-05', false, null,
    'Bucket boundaries, aggregation across pods, and the number I now report instead.', ['Observability']],
  ['Idempotency keys are a data model, not a header', 'article', '2026-06-28', false, 3,
    'Three ways every payment integration gets retries wrong, and the four-column table that fixes all of them.', ['Architecture', 'API design']],
  ['Reading the Go scheduler by printing things', 'article', '2026-06-09', false, 4,
    'No tracing tools, no papers — an afternoon with GODEBUG=schedtrace and a whiteboard.', ['Golang', 'Runtime']],
  ['Our CI was slow because of one COPY .', 'article', '2026-05-21', false, null,
    'A Docker layer-caching story that ended with a 9-minute build becoming 40 seconds.', ['Docker', 'CI/CD']],
  ['Seven years in, the code review comments I keep writing', 'article', '2026-04-30', false, null,
    'A catalogue of the same twelve remarks, and how to design them out of a codebase entirely.', ['Career & craft']],
  ['A tmux config I\'ve kept for six years', 'note', '2026-04-02', false, null,
    'Forty lines, three bindings I actually use, and the one plugin that survived.', ['Tooling', 'Linux']],
  ['Zero-downtime migrations: the seven safe moves', 'article', '2026-03-02', false, null,
    'Add, backfill, dual-write, switch, verify, drop, forget. The order matters more than the tooling.', ['Postgres', 'Ops']],
  ['Your index is fine; your query planner disagrees', 'article', '2025-11-18', false, null,
    'Reading EXPLAIN output as a conversation instead of a verdict, using four queries from a real incident.', ['Postgres', 'Performance']],
  ['Zero-downtime column renames', 'note', '2026-07-01', false, null,
    'Three deploys, one view, and never a lock you can feel.', ['Postgres']],
  ['pg_stat_statements, the useful columns', 'note', '2026-06-22', false, null,
    'Four columns out of forty-three, and what each one actually tells you.', ['Postgres', 'Performance']],
  ['Why SELECT ... FOR UPDATE SKIP LOCKED is a queue', 'note', '2026-06-03', false, null,
    'You probably don\'t need Kafka yet. Here is the ninety-line version.', ['Postgres', 'Architecture']],
]

// role, kind, org, orgUrl, location, logo, start, end, tech[], bullets[]
const CV = [
  ['Senior Backend Engineer', 'experience', 'Axiom Pay', 'https://example.com', 'Singapore / remote', 'Ax', '2023-01-01', null,
    ['go', 'postgres', 'kafka', 'kubernetes', 'terraform', 'grafana', 'opentelemetry', 'redis', 'grpc'],
    ['Own the payment orchestration service: ~9M transactions/month across six PSPs, with exactly-once settlement guarantees built on Postgres and an outbox pattern.',
     'Led the migration from a shared monolith database to per-service schemas without a maintenance window; wrote the dual-write & backfill tooling now used by four teams.',
     'Cut p99 checkout latency from 1.8s to 340ms by removing three synchronous calls and one very confident cache.',
     'Mentor two engineers; run the internal "how it actually works" seminar every second Thursday.']],
  ['Backend Engineer', 'experience', 'Lumen Logistics', 'https://example.com', 'Ho Chi Minh City', 'Lm', '2021-01-01', '2023-01-01',
    ['go', 'python', 'postgis', 'debezium', 'kafka', 'docker', 'gitlab-ci'],
    ['Built the route-planning API serving 1,200 drivers; designed the geospatial data model on PostGIS and kept it under 100ms at the 95th percentile.',
     'Replaced a nightly CSV import with a change-data-capture pipeline (Debezium → Kafka → warehouse), reducing data freshness from 24 hours to under a minute.',
     'Introduced structured logging and tracing across eight services; on-call pages dropped by roughly half in two quarters.']],
  ['Full-stack Developer', 'experience', 'Novaweb Studio', 'https://example.com', 'Đà Nẵng', 'Nv', '2019-01-01', '2021-01-01',
    ['typescript', 'nodejs', 'react', 'nextjs', 'mysql', 'nginx', 'aws'],
    ['Delivered eleven client projects end-to-end: Node/TypeScript APIs, React front-ends, and the deployment pipelines nobody else wanted to own.',
     'Wrote the studio\'s project starter kit — still in use, still the reason new projects take two days instead of two weeks.']],
  ['Freelance & self-directed work', 'experience', 'Various', null, 'remote', '§', '2017-01-01', '2019-01-01', [],
    ['Small business websites, scraping jobs, and one inventory system that is somehow still running in production today.']],
  ['B.Eng. Computer Science', 'education', 'University of Technology', null, 'Ho Chi Minh City', 'UT', '2015-01-01', '2019-01-01', [],
    ['Thesis on distributed task scheduling; graduated with distinction.']],
  ['Self-taught, continuously', 'education', 'This website is the transcript', null, '', '✎', '2019-01-01', null, [],
    ['Designing Data-Intensive Applications, the Postgres source, and far too many incident write-ups from other people\'s companies.']],
  ['outboxd', 'project', 'Open source', 'https://github.com/duckthedev/outboxd', 'github.com/duckthedev/outboxd', 'ob', '2024-01-01', null,
    ['go', 'postgres', 'kafka'],
    ['A 700-line transactional outbox relay for Postgres → Kafka. 1.4k stars, used in production by a handful of teams braver than me.']],
  ['pgquiet', 'project', 'Open source', 'https://github.com/duckthedev/pgquiet', 'github.com/duckthedev/pgquiet', 'pq', '2022-01-01', null,
    ['go', 'postgres', 'tui'],
    ['A CLI that tells you which of your Postgres indexes nobody has used since the last restart, and whether it\'s safe to drop them.']],
]

const SITE = [
  ['availability', 'Open to interesting problems'],
  ['cv_pdf_url', 'https://example.com/duc-hoang-cv.pdf'],
  ['email', 'me@duckthedev.com'],
]

// ─────────────────────────────────────────────────────────── run

const log = (s) => process.stdout.write(s)

async function main() {
  const t0 = Date.now()
  log('▸ Container page… ')
  const root = await notion('/pages', {
    parent: { type: 'page_id', page_id: PARENT },
    icon: { type: 'emoji', emoji: '📓' },
    properties: { title: { title: txt('duckthedev — CMS (mock)') } },
    children: [
      p('Mock data sinh bởi scripts/seed-notion.mjs. Schema: docs/notion-cms.md.'),
      quote('Mọi con số hiển thị trên site (reading time, số chapter, entries per topic) được tính lúc build, không lưu ở đây.'),
    ],
  })
  const PAGE = root.id
  log('ok\n')

  const db = async (name, emoji, properties) => {
    log(`▸ DB ${name}… `)
    const d = await notion('/databases', {
      parent: { type: 'page_id', page_id: PAGE },
      icon: { type: 'emoji', emoji },
      title: txt(name),
      properties,
    })
    log('ok\n')
    return d.id
  }

  // 1 — depends on nothing
  const topicsDb = await db('Topics', '🏷️', {
    Name: { title: {} },
    Slug: { rich_text: {} },
    Icon: { url: {} },
    'Icon class': { select: options('invert', 'wide') },
    Glyph: { rich_text: {} },
    Description: { rich_text: {} },
    Group: { select: options('lang', 'data', 'infra', 'practice') },
    Pinned: { checkbox: {} },
    Order: { number: {} },
  })

  const skillsDb = await db('Skills', '🧰', {
    Name: { title: {} },
    Group: { select: options('Languages', 'Data', 'Infrastructure', 'Observability', 'Practices', 'Front-end') },
    Order: { number: {} },
    'Show in skills': { checkbox: {} },
    Note: { rich_text: {} },
  })

  // 2 — Series depends on Topics
  const seriesDb = await db('Series', '📚', {
    Name: { title: {} },
    Slug: { rich_text: {} },
    Description: { rich_text: {} },
    Topics: relation(topicsDb),
    State: { select: options('planned', 'ongoing', 'complete') },
    Level: { select: options('beginner', 'intermediate', 'advanced') },
    Order: { number: {} },
    Cadence: { rich_text: {} },
    'Planned chapters': { number: {} },
    Status: { select: options('draft', 'published') },
  })

  const partsDb = await db('Parts', '🔖', {
    Name: { title: {} },
    Series: relation(seriesDb),
    Order: { number: {} },
    Note: { rich_text: {} },
  })

  // 3 — Posts depends on everything
  const postsDb = await db('Posts', '📝', {
    Title: { title: {} },
    Slug: { rich_text: {} },
    Type: { select: options('article', 'note') },
    Status: { select: options('idea', 'draft', 'review', 'published') },
    Date: { date: {} },
    Updated: { date: {} },
    Description: { rich_text: {} },
    Topics: relation(topicsDb),
    Series: relation(seriesDb),
    Part: relation(partsDb),
    Order: { number: {} },
    Pinned: { checkbox: {} },
    'Featured order': { number: {} },
    Cover: { files: {} },
    Lang: { select: options('en', 'vi') },
  })

  // self-relations can only be added once the DB exists
  log('▸ Posts.Related (self-relation)… ')
  await notion(`/databases/${postsDb}`, {
    properties: { Related: relation(postsDb, false) },
  }, 'PATCH')
  log('ok\n')

  const cvDb = await db('CV entries', '👤', {
    Role: { title: {} },
    Kind: { select: options('experience', 'education', 'project') },
    Org: { rich_text: {} },
    'Org URL': { url: {} },
    Location: { rich_text: {} },
    Logo: { rich_text: {} },
    Start: { date: {} },
    End: { date: {} },
    Order: { number: {} },
    Tech: relation(skillsDb, false),
    Visible: { checkbox: {} },
  })

  const siteDb = await db('Site', '⚙️', {
    Key: { title: {} },
    Value: { rich_text: {} },
  })

  // ── rows ────────────────────────────────────────────────

  const page = (database_id, properties, children, icon) =>
    notion('/pages', {
      parent: { database_id },
      properties,
      ...(children ? { children } : {}),
      ...(icon ? { icon: { type: 'external', external: { url: icon } } } : {}),
    })

  const topicId = {}
  log(`▸ ${TOPICS.length} topics `)
  for (const [i, [name, glyph, group, pinned, desc]] of TOPICS.entries()) {
    const [icon, iconClass] = TOPIC_ICONS[name] || []
    const r = await page(topicsDb, {
      Name: title(name), Slug: rt(slugify(name)), Glyph: rt(glyph),
      Icon: url(icon), 'Icon class': sel(iconClass),
      Description: rt(desc), Group: sel(group), Pinned: cb(pinned), Order: num(i + 1),
    }, null, icon)
    topicId[name] = r.id
    log('·')
  }
  log(' ok\n')

  const skillId = {}
  log(`▸ ${SKILLS.length} skills `)
  for (const [i, [name, group, show, note]] of SKILLS.entries()) {
    const r = await page(skillsDb, {
      Name: title(name), Group: sel(group), Order: num(i + 1),
      'Show in skills': cb(show), Note: rt(note),
    })
    skillId[name] = r.id
    log('·')
  }
  log(' ok\n')

  const seriesId = {}
  log(`▸ ${SERIES.length} series `)
  for (const [name, state, level, order, cadence, planned, topics, desc] of SERIES) {
    const r = await page(seriesDb, {
      Name: title(name), Slug: rt(slugify(name)), Description: rt(desc),
      Topics: rel(topics.map((t) => topicId[t])),
      State: sel(state), Level: sel(level), Order: num(order),
      Cadence: rt(cadence), 'Planned chapters': num(planned),
      Status: sel('published'),
    })
    seriesId[order] = r.id
    log('·')
  }
  log(' ok\n')

  const partId = {}
  log(`▸ ${PARTS.length} parts `)
  for (const [name, order, note] of PARTS) {
    const r = await page(partsDb, {
      Name: title(name), Series: rel([seriesId[1]]), Order: num(order), Note: rt(note),
    })
    partId[order] = r.id
    log('·')
  }
  log(' ok\n')

  log(`▸ ${CHAPTERS.length} chapters `)
  for (const [order, t, d, status, part, desc, topics] of CHAPTERS) {
    await page(postsDb, {
      Title: title(t), Slug: rt(slugify(t)), Type: sel('article'), Status: sel(status),
      Date: date(d), Description: rt(desc),
      Topics: rel(topics.map((x) => topicId[x])),
      Series: rel([seriesId[1]]), Part: rel([partId[part]]), Order: num(order),
      Pinned: cb(false), Lang: sel('en'),
    }, order === 5 ? chapter05Body : genericBody(desc))
    log('·')
  }
  log(' ok\n')

  log(`▸ ${POSTS.length} posts `)
  for (const [t, type, d, pinned, feat, desc, topics] of POSTS) {
    await page(postsDb, {
      Title: title(t), Slug: rt(slugify(t)), Type: sel(type), Status: sel('published'),
      Date: date(d), Updated: date(d), Description: rt(desc),
      Topics: rel(topics.map((x) => topicId[x])),
      Pinned: cb(pinned), 'Featured order': num(feat), Lang: sel('en'),
    }, genericBody(desc))
    log('·')
  }
  log(' ok\n')

  log(`▸ ${CV.length} CV entries `)
  for (const [i, [role, kind, org, orgUrl, loc, logo, start, end, tech, bullets]] of CV.entries()) {
    await page(cvDb, {
      Role: title(role), Kind: sel(kind), Org: rt(org), 'Org URL': url(orgUrl),
      Location: rt(loc), Logo: rt(logo), Start: date(start), End: date(end),
      Order: num(i + 1), Tech: rel(tech.map((x) => skillId[x])), Visible: cb(true),
    }, bullets.map(li))
    log('·')
  }
  log(' ok\n')

  log(`▸ ${SITE.length} site keys `)
  for (const [k, v] of SITE) {
    await page(siteDb, { Key: title(k), Value: rt(v) })
    log('·')
  }
  log(' ok\n')

  const ids = {
    page: PAGE, topics: topicsDb, skills: skillsDb, series: seriesDb,
    parts: partsDb, posts: postsDb, cv: cvDb, site: siteDb,
  }
  const { writeFileSync } = await import('node:fs')
  const out = new URL('./notion-ids.json', import.meta.url)
  writeFileSync(out, JSON.stringify(ids, null, 2) + '\n')

  console.log(`
✓ Done in ${((Date.now() - t0) / 1000).toFixed(0)}s — ${calls} API calls
  Page:  https://notion.so/${PAGE.replace(/-/g, '')}
  IDs:   scripts/notion-ids.json  (paste the block below into .env)

  NOTION_DB_POSTS=${postsDb}
  NOTION_DB_SERIES=${seriesDb}
  NOTION_DB_PARTS=${partsDb}
  NOTION_DB_TOPICS=${topicsDb}
  NOTION_DB_CV=${cvDb}
  NOTION_DB_SKILLS=${skillsDb}
  NOTION_DB_SITE=${siteDb}
`)
}

main()
