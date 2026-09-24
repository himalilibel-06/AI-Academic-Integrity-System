"""
GapGuard AI — Tests for Faculty Review Dashboard & Project Review Management (Phase 11B)

Verifies:
A. Faculty dashboard can retrieve available research projects.
B. Projects without a review are shown as "Not Reviewed".
C. Existing review status is returned correctly.
D. Multiple projects can be returned.
E. Unknown/invalid data is handled safely.
F. Existing faculty review records are not duplicated.
G. Existing Phase 11A review functionality still works.
H. No numerical research-quality score is generated.
I. No novelty score is generated.
J. No publication prediction is generated.
K. No automatic academic approval/rejection is generated.
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
    STATUS_NOT_REVIEWED,
    STATUS_IN_REVIEW,
    STATUS_FEEDBACK_PROVIDED,
    STATUS_REVISION_REQUESTED,
    STATUS_REVIEWED,
)

client = TestClient(app)


class TestFacultyReviewDashboard:
    """Test suite covering all Phase 11B requirements."""

    def test_a_faculty_dashboard_can_retrieve_available_research_projects(self):
        """Test A: Dashboard retrieves available research projects with summary counts."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "projects" in data
        assert isinstance(data["projects"], list)
        assert len(data["projects"]) > 0
        assert "counts" in data
        counts = data["counts"]
        assert "total" in counts
        assert "not_reviewed" in counts
        assert "in_review" in counts
        assert "revision_requested" in counts
        assert "reviewed" in counts
        assert counts["total"] == len(data["projects"])

    def test_b_projects_without_a_review_are_shown_as_not_reviewed(self):
        """Test B: A newly registered project without a review defaults to 'Not Reviewed'."""
        proj_id = "proj-11b-unreviewed-test"
        faculty_review_service.register_project({
            "id": proj_id,
            "title": "Unreviewed Project Test",
            "domain": "Artificial Intelligence",
        })

        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()
        matched = [p for p in data["projects"] if p["project_id"] == proj_id]
        assert len(matched) == 1
        p = matched[0]
        assert p["review_status"] == STATUS_NOT_REVIEWED
        assert p["review_id"] is None

    def test_c_existing_review_status_is_returned_correctly(self):
        """Test C: If a project has an existing review, its actual current status is returned."""
        proj_id = "proj-11b-status-test"
        faculty_review_service.register_project({
            "id": proj_id,
            "title": "Review Status Tracking Project",
            "domain": "Computer Vision",
        })

        # Create review
        c_resp = client.post(
            "/api/faculty-review/create",
            json={
                "project_id": proj_id,
                "reviewer_name": "Dr. Katherine Johnson",
                "reviewer_id": "prof-kj",
            },
        )
        assert c_resp.status_code == 200
        rev_id = c_resp.json()["review"]["review_id"]

        # Request revision with feedback
        r_resp = client.post(
            f"/api/faculty-review/{rev_id}/request-revision",
            json={
                "comments": {"research_problem": "Need tighter formulation of vision objectives."},
                "recommendations": "Add comparative benchmark with recent 2024 baselines.",
                "reviewer_name": "Dr. Katherine Johnson",
            },
        )
        assert r_resp.status_code == 200

        # Now query dashboard projects
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()
        matched = [p for p in data["projects"] if p["project_id"] == proj_id]
        assert len(matched) == 1
        p = matched[0]
        assert p["review_status"] == STATUS_REVISION_REQUESTED
        assert p["review_id"] == rev_id
        assert p["reviewer_name"] == "Dr. Katherine Johnson"

    def test_d_multiple_projects_can_be_returned(self):
        """Test D: Multiple research projects are returned simultaneously."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["projects"]) >= 3
        # Check standard required fields on each project
        for p in data["projects"]:
            assert "project_id" in p
            assert "project_title" in p
            assert "domain" in p
            assert "student_id" in p
            assert "review_status" in p
            assert "updated_at" in p

    def test_e_unknown_or_invalid_data_is_handled_safely(self):
        """Test E: Unknown projects and invalid queries do not break the dashboard."""
        # Non-existent project returns None in service
        assert faculty_review_service.get_project("completely_unknown_pid") is None
        assert faculty_review_service.get_project("") is None
        assert faculty_review_service.get_project(None) is None

        # Dashboard endpoint remains healthy
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_f_existing_faculty_review_records_are_not_duplicated(self):
        """Test F: Repeated dashboard calls or review creations do not duplicate records."""
        resp1 = client.get("/api/faculty-review/projects")
        count1 = len(resp1.json()["projects"])

        # Multiple idempotent calls
        resp2 = client.get("/api/faculty-review/projects")
        count2 = len(resp2.json()["projects"])
        assert count1 == count2

        # Create/get review for an already reviewed project
        client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-11b-status-test", "reviewer_name": "Dr. Katherine Johnson"},
        )
        resp3 = client.get("/api/faculty-review/projects")
        count3 = len(resp3.json()["projects"])
        assert count1 == count3

    def test_g_existing_phase_11a_review_functionality_still_works(self):
        """Test G: Existing Phase 11A individual review workflows continue functioning seamlessly."""
        proj_id = "proj-11b-11a-compat"
        faculty_review_service.register_project({
            "id": proj_id,
            "title": "Phase 11A Backward Compatibility Test",
            "domain": "Natural Language Processing",
        })

        # 1. Start review
        create_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": proj_id, "reviewer_name": "Prof. Shannon"},
        )
        assert create_resp.status_code == 200
        rev_id = create_resp.json()["review"]["review_id"]

        # 2. Save feedback
        save_resp = client.put(
            f"/api/faculty-review/{rev_id}",
            json={
                "comments": {"proposed_method": "Clear information theoretic formulation."},
                "recommendations": "Proceed with empirical testing.",
            },
        )
        assert save_resp.status_code == 200
        assert save_resp.json()["review"]["status"] == STATUS_FEEDBACK_PROVIDED

        # 3. Mark completed
        comp_resp = client.post(
            f"/api/faculty-review/{rev_id}/complete",
            json={"reviewer_name": "Prof. Shannon"},
        )
        assert comp_resp.status_code == 200
        assert comp_resp.json()["review"]["status"] == STATUS_REVIEWED
        assert comp_resp.json()["message"] == "Review completed"

    def test_h_no_numerical_research_quality_score_is_generated(self):
        """Test H: The dashboard strictly provides counts, never numerical scores or quality rankings."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()

        forbidden_keys = [
            "quality_score",
            "score",
            "rating",
            "grade",
            "rank",
            "ranking",
            "research_quality",
            "best_project",
            "weakest_project",
        ]

        for p in data["projects"]:
            for key in forbidden_keys:
                assert key not in p, f"Forbidden quality key '{key}' found in project!"

        counts = data["counts"]
        for key in forbidden_keys:
            assert key not in counts, f"Forbidden quality key '{key}' found in counts!"

    def test_i_no_novelty_score_is_generated(self):
        """Test I: No novelty score or percentage is generated."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()

        forbidden_novelty_keys = [
            "novelty_score",
            "novelty_rating",
            "novelty_percentage",
            "novelty_level",
        ]

        for p in data["projects"]:
            for key in forbidden_novelty_keys:
                assert key not in p, f"Forbidden novelty key '{key}' found in project!"

    def test_j_no_publication_prediction_is_generated(self):
        """Test J: No publication likelihood or acceptance prediction is generated."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()

        forbidden_pub_keys = [
            "publication_probability",
            "acceptance_rate",
            "publication_likelihood",
            "publication_prediction",
            "acceptance_prediction",
        ]

        for p in data["projects"]:
            for key in forbidden_pub_keys:
                assert key not in p, f"Forbidden publication key '{key}' found in project!"

    def test_k_no_automatic_academic_approval_or_rejection_is_generated(self):
        """Test K: No automatic approval or rejection is produced; guardrail notice is present."""
        resp = client.get("/api/faculty-review/projects")
        assert resp.status_code == 200
        data = resp.json()

        assert "academic_guardrail" in data
        assert "qualitative" in data["academic_guardrail"].lower()

        for p in data["projects"]:
            status_val = p.get("review_status", "").lower()
            assert "approved" not in status_val, f"Forbidden status 'Approved' found in project: {status_val}"
            assert "rejected" not in status_val, f"Forbidden status 'Rejected' found in project: {status_val}"
