# GapGuard AI — Requirements Traceability Matrix

This matrix maps every academic requirement to its backend implementation, REST API endpoints, user-facing frontend page, and automated unit/integration test coverage.

---

| # | Requirement | Implementation Module | REST API Endpoints | Frontend View / Component | Automated Test Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Research Project Management** | `backend/database/database.py` | Seeded SQLite `research_projects` | `CreateResearchProject.jsx`, `StudentDashboard.jsx` | `test_database.py`, `test_system_integration.py` |
| **2** | **Manuscript Upload & Versioning** | `manuscriptStorage.js`, `database.py` | `POST /api/faculty-review/manuscripts/register`, `GET /api/faculty-review/manuscripts/{id}` | `UploadSubmission.jsx`, `MySubmissions.jsx` | `test_faculty_review_history.py`, `test_system_integration.py` |
| **3** | **Text & Research Info Extraction** | `manuscript_extractor.py`, `research_extractor.py` | `POST /api/manuscripts/extract-text`, `POST /api/manuscripts/extract-research-info` | `UploadSubmission.jsx` | `test_manuscript_extraction.py`, `test_research_extraction.py` |
| **4** | **Literature Corpus & Retrieval** | `literature_corpus.py` | `GET /api/literature`, `POST /api/literature/search`, `GET /api/literature/{id}` | `LiteratureCorpus.jsx` | `test_literature_retrieval.py`, `test_system_integration.py` |
| **5** | **Gap Contradiction Analysis** | `gap_analyzer.py` | `POST /api/gap-analysis/analyze` | `GapAnalysis.jsx` | `test_gap_analysis.py`, `test_system_integration.py` |
| **6** | **Contribution Differentiation (6D)** | `contribution_differentiator.py` | `POST /api/contribution-analysis/analyze` | `ContributionAnalysis.jsx` | `test_contribution_analysis.py`, `test_system_integration.py` |
| **7** | **Research Knowledge Graph** | `knowledge_graph.py` | `GET /api/knowledge-graph/{id}`, `POST /api/knowledge-graph/build` | `KnowledgeGraph.jsx` | `test_knowledge_graph.py`, `test_graph_search.py` |
| **8** | **Breadth-First Search (BFS)** | `graph_search.py` | `POST /api/knowledge-graph/search` (`algorithm=bfs`) | `KnowledgeGraph.jsx` | `test_graph_search.py` |
| **9** | **Depth-First Search (DFS)** | `graph_search.py` | `POST /api/knowledge-graph/search` (`algorithm=dfs`) | `KnowledgeGraph.jsx` | `test_graph_search.py` |
| **10** | **Greedy Best-First Search** | `graph_search.py` | `POST /api/knowledge-graph/search` (`algorithm=best_first`) | `KnowledgeGraph.jsx` | `test_graph_search.py` |
| **11** | **Rule-Based Reasoning (Fwd/Bwd)** | `rule_engine.py` | `POST /api/reasoning/analyze` | `ReasoningWorkbench.jsx` | `test_rule_engine.py`, `test_reasoning_api.py` |
| **12** | **Bayesian Evidence Reasoning** | `bayesian_reasoner.py` | `POST /api/reasoning/analyze` | `ReasoningWorkbench.jsx` | `test_bayesian_reasoner.py`, `test_reasoning_api.py` |
| **13** | **Claim Evidence Coverage Audit** | `evidence_coverage.py` | `POST /api/evidence-coverage/analyze` | `EvidenceCoverage.jsx` | `test_evidence_coverage.py`, `test_system_integration.py` |
| **14** | **13-Field Revision Comparison** | `revision_comparator.py` | `POST /api/revision-comparison/compare` | `RevisionComparison.jsx` | `test_revision_comparison.py`, `test_system_integration.py` |
| **15** | **Submission Readiness Dashboard** | `submission_readiness.py` | `POST /api/submission-readiness/analyze` | `SubmissionReadiness.jsx` | `test_submission_readiness.py`, `test_system_integration.py` |
| **16** | **Faculty Review & Feedback** | `faculty_review.py` | `POST /api/faculty-review/create`, `GET /api/faculty-review/{id}`, `PUT /api/faculty-review/{id}` | `FacultyReview.jsx`, `FacultyFeedback.jsx` | `test_faculty_review.py`, `test_system_integration.py` |
| **17** | **Faculty Review Dashboard** | `faculty_review.py` | `GET /api/faculty-review/projects` | `FacultyReviewDashboard.jsx` | `test_faculty_review_dashboard.py`, `test_system_integration.py` |
| **18** | **Faculty Review History** | `faculty_review.py` | `GET /api/faculty-review/history/{id}` | `FacultyReviewHistory.jsx` | `test_faculty_review_history.py`, `test_system_integration.py` |
| **19** | **Revision Cycle Tracking** | `faculty_review.py` | `POST /api/faculty-review/history/create-cycle` | `FacultyReviewHistory.jsx` | `test_faculty_review_history.py`, `test_system_integration.py` |
| **20** | **Academic Ethical Guardrails** | Integrated across all services | All API endpoints | All active UI views | `test_academic_guardrails.py`, `test_system_integration.py` |

---

## Verification Summary
- **Total Backend Tests**: 303 passed (100% pass rate)
- **Frontend Production Build**: Clean build, 0 errors, 54 modules transformed
- **Academic Guardrails Verified**: Zero forbidden claims (*novelty confirmed*, *research approved*, *publication guaranteed*); mandatory corpus scope disclaimers enforced across all reasoning interfaces.
