/* ============================================================================
 *  generate_dataset.js
 *  Generates the cascade-failure dataset used by the CASCADE AI dashboard and
 *  the Python reference pipeline. Uses the SAME seeded BA(100,3) realization as
 *  the website (mulberry32, seed = 324), so the CSVs match the live demo and
 *  the paper's Table I statistics: N=100, M=291, <d>=5.82, d_max=24.
 *
 *  Run:  node generate_dataset.js
 *  Writes CSVs into ./data/
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');

const N = 100, M_ATTACH = 3, ALPHA = 0.20, SEED = 324;
const OUT = path.join(__dirname, 'data');

// ---- seeded PRNG (mulberry32) — identical to the website ----
let _seed = SEED;
function rand() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---- build graph ----
const deg = new Array(N).fill(0);
const adj = Array.from({ length: N }, () => new Set());
const edges = [];
function addEdge(a, b) {
  if (a === b || adj[a].has(b)) return;
  adj[a].add(b); adj[b].add(a); deg[a]++; deg[b]++; edges.push([a, b]);
}

// loads first (matches website rand-stream ordering), then attachment
const loads = [];
for (let i = 0; i < N; i++) loads.push(rand());

// Barabási–Albert: m isolated seed nodes, each new node adds m edges
for (let i = M_ATTACH; i < N; i++) {
  const picked = new Set(); let guard = 0;
  while (picked.size < M_ATTACH && guard++ < 500) {
    let sum = 0; const w = [];
    for (let j = 0; j < i; j++) { const d = deg[j] + 1; w[j] = d; sum += d; }
    let r = rand() * sum, cum = 0, sel = 0;
    for (let j = 0; j < i; j++) { cum += w[j]; if (r <= cum) { sel = j; break; } }
    picked.add(sel);
  }
  picked.forEach(t => addEdge(i, t));
}
const adjA = adj.map(s => [...s]);

// ---- clustering coefficient ----
const clustering = new Array(N).fill(0);
for (let i = 0; i < N; i++) {
  const nb = adjA[i], k = nb.length;
  if (k < 2) continue;
  let links = 0;
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) if (adj[nb[a]].has(nb[b])) links++;
  clustering[i] = (2 * links) / (k * (k - 1));
}

// ---- betweenness (Brandes, normalized) ----
const bc = new Array(N).fill(0);
for (let s = 0; s < N; s++) {
  const S = [], P = Array.from({ length: N }, () => []);
  const sigma = new Array(N).fill(0), dist = new Array(N).fill(-1);
  sigma[s] = 1; dist[s] = 0;
  const Q = [s];
  while (Q.length) {
    const v = Q.shift(); S.push(v);
    for (const w of adjA[v]) {
      if (dist[w] < 0) { dist[w] = dist[v] + 1; Q.push(w); }
      if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); }
    }
  }
  const delta = new Array(N).fill(0);
  while (S.length) {
    const w = S.pop();
    for (const v of P[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
    if (w !== s) bc[w] += delta[w];
  }
}
const norm = N > 2 ? 2 / ((N - 1) * (N - 2)) : 1;
const betweenness = bc.map(v => v * norm);

// ---- load-capacity cascade (Algorithm 1) ----
function runCascade(seed) {
  const L = loads.slice(), C = loads.map(x => (1 + ALPHA) * x);
  const failed = new Array(N).fill(false);
  let front = [seed]; failed[seed] = true; let guard = 0;
  while (front.length && guard++ < N) {
    const next = [], contrib = new Array(N).fill(0);
    for (const i of front) {
      const d = deg[i] || 1;
      for (const j of adjA[i]) if (!failed[j]) contrib[j] += L[i] / d;
    }
    for (let j = 0; j < N; j++) if (!failed[j] && contrib[j] > 0) {
      L[j] += contrib[j];
      if (L[j] > C[j]) { failed[j] = true; next.push(j); }
    }
    front = next;
  }
  let count = 0; for (let i = 0; i < N; i++) if (failed[i]) count++;
  return count;
}
const cascadeSize = []; for (let i = 0; i < N; i++) cascadeSize.push(runCascade(i));

// ---- 3-class labels via 33rd / 67th percentile ----
const sorted = [...cascadeSize].sort((a, b) => a - b);
const p33 = sorted[Math.floor(N * 0.33)];
const p67 = sorted[Math.floor(N * 0.67)];
const LABELS = ['Low', 'Medium', 'High'];
const riskClass = cascadeSize.map(s => (s <= p33 ? 0 : (s <= p67 ? 1 : 2)));

// ---- stratified 70/10/20 split (deterministic) ----
const split = new Array(N).fill('train');
for (let c = 0; c < 3; c++) {
  const idx = []; for (let i = 0; i < N; i++) if (riskClass[i] === c) idx.push(i);
  const nVal = Math.round(idx.length * 0.10);
  const nTest = Math.round(idx.length * 0.20);
  idx.forEach((node, k) => {
    if (k < nTest) split[node] = 'test';
    else if (k < nTest + nVal) split[node] = 'val';
    else split[node] = 'train';
  });
}

// ---- write CSVs ----
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const w = (f, s) => fs.writeFileSync(path.join(OUT, f), s);

w('edges.csv', 'source,target\n' + edges.map(([a, b]) => `${a},${b}`).join('\n') + '\n');
w('node_loads.csv', 'node_id,load,capacity\n' +
  Array.from({ length: N }, (_, i) =>
    `${i},${loads[i].toFixed(6)},${((1 + ALPHA) * loads[i]).toFixed(6)}`).join('\n') + '\n');
w('node_features.csv',
  'node_id,degree,clustering,betweenness\n' +
  Array.from({ length: N }, (_, i) =>
    `${i},${deg[i]},${clustering[i].toFixed(6)},${betweenness[i].toFixed(6)}`).join('\n') + '\n');
w('node_labels.csv',
  'node_id,cascade_size,risk_class,risk_label,split\n' +
  Array.from({ length: N }, (_, i) =>
    `${i},${cascadeSize[i]},${riskClass[i]},${LABELS[riskClass[i]]},${split[i]}`).join('\n') + '\n');

// combined convenience file
w('cascade_dataset.csv',
  'node_id,degree,clustering,betweenness,cascade_size,risk_class,risk_label,split\n' +
  Array.from({ length: N }, (_, i) =>
    `${i},${deg[i]},${clustering[i].toFixed(6)},${betweenness[i].toFixed(6)},${cascadeSize[i]},${riskClass[i]},${LABELS[riskClass[i]]},${split[i]}`).join('\n') + '\n');

// ---- summary ----
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const counts = [0, 0, 0]; riskClass.forEach(c => counts[c]++);
const splitCounts = { train: 0, val: 0, test: 0 }; split.forEach(s => splitCounts[s]++);
const summary = {
  model: 'Barabasi-Albert', N, edges: edges.length, m: M_ATTACH, alpha: ALPHA, seed: SEED,
  mean_degree: +mean(deg).toFixed(2), max_degree: Math.max(...deg),
  mean_clustering_live: +mean(clustering).toFixed(3),
  mean_betweenness_live: +mean(betweenness).toFixed(3),
  paper_table_I: { mean_degree: 5.82, max_degree: 24, mean_clustering: 0.07, mean_betweenness: 0.058 },
  class_split: { Low: counts[0], Medium: counts[1], High: counts[2] },
  percentiles: { p33, p67 },
  split_counts: splitCounts,
  mean_cascade_fraction: +(mean(cascadeSize) / N).toFixed(3)
};
w('dataset_summary.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
