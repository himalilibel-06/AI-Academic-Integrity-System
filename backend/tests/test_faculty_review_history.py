"""
GapGuard AI — Tests for Faculty Review History & Revision Cycle Tracking (Phase 11C)

Verifies:
A. Review history can be retrieved for an existing project.
B. Project with no history returns an empty cycle list.
C. Existing faculty review is linked correctly.
D. Manuscript V1 can be linked to V2 when both belong to the same project.
E. Cross-project manuscript linking is rejected.
F. Nonexistent manuscript IDs are rejected.
G. Invalid version ordering is rejected.
H. Revision history does not duplicate manuscript records.
I. Existing Revision Comparison functionality remains intact.
J. Existing Phase 11A faculty review functionality remains intact.
K. Existing Phase 11B dashboard functionality remains intact.
L. Student can access appropriate revision history.
M. No research-quality score is generated.
N. No novelty score is generated.
O. No publication prediction is generated.
P. No automatic academic approval/rejection is generated.
Q. Ambiguous revision relationships are not falsely presented as confirmed revisions.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.faculty_review import (
    faculty_review_service,
    CYCLE_STATUS_REVIEW_STARTED,
    CYCLE_STATUS_REVISION_REQUESTED,
    CYCLE_STATUS_REVISION_SUBMITTED,
    CYCLE_STATUS_REVIEW_COMPLETED,
    STATUS_NOT_REVIEWED,
    STATUS_REVISION_REQUESTED,
    STATUS_REVIEWED,
)

client = TestClient(app)


class TestFacultyReviewHistoryWorkflow:
    """Test suite covering all Phase 11C requirements."""

    def test_a_review_history_can_be_retrieved_for_existing_project(self):
        """Test A: Review history can be retrieved for a recognized project with manuscripts."""
        resp = client.get("/api/faculty-review/history/proj-01")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["project_id"] == "proj-01"
        assert "cycles" in data
        assert isinstance(data["cycles"], list)
        assert len(data["cycles"]) >= 1
        c = data["cycles"][0]
        assert "cycle_id" in c
        assert "cycle_status" in c
        assert "current_manuscript_id" in c

    def test_b_project_with_no_history_returns_empty_cycle_list(self):
        """Test B: A project with no manuscripts and no review returns an empty cycle list."""
        proj_id = "proj-11c-empty-test"
        faculty_review_service.register_project({
            "id": proj_id,
            "title": "Empty History Project",
            "domain": "Bioinformatics",
        })

        resp = client.get(f"/api/faculty-review/history/{proj_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["cycles"] == []
        assert data["total_cycles"] == 0

    def test_c_existing_faculty_review_is_linked_correctly(self):
        """Test C: Existing faculty review and reviewer are linked to the review history."""
        proj_id = "proj-11c-review-link"
        faculty_review_service.register_project({
            "id": proj_id,
            "title": "Review Link Project",
            "domain": "Data Science",
        })
        faculty_review_service.register_manuscript({
            "id": "manu-11c-c1",
            "project_id": proj_id,
            "title": "Review Link Manuscript Draft",
            "version_number": 1,
            "version_label": "Version 1 — Draft",
        })

        # Create review
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": proj_id, "reviewer_name": "Dr. Rosalind Franklin"},
        )
        assert c_resp.status_code == 200

        # Query history
        h_resp = client.get(f"/api/faculty-review/history/{proj_id}")
        assert h_resp.status_code == 200
        data = h_resp.json()
        assert len(data["cycles"]) >= 1
        cycle = data["cycles"][0]
        assert cycle["reviewer_name"] == "Dr. Rosalind Franklin"

    def test_d_manuscript_v1_can_be_linked_to_v2_same_project(self):
        """Test D: Manuscript V1 can be linked to V2 when both belong to the same project."""
        proj_id = "proj-11c-link-d"
        faculty_review_service.register_project({
            "id": proj_id,
            "title": "Version Linking Project",
        })
        faculty_review_service.register_manuscript({
            "id": "manu-11c-d1",
            "project_id": proj_id,
            "title": "Linking Paper V1",
            "version_number": 1,
            "version_label": "Version 1",
        })
        faculty_review_service.register_manuscript({
            "id": "manu-11c-d2",
            "project_id": proj_id,
            "title": "Linking Paper V2",
            "version_number": 2,
            "version_label": "Version 2",
        })

        resp = client.post(
            "/api/faculty-review/history/create-cycle",
            json={
                "project_id": proj_id,
                "previous_manuscript_id": "manu-11c-d1",
                "current_manuscript_id": "manu-11c-d2",
                "previous_version": 1,
                "current_version": 2,
                "cycle_status": CYCLE_STATUS_REVISION_SUBMITTED,
            },
        )
        assert resp.status_code == 200
        cycle = resp.json()["cycle"]
        assert cycle["previous_manuscript_id"] == "manu-11c-d1"
        assert cycle["current_manuscript_id"] == "manu-11c-d2"
        assert cycle["cycle_status"] == CYCLE_STATUS_REVISION_SUBMITTED

    def test_e_cross_project_manuscript_linking_is_rejected(self):
        """Test E: Linking manuscripts from different research projects is rejected."""
        resp = client.post(
            "/api/faculty-review/history/create-cycle",
            json={
                "project_id": "proj-01",
                "previous_manuscript_id": "manu-01",  # belongs to proj-01
                "current_manuscript_id": "manu-03",   # belongs to proj-02
                "previous_version": 1,
                "current_version": 2,
            },
        )
        assert resp.status_code == 400
        assert "same research project" in resp.json()["detail"].lower()

    def test_f_nonexistent_manuscript_ids_are_rejected(self):
        """Test F: Attempting to record a cycle with nonexistent manuscript IDs is rejected."""
        resp = client.post(
            "/api/faculty-review/history/create-cycle",
            json={
                "project_id": "proj-01",
                "previous_manuscript_id": "manu-01",
                "current_manuscript_id": "ghost_manu_xyz_999",
                "previous_version": 1,
                "current_version": 2,
            },
        )
        assert resp.status_code in (400, 404)
        assert "does not exist" in resp.json()["detail"].lower()

    def test_g_invalid_version_ordering_is_rejected(self):
        """Test G: previous_version must be strictly less than current_version."""
        proj_id = "proj-11c-ver-ord"
        faculty_review_service.register_project({"id": proj_id, "title": "Version Order Project"})
        faculty_review_service.register_manuscript({
            "id": "manu-11c-g1",
            "project_id": proj_id,
            "title": "Doc G1",
            "version_number": 2,
        })
        faculty_review_service.register_manuscript({
            "id": "manu-11c-g2",
            "project_id": proj_id,
            "title": "Doc G2",
            "version_number": 1,
        })

        resp = client.post(
            "/api/faculty-review/history/create-cycle",
            json={
                "project_id": proj_id,
                "previous_manuscript_id": "manu-11c-g1",
                "current_manuscript_id": "manu-11c-g2",
                "previous_version": 2,
                "current_version": 1,
            },
        )
        assert resp.status_code == 400
        assert "strictly less than" in resp.json()["detail"].lower()

    def test_h_revision_history_does_not_duplicate_manuscript_records(self):
        """Test H: Fetching history or cycles does not duplicate manuscript records."""
        m_resp1 = client.get("/api/faculty-review/manuscripts/proj-01")
        count1 = len(m_resp1.json()["manuscripts"])

        # Multiple history calls
        client.get("/api/faculty-review/history/proj-01")
        client.get("/api/faculty-review/history/proj-01")

        m_resp2 = client.get("/api/faculty-review/manuscripts/proj-01")
        count2 = len(m_resp2.json()["manuscripts"])
        assert count1 == count2

    def test_i_existing_revision_comparison_functionality_remains_intact(self):
        """Test I: Phase 10A 13-field comparison continues working without modification."""
        resp = client.post(
            "/api/revision-comparison/compare",
            json={
                "project_id": "proj-01",
                "previous_research_info": {
                    "title": "Initial Title",
                    "research_problem": "Problem 1",
                },
                "new_research_info": {
                    "title": "Revised Title",
                    "research_problem": "Problem 1",
                },
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "revision_summary" in data
        assert "field_comparisons" in data
        assert len(data["field_comparisons"]) == 13

    def test_j_existing_phase_11a_faculty_review_functionality_remains_intact(self):
        """Test J: Phase 11A individual review workspace continues functioning."""
        resp = client.get("/api/faculty-review/proj-01")
        assert resp.status_code == 200
        assert "review" in resp.json()

    def test_k_existing_phase_11b_dashboard_functionality_remains_intact(self):
        """Test K: Phase 11B dashboard endpoint continues returning projects and counts."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert "projects" in data
        assert "counts" in data

    def test_l_student_can_access_appropriate_revision_history(self):
        """Test L: Student can retrieve project revision history without leaked secrets."""
        resp = client.get("/api/faculty-review/history/proj-01")
        assert resp.status_code == 200
        data = resp.json()
        assert "cycles" in data
        for c in data["cycles"]:
            # Ensure no secret keys
            assert "password" not in c
            assert "token" not in c
            assert "hash" not in c
            # Ensure required workflow keys present
            assert "current_version_label" in c
            assert "actions" in c

    def test_m_no_numerical_research_quality_score_is_generated(self):
        """Test M: Revision history does not generate numerical scores or quality rankings."""
        resp = client.get("/api/faculty-review/history/proj-01")
        assert resp.status_code == 200
        data = resp.json()

        forbidden_keys = [
            "quality_score",
            "score",
            "rating",
            "grade",
            "rank",
            "novelty_score",
            "publication_probability",
        ]
        for key in forbidden_keys:
            assert key not in data
            for c in data["cycles"]:
                assert key not in c

    def test_n_no_novelty_score_is_generated(self):
        """Test N: No novelty score or percentage is generated in history."""
        resp = client.get("/api/faculty-review/history/proj-01")
        data = resp.json()
        for c in data["cycles"]:
            assert "novelty_score" not in c
            assert "novelty_percentage" not in c

    def test_o_no_publication_prediction_is_generated(self):
        """Test O: No publication prediction or acceptance rate is generated."""
        resp = client.get("/api/faculty-review/history/proj-01")
        data = resp.json()
        for c in data["cycles"]:
            assert "publication_probability" not in c
            assert "acceptance_rate" not in c

    def test_p_no_automatic_academic_approval_or_rejection_is_generated(self):
        """Test P: Cycle and faculty statuses never indicate 'Approved' or 'Rejected'."""
        resp = client.get("/api/faculty-review/history/proj-01")
        data = resp.json()
        assert "academic_guardrail" in data
        for c in data["cycles"]:
            assert "approved" not in c.get("faculty_status", "").lower()
            assert "rejected" not in c.get("faculty_status", "").lower()
            assert "approved" not in c.get("cycle_status", "").lower()
            assert "rejected" not in c.get("cycle_status", "").lower()

    def test_q_ambiguous_relationships_not_falsely_presented_as_confirmed_revisions(self):
        """Test Q: Ambiguous detected cycles are framed conservatively as 'Potential revision cycle'."""
        resp = client.get("/api/faculty-review/history/proj-01")
        data = resp.json()
        cycles = data["cycles"]
        if len(cycles) >= 2:
            v2_cycle = cycles[1]
            # Part 7 guardrail: conservative wording for potential revision candidate
            if v2_cycle.get("cycle_status") != CYCLE_STATUS_REVIEW_COMPLETED:
                assert "potential revision cycle" in v2_cycle.get("notes", "").lower()
