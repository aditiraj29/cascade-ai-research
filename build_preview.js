/* Builds a single self-contained preview.html that renders the dataset (as
 * tables) and every code file (as highlighted-ish source) so the whole project
 * can be browsed in a browser. Run: node build_preview.js */
const fs = require('fs');
const path = require('path');
const root = __dirname;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function readSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

// ---- dataset CSV -> HTML table ----
function csvTable(file, maxRows = 0) {
  const txt = readSafe(path.join(root, 'data', file)).trim();
  if (!txt) return `<p class="muted">missing ${file}</p>`;
  const rows = txt.split('\n').map(r => r.split(','));
  const head = rows[0];
  let body = rows.slice(1);
  const total = body.length;
  if (maxRows && body.length > maxRows) body = body.slice(0, maxRows);
  const th = head.map(h => `<th>${esc(h)}</th>`).join('');
  const tr = body.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('');
  const note = maxRows && total > maxRows ? `<div class="muted small">showing first ${maxRows} of ${total} rows — full data in data/${file}</div>` : '';
  return `<div class="tablewrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>${note}`;
}

const summary = readSafe(path.join(root, 'data', 'dataset_summary.json'));
const paperRes = readSafe(path.join(root, 'data', 'paper_results.json'));

const codeFiles = [
  'generate_dataset.js', 'requirements.txt', 'README.md',
  'src/network_generation.py', 'src/cascade_simulation.py', 'src/features.py',
  'src/dataset.py', 'src/models.py', 'src/train.py', 'src/evaluate.py', 'src/main.py',
];

const codeSections = codeFiles.map((f, i) => {
  const src = readSafe(path.join(root, f));
  const lines = src.split('\n').length;
  return `<details class="file" ${i === 0 ? 'open' : ''}>
    <summary>${esc(f)} <span class="muted small">· ${lines} lines</span></summary>
    <pre><code>${esc(src)}</code></pre>
  </details>`;
}).join('\n');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CASCADE AI — Dataset &amp; Code Preview</title>
<style>
  :root{--bg:#03040d;--surf:#0b1024;--card:#0f1630;--bd:rgba(255,255,255,.08);
        --tx:#e8eaf6;--mut:#8892b0;--acc:#6366f1;--acc2:#8b5cf6;--cyan:#06b6d4;--em:#10b981;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--tx);font:14px/1.6 'Inter',system-ui,Segoe UI,sans-serif;padding:0 0 80px}
  .nav{position:sticky;top:0;z-index:9;background:rgba(3,4,13,.9);backdrop-filter:blur(14px);
       border-bottom:1px solid var(--bd);padding:16px 28px;display:flex;align-items:center;gap:14px}
  .logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--acc),var(--acc2));
        display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(99,102,241,.5)}
  .logo svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2}
  .nav h1{font-size:16px;font-weight:800;letter-spacing:1px}
  .nav .tag{font-size:10px;color:var(--mut);border:1px solid var(--bd);padding:3px 8px;border-radius:6px;font-family:monospace}
  .wrap{max-width:1100px;margin:0 auto;padding:28px}
  h2{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--mut);margin:34px 0 14px;font-weight:700}
  h2:first-child{margin-top:8px}
  .card{background:var(--surf);border:1px solid var(--bd);border-radius:14px;padding:20px;margin-bottom:18px}
  .card h3{font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px var(--acc)}
  .tablewrap{overflow-x:auto;border:1px solid var(--bd);border-radius:10px}
  table{width:100%;border-collapse:collapse;font:12.5px/1.5 'JetBrains Mono',monospace;min-width:480px}
  th,td{padding:7px 12px;text-align:left;border-bottom:1px solid var(--bd);white-space:nowrap}
  th{color:var(--mut);font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;position:sticky;top:0;background:var(--card)}
  td{color:var(--tx)} tr:hover td{background:rgba(99,102,241,.06)}
  .muted{color:var(--mut)} .small{font-size:11px} .muted.small{margin-top:8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:820px){.grid{grid-template-columns:1fr}}
  pre{background:#070b18;border:1px solid var(--bd);border-radius:10px;padding:16px;overflow-x:auto;
      font:12px/1.55 'JetBrains Mono',monospace;color:#c5cae9;margin-top:10px}
  details.file{background:var(--surf);border:1px solid var(--bd);border-radius:12px;margin-bottom:12px;overflow:hidden}
  details.file>summary{cursor:pointer;padding:14px 18px;font:13px/1 'JetBrains Mono',monospace;font-weight:600;
      list-style:none;display:flex;align-items:center;gap:8px}
  details.file>summary::-webkit-details-marker{display:none}
  details.file>summary:before{content:'▸';color:var(--acc);transition:.2s}
  details.file[open]>summary:before{transform:rotate(90deg)}
  details.file[open]>summary{border-bottom:1px solid var(--bd);background:rgba(99,102,241,.05)}
  details.file pre{margin:0;border:none;border-radius:0;max-height:520px}
  .pill{display:inline-block;background:rgba(16,185,129,.14);color:var(--em);font-size:10px;font-weight:700;
        padding:3px 9px;border-radius:100px;letter-spacing:.6px}
  .json{font:12px/1.55 'JetBrains Mono',monospace;color:#9fb3d1;white-space:pre;overflow-x:auto;
        background:#070b18;border:1px solid var(--bd);border-radius:10px;padding:16px}
</style></head><body>
<div class="nav">
  <div class="logo"><svg viewBox="0 0 24 24"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/><circle cx="12" cy="12" r="3"/></svg></div>
  <h1>CASCADE AI</h1><span class="tag">dataset &amp; code preview</span>
</div>
<div class="wrap">

  <h2>Dataset <span class="pill">N=100 · M=291 · seed 324</span></h2>

  <div class="card"><h3><span class="dot"></span>Summary (data/dataset_summary.json)</h3>
    <div class="json">${esc(summary)}</div></div>

  <div class="grid">
    <div class="card"><h3><span class="dot"></span>node_features.csv</h3>${csvTable('node_features.csv', 15)}</div>
    <div class="card"><h3><span class="dot"></span>node_labels.csv</h3>${csvTable('node_labels.csv', 15)}</div>
  </div>
  <div class="grid">
    <div class="card"><h3><span class="dot"></span>node_loads.csv</h3>${csvTable('node_loads.csv', 15)}</div>
    <div class="card"><h3><span class="dot"></span>edges.csv</h3>${csvTable('edges.csv', 15)}</div>
  </div>

  <div class="card"><h3><span class="dot"></span>Reported paper figures (data/paper_results.json)</h3>
    <div class="json">${esc(paperRes)}</div></div>

  <h2>Code</h2>
  ${codeSections}

</div></body></html>`;

fs.writeFileSync(path.join(root, 'preview.html'), html);
console.log('wrote preview.html (' + html.length + ' bytes)');
