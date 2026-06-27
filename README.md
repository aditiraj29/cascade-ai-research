# CASCADE AI — Dashboard
https://cascade-ai-research.vercel.app/

Interactive dashboard for the paper **"AI-Based Cascade Failure Risk Prediction
in Complex Networked Systems Using Machine Learning"** (Aditi Raj).

A single self-contained `index.html` (no build step, no dependencies to install —
it loads Plotly and Google Fonts from a CDN at runtime). It presents:

- a live **Barabási–Albert / Erdős–Rényi** network generator (N=100, m=3, α=0.20)
  with a real **load-capacity cascade** simulation (Algorithm 1 of the paper);
- the **model comparison** (GAT 90.0% > GCN 85.0% > RF 80.0% > MLP 75% >
  centrality 65–70%), per-class ROC-AUC (macro 0.917), confusion matrix (18/20),
  ablation, and node-protection results — all matching the paper.

The companion **dataset + reproducible code** live in a separate repository
(`cascade-ai-research`).

---

## Deploy to Vercel

**Option A — drag & drop (no Git):**
1. Go to <https://vercel.com/new> and sign in.
2. Drag this whole `cascade-ai-site` folder onto the page (or use "Deploy" →
   upload). Vercel serves `index.html` automatically.
3. Done — you get a `*.vercel.app` URL.

**Option B — from GitHub:**
1. Push this folder to a GitHub repo (see commands below).
2. In Vercel: **New Project → Import** that repo → **Deploy**.
   No framework preset is needed; it's a static site.

**Option C — Vercel CLI:**
```bash
npm i -g vercel
cd cascade-ai-site
vercel --prod
```

## Push this folder to GitHub (optional)

```bash
cd cascade-ai-site
git init
git add .
git commit -m "CASCADE AI dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/cascade-ai-site.git
git push -u origin main
```

## Local preview

Just open `index.html` in a browser, or serve the folder:
```bash
npx serve .
```
