# GapGuard AI — Live Demonstration Checklist

This checklist provides an end-to-end, deterministic manual evaluation walkthrough for examiners, instructors, and evaluators.

---

## Pre-requisites & Local Environment
- **Backend Running**: `http://127.0.0.1:8000` (FastAPI + SQLite)
- **Frontend Running**: `http://localhost:5173` (Vite + React)
- **Test Credentials**:
  - Student: `student@example.com` / `password123` (or any registered student)
  - Faculty: `professor@example.com` / `password123` (or any registered professor)

---

## 1. Authentication & Role Switcher
- **Action**: Navigate to `http://localhost:5173/login`. Select "Student" or "Professor", enter credentials, and click **Sign in**.
- **What to Demonstrate**: Role-based access control protecting researcher vs. faculty dashboards, preserving data privacy and clear workflow boundaries.

---

## 2. Research Project Management
- **Action**: From Student Dashboard, click **Create Research Project** or scroll to the Projects section (`proj-01`).
- **What to Demonstrate**: Formulating a structured academic study (`title`, `domain`, `research_problem`, `claimed_research_gap`, `proposed_method`, `expected_contribution`).
- **Limitation to Note**: Research projects are structured problem formulations; creating a project does not mean the research hypothesis is proven.

---

## 3. Manuscript Upload & Versioning
- **Action**: Navigate to **Upload Manuscript** (`/student/upload`). Select active project `proj-01` and upload a `.pdf`, `.docx`, or `.txt` manuscript (e.g. `contrastive_medical_diagnostics_v1.pdf`).
- **What to Demonstrate**: Multi-version tracking (`Version 1 — Initial Draft`, `Version 2 — Revised Draft`) where manuscript metadata and file references are separated from raw binary content without overwriting past versions.

---

## 4. Research Information Extraction
- **Action**: On the Upload Manuscript page, click **Extract Research Information**.
- **What to Demonstrate**: Deterministic NLP extraction of the 13 canonical academic sections (`title`, `abstract`, `keywords`, `problem`, `objective`, `question`, `claimed_gap`, `method`, `dataset_context`, `contribution`, `metrics`, `claims`, `references`).
- **Limitation to Note**: Pure extraction parses author statements without validating empirical truth.

---

## 5. Literature Corpus & Retrieval
- **Action**: Navigate to **Literature** (`/student/literature`). Search query `contrastive attention` or click **Top Results**.
- **What to Demonstrate**: BM25 / TF-IDF textual retrieval against the indexed local literature corpus (`development_sample_corpus`). Papers are ranked by relevance scores with matched excerpts.
- **Limitation to Note**: "Based only on literature currently available in the GapGuard corpus. Does not establish global scientific coverage."

---

## 6. Gap Contradiction Analysis
- **Action**: Navigate to **Gap Analysis** (`/student/gap-analysis`). Select study `proj-01` and click **Analyze Research Gap**.
- **What to Demonstrate**: Rule-based reasoning classifying gap relationship into *Supported by Available Evidence*, *Partially Supported*, *Potentially Contradicted*, or *Insufficient Evidence*.
- **Limitation to Note**: Contradiction indicates retrieved literature addresses similar limitations; it is decision support for human academic review.

---

## 7. Contribution Differentiation
- **Action**: Navigate to **Contribution Analysis** (`/student/contribution-analysis`). Select `proj-01` and run evaluation.
- **What to Demonstrate**: 6-dimension differentiation matrix (*problem*, *method*, *dataset*, *findings*, *limitations*, *contribution*). Classifies each paper into *Clearly Differentiated*, *Partially Differentiated*, or *Potential Overlap*.
- **Limitation to Note**: Overlap flags areas requiring explicit literature discussion; does not imply plagiarism.

---

## 8. Knowledge Graph Construction
- **Action**: Navigate to **Knowledge Graph** (`/student/knowledge-graph`). Select `proj-01` and view graph topology.
- **What to Demonstrate**: Structured concept network connecting research nodes (`Project`, `Problem`, `Claimed Gap`, `Method`, `Contribution`) to corpus nodes (`Paper`, `Finding`, `Limitation`).

