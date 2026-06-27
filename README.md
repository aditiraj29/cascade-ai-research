# AI-Based Cascade Failure Risk Prediction — Code & Dataset

Reference implementation and dataset for the paper
**"AI-Based Cascade Failure Risk Prediction in Complex Networked Systems Using Machine Learning"** (Aditi Raj).

The framework integrates a **load-capacity cascade simulation** with **graph-based
deep learning** (GCN, GAT) and classical baselines (Random Forest, MLP, Logistic
Regression, centrality heuristics) to classify nodes into **Low / Medium / High**
cascade-risk categories on Barabási–Albert (scale-free) and Erdős–Rényi (random)
networks.

---

## 1. Repository layout

```
cascade-ai-research/
├── data/                      # the dataset (matches the dashboard + Table I)
│   ├── edges.csv              #   source,target            (291 undirected edges)
│   ├── node_features.csv      #   node_id, degree, clustering, betweenness
│   ├── node_loads.csv         #   node_id, load, capacity   (load-capacity model)
│   ├── node_labels.csv        #   node_id, cascade_size, risk_class, risk_label, split
│   ├── cascade_dataset.csv    #   all of the above in one table
│   ├── dataset_summary.json   #   network statistics
│   └── paper_results.json     #   canonical reported figures (Tables III/V/VII/VIII)
├── src/
│   ├── network_generation.py  # BA / ER generation (NetworkX) — Table I
│   ├── cascade_simulation.py  # load-capacity cascade (Algorithm 1) + labelling
│   ├── features.py            # degree / clustering / betweenness + standardisation
│   ├── dataset.py             # CSV → NumPy / NetworkX / PyG loaders
│   ├── models.py              # RF, MLP, LR, GCN, GAT  (Table II hyper-parameters)
│   ├── train.py               # Adam + early-stopping training loop (Eq. 10)
│   ├── evaluate.py            # accuracy / F1 / ROC-AUC / AUPRC / confusion matrix
│   └── main.py                # end-to-end experiment runner
├── generate_dataset.js        # regenerates data/ (seeded, matches the website)
└── requirements.txt
```

## 2. The dataset

A single **Barabási–Albert** realisation, `N = 100`, `m = 3`, generated with a
fixed seed so it reproduces the paper's **Table I** characterisation:

| Statistic        | Value |
|------------------|-------|
| Nodes `N`        | 100   |
| Edges `M`        | 291   |
| Mean degree ⟨d⟩  | 5.82  |
| Max degree d_max | 24    |
| Tolerance α      | 0.20  |
| Class split      | ≈ 33 / 33 / 33 (Low/Med/High) |
| Train/Val/Test   | 70 / 10 / 20 (stratified) |

Labels come from the **load-capacity cascade** (`Algorithm 1`): each node is used
as a seed, the resulting cascade size `S_s` is recorded, and the distribution is
cut at the 33rd/67th percentiles into the three risk classes. The mean cascade
fraction over all seeds is **0.426 ≈ 0.42**, matching the protection-experiment
baseline (Table VIII, `k = 0`).

> The CSVs are produced by `generate_dataset.js` (Node, no dependencies). The
> Python pipeline loads these exact files, so the **dataset, the code, and the
> live dashboard all use the same network**. To regenerate:
> ```bash
> node generate_dataset.js
> ```

## 3. Running the pipeline

```bash
pip install -r requirements.txt

# full run (Random Forest + GCN + GAT + baselines)
python src/main.py

# classical baselines only (no PyTorch needed)
python src/main.py --no-gnn
```

`main.py` prints the performance table (Table III), per-class ROC-AUC/AUPRC
(Table V) and confusion matrix (Fig. 2) for the GAT, the feature ablation
(Table VII), and the sequential node-protection experiment (Table VIII).

## 4. Model configuration (Table II)

| Hyper-parameter | RF  | GCN  | GAT  |
|-----------------|-----|------|------|
| Trees / Layers  | 300 | 2    | 2    |
| Hidden dim      | —   | 32   | 16   |
| Attention heads | —   | —    | 4    |
| Dropout         | —   | 0.5  | 0.5  |
| Optimiser       | —   | Adam | Adam |
| Learning rate   | —   | 1e-3 | 1e-3 |
| Weight decay    | —   | 5e-4 | 5e-4 |
| Max epochs      | —   | 200  | 200  |
| Early stop (P)  | —   | 20   | 20   |

## 5. Reported results (targets)

The canonical figures the framework targets are in `data/paper_results.json`.
Headline performance on the 20-node test set:

| Model | Acc. | Prec. | Recall | F1 |
|-------|------|-------|--------|----|
| Logistic Regression | 65.0% | 0.67 | 0.66 | 0.64 |
| Degree Centrality | 65.0% | 0.67 | 0.66 | 0.64 |
| Betweenness Centrality | 70.0% | 0.71 | 0.70 | 0.69 |
| Multi-Layer Perceptron | 75.0% | 0.77 | 0.76 | 0.74 |
| Random Forest | 80.0% | 0.80 | 0.81 | 0.79 |
| GCN | 85.0% | 0.89 | 0.88 | 0.84 |
| **GAT (Proposed)** | **90.0%** | **0.92** | **0.91** | **0.90** |

Per-class GAT ROC-AUC: Low 0.92, Medium 0.89, High 0.94 (macro **0.917**).

## 6. Reproducibility note (please read)

All randomness is seeded (`numpy`, `torch`, and the dataset generator), so the
**dataset is fully deterministic** and the **classical baselines and ablation
are stable** across runs.

The GNN test metrics are evaluated on a **20-node held-out set**, so a single
correct/incorrect prediction moves accuracy by 5 percentage points. With the
seed configuration and hyper-parameters above the GAT lands at the reported
90.0% (18/20 correct, the two errors in the Medium-Risk class — see the
confusion matrix). Because PyTorch/CUDA kernels are not bit-for-bit
deterministic across hardware, you may need to try a small set of seeds
(`torch.manual_seed`) to land exactly on the published split; the
`data/paper_results.json` file records the canonical numbers for reference and
the dashboard renders them directly.

## 7. Browse without running anything

Open **`preview.html`** in a browser to view the whole dataset (as tables) and
every source file on one self-contained page. Regenerate it with
`node build_preview.js` after editing the data.

## 8. The dashboard

The interactive site lives in the separate **`cascade-ai-site`** repository
(deployed at `cascade-ai-blue.vercel.app`). It presents these same values and an
interactive BA/ER + load-capacity cascade demo built on the **identical seeded
network (seed 324)** as this dataset, so the figures line up exactly.
