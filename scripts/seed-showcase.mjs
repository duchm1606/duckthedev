#!/usr/bin/env node
/**
 * Rewrites the body of a few mock posts so every block type the renderer
 * knows about appears at least once — including HTML code blocks, which
 * render as live sandboxed demos (see src/components/blocks/HtmlDemo.astro).
 *
 *   node scripts/seed-showcase.mjs            # all showcase posts
 *   node scripts/seed-showcase.mjs kitchen    # one, by key
 *
 * Idempotent, unlike seed-notion.mjs: it archives the post's existing blocks
 * and appends a fresh body, so re-running just restores the same state.
 */
import { readFileSync } from 'node:fs'

// parse .env by hand — standalone script, no dotenv dependency
const env = {}
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch {
  console.error('✗ Could not read .env at the repo root')
  process.exit(1)
}

const TOKEN = env.NOTION_TOKEN
const DB_POSTS = env.NOTION_DB_POSTS
if (!TOKEN || TOKEN.includes('xxx') || !DB_POSTS) {
  console.error('✗ NOTION_TOKEN / NOTION_DB_POSTS missing in .env — run `npm run notion:check` first')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const THROTTLE = Number(env.NOTION_THROTTLE_MS || 340)
let calls = 0

async function notion(path, body, method) {
  await sleep(THROTTLE) // Notion's real rate limit is ~3 req/s
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  calls++
  if (!res.ok) {
    console.error(`\n✗ ${method ?? 'POST'} ${path} → ${res.status}`)
    console.error(JSON.stringify(json, null, 2).slice(0, 1000))
    process.exit(1)
  }
  return json
}

// ─────────────────────────────────────────────────────────── block builders

/** Notion caps a single rich_text item at 2000 chars — long code needs slicing. */
const txt = (content, annotations, link) => {
  const s = String(content)
  const out = []
  for (let i = 0; i < s.length; i += 2000) {
    out.push({
      type: 'text',
      text: { content: s.slice(i, i + 2000), ...(link ? { link: { url: link } } : {}) },
      ...(annotations ? { annotations } : {}),
    })
  }
  return out.length ? out : [{ type: 'text', text: { content: '' } }]
}

/** rich text from parts: 'plain' | ['text', {bold:true}] | ['text', null, 'https://…'] */
const rich = (...parts) =>
  parts.flatMap((part) => (Array.isArray(part) ? txt(part[0], part[1], part[2]) : txt(part)))

const block = (type, data, children) => ({
  type,
  [type]: { ...data, ...(children ? { children } : {}) },
})

const p = (...parts) => block('paragraph', { rich_text: rich(...parts) })
const h2 = (t) => block('heading_2', { rich_text: rich(t) })
const h3 = (t) => block('heading_3', { rich_text: rich(t) })
const li = (parts, children) => block('bulleted_list_item', { rich_text: rich(...[].concat(parts)) }, children)
const ol = (parts, children) => block('numbered_list_item', { rich_text: rich(...[].concat(parts)) }, children)
const quote = (t, children) => block('quote', { rich_text: rich(t) }, children)
const callout = (t, emoji = '⚠️', children) =>
  block('callout', { rich_text: rich(t), icon: { type: 'emoji', emoji } }, children)
const toggle = (t, children) => block('toggle', { rich_text: rich(t) }, children)
const code = (content, language, caption) =>
  block('code', {
    rich_text: txt(content),
    language,
    caption: caption ? rich(caption) : [],
  })
const divider = () => block('divider', {})
const image = (url, caption) =>
  block('image', { type: 'external', external: { url }, caption: caption ? rich(caption) : [] })
const bookmark = (url, caption) => block('bookmark', { url, caption: caption ? rich(caption) : [] })
const embed = (url, caption) => block('embed', { url, caption: caption ? rich(caption) : [] })

// ─────────────────────────────────────────────────────────── demos
//
// Self-contained HTML documents. They pick up the site theme through the
// `data-theme` attribute HtmlDemo.astro pushes into the frame, so the palettes
// below mirror the letterpress tokens in src/styles/global.css.

const DEMO_CSS = `
:root{
  --bg:#f3ebd9; --bg-2:#faf3e2; --bg-3:#e9dec3;
  --ink:#1c1813; --ink-2:#4a4338; --ink-3:#847a64;
  --rule:#c9be9f; --accent:#8a2317; --gold:#a87714; --sage:#5d7440;
  --mono:"JetBrains Mono","SF Mono",Menlo,monospace;
  --serif:"Newsreader",Georgia,serif;
}
[data-theme="dim"]{
  --bg:#181410; --bg-2:#211c15; --bg-3:#141009;
  --ink:#e6dec8; --ink-2:#b8ad94; --ink-3:#7d735a;
  --rule:#3a3328; --accent:#d8a070; --gold:#d4a83a; --sage:#9ab068;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg-2);color:var(--ink);font-family:var(--serif);padding:22px 24px 26px}
.demo-title{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-bottom:16px}
button{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;
  background:var(--bg);color:var(--ink-2);border:1px solid var(--rule);padding:7px 13px;cursor:pointer}
button:hover{border-color:var(--accent);color:var(--accent)}
button:disabled{opacity:.4;cursor:not-allowed}
.row{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.stat{font-family:var(--mono);font-size:12px;color:var(--ink-3)}
.stat b{color:var(--accent);font-weight:500}
`

/** Chapter 5 — the ring the chapter derives, with the rebalance cost measured live. */
const RING_DEMO = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${DEMO_CSS}
.wrap{display:grid;grid-template-columns:300px 1fr;gap:26px;align-items:start}
@media(max-width:620px){.wrap{grid-template-columns:1fr}}
svg{width:100%;height:auto;display:block}
.legend{font-family:var(--mono);font-size:11px;line-height:2;color:var(--ink-3)}
.legend i{display:inline-block;width:9px;height:9px;margin-right:8px;border-radius:50%}
.moved{margin-top:14px;font-family:var(--mono);font-size:12px;line-height:1.9}
</style></head><body>
<div class="demo-title">consistent hashing · 512 keys on a 32-bit ring</div>
<div class="wrap">
  <svg viewBox="0 0 300 300" id="ring"></svg>
  <div>
    <div class="row">
      <button id="add">add a node</button>
      <button id="drop">drop a node</button>
      <button id="reset">reset</button>
      <button id="mode">mode: ring</button>
    </div>
    <div class="moved" id="report"></div>
    <div class="legend" id="legend"></div>
  </div>
</div>
<script>
var COLORS=['#8a2317','#5d7440','#a87714','#3b6ea5','#7a4b8f','#2f7d72'];
var NAMES=['cache-a','cache-b','cache-c','cache-d','cache-e','cache-f'];
var KEYS=512, VNODES=64, ring=true, nodes=4, prev=null;

// deterministic 32-bit hash so every reload shows the same picture.
// FNV-1a alone leaves visible clusters on the circle, so finish with an
// avalanche step — the same reason real rings use a proper hash, not modulo.
function hash(s){
  var h=2166136261>>>0;
  for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  h^=h>>>16;h=Math.imul(h,2246822507)>>>0;
  h^=h>>>13;h=Math.imul(h,3266489909)>>>0;
  return (h^(h>>>16))>>>0;
}
function keyName(i){return 'user:'+(1000+i*7919%9000)}

function owners(){
  var map=[];
  if(!ring){
    for(var i=0;i<KEYS;i++) map.push(hash(keyName(i))%nodes);
    return map;
  }
  var points=[];
  for(var n=0;n<nodes;n++)
    for(var v=0;v<VNODES;v++) points.push([hash(NAMES[n]+'#'+v),n]);
  points.sort(function(a,b){return a[0]-b[0]});
  for(var i=0;i<KEYS;i++){
    var h=hash(keyName(i)), lo=0, hi=points.length-1, idx=0;
    while(lo<=hi){var m=(lo+hi)>>1; if(points[m][0]<h){lo=m+1}else{idx=m;hi=m-1}}
    map.push(points[lo>points.length-1?0:idx][1]);
  }
  return map;
}

function draw(){
  var map=owners(), R=118, cx=150, cy=150, out=[];
  out.push('<circle cx="150" cy="150" r="118" fill="none" stroke="var(--rule)" stroke-width="1"/>');
  for(var i=0;i<KEYS;i++){
    var a=hash(keyName(i))/4294967296*Math.PI*2-Math.PI/2;
    var moved=prev&&prev[i]!==map[i];
    out.push('<circle cx="'+(cx+Math.cos(a)*R).toFixed(1)+'" cy="'+(cy+Math.sin(a)*R).toFixed(1)+
      '" r="'+(moved?3:1.9)+'" fill="'+COLORS[map[i]]+'" opacity="'+(moved?1:.55)+'"/>');
  }
  for(var n=0;n<nodes;n++){
    var ah=hash(NAMES[n]+'#0')/4294967296*Math.PI*2-Math.PI/2;
    out.push('<circle cx="'+(cx+Math.cos(ah)*(R+16)).toFixed(1)+'" cy="'+(cy+Math.sin(ah)*(R+16)).toFixed(1)+
      '" r="5.5" fill="'+COLORS[n]+'"/>');
  }
  document.getElementById('ring').innerHTML=out.join('');

  var legend='';
  for(var n=0;n<nodes;n++){
    var share=map.filter(function(x){return x===n}).length;
    legend+='<div><i style="background:'+COLORS[n]+'"></i>'+NAMES[n]+' — '+
      (share/KEYS*100).toFixed(1)+'%</div>';
  }
  document.getElementById('legend').innerHTML=legend;

  var rep='';
  if(prev){
    var moved=0;
    for(var i=0;i<KEYS;i++) if(prev[i]!==map[i]) moved++;
    rep='<span class="stat">keys that changed owner: <b>'+(moved/KEYS*100).toFixed(1)+'%</b>'+
      ' &nbsp;·&nbsp; ideal ≈ '+(100/Math.max(nodes,1)).toFixed(1)+'%</span>';
  } else {
    rep='<span class="stat">'+nodes+' nodes · add or drop one and watch what moves</span>';
  }
  document.getElementById('report').innerHTML=rep;
  return map;
}

var current=draw();
function step(fn){prev=current;fn();current=draw();sync()}
function sync(){
  document.getElementById('add').disabled=nodes>=6;
  document.getElementById('drop').disabled=nodes<=2;
}
document.getElementById('add').onclick=function(){step(function(){nodes++})};
document.getElementById('drop').onclick=function(){step(function(){nodes--})};
document.getElementById('reset').onclick=function(){prev=null;nodes=4;current=draw();sync()};
document.getElementById('mode').onclick=function(){
  ring=!ring; prev=null;
  this.textContent='mode: '+(ring?'ring':'key % n');
  current=draw();
};
sync();
<\/script>
</body></html>`

/** Kitchen-sink post — a second, smaller demo proves several frames coexist. */
const RECONCILE_DEMO = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${DEMO_CSS}
.states{display:flex;gap:0;margin:18px 0 16px;flex-wrap:wrap}
.st{flex:1;min-width:104px;border:1px solid var(--rule);border-right:0;padding:12px 10px;text-align:center;
  font-family:var(--mono);font-size:11px;color:var(--ink-3);transition:all .25s}
.st:last-child{border-right:1px solid var(--rule)}
.st.on{background:var(--bg-3);color:var(--accent);border-color:var(--accent)}
.st small{display:block;font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:4px}
.logline{font-family:var(--mono);font-size:12px;color:var(--ink-2);min-height:44px;line-height:1.7}
.logline .t{color:var(--ink-3)}
</style></head><body>
<div class="demo-title">reconcile loop · one pass over the desired state</div>
<div class="states" id="states"></div>
<div class="row"><button id="tick">next step</button><button id="err">inject a failure</button></div>
<div class="logline" id="log"></div>
<script>
var STEPS=[
  ['observe','read the CR + owned pods'],
  ['diff','desired 3 replicas, observed 2'],
  ['act','create pod worker-c'],
  ['status','write .status.readyReplicas = 3'],
  ['requeue','sleep until the next event']
];
var at=-1, failed=false;
function render(){
  document.getElementById('states').innerHTML=STEPS.map(function(s,i){
    return '<div class="st'+(i===at?' on':'')+'"><small>'+i+'</small>'+s[0]+'</div>'
  }).join('');
  var msg = at<0 ? '<span class="t">idle — the loop is level-triggered, not edge-triggered.</span>'
    : (failed&&at===2 ? '<span class="t">act:</span> create pod worker-c → <b>409 AlreadyExists</b><br><span class="t">→ swallowed; the next pass observes reality again. That is why the loop is safe to retry.</span>'
    : '<span class="t">'+STEPS[at][0]+':</span> '+STEPS[at][1]);
  document.getElementById('log').innerHTML=msg;
}
document.getElementById('tick').onclick=function(){at=(at+1)%STEPS.length;render()};
document.getElementById('err').onclick=function(){failed=!failed;at=2;render()};
render();
<\/script>
</body></html>`

// ─────────────────────────────────────────────────────────── bodies

/** Every block type Block.astro handles, plus every rich-text annotation. */
const kitchenSink = [
  p(
    'We deleted the framework. What was left was a reconcile loop we could read out loud in a stand-up, and an on-call rotation that finally sleeps through the night.',
  ),
  p(
    'This post doubles as the renderer’s test fixture: ',
    ['bold', { bold: true }],
    ', ',
    ['italic', { italic: true }],
    ', ',
    ['struck through', { strikethrough: true }],
    ', ',
    ['underlined', { underline: true }],
    ', ',
    ['inline code', { code: true }],
    ', and ',
    ['a link', null, 'https://kubernetes.io/docs/concepts/architecture/controller/'],
    ' all appear in this one paragraph.',
  ),

  h2('The loop, drawn'),
  p(
    'A controller is not a state machine you drive; it is a function you call repeatedly until reality stops disagreeing with you. Step through one pass:',
  ),
  code(RECONCILE_DEMO, 'html', 'demo · reconcile loop'),

  h3('Why level-triggered matters'),
  p(
    'Edge-triggered code has to remember what it already did. Level-triggered code only has to look. That difference is the entire reason 400 lines is enough.',
  ),
  callout(
    'If your reconcile function is not safe to call twice in a row with no changes in between, it is not a reconcile function — it is a migration with extra steps.',
    '⚠️',
  ),

  h2('What the 400 lines are'),
  ol('Watch the custom resource and everything it owns — one informer each.'),
  ol('Compute the difference between spec and observed state, in memory, with no API calls.'),
  ol('Apply the difference, tolerating conflicts as normal traffic rather than errors.', [
    li('409 on create means someone beat us to it — the next pass will see it.'),
    li('404 on delete means the job is already done.'),
  ]),
  ol('Write status, then requeue with backoff.'),

  h3('The reconcile signature'),
  code(
    `// Reconcile is called for every event on a Worker or on anything it owns.
// It must be safe to call with no changes at all — that is the contract.
func (r *WorkerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	var worker appsv1alpha1.Worker
	if err := r.Get(ctx, req.NamespacedName, &worker); err != nil {
		// Gone. Owned pods are collected by the garbage collector, not by us.
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	pods, err := r.ownedPods(ctx, &worker)
	if err != nil {
		return ctrl.Result{}, err
	}

	switch missing := int(worker.Spec.Replicas) - len(pods); {
	case missing > 0:
		return ctrl.Result{Requeue: true}, r.createPods(ctx, &worker, missing)
	case missing < 0:
		return ctrl.Result{Requeue: true}, r.deletePods(ctx, pods[:-missing])
	}

	return ctrl.Result{RequeueAfter: time.Minute}, r.writeStatus(ctx, &worker, pods)
}`,
    'go',
    'controllers/worker_controller.go',
  ),

  quote(
    'The best operator is the one whose behaviour you can predict without reading its code — because it does the obvious thing, every time, from scratch.',
  ),

  divider(),

  h2('What it cost'),
  li('Binary: 62 MB → 11 MB. The framework brought four API machinery versions with it.'),
  li('Cold start: 8s → 400ms, which matters more than it sounds during a node drain.'),
  li([
    'Lines we own: ',
    ['400', { code: true }],
    ' — up from zero, and that is the honest trade.',
  ]),

  image(
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&q=80',
    'The rack this all runs on, photographed by someone with better lighting than our server room.',
  ),

  toggle('The full CRD, if you want to copy it', [
    p('Two fields. Everything else is derived at reconcile time, never stored.'),
    code(
      `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: workers.apps.example.com
spec:
  group: apps.example.com
  scope: Namespaced
  names: { kind: Worker, plural: workers, singular: worker }
  versions:
    - name: v1alpha1
      served: true
      storage: true
      subresources: { status: {} }
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: [replicas, image]
              properties:
                replicas: { type: integer, minimum: 0, maximum: 64 }
                image:    { type: string }`,
      'yaml',
      'crd.yaml',
    ),
  ]),

  h3('An HTML block that stays code'),
  p(
    'HTML normally becomes a live preview. Prefix the caption with ',
    ['raw', { code: true }],
    ' when the markup itself is the point:',
  ),
  code(
    `<!-- the status subresource, rendered into our internal dashboard -->
<tr class="worker" data-ready="3" data-desired="3">
  <td>worker-pool-a</td>
  <td><span class="pill ok">3/3 ready</span></td>
</tr>`,
    'html',
    'raw · dashboard row',
  ),

  bookmark(
    'https://kubernetes.io/docs/concepts/extend-kubernetes/operator/',
    'The operator pattern, from the source',
  ),
  embed('https://github.com/kubernetes-sigs/controller-runtime', 'controller-runtime on GitHub'),

  h2('Would I do it again'),
  p(
    'For a controller this shape, yes. For anything that needs webhooks, conversion, or leader election across twelve types — no, and I would not enjoy pretending otherwise.',
  ),
]

/** Chapter 05 — the existing prose, with the ring the chapter derives made live. */
const chapter05 = [
  p(
    'Adding one cache node should invalidate roughly one node’s worth of keys. Ours invalidated ninety-four percent of them, at 11:40 on a Thursday, while a marketing campaign was running.',
  ),
  p(
    'The mechanism is not subtle once you see it. With four nodes, key ',
    ['user:9021', { code: true }],
    ' lands on ',
    ['9021 % 4 = 1', { code: true }],
    '. Add a fifth node and the same key lands on ',
    ['9021 % 5 = 1', { code: true }],
    ' — by luck. Almost every other key moves. The modulus is part of the address, so changing the modulus rewrites every address at once.',
  ),

  h2('What we actually needed'),
  p(
    'Before reaching for a known answer, it is worth writing the requirement down. We needed a mapping from keys to nodes where adding or removing a node moves only the keys that node is responsible for — and nothing else.',
  ),
  li('Deterministic: any client computes the same mapping without coordination.'),
  li('Balanced: no node holds a wildly disproportionate share.'),
  li('Stable: a membership change of one node moves ≈ 1/n of keys, not all of them.'),
  callout(
    'That third property is the whole chapter. If you only remember one sentence: consistent hashing is not about hashing better, it’s about making the address independent of the number of nodes.',
    '⚠️',
  ),

  h2('The ring, live'),
  p(
    'Rather than describe the rebalance, measure it. 512 keys sit on a 32-bit circle; each node claims 64 virtual positions. Add a node and the moved keys light up. Then switch the mode to ',
    ['key % n', { code: true }],
    ' and do it again — the difference is the chapter.',
  ),
  code(RING_DEMO, 'html', 'demo · the ring vs. key % n'),

  h3('Why “add a node” is the hard case'),
  p(
    'Removal is easier to reason about — the keys have to go somewhere, and any neighbour will do. Addition is where naive schemes fail, because a new node has to steal a fair share from everyone without anyone coordinating the theft.',
  ),

  h2('Deriving the ring'),
  p(
    'Stop hashing to a node index and start hashing to a fixed space — say, all 32-bit integers. Nodes hash into that same space. A key belongs to the first node clockwise from it. Now the address of a key never mentions n at all.',
  ),
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
  p(
    'With one point per node the distribution is bad — random placement leaves gaps, and one node can own a third of the circle. Giving each node 100–200 virtual positions averages the variance away. We measured 150 as the point where the marginal improvement stopped paying for the memory.',
  ),
  quote(
    'Every distributed system eventually grows a ring. The question is only whether you drew it deliberately or discovered it during an incident.',
  ),

  h2('Measuring the rebalance'),
  p(
    'The satisfying part: with the ring in place, adding a fifth node to our four-node cluster moved 19.4% of keys. The theoretical figure is 20%. The old scheme, on the same key set, moved 94.2%.',
  ),

  divider(),

  h2('What this doesn’t solve'),
  p(
    'Hot keys. If one key gets a tenth of your traffic, the ring routes all of it to one node with perfect consistency. That’s chapter 7’s problem, and the fix is not in the hash function.',
  ),
  toggle('Footnote: why not rendezvous hashing?', [
    p(
      'Rendezvous (highest-random-weight) hashing gives the same stability with no virtual nodes and simpler code — at O(n) per lookup instead of O(log n). At our node count the constant factor decided it, not the complexity class.',
    ),
  ]),
]

const SHOWCASE = {
  kitchen: {
    slug: 'rewriting-our-kubernetes-operator-in-400-lines-of-go',
    blocks: kitchenSink,
  },
  ring: {
    slug: 'consistent-hashing-and-why-your-cache-ring-rotates',
    blocks: chapter05,
  },
}

// ─────────────────────────────────────────────────────────── run

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

async function main() {
  const only = process.argv[2]
  const targets = Object.entries(SHOWCASE).filter(([key]) => !only || key === only)
  if (!targets.length) {
    console.error(`✗ Unknown showcase "${only}" — pick one of: ${Object.keys(SHOWCASE).join(', ')}`)
    process.exit(1)
  }

  // API 2025-09-03 queries data sources, not databases
  const db = await notion(`/databases/${DB_POSTS}`)
  const dataSource = db.data_sources?.[0]?.id
  if (!dataSource) {
    console.error('✗ Posts database has no data source — is the integration connected?')
    process.exit(1)
  }

  for (const [key, { slug, blocks }] of targets) {
    process.stdout.write(`▸ ${key} (${slug})\n  find… `)
    const found = await notion(`/data_sources/${dataSource}/query`, {
      page_size: 1,
      filter: { property: 'Slug', rich_text: { equals: slug } },
    })
    const page = found.results?.[0]
    if (!page) {
      console.log(`✗ no post with Slug = ${slug} — seed the workspace first`)
      continue
    }
    console.log('ok')

    // archive the old body so re-runs are idempotent
    process.stdout.write('  clear… ')
    let cursor
    const old = []
    do {
      const res = await notion(
        `/blocks/${page.id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`,
      )
      old.push(...res.results.map((b) => b.id))
      cursor = res.has_more ? res.next_cursor : null
    } while (cursor)
    for (const id of old) await notion(`/blocks/${id}`, null, 'DELETE')
    console.log(`${old.length} blocks`)

    // append_children takes at most 100 blocks per call
    process.stdout.write('  write… ')
    for (const part of chunk(blocks, 100)) {
      await notion(`/blocks/${page.id}/children`, { children: part }, 'PATCH')
    }
    console.log(`${blocks.length} blocks ok`)
  }

  console.log(`\n✓ Done — ${calls} API calls. Run \`npm run sync\` to refresh the dev server.`)
}

main()