---

## 9. AI Search Algorithms (BFS, DFS, Best-First Search)
- **Action**: On Knowledge Graph, select preset *Claimed Gap → Limitation* and execute:
  1. **Breadth-First Search (BFS)** — level-by-level queue traversal finding shortest concept hop.
  2. **Depth-First Search (DFS)** — deep backtracking traversal across conceptual references.
  3. **Greedy Best-First Search** — heuristic-guided search using cosine semantic proximity.
- **What to Demonstrate**: Complete step-by-step traversal order, explored nodes, and path discovery.

---

## 10. Rule-Based & Bayesian Evidence Reasoning
- **Action**: Navigate to **Reasoning Workbench** (`/student/reasoning`). Run reasoning over `proj-01`.
- **What to Demonstrate**:
  - **Forward Chaining**: Production rules deriving new facts from initial project facts.
  - **Backward Chaining**: Goal-directed proof of hypothesis `GAP_SUPPORTED_BY_EVIDENCE`.
  - **Bayesian Inference**: Calculating posterior probability $P(H|E)$ from configurable prior and likelihood ratios.
- **Limitation to Note**: Model-based posterior estimate under configured assumptions; not global empirical truth.

---

## 11. Claim Evidence Coverage Audit
- **Action**: Navigate to **Evidence Coverage** (`/student/evidence-coverage`). Select `proj-01`.
- **What to Demonstrate**: Claim-by-claim audit categorizing author assertions into *Supported*, *Partially Supported*, or *Insufficient Evidence* against retrieved literature sentences.

---

## 12. Manuscript Revision Comparison
- **Action**: Navigate to **Revision Comparison** (`/student/revision-comparison`). Select Base `manu-01` (V1) and Compare `manu-02` (V2).
- **What to Demonstrate**: 13-field semantic diff engine highlighting added, modified, unchanged, or removed claims, datasets, and methodology tweaks between revision drafts.

---

## 13. Submission Readiness Report
- **Action**: Navigate to **Submission Readiness** (`/student/submission-readiness`).
- **What to Demonstrate**: Comprehensive non-scoring readiness checklist synthesizing Gap Analysis, Contribution Differentiation, Evidence Coverage, and Revision history into an actionable pre-submission dashboard.
- **Limitation to Note**: Strictly non-scoring; generates no acceptance percentage or publication prediction.

---

## 14. Faculty Review & Academic Feedback
- **Action**: Log in as Professor, navigate to **Faculty Review Dashboard** (`/faculty/reviews`), and open `proj-01` (`/faculty/review/proj-01`).
- **What to Demonstrate**: Faculty qualitative feedback form across 6 academic dimensions, Request Revision action, and qualitative academic recommendations.

---

## 15. Faculty Review Dashboard
- **Action**: Navigate to `/faculty/reviews`.
- **What to Demonstrate**: Multi-project oversight listing student research studies with review statuses (*In Review*, *Revision Requested*, *Reviewed*) and reviewer assignments.

---

## 16. Faculty Review History
- **Action**: Click **Review History** on any project in Faculty Review Dashboard (`/faculty/review-history/proj-01`).
- **What to Demonstrate**: Chronological revision history timeline displaying review cycles, reviewer feedback, date stamps, and contextual actions.

---

## 17. Revision Cycle Tracking & Student View
- **Action**: In History view, click **Compare Versions** to navigate directly into Revision Comparison for V1 $\rightarrow$ V2. Log in as student and verify student view (`/student/revision-history/proj-01`).
- **What to Demonstrate**: End-to-end loop closed: Student Draft V1 $\rightarrow$ Faculty Feedback $\rightarrow$ Revision Requested $\rightarrow$ Manuscript V2 Upload $\rightarrow$ Revision Comparison $\rightarrow$ Faculty Re-review.
