// The About page's CV, kept in the repo rather than Notion: it changes a few
// times a year, and the site's Notion token is read-only anyway. Source of
// truth for wording is the CV in ~/trustsoft/trusty-bot/.scratch/cv-hoang-minh-duc.
// Deliberately no per-job technology lists — the bullets name the tools that matter.

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
            'Architected and built, solo, a cross-conversation agentic memory service (mem0 over a custom ' +
              'pgvector store, Hono/Bun, NATS JetStream capture pipeline), introducing the platform’s first ' +
              'two-predicate org + user row-level-security model for its most sensitive data class — ' +
              'five ADRs’ worth of decisions, then the full path to its first deployed environment across ' +
              'three repos.',
            'Diagnosed a deterministic lock-starvation bug — a per-user advisory lock held across a ' +
              '12–61 s LLM call against a 10 s statement_timeout — and fixed it by releasing the lock ' +
              'across the call.',
            'Re-root-caused a customer-blocking Excel failure: 100–120 MB workbooks were not hitting a ' +
              '“5 MB Graph limit”, Microsoft Graph was recalculating them inside its ~30 s window. Routed ' +
              'large files through an Azure Container Apps sandbox, lifting a ~100-row cap to full-workbook scale.',
            'Led the v2 rewrite of the AI presentation pipeline (design spec → image generation → ' +
              'SVG slides → PPTX) with a two-guard QA loop — deterministic gate plus LLM-vision re-roll — ' +
              'catching OOXML defects before export on decks up to 40 slides.',
          ],
        },
        {
          name: 'TrustAI Platform',
          blurb:
            'Internal multi-tenant RAG chatbot platform with visual workflow orchestration and sandboxed ' +
            'agentic document generation.',
          bullets: [
            'Built from scratch an event-driven workflow orchestrator (Go, RabbitMQ, PostgreSQL, Redis) that ' +
              'executes visual DAG workflows — condition, LLM, agent and human-input nodes — with ' +
              'DB-per-tenant routing; empty repository to production in five months as its primary author.',
            'Designed its auto-scaling worker pool (10 → 32 workers under load): 40,700+ node executions ' +
              'across 2,200+ workflows with 0% errors and 0% timeouts in stress testing, p95 API latency ~21 ms.',
            'Started the platform’s first benchmark effort (k6, Prometheus, Grafana) — baselines such as ' +
              'Postgres at 1,559 commits/s with a 99.7% cache-hit ratio — and wrote the competitive analysis ' +
              'against Dify and n8n.',
            'Owned a sandboxed PPTX deck-generation agent end to end, PRDs and ADRs through GitOps rollout: a ' +
              'warm sandbox pool to remove cold starts, a server-side per-user daily quota closing a cost-cap ' +
              'bypass, parallel slide-render subagents with a pre-export render-QA gate, and a container image ' +
              'slimmed 781 → 677 MB.',
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
        'Built a multi-agent document-extraction service (LangChain/LangGraph) that parses stock positions ' +
          'out of stakeholder invoices and filings, plus workflows aggregating the day’s worldwide news ' +
          'relevant to those portfolios.',
        'Background and batch processing between services over RabbitMQ; document storage on Amazon S3 with ' +
          'SSE-KMS for the sensitive files.',
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
        'The whole stack from first principles, verified by a 343-test suite larger than the code itself: ' +
          'LSM-tree storage (WAL, SSTables with bloom filters, level compaction, crash-safe dual-slot metadata), ' +
          'MVCC with write intents and GC, hybrid logical clocks.',
        'Single-node ACID transactions with Snapshot Isolation and Serializable Snapshot Isolation, a bounded ' +
          'timestamp cache and a six-case conflict-resolution matrix that includes the uncertainty window.',
        'Raft from scratch as a pure state machine (etcd-style Ready loop) with leader election, log ' +
          'replication and snapshot-based compaction, tested with a hand-built fault-injection harness that ' +
          'simulates partitions; a Postgres-compatible SQL layer routed through it.',
      ],
    },
    {
      when: 'Aug 2025',
      role: 'rogo',
      org: 'github.com/duchm1606/rogo',
      orgUrl: 'https://github.com/duchm1606/rogo',
      blurb: 'A Redis-compatible in-memory key-value store in Go, zero external dependencies.',
      bullets: [
        'A single-threaded reactor over raw syscalls (epoll on Linux, kqueue on macOS behind one interface) ' +
          'and a from-scratch RESP codec — Redis’s actual event-loop design rather than Go’s ' +
          'goroutine-per-connection idiom.',
        'Skiplist with rank-by-span, B+ tree, Bloom filter and Count-Min Sketch from first principles behind ' +
          '19 Redis-compatible commands; Redis’s approximated-LRU eviction and two-pronged TTL expiry ' +
          'reimplemented.',
      ],
    },
  ],

  education: [
    {
      when: '2020 — 2024',
      role: 'B.Eng. Control Engineering and Automation',
      org: 'Hanoi University of Science and Technology',
      bullets: ['CPA 3.84/4.0, top 1% of the cohort.'],
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
