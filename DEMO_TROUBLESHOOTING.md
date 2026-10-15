# GapGuard AI — Demo Troubleshooting & Evaluation Guide

This document provides operational startup instructions, verified credentials, workflow guidance, common non-blocking notices, and known system limitations for live evaluation of **GapGuard AI**.

---

## 1. Startup Commands

### Backend (FastAPI + SQLite)
From the project root directory:
```bash
# Windows PowerShell / CMD
.venv\Scripts\uvicorn.exe main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- **Base URL**: `http://127.0.0.1:8000`
- **Interactive API Documentation (Swagger)**: `http://127.0.0.1:8000/docs`
- **Database**: SQLite database stored at `backend/academic_integrity.db`

### Frontend (Vite + React)
From the project root directory in a second terminal:
```bash
# Windows PowerShell / CMD
npm run dev
```
- **Base URL**: `http://localhost:5173`
- **Primary Routes**:
  - Student Dashboard: `http://localhost:5173/dashboard` or `http://localhost:5173/`
  - Research Projects: `http://localhost:5173/research-projects`
  - Manuscript Workspace: `http://localhost:5173/manuscripts`
  - Literature Retrieval: `http://localhost:5173/literature`
  - Gap Analysis: `http://localhost:5173/gap-analysis`
  - Contribution Analysis: `http://localhost:5173/contribution-analysis`
  - Knowledge Graph: `http://localhost:5173/knowledge-graph`
  - Reasoning Workbench: `http://localhost:5173/reasoning`
  - Evidence Coverage: `http://localhost:5173/evidence-coverage`
  - Revision Comparison: `http://localhost:5173/revision-comparison`
  - Submission Readiness: `http://localhost:5173/submission-readiness`
  - Faculty Reviews: `http://localhost:5173/faculty/reviews`
  - Faculty Review History: `http://localhost:5173/faculty/review-history/proj-01`
  - Student Revision History: `http://localhost:5173/student/revision-history/proj-01`

---

## 2. Verified Test Credentials

| Role | Email | Password | Primary Workflow |
|---|---|---|---|
| **Student** | `student@example.com` | `password123` | Project formulation, manuscripts V1/V2, literature retrieval, gap & contribution analysis, graph search, reasoning, readiness checklist, revision comparison |
| **Faculty / Professor** | `professor@example.com` | `password123` | Faculty review dashboard, qualitative academic commentary, revision requests, review history timeline |

*Note: Demo accounts are automatically seeded into `backend/academic_integrity.db` upon database initialization.*

---

## 3. Recommended 17-Step Demo Sequence

The evaluation scenario follows the coherent agricultural vision demo project:
**"Robust Deep Feature Attribution in Agricultural Disease Detection" (`proj-01`)**

1. **Step 1 — Login**: Sign in as `student@example.com` / `password123`.
2. **Step 2 — Student Dashboard**: Observe project oversight metrics, recent submissions, and quick action cards.
3. **Step 3 — Open Research Project**: Select `proj-01` to view the 8 canonical fields (Problem, Objective, Research Question, Claimed Gap, Proposed Method, Dataset Context, Expected Contribution, Evaluation Metrics).
4. **Step 4 — Manuscript Workspace**: Inspect ordered versions: `manu-01` (V1 Initial Draft) and `manu-02` (V2 Revised Draft).
5. **Step 5 — Research Information Extraction**: Extract 13 structured academic sections from manuscript text using deterministic regex/NLP heuristics.
6. **Step 6 — Literature Retrieval**: Query the local corpus; observe topically aligned papers (`P001`, `P002`, `P004`, `P009`) with similarity scores and prominent corpus limitation notices.
7. **Step 7 — Gap Analysis**: Evaluate claimed gap against retrieved papers across 5 dimensions (*Problem Scope, Methodology, Dataset/Context, Findings, Limitations*). Notice qualified status without global novelty claims.
8. **Step 8 — Contribution Analysis**: Inspect 6-dimension differentiation matrix (*Clearly Differentiated*, *Partially Differentiated*, or *Potential Overlap*). Notice absence of numerical quality rankings.
9. **Step 9 — Knowledge Graph**: Explore concept topology (24 nodes, 26 edges). Execute BFS, DFS, and Best-First search. Best-First displays the explicit educational heuristic disclaimer.
10. **Step 10 — Reasoning Workbench**: Inspect Forward Chaining (derived inferential facts), Backward Chaining (hypothesis verification for `GAP_SUPPORTED_BY_EVIDENCE`), and Bayesian reasoning with posterior estimate and documented assumptions.
11. **Step 11 — Evidence Coverage**: Audit sentence-level claims against corpus literature; confirm "Insufficient Evidence" is presented non-punitively.
12. **Step 12 — Revision Comparison**: Compare V1 (`manu-01`) vs V2 (`manu-02`); view 8 modified fields detailing edge TPU quantization, InFieldCrop-50K dataset, and parameter count metrics.
13. **Step 13 — Submission Readiness**: Review the 9-item qualitative pre-submission checklist. Confirm absence of automated pass/fail grades or publication predictions.
14. **Step 14 — Faculty Review**: Sign in as `professor@example.com`, open `proj-01`, record qualitative recommendations, and submit "Request Revision".
15. **Step 15 — Faculty Review Dashboard**: Filter and search projects; verify `proj-01` displays status "Revision Requested".
16. **Step 16 — Faculty Review History**: Inspect chronological revision cycle timeline showing Cycle 1 (V1 $\rightarrow$ Revision Requested) and Cycle 2 (V2 $\rightarrow$ Revision Submitted / Re-analysis Available).
17. **Step 17 — Student Revision History**: Confirm the student view displays the complete research cycle with direct links to Revision Comparison and Submission Readiness.

