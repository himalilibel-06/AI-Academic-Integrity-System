# GapGuard AI — Research Gap & Integrity Review System

GapGuard AI is an explainable decision-support and academic integrity workbench. It assists student researchers and faculty reviewers in validating claimed research gaps against indexed literature, differentiating novel contributions across multidimensional matrices, auditing evidence coverage, and managing multi-version revision histories.

---

## 1. Problem Statement
Academic manuscript preparation and early research formulation face significant challenges:
- **Opaque Literature Gaps**: Claimed research gaps often duplicate existing literature limitations without verifiable evidence.
- **Undifferentiated Contributions**: Authors struggle to delineate how their proposed method or dataset uniquely advances prior art.
- **Evidence Gap**: Author claims frequently lack grounding in accessible peer-reviewed findings.
- **Disconnected Revision Tracking**: Editorial feedback, revision cycles, and manuscript diffs are maintained in siloed documents without auditable provenance.

---

## 2. Proposed Solution
GapGuard AI provides an explainable AI pipeline that structures research information, searches a local literature corpus, executes deterministic rule-based and Bayesian evidence reasoning, and provides an end-to-end faculty review workflow.

---

## 3. Main Users & Personas
- **Student Researchers**: Formulate research proposals, upload manuscript drafts, extract structured research fields, run gap contradiction analysis, audit claim evidence, compare drafts, and track revision history.
- **Faculty Reviewers & Mentors**: Review student studies, inspect contribution differentiation matrices, provide qualitative feedback across 6 core academic dimensions, request manuscript revisions, and evaluate longitudinal revision progress.

---

## 4. Core End-to-End Workflow
```
Research Project
  ↓
Manuscript Upload & Versioning
  ↓
Research Information Extraction (13 Canonical Sections)
  ↓
Literature Retrieval (BM25 / TF-IDF Ranking)
  ↓
Gap Contradiction Analysis (Rule-Based)
  ↓
Contribution Differentiation (6-Dimension Overlap Matrix)
  ↓
Research Knowledge Graph Construction
  ↓
Search Algorithms (BFS, DFS, Greedy Best-First Search)
  ↓
Rule-Based Forward/Backward Chaining & Bayesian Evidence Reasoning
  ↓
Evidence Coverage Audit
  ↓
13-Field Revision Comparison
  ↓
Submission Readiness Report
  ↓
Faculty Qualitative Review & Feedback
  ↓
Faculty Review Dashboard & Review History Timeline
  ↓
Revision Cycle Tracking (V1 → V2 Progression)
```

---

## 5. AI & Computer Science Techniques Used

### A. Knowledge Representation
- **Ontology & Concept Graphs**: Bipartite graph representation mapping internal project nodes (`Project`, `Problem`, `Claimed Gap`, `Method`, `Contribution`) to literature corpus nodes (`Paper`, `Finding`, `Limitation`).
- **13-Field Structured Schemas**: Deterministic representation of academic discourse markers.

### B. Graph Search Algorithms
- **Breadth-First Search (BFS)**: Level-by-level queue traversal finding minimum-hop relationship paths between research gaps and literature limitations.
- **Depth-First Search (DFS)**: Exhaustive backtracking traversal discovering deep conceptual citation lineages.
- **Greedy Best-First Search**: Heuristic search prioritized by cosine semantic proximity to goal concepts.

### C. Rule-Based Reasoning
- **Forward Chaining**: Production rules firing from extracted manuscript facts to derive new intermediate conclusions with explicit derivation traces.
- **Backward Chaining**: Goal-directed reasoning establishing whether hypotheses like `GAP_SUPPORTED_BY_EVIDENCE` can be derived from existing facts.

### D. Bayesian Evidence Reasoning
- Computes model-based posterior evidence estimates $P(H|E)$ using Bayes' theorem:
  $$P(H|E) = \frac{P(E|H) \cdot P(H)}{P(E|H) \cdot P(H) + P(E|\neg H) \cdot P(\neg H)}$$
- Provides transparent sensitivity adjustments across configurable prior and likelihood ratios.

---

## 6. Literature Corpus
- Uses an indexed development corpus (`development_sample_corpus`) of peer-reviewed papers spanning machine learning, computer vision, natural language processing, and medical AI.
- Grounded textual retrieval matches abstracts, methods, findings, and limitation statements.

---

## 7. Faculty Review & Revision Tracking
- **Qualitative Guidance**: Feedback forms across 6 academic dimensions without arbitrary numerical grading.
- **Workflow Statuses**: `Not Reviewed`, `In Review`, `Feedback Provided`, `Revision Requested`, and `Reviewed`.
- **Chronological Revision Cycles**: Tracks draft iterations (e.g. V1 $\rightarrow$ V2) and links directly to semantic revision comparisons and submission readiness.

---

## 8. Technology Stack
- **Backend**: FastAPI (Python 3.8+), SQLite3 with foreign keys, Pydantic, scikit-learn, PyPDF2, python-docx.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide-inspired SVG iconography.
- **Testing**: Pytest, FastAPI TestClient.

---

## 9. Current Limitations & Academic Guardrails
- **Corpus Boundary**: Grounded only in the local GapGuard corpus. It does **not** perform global web searches or establish universal scientific truth.
- **No Automated Acceptance Decisions**: Does **not** predict publication acceptance, calculate numerical novelty scores, or generate automated approvals/rejections.
- **Human Review Primacy**: All outputs serve as advisory decision-support tools for human researchers and faculty.

---

## 10. How to Run Locally

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Activate Python virtual environment (Windows)
..\.venv\Scripts\activate

# Install dependencies (if needed)
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
Backend API will be live at `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`).

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Start Vite development server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 11. How to Run Tests

### Backend Test Suite (303 Tests)
```bash
# From repository root
.venv\Scripts\pytest.exe backend/tests -v
```

### Frontend Production Build
```bash
cd frontend
npm run build
```