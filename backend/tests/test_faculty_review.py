"""
GapGuard AI — Tests for Faculty Review & Research Feedback (Phase 11A)

Verifies:
A. Faculty review can be created for an existing project.
B. Unknown project is rejected safely.
C. Existing review can be retrieved.
D. Faculty feedback can be updated.
E. Empty feedback sections are allowed.
F. Request Revision requires meaningful feedback.
G. Request Revision changes status correctly.
H. Mark Reviewed changes status to Reviewed.
I. Reviewed does not mean Approved.
J. Student can retrieve faculty feedback.
K. Unknown review is handled safely.
L. Duplicate active review is handled safely.
M. No numerical research-quality score is generated.
N. No publication prediction is generated.
O. Academic guardrail language is preserved.
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


class TestFacultyReviewWorkflow:
    """Test suite covering all Phase 11A requirements."""

    def test_a_faculty_review_can_be_created_for_existing_project(self):
        """Test A: Faculty review can be created for a recognized research project."""
        resp = client.post(
            "/api/faculty-review/create",
            json={
                "project_id": "proj-01",
                "reviewer_name": "Dr. Alan Turing",
                "reviewer_id": "prof-01",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "review" in data
        rev = data["review"]
        assert rev["project_id"] == "proj-01"
        assert rev["reviewer_name"] == "Dr. Alan Turing"
        assert rev["status"] in (STATUS_IN_REVIEW, STATUS_FEEDBACK_PROVIDED, STATUS_NOT_REVIEWED)
        assert "comments" in rev
        assert "research_problem" in rev["comments"]

    def test_b_unknown_project_is_rejected_safely(self):
        """Test B: Unknown research project ID is safely rejected with HTTP 404."""
        resp = client.post(
            "/api/faculty-review/create",
            json={
                "project_id": "unknown_project_xyz_999",
                "reviewer_name": "Dr. Lin",
            },
        )
        assert resp.status_code == 404
        data = resp.json()
        assert "not found" in data["detail"].lower()

    def test_c_existing_review_can_be_retrieved(self):
        """Test C: Existing review for a project can be retrieved via GET."""
        resp = client.get("/api/faculty-review/proj-01")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["review"]["project_id"] == "proj-01"
        assert "comments" in data["review"]

    def test_d_faculty_feedback_can_be_updated(self):
        """Test D: Faculty can update comments and overall recommendations."""
        faculty_review_service.register_project({
            "id": "proj-test-d",
            "title": "Project D — Privacy Embeddings",
        })
        # Ensure review exists
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-test-d", "reviewer_name": "Dr. Ada Lovelace"},
        )
        review_id = c_resp.json()["review"]["review_id"]

        update_resp = client.put(
            f"/api/faculty-review/{review_id}",
            json={
                "comments": {
                    "research_problem": "Problem is clearly articulated.",
                    "research_gap": "Need to clarify edge cases in federated setup.",
                },
                "recommendations": "Add comparative baselines on differential privacy bounds.",
            },
        )
        assert update_resp.status_code == 200
        rev = update_resp.json()["review"]
        assert rev["comments"]["research_problem"] == "Problem is clearly articulated."
        assert rev["comments"]["research_gap"] == "Need to clarify edge cases in federated setup."
        assert rev["recommendations"] == "Add comparative baselines on differential privacy bounds."
        assert rev["status"] == STATUS_FEEDBACK_PROVIDED

    def test_e_empty_feedback_sections_are_allowed(self):
        """Test E: Empty feedback sections are allowed; reviewers not forced to comment on all."""
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-03", "reviewer_name": "Dr. Grace Hopper"},
        )
        review_id = c_resp.json()["review"]["review_id"]

        # Only comment on proposed_method; leave others empty
        update_resp = client.put(
            f"/api/faculty-review/{review_id}",
            json={
                "comments": {
                    "proposed_method": "Autoencoder architecture is sound.",
                },
                "recommendations": "",
            },
        )
        assert update_resp.status_code == 200
        rev = update_resp.json()["review"]
        assert rev["comments"]["proposed_method"] == "Autoencoder architecture is sound."
        assert rev["comments"]["research_problem"] == ""
        assert rev["comments"]["expected_contribution"] == ""

    def test_f_request_revision_requires_meaningful_feedback(self):
        """Test F: Request Revision fails if all feedback and recommendations are completely empty."""
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": "demo-project-1", "reviewer_name": "Prof. Smith"},
        )
        review_id = c_resp.json()["review"]["review_id"]

        # Clear any prior comments
        client.put(
            f"/api/faculty-review/{review_id}",
            json={
                "comments": {
                    "research_problem": "",
                    "research_gap": "",
                    "proposed_method": "",
                    "expected_contribution": "",
                    "evidence_literature": "",
                    "research_claims": "",
                },
                "recommendations": "",
            },
        )

        # Attempt revision request with empty payload
        rev_resp = client.post(
            f"/api/faculty-review/{review_id}/request-revision",
            json={
                "comments": {},
                "recommendations": "   ",
            },
        )
        assert rev_resp.status_code == 400
        assert "requires at least one feedback" in rev_resp.json()["detail"]

    def test_g_request_revision_changes_status_correctly(self):
        """Test G: Request Revision with meaningful feedback changes status to 'Revision Requested'."""
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": "demo-project-1", "reviewer_name": "Prof. Smith"},
        )
        review_id = c_resp.json()["review"]["review_id"]

        rev_resp = client.post(
            f"/api/faculty-review/{review_id}/request-revision",
            json={
                "comments": {
                    "evidence_literature": "Please add citations for Vision Transformer quantization.",
                },
                "recommendations": "Expand ablation experiments on variable illumination.",
            },
        )
        assert rev_resp.status_code == 200
        data = rev_resp.json()
        assert data["review"]["status"] == STATUS_REVISION_REQUESTED
        assert "Faculty revision feedback is available" in data["message"]

    def test_h_mark_reviewed_changes_status_to_reviewed(self):
        """Test H: Mark Reviewed changes status to 'Reviewed'."""
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-02", "reviewer_name": "Dr. Ada Lovelace"},
        )
        review_id = c_resp.json()["review"]["review_id"]

        comp_resp = client.post(
            f"/api/faculty-review/{review_id}/complete",
            json={"recommendations": "Comprehensive revision completed."},
        )
        assert comp_resp.status_code == 200
        data = comp_resp.json()
        assert data["review"]["status"] == STATUS_REVIEWED
        assert data["message"] == "Review completed"

    def test_i_reviewed_does_not_mean_approved(self):
        """Test I: 'Reviewed' indicates 'Review completed', never 'Research approved'."""
        c_resp = client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-03", "reviewer_name": "Dr. Grace Hopper"},
        )
        review_id = c_resp.json()["review"]["review_id"]

        comp_resp = client.post(
            f"/api/faculty-review/{review_id}/complete",
            json={},
        )
        data = comp_resp.json()
        assert data["review"]["status"] == STATUS_REVIEWED
        assert "approved" not in str(data["message"]).lower()
        assert "Review completed" in data["message"]

    def test_j_student_can_retrieve_faculty_feedback(self):
        """Test J: Student view can retrieve reviewer name, comments, recommendations, and status."""
        resp = client.get("/api/faculty-review/proj-test-d")
        assert resp.status_code == 200
        rev = resp.json()["review"]
        assert rev["reviewer_name"] == "Dr. Ada Lovelace"
        assert "comments" in rev
        assert rev["recommendations"] != ""
        assert "updated_at" in rev

    def test_k_unknown_review_is_handled_safely(self):
        """Test K: Accessing or modifying a non-existent review ID returns HTTP 404."""
        resp = client.put(
            "/api/faculty-review/rev_nonexistent_99999",
            json={"comments": {"research_problem": "Test"}},
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_l_duplicate_active_review_is_handled_safely(self):
        """Test L: Attempting to create duplicate review for a project safely returns the existing one."""
        resp1 = client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-01", "reviewer_name": "Reviewer 1"},
        )
        resp2 = client.post(
            "/api/faculty-review/create",
            json={"project_id": "proj-01", "reviewer_name": "Reviewer 2"},
        )
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        # Same review ID returned
        assert resp1.json()["review"]["review_id"] == resp2.json()["review"]["review_id"]

    def test_m_no_numerical_research_quality_score_is_generated(self):
        """Test M: Review object contains no numerical faculty scores, grades, or quality metrics."""
        resp = client.get("/api/faculty-review/proj-01")
        data = resp.json()

        def check_no_scores(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    k_lower = str(k).lower()
                    assert "score" not in k_lower
                    assert "grade" not in k_lower
                    assert "rating" not in k_lower
                    assert "quality_score" not in k_lower
                    check_no_scores(v)
            elif isinstance(obj, list):
                for item in obj:
                    check_no_scores(item)

        check_no_scores(data["review"])

    def test_n_no_publication_prediction_is_generated(self):
        """Test N: Review object contains no publication prediction or acceptance probability."""
        resp = client.get("/api/faculty-review/proj-01")
        data = resp.json()

        def check_no_pub_pred(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    k_lower = str(k).lower()
                    assert "publication_probability" not in k_lower
                    assert "acceptance_chance" not in k_lower
                    if isinstance(v, str):
                        v_lower = v.lower()
                        assert "publication approved" not in v_lower
                        assert "publication ready" not in v_lower
                    check_no_pub_pred(v)
            elif isinstance(obj, list):
                for item in obj:
                    check_no_pub_pred(item)

        check_no_pub_pred(data["review"])

    def test_o_academic_guardrail_language_is_preserved(self):
        """Test O: Review object preserves required guardrail language and rejects banned phrases."""
        resp = client.get("/api/faculty-review/proj-01")
        rev = resp.json()["review"]

        guardrail = rev.get("academic_guardrail", "")
        assert "Faculty feedback is qualitative and human-advisory" in guardrail
        assert "Review completed" in guardrail

        raw_text = str(rev).lower()
        assert "research approved" not in raw_text
        assert "research rejected" not in raw_text
        assert "ai approved the research" not in raw_text
        assert "your research failed" not in raw_text