---

## 4. Common Non-Blocking Notices & Warnings

Evaluators and developers may encounter the following non-blocking messages:

1. **Python 3.8 Cryptography Deprecation Notice**:
   ```
   CryptographyDeprecationWarning: Python 3.8 is no longer supported by the Python core team...
   ```
   *Explanation*: Standard warning from the PyJWT/cryptography library under Python 3.8 runtime. Does not affect authentication or system security during prototype evaluation.

2. **Corpus Limitation Advisory**:
   ```
   "Based only on literature currently available in the GapGuard corpus. Does not establish global scientific coverage."
   ```
   *Explanation*: Intended academic transparency guardrail required by system design to prevent evaluators or students from interpreting local corpus retrieval as exhaustive global discovery.

3. **Heuristic Search Disclaimer (Best-First Search)**:
   ```
   "Best-First Search path is guided by local lexical overlap heuristics for educational demonstration..."
   ```
   *Explanation*: Intended design requirement ensuring the user understands graph traversals illustrate explainable AI algorithms rather than definitive scientific citation paths.

4. **Model-Based Bayesian Posterior Label**:
   ```
   "Model-based posterior estimate under configured likelihood assumptions; not global empirical truth."
   ```
   *Explanation*: Clarifies that Bayesian probability values reflect prior-likelihood updates within the model's configured conditional table rather than empirical real-world certainty.

---

## 5. Known Prototype Scope & Limitations

The following architectural and data choices are intentional features of the offline, explainable prototype:

1. **Local Development Corpus**:
   - The literature corpus contains **36 curated, peer-reviewed style research papers** spanning Computer Vision & Agriculture AI, Cybersecurity & Differential Privacy, and Cross-Lingual NLP.
   - It is designed for self-contained, reproducible offline demonstration without external API keys (e.g., Semantic Scholar, arXiv, Crossref).

2. **Decision-Support vs. Scientific Truth**:
   - GapGuard AI provides structured, explainable decision support to students and advisors.
   - It does not judge whether research is scientifically valid, globally novel, or guaranteed acceptance by a peer-reviewed venue.

3. **Prototype Authentication & State**:
   - User authentication uses standard JWT tokens with password hashing.
   - Manuscript files are associated by metadata and version records; client mock file uploads do not alter the server repository.

4. **Best-First Search Heuristic**:
   - The greedy search heuristic uses lexical Dice coefficient and concept type weights to demonstrate heuristic graph traversal.

---

## 6. Automated Verification Commands

To run the automated verification scripts at any time:

```bash
# 1. Run all backend tests (303+ tests expected, 0 failures)
.venv\Scripts\pytest.exe backend/tests -v

# 2. Run comprehensive 17-step live audit (routes + workflows)
.venv\Scripts\python.exe audit_phase14.py

# 3. Build frontend bundle
npm run build
```
