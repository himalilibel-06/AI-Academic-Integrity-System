"""
GapGuard AI — Final System Integration & Demo Readiness Smoke Suite (Phase 12)

Verifies high-level end-to-end coherence across all core workflow stages:
A. Research project exists.
B. Manuscript can be associated with project.
C. Research information extraction remains available.
D. Literature retrieval remains available.
E. Gap analysis remains available.
F. Contribution analysis remains available.
G. Submission readiness remains available.
H. Faculty review remains available.
I. Faculty review dashboard remains available.
J. Faculty review history remains available.
K. Revision comparison remains available.
L. Academic guardrails remain present.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from database.database import get_connection

client = TestClient(app)


class TestSystemIntegrationSmokeSuite:
    """End-to-End smoke tests verifying complete GapGuard AI workflow integration."""

    def test_a_research_project_exists(self):
        """A. Research project exists in the system database."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, domain FROM research_projects WHERE id = 'proj-01'")
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Seed project proj-01 must exist in the database."
        assert "Agricultural Disease Detection" in row["title"]
        assert row["domain"] == "Computer Vision & Agriculture AI"

    def test_b_manuscript_can_be_associated_with_project(self):
        """B. Manuscript can be registered and associated with a project."""
        payload = {
            "manuscript_id": "manu-smoke-test-1",
            "project_id": "proj-01",
            "title": "Smoke Test Manuscript V1",
            "version_number": 1,
            "version_label": "Version 1 — Smoke Test",
            "file_name": "smoke_test_v1.pdf",
            "file_type": "PDF",
        }
        res = client.post("/api/faculty-review/manuscripts/register", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["manuscript"]["id"] == "manu-smoke-test-1"

        # Verify retrieval for the project
        get_res = client.get("/api/faculty-review/manuscripts/proj-01")
        assert get_res.status_code == 200
        manuscripts = get_res.json()["manuscripts"]
        ids = [m["id"] for m in manuscripts]
        assert "manu-smoke-test-1" in ids

    def test_c_research_information_extraction_remains_available(self):
        """C. Research information extraction parses manuscript text into structured fields."""
        text = (
            "Title: Federated Graph Attention Networks for Clinical Predictions\n\n"
            "Abstract: We propose a graph attention mechanism for patient diagnosis.\n\n"
            "Problem: Multi-site hospital patient records suffer from non-IID graph topology.\n\n"
            "Research Gap: Existing federated learning models fail under heterogeneous clinical graphs.\n\n"
            "Proposed Method: A federated graph transformer with differential edge privacy.\n\n"
            "Expected Contribution: An empirical study demonstrating 18% improvement on benchmark graphs."
        )
        res = client.post(
            "/api/manuscripts/extract-research-info",
            json={"text": text, "file_name": "test_manuscript.txt"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "claimed_research_gap" in data
        assert data["claimed_research_gap"]["text"] is not None

    def test_d_literature_retrieval_remains_available(self):
        """D. Literature corpus retrieval and search are responsive."""
        corpus_res = client.get("/api/literature?limit=10")
        assert corpus_res.status_code == 200
        corpus_data = corpus_res.json()
        assert "papers" in corpus_data
        assert len(corpus_data["papers"]) > 0

        search_res = client.post(
            "/api/literature/search",
            json={"query": "vision transformer edge plant pathology", "top_k": 5},
        )
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert "results" in search_data
        assert len(search_data["results"]) <= 5

    def test_e_gap_analysis_remains_available(self):
        """E. Gap contradiction analysis functions deterministically."""
        research_info = {
            "title": "Robust Deep Feature Attribution in Agricultural Disease Detection",
            "claimed_research_gap": "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination.",
            "research_problem": "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.",
            "proposed_method": "Cross-attention attribution pooling with contrastive token alignment on edge hardware.",
        }
        res = client.post("/api/gap-analysis/analyze", json={"research_information": research_info, "top_k": 3})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "overall_assessment" in data
        assert "status" in data["overall_assessment"]
        assert "corpus_limitation" in data
        assert data["overall_assessment"]["status"] in [
            "Supported by Available Evidence",
            "Partially Supported",
            "Potentially Contradicted",
            "Insufficient Evidence",
            "Mixed Evidence",
        ]

    def test_f_contribution_analysis_remains_available(self):
        """F. Contribution differentiation analysis functions across all 6 dimensions."""
        research_info = {
            "title": "Robust Deep Feature Attribution in Agricultural Disease Detection",
            "expected_contribution": "A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.",
            "proposed_method": "Cross-attention attribution pooling with contrastive token alignment on edge hardware.",
            "dataset_context": "PlantVillage and InFieldCrop-50K foliar disease benchmark datasets under variable field illumination.",
        }
        res = client.post("/api/contribution-analysis/analyze", json={"research_information": research_info, "top_k": 3})
        assert res.status_code == 200
        data = res.json()
        assert "project_summary" in data
        assert "paper_analyses" in data
        assert "corpus_limitation" in data
        if data["paper_analyses"]:
            assert "matched_dimensions" in data["paper_analyses"][0]

    def test_g_submission_readiness_remains_available(self):
        """G. Submission readiness aggregates analyses into non-scoring explainable report."""
        research_info = {
            "title": "Robust Deep Feature Attribution in Agricultural Disease Detection",
            "claimed_research_gap": "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination.",
            "expected_contribution": "A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.",
            "proposed_method": "Cross-attention attribution pooling with contrastive token alignment on edge hardware.",
        }
        res = client.post(
            "/api/submission-readiness/analyze",
            json={
                "project_id": "proj-01",
                "manuscript_id": "manu-01",
                "research_information": research_info,
                "top_k": 3,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "gap_review" in data
        assert "contribution_review" in data
        assert "evidence_coverage_review" in data
        assert "review_checklist" in data
        assert len(data["review_checklist"]) == 9
        assert "corpus_limitation" in data
        # Must NOT generate a numerical readiness score
        assert "readiness_score" not in data
        assert "acceptance_probability" not in data

    def test_h_faculty_review_remains_available(self):
        """H. Faculty review retrieval and feedback submission remain available."""
        # Create or retrieve review for proj-03
        create_res = client.post(
            "/api/faculty-review/create",
            json={
                "project_id": "proj-03",
                "reviewer_name": "Prof. Semantic Systems",
                "reviewer_id": "prof-03",
            },
        )
        assert create_res.status_code == 200
        review = create_res.json()["review"]
        review_id = review.get("review_id") or review.get("id")

        # Update feedback
        update_res = client.put(
            f"/api/faculty-review/{review_id}",
            json={
                "comments": {"literature_coverage": "Integration test feedback."},
                "recommendations": "Expand coverage of benchmark datasets.",
                "reviewer_name": "Prof. Semantic Systems",
            },
        )
        assert update_res.status_code == 200
        assert update_res.json()["success"] is True

        # Retrieve review
        get_res = client.get("/api/faculty-review/proj-03")
        assert get_res.status_code == 200
        assert get_res.json()["review"]["recommendations"] == "Expand coverage of benchmark datasets."

    def test_i_faculty_review_dashboard_remains_available(self):
        """I. Faculty review dashboard lists research projects with their review statuses."""
        res = client.get("/api/faculty-review/projects")
        assert res.status_code == 200
        data = res.json()
        assert "projects" in data
        assert len(data["projects"]) > 0
        proj_ids = [p["project_id"] for p in data["projects"]]
        assert "proj-01" in proj_ids

    def test_j_faculty_review_history_remains_available(self):
        """J. Faculty review history returns chronological revision cycles for a project."""
        res = client.get("/api/faculty-review/history/proj-01")
        assert res.status_code == 200
        data = res.json()
        assert data["project_id"] == "proj-01"
        assert "cycles" in data
        assert isinstance(data["cycles"], list)

    def test_k_revision_comparison_remains_available(self):
        """K. Revision comparison module evaluates differences between manuscript versions."""
        v1_info = {
            "title": "Robust Deep Feature Attribution in Agricultural Disease Detection",
            "claimed_research_gap": "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination.",
            "major_claims": ["Attribution alignment improves lesion localization interpretability without sacrificing predictive accuracy."],
        }
        v2_info = {
            "title": "Robust Deep Feature Attribution in Agricultural Disease Detection (Revised)",
            "claimed_research_gap": "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination while maintaining edge inference budgets.",
            "major_claims": [
                "Attribution alignment improves diagnostic interpretability by 24% without degrading predictive accuracy.",
                "Post-training token quantization reduces parameter footprint by 45% on mobile edge accelerators.",
            ],
        }
        res = client.post(
            "/api/revision-comparison/compare",
            json={
                "project_id": "proj-01",
                "previous_manuscript_id": "manu-01",
                "new_manuscript_id": "manu-02",
                "previous_research_info": v1_info,
                "new_research_info": v2_info,
                "previous_version_label": "Version 1",
                "new_version_label": "Version 2",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert "field_comparisons" in data
        assert "revision_summary" in data

    def test_l_academic_guardrails_remain_present(self):
        """L. Prohibited academic claims are strictly absent and corpus limitations are explicit."""
        readiness_res = client.post(
            "/api/submission-readiness/analyze",
            json={
                "project_id": "proj-01",
                "manuscript_id": "manu-01",
                "research_information": {
                    "title": "Robust Deep Feature Attribution in Agricultural Disease Detection",
                    "claimed_research_gap": "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution.",
                },
                "top_k": 3,
            },
        )
        assert readiness_res.status_code == 200
        content_str = readiness_res.text.lower()

        # Prohibited terms MUST NOT appear
        assert "research approved" not in content_str
        assert "research rejected" not in content_str
        assert "novelty confirmed" not in content_str
        assert "publication guaranteed" not in content_str
        assert "ai approved" not in content_str
        assert "ai rejected" not in content_str

        # Mandatory corpus limitation warning MUST appear
        data = readiness_res.json()
        assert "corpus_limitation" in data
        assert "warning" in data["corpus_limitation"]
        assert "GapGuard corpus" in data["corpus_limitation"]["warning"]
