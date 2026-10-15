# GapGuard AI — Live Demonstration Checklist

This checklist provides an end-to-end, deterministic manual evaluation walkthrough for examiners, instructors, and evaluators using ONE unified and scientifically coherent research demonstration scenario.

---

# Demo Research Scenario

- **Title**: Robust Deep Feature Attribution in Agricultural Disease Detection
- **Domain**: Computer Vision & Agriculture AI
- **Problem**: Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.
- **Claimed Gap**: Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination.
- **Proposed Method**: Cross-attention attribution pooling with contrastive token alignment on edge hardware.
- **Expected Contribution**: A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.
- **Dataset / Application Context**: PlantVillage and InFieldCrop-50K foliar disease benchmark datasets under variable field illumination.

---

## Pre-requisites & Local Environment
- **Backend Running**: `http://127.0.0.1:8000` (FastAPI + SQLite)
- **Frontend Running**: `http://localhost:5173` (Vite + React)
- **Test Credentials**:
  - Student: `student@example.com` / `password123` (or any registered student)
  - Faculty: `professor@example.com` / `password123` (or any registered professor)

---

## 17-Step Live Demonstration Walkthrough

### 1. Login
- **Action**: Navigate to `http://localhost:5173/login`. Select "Student" or enter `student@example.com` / `password123`, and click **Sign in**.
- **What Evaluator Should Observe**: Role-based authentication routes the user directly to the Student Research Dashboard, displaying research project oversight and workflow actions.

### 2. Open Project
- **Action**: From the Student Dashboard, select or click on project `proj-01` (*Robust Deep Feature Attribution in Agricultural Disease Detection*).
- **What Evaluator Should Observe**: The project details view displays the structured academic formulation: Title, Domain (*Computer Vision & Agriculture AI*), Research Problem, Claimed Gap, Proposed Method, Expected Contribution, and Target Evaluation Metrics.

### 3. Open Manuscript
- **Action**: Navigate to **Upload Manuscript** (`/student/upload`) or open the manuscript selector for `proj-01`.
- **What Evaluator Should Observe**: Two ordered manuscript versions are tracked:
  - Version 1 (`manu-01`): `feature_attribution_crop_disease_v1.pdf` (*Initial Draft*)
  - Version 2 (`manu-02`): `feature_attribution_crop_disease_v2_revised.docx` (*Revised Draft*)
  Manuscript metadata and file references are cleanly separated from raw files without overwriting version history.

### 4. Extract Research Information
- **Action**: On the Upload Manuscript page, click **Extract Research Information** for Manuscript V1.
- **What Evaluator Should Observe**: Deterministic NLP extraction parsing the 13 canonical academic sections: Title, Abstract, Keywords, Research Problem, Objective, Research Question, Claimed Gap, Proposed Method, Dataset Context, Contribution, Metrics, Claims, and References.

### 5. Retrieve Literature
- **Action**: Navigate to **Literature** (`/student/literature`) or click Retrieve Evidence.
- **What Evaluator Should Observe**: TF-IDF textual retrieval against the 36-paper development corpus returns topically aligned agricultural edge AI papers:
  - `P001`: *Lightweight Vision Transformers for Real-Time Plant Pathology on Edge Microcontrollers* (highest similarity)
  - `P002`: *Cross-Farm Domain Adaptation Under Acute Illumination Shifts*
  - `P004`: *Explainable Contrastive Attribution Maps for Transparent Agricultural Disease Diagnosis*
  - `P009`: *Dynamic Token Pruning in Vision Transformers for Foliar Lesion Quantification*
  The explicit corpus limitation notice is prominently displayed: *"Based only on literature currently available in the GapGuard corpus. Does not establish global scientific coverage."*

### 6. Run Gap Analysis
- **Action**: Navigate to **Gap Analysis** (`/student/gap-analysis`), select `proj-01`, and click **Analyze Research Gap**.
- **What Evaluator Should Observe**: The rule-based gap contradiction analyzer evaluates the claimed gap against retrieved papers across 5 dimensions (*Problem Scope, Methodology, Dataset/Context, Findings, Limitations*). Evaluator observes a qualified status (*Supported by Available Evidence*, *Partially Supported*, or *Insufficient Evidence*) with explainable textual evidence excerpts and zero global novelty claims.

### 7. Run Contribution Analysis
- **Action**: Navigate to **Contribution Analysis** (`/student/contribution-analysis`), select `proj-01`, and run analysis.
- **What Evaluator Should Observe**: The 6-dimension differentiation matrix (*Problem Scope, Proposed Method, Dataset/Context, Key Findings, Limitations Addressed, Primary Contribution*) classifies each paper into *Clearly Differentiated*, *Partially Differentiated*, or *Potential Overlap*. No prohibited numerical scores or "originality percentages" appear.

### 8. Open Knowledge Graph
- **Action**: Navigate to **Knowledge Graph** (`/student/knowledge-graph`) and select `proj-01`.
- **What Evaluator Should Observe**: An interactive concept topology rendering 18+ typed nodes (*Project, Problem, Objective, Question, Claimed Gap, Method, Dataset Context, Contribution, Claims, Literature Paper, Finding, Limitation*) and 18+ semantic edges (*ADDRESSES, EMPLOYS, EVALUATES_ON, CONNECTS_TO*).

