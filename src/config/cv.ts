// The About page's CV, kept in the repo rather than Notion: it changes a few
// times a year, and the site's Notion token is read-only anyway. Source of
// truth for wording is the CV in ~/trustsoft/trusty-bot/.scratch/cv-hoang-minh-duc.
// Deliberately no per-job technology lists — the bullets name the tools that
// matter. Bullets are raw HTML (rendered with set:html) so key terms can be bold.

export type CvPart = {
  name: string
  blurb?: string
  bullets: string[]
}

export type CvItem = {
  when: string
  role: string
  org: string
  orgUrl?: string
  where?: string
  blurb?: string
  bullets?: string[]
  /** sub-blocks for a role that spanned several products */
  parts?: CvPart[]
}

export const cv = {
  experience: [
    {
      when: 'Jul 2025 — present',
      role: 'Software Engineer',
      org: 'TrustSoft JSC',
      where: 'Hanoi · remote-first',
      parts: [
        {
          name: 'Blockbrain',
          blurb:
            'Multi-tenant enterprise AI-agent platform serving 15+ German corporations: TypeScript/Bun ' +
            'services running LLM agents over Microsoft 365, DATEV and Atlassian data, with row-level-security ' +
            'Postgres isolation, NATS JetStream eventing and GitOps Kubernetes deployment.',
          bullets: [
            'Architected and built, solo, a <strong>cross-conversation agentic memory service</strong> (mem0 over a custom ' +
              'pgvector store, Hono/Bun, NATS JetStream capture pipeline), introducing the platform’s first ' +
              '<strong>two-predicate org + user row-level-security model</strong> for its most sensitive data class — ' +
              '<strong>five ADRs</strong>’ worth of decisions, then the full path to its first deployed environment across ' +
              'three repos.',
            'Diagnosed a <strong>deterministic lock-starvation bug</strong> — a per-user advisory lock held across a ' +
              '<strong>12–61 s LLM call</strong> against a <strong>10 s statement_timeout</strong> — and fixed it by releasing the lock ' +
              'across the call.',
            'Re-root-caused a <strong>customer-blocking Excel failure</strong>: 100–120 MB workbooks were not hitting a ' +
              '“5 MB Graph limit”, <strong>Microsoft Graph</strong> was recalculating them inside its ~30 s window. Routed ' +
              'large files through an Azure Container Apps sandbox, lifting a <strong>~100-row cap to full-workbook scale</strong>.',
            'Led the <strong>v2 rewrite of the AI presentation pipeline</strong> (design spec → image generation → ' +
              'SVG slides → PPTX) with a <strong>two-guard QA loop</strong> — deterministic gate plus LLM-vision re-roll — ' +
              'catching OOXML defects before export on decks up to <strong>40 slides</strong>.',
          ],
        },
        {
          name: 'TrustAI Platform',
          blurb:
            'Internal multi-tenant RAG chatbot platform with visual workflow orchestration and sandboxed ' +
            'agentic document generation.',
          bullets: [
            'Built from scratch an <strong>event-driven workflow orchestrator</strong> (Go, RabbitMQ, PostgreSQL, Redis) that ' +
              'executes visual DAG workflows — condition, LLM, agent and human-input nodes — with ' +
              '<strong>DB-per-tenant routing</strong>; empty repository to production in <strong>five months</strong> as its primary author.',
            'Designed its auto-scaling worker pool (<strong>10 → 32 workers</strong> under load): <strong>40,700+ node executions</strong> ' +
              'across 2,200+ workflows with <strong>0% errors and 0% timeouts</strong> in stress testing, ' +
              '<strong>p95 API latency ~21 ms</strong>.',
            'Started the platform’s first <strong>performance-benchmark effort</strong> (k6, Prometheus, Grafana) — baselines ' +
              'such as <strong>Postgres at 1,559 commits/s</strong> with a 99.7% cache-hit ratio — and wrote the competitive ' +
              'analysis against <strong>Dify and n8n</strong>.',
            'Owned a <strong>sandboxed PPTX deck-generation agent</strong> end to end, PRDs and ADRs through GitOps rollout: a ' +
              '<strong>warm sandbox pool</strong> to remove cold starts, a server-side <strong>per-user daily quota</strong> closing a ' +
              'cost-cap bypass, parallel slide-render subagents with a pre-export render-QA gate, and a container ' +
              'image slimmed <strong>781 → 677 MB</strong>.',
          ],
        },
      ],
    },
    {
      when: 'Nov 2024 — May 2025',
      role: 'Software Engineer',
      org: 'An undisclosed hedge fund',
      blurb: 'Document-intelligence and market-news backend for stakeholder portfolio analysis.',
      bullets: [
        'Built a <strong>multi-agent document-extraction service</strong> (LangChain/LangGraph) that parses stock positions ' +
          'out of stakeholder invoices and filings, plus workflows aggregating the day’s worldwide news ' +
          'relevant to those portfolios.',
        'Background and batch processing between services over <strong>RabbitMQ</strong>; document storage on Amazon S3 with ' +
          '<strong>SSE-KMS</strong> for the sensitive files.',
      ],
    },
  ],

  projects: [
    {
      when: 'May 2026',
      role: 'DucklingDB',
      org: 'github.com/duchm1606/ducklingdb',
      orgUrl: 'https://github.com/duchm1606/ducklingdb',
      blurb: 'A distributed SQL database built from scratch in Go, modeled on CockroachDB’s layered architecture.',
      bullets: [
        'The whole stack from first principles, verified by a <strong>343-test suite larger than the code itself</strong>: ' +
          '<strong>LSM-tree storage</strong> (WAL, SSTables with bloom filters, level compaction, crash-safe dual-slot metadata), ' +
          '<strong>MVCC</strong> with write intents and GC, <strong>hybrid logical clocks</strong>.',
        'Single-node <strong>ACID transactions</strong> with <strong>Snapshot Isolation and Serializable Snapshot Isolation</strong>, a bounded ' +
          'timestamp cache and a <strong>six-case conflict-resolution matrix</strong> that includes the uncertainty window.',
        '<strong>Raft from scratch</strong> as a pure state machine (etcd-style Ready loop) with leader election, log ' +
          'replication and snapshot-based compaction, tested with a hand-built <strong>fault-injection harness</strong> that ' +
          'simulates partitions; a <strong>Postgres-compatible SQL layer</strong> routed through it.',
      ],
    },
    {
      when: 'Aug 2025',
      role: 'rogo',
      org: 'github.com/duchm1606/rogo',
      orgUrl: 'https://github.com/duchm1606/rogo',
      blurb: 'A Redis-compatible in-memory key-value store in Go, zero external dependencies.',
      bullets: [
        'A <strong>single-threaded reactor over raw syscalls</strong> (epoll on Linux, kqueue on macOS behind one interface) ' +
          'and a from-scratch <strong>RESP codec</strong> — Redis’s actual event-loop design rather than Go’s ' +
          'goroutine-per-connection idiom.',
        '<strong>Skiplist with rank-by-span</strong>, B+ tree, Bloom filter and Count-Min Sketch from first principles behind ' +
          '<strong>19 Redis-compatible commands</strong>; Redis’s <strong>approximated-LRU eviction</strong> and two-pronged TTL expiry ' +
          'reimplemented.',
      ],
    },
  ],

  education: [
    {
      when: '2020 — 2024',
      role: 'B.Eng. Control Engineering and Automation',
      org: 'Hanoi University of Science and Technology',
      bullets: ['CPA <strong>3.84/4.0</strong>, top 1% of the cohort.'],
    },
    {
      when: 'Oct 2025',
      role: 'AWS Certified Cloud Practitioner',
      org: 'Amazon Web Services',
      orgUrl: 'https://cp.certmetrics.com/amazon/en/public/verify/credential/3b6c8287c4c4477aacab517be3defee4',
    },
    {
      when: 'Jan 2024',
      role: 'TOEIC 825',
      org: 'ETS',
    },
  ],
} satisfies Record<string, CvItem[]>