### 9. Demonstrate BFS, DFS, and Best-First Search
- **Action**: On the Knowledge Graph page, select start node *Research Project* and goal node *Corpus Limitation (P004)*, then execute:
  1. **Breadth-First Search (BFS)** — level-by-level queue traversal finding the shortest concept hop (path length 3).
  2. **Depth-First Search (DFS)** — deep backtracking traversal across conceptual references (path length 4).
  3. **Greedy Best-First Search** — heuristic-guided search using cosine semantic proximity.
- **What Evaluator Should Observe**: Step-by-step traversal animations, complete node exploration sequences, discovered path highlights, and the educational heuristic notice explaining that Best-First Search is an educational demonstration heuristic, not a guarantee of scientific relevance.

### 10. Open Reasoning Workbench
- **Action**: Navigate to **Reasoning Workbench** (`/student/reasoning`) for `proj-01`.
- **What Evaluator Should Observe**:
  - **Forward Chaining**: Production rules deriving inferential facts from initial project facts with full premise traces.
  - **Backward Chaining**: Goal-directed proof verifying whether hypothesis `GAP_SUPPORTED_BY_EVIDENCE` is satisfied.
  - **Bayesian Reasoning**: Calculation of posterior estimate $P(\text{Gap Supported} \mid \text{Evidence})$, prominently labeled: *"Model-based posterior estimate under configured assumptions; not global empirical truth."*

### 11. Open Evidence Coverage
- **Action**: Navigate to **Evidence Coverage** (`/student/evidence-coverage`) and select `proj-01`.
- **What Evaluator Should Observe**: Individual author claims (e.g. attribution interpretability, 45% parameter reduction via quantization, hierarchical subsampling illumination robustness) are audited sentence-by-sentence against corpus evidence and categorized into *Supported by Available Evidence*, *Partially Supported*, or *Insufficient Evidence*.

### 12. Compare V1 / V2
- **Action**: Navigate to **Revision Comparison** (`/student/revision-comparison`). Select Base Manuscript `manu-01` (V1) and Compared Manuscript `manu-02` (V2).
- **What Evaluator Should Observe**: A 13-field semantic diff highlighting exact revisions between drafts:
  - Title updated to include *(Revised)*
  - Proposed Method updated to incorporate 8-bit integer post-training quantization on edge TPU hardware
  - Dataset Context expanded to include InFieldCrop-50K outdoor illumination benchmark
  - Expected Contribution refined to quantify 45% model parameter reduction
  - Evaluation Metrics added `parameter_count`
  - Quantified major claims and added MobileNet literature reference (`Howard et al., 2019`).

### 13. Open Submission Readiness
- **Action**: Navigate to **Submission Readiness** (`/student/submission-readiness`) for `proj-01`.
- **What Evaluator Should Observe**: An integrated, non-scoring qualitative readiness report aggregating Gap Analysis, Contribution Differentiation, Evidence Coverage, Claims Audit, Revision Tracking, and Faculty Feedback into a 9-item checklist. Zero acceptance probabilities or pass/fail grades are displayed.

### 14. Open Faculty Review
- **Action**: Log out and log in as Professor (`professor@example.com` / `password123`). Navigate to **Faculty Review Dashboard** (`/faculty/reviews`) and click **Review Project** on `proj-01`.
- **What Evaluator Should Observe**: The faculty review form allows qualitative commenting across 6 academic dimensions (*Research Problem, Research Gap, Proposed Method, Expected Contribution, Literature Coverage, Author Claims*) alongside student analysis context.

### 15. Request Revision
- **Action**: On the Faculty Review page for `proj-01`, enter qualitative recommendations (e.g. *"Evaluate on outdoor InFieldCrop-50K benchmark and report Edge TPU latency / parameter count"*) and click **Request Revision**.
- **What Evaluator Should Observe**: Status successfully transitions to **Revision Requested** with an advisory guardrail note that faculty feedback is human-advisory and non-punitive.

### 16. Open Review History
- **Action**: From the Faculty Dashboard or Student view, navigate to **Review History** (`/faculty/review-history/proj-01` or `/student/revision-history/proj-01`).
- **What Evaluator Should Observe**: A chronological revision cycle timeline showing:
  - **Cycle 1**: Manuscript V1 Initial Draft $\rightarrow$ Faculty Review Started $\rightarrow$ Revision Requested.
  - **Cycle 2**: Manuscript V2 Revised Draft $\rightarrow$ Revision Submitted $\rightarrow$ Re-analysis Available.

### 17. Compare Revisions from History
- **Action**: In the Review History timeline on Cycle 2, click **Compare Versions (V1 vs V2)**.
- **What Evaluator Should Observe**: Direct navigation to the Revision Comparison view with V1 and V2 preselected, proving complete end-to-end coherence across the research review and revision lifecycle.
