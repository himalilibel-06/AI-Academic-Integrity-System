"""
GapGuard AI — Tests for Submission Readiness Report (Phase 10B)

Verifies:
A. Readiness report aggregates available gap analysis.
B. Readiness report aggregates contribution analysis.
C. Readiness report aggregates evidence coverage.
D. Readiness report handles missing gap analysis safely.
E. Readiness report handles missing contribution analysis safely.
F. Readiness report handles missing evidence coverage safely.
G. Revision information is included when available.
H. First manuscript without previous version is handled safely.
I. No readiness score is produced.
J. No publication probability is produced.
K. No scientific-truth / global-novelty claim is produced.
L. Corpus limitation warning is always present.
M. API handles incomplete analysis data safely.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.submission_readiness import (
    SubmissionReadinessService,
    submission_readiness_service,
    CORPUS_LIMITATION_WARNING,
    STATUS_AVAILABLE,
    STATUS_NOT_RUN,
    STATUS_INSUFFICIENT,
    STATUS_REVIEW_RECOMMENDED,
)

client = TestClient(app)


class TestSubmissionReadinessReport:
    """Test suite covering all Phase 10B requirements."""

    def test_a_readiness_report_aggregates_available_gap_analysis(self):
        """Test A: Readiness report aggregates available gap analysis outputs and recommendations."""
        mock_gap = {
            "overall_assessment": {
                "status": "Partially Supported",
                "overall_status": "Partially Supported",
                "evidence_count": 4,
                "supporting": 2,
                "partial": 1,
                "potentially_contradicted": 1,
                "insufficient": 0,
            },
            "claimed_research_gap": "Vision transformer token attribution under variable illumination",
            "paper_analyses": [
                {
                    "paper_id": "p1",
                    "title": "Study 1",
                    "evidence_relationship": "Potentially Contradicted",
                    "reason": "Overlapping method and problem context found.",
                },
                {
                    "paper_id": "p2",
                    "title": "Study 2",
                    "evidence_relationship": "Supported by Available Evidence",
                    "reason": "Explicit limitation corroborating gap.",
                },
            ],
            "corpus_limitation": "Corpus limitation note",
        }

        report = submission_readiness_service.build_report(
            gap_analysis=mock_gap,
            research_information={"claimed_research_gap": "Vision transformer token attribution"},
        )

        gap_rev = report["gap_review"]
        assert gap_rev["analysis_status"] == STATUS_REVIEW_RECOMMENDED
        assert gap_rev["current_status"] == "Partially Supported"
        assert gap_rev["supporting_evidence_count"] == 2
        assert gap_rev["partial_evidence_count"] == 1
        assert gap_rev["potentially_contradictory_evidence_count"] == 1
        assert gap_rev["evidence_count"] == 4
        assert "Review both supporting and potentially contradictory evidence." in gap_rev["recommended_action"]
        assert len(gap_rev["important_findings"]) > 0

    def test_b_readiness_report_aggregates_contribution_analysis(self):
        """Test B: Readiness report aggregates contribution differentiation outputs and overlap dimensions."""
        mock_contrib = {
            "project_summary": {
                "total_papers_compared": 5,
                "clearly_differentiated_count": 3,
                "partially_differentiated_count": 1,
                "needs_clarification_count": 0,
                "potential_overlap_count": 1,
                "strongest_overlapping_dimensions": [
                    {"dimension": "method_overlap", "average_score": 0.42},
                    {"dimension": "problem_overlap", "average_score": 0.38},
                ],
                "highest_overlap_papers": [
                    {
                        "paper_id": "paper_over_1",
                        "title": "Related Transformer Work",
                        "classification": "Potential Overlap",
                        "composite_overlap": 0.55,
                    }
                ],
                "summary_text": "Potential overlap identified with 1 paper in the corpus.",
            },
            "proposed_contribution": "Hierarchical token alignment method.",
            "paper_analyses": [],
            "corpus_limitation": "Limitation note",
        }

        report = submission_readiness_service.build_report(
            contribution_analysis=mock_contrib,
            research_information={"expected_contribution": "Hierarchical token alignment method."},
        )

        contrib_rev = report["contribution_review"]
        assert contrib_rev["analysis_status"] == STATUS_REVIEW_RECOMMENDED
        assert contrib_rev["current_status"] == "Potential Overlap"
        assert contrib_rev["number_of_papers_analyzed"] == 5
        assert contrib_rev["clearly_differentiated_count"] == 3
        assert contrib_rev["potential_overlap_count"] == 1
        assert contrib_rev["recommended_action"] == "Review the overlapping literature and clarify how the proposed contribution differs."
        assert len(contrib_rev["important_dimensional_overlaps"]) == 2

    def test_c_readiness_report_aggregates_evidence_coverage(self):
        """Test C: Readiness report aggregates evidence coverage and names it Evidence Coverage."""
        mock_coverage = {
            "overall_coverage": {
                "total_claims": 4,
                "usable_claims": 4,
                "supported_claims": 3,
                "partially_supported_claims": 1,
                "insufficient_evidence_claims": 0,
                "coverage_percentage": 75.0,
                "status_message": "Evidence Coverage: 75.0% across 4 usable claim(s).",
            },
            "claim_analyses": [
                {
                    "claim": "Attribution alignment improves interpretability.",
                    "evidence_status": "Supported by Available Evidence",
                    "strongest_similarity_score": 0.65,
                    "number_of_relevant_papers": 3,
                    "matched_papers": [{"paper_id": "p1", "title": "Paper 1"}],
                    "reason": "Strong literature match.",
                },
                {
                    "claim": "Token subsampling reduces memory budget.",
                    "evidence_status": "Partially Supported",
                    "strongest_similarity_score": 0.35,
                    "number_of_relevant_papers": 1,
                    "matched_papers": [{"paper_id": "p2", "title": "Paper 2"}],
                    "reason": "Partial match.",
                },
            ],
            "corpus_limitation_statement": "Coverage statement",
        }

        report = submission_readiness_service.build_report(evidence_coverage=mock_coverage)

        cov_rev = report["evidence_coverage_review"]
        assert cov_rev["coverage_percentage"] == 75.0
        assert cov_rev["total_claims"] == 4
        assert cov_rev["usable_claims"] == 4
        assert cov_rev["supported_claims"] == 3
        assert cov_rev["partially_supported_claims"] == 1
        assert cov_rev["insufficient_evidence_claims"] == 0

        # Part 6: Research Claim Review
        claim_rev = report["research_claim_review"]
        assert len(claim_rev) == 2
        assert claim_rev[0]["evidence_status"] == "Supported by Available Evidence"
        assert "Available corpus evidence was found" in claim_rev[0]["review_recommendation"]
        assert claim_rev[1]["evidence_status"] == "Partially Supported"
        assert "Limited matching evidence was found" in claim_rev[1]["review_recommendation"]

    def test_d_readiness_report_handles_missing_gap_analysis_safely(self):
        """Test D: When gap analysis is missing, handles safely and marks as Not Run."""
        report = submission_readiness_service.build_report(
            gap_analysis=None,
            research_information={},  # No claimed_research_gap
        )

        gap_rev = report["gap_review"]
        assert gap_rev["analysis_status"] == STATUS_NOT_RUN
        assert gap_rev["current_status"] == "Not Run"
        assert gap_rev["supporting_evidence_count"] == 0
        assert "Provide a claimed research gap" in gap_rev["recommended_action"]

    def test_e_readiness_report_handles_missing_contribution_analysis_safely(self):
        """Test E: When contribution analysis is missing, handles safely and marks as Not Run."""
        report = submission_readiness_service.build_report(
            contribution_analysis=None,
            research_information={},  # No contribution or problem
        )

        contrib_rev = report["contribution_review"]
        assert contrib_rev["analysis_status"] == STATUS_NOT_RUN
        assert contrib_rev["current_status"] == "Not Run"
        assert contrib_rev["number_of_papers_analyzed"] == 0
        assert "Provide expected contribution or research problem" in contrib_rev["recommended_action"]

    def test_f_readiness_report_handles_missing_evidence_coverage_safely(self):
        """Test F: When evidence coverage is missing, handles safely and marks as Not Run."""
        report = submission_readiness_service.build_report(
            evidence_coverage=None,
            claims=None,
            research_information={},
        )

        cov_rev = report["evidence_coverage_review"]
        assert cov_rev["analysis_status"] == STATUS_NOT_RUN
        assert cov_rev["current_status"] == "Not Run"
        assert cov_rev["coverage_percentage"] is None
        assert "usable extracted claims" in cov_rev["coverage_display"]
        assert report["research_claim_review"] == []

    def test_g_revision_information_is_included_when_available(self):
        """Test G: Revision comparison is included and aggregated when available."""
        mock_revision = {
            "project_id": "proj-10",
            "revision_summary": {
                "previous_version": "Draft 1",
                "new_version": "Draft 2",
                "changed_fields_count": 2,
                "changed_research_fields": ["claimed_research_gap", "proposed_method"],
                "key_change_notes": ["Claimed gap changed between versions."],
            },
            "field_comparisons": {
                "major_claims": {
                    "added_items": ["New claim on edge inference"],
                    "removed_items": ["Old claim"],
                    "retained_items": ["Retained core claim"],
                },
            },
            "priority_guidance": [
                "Re-run Gap Analysis after reviewing the revised gap formulation.",
                "Re-run Contribution Differentiation after reviewing the revised method.",
            ],
            "disclaimer": "Revision comparison disclaimer.",
        }

        report = submission_readiness_service.build_report(revision_comparison=mock_revision)

        rev_rev = report["revision_review"]
        assert rev_rev["has_revision"] is True
        assert rev_rev["analysis_status"] == STATUS_REVIEW_RECOMMENDED
        assert rev_rev["previous_version"] == "Draft 1"
        assert rev_rev["current_version"] == "Draft 2"
        assert rev_rev["changed_fields_count"] == 2
        assert "claimed_research_gap" in rev_rev["changed_research_fields"]
        assert rev_rev["added_claims"] == ["New claim on edge inference"]
        assert len(rev_rev["revision_priority_guidance"]) == 2

    def test_h_first_manuscript_without_previous_version_is_handled_safely(self):
        """Test H: First manuscript without previous version is handled safely with no penalty."""
        report = submission_readiness_service.build_report(
            revision_comparison=None,
            previous_research_info=None,
        )

        rev_rev = report["revision_review"]
        assert rev_rev["has_revision"] is False
        assert rev_rev["analysis_status"] == STATUS_NOT_RUN
        assert rev_rev["message"] == "Revision comparison is not available because a previous manuscript version was not selected."
        assert rev_rev["changed_fields_count"] == 0
        assert report["overall_summary"]["analyses_status"]["revision_review"] == STATUS_NOT_RUN

    def test_i_no_readiness_score_is_produced(self):
        """Test I: Verifies no readiness score, readiness percentage, or scientific score exists."""
        report = submission_readiness_service.build_report(
            research_information={
                "claimed_research_gap": "Test gap",
                "expected_contribution": "Test contribution",
            }
        )

        # Inspect all keys recursively
        def check_no_scores(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    k_lower = str(k).lower()
                    assert "readiness_score" not in k_lower
                    assert "readiness_percentage" not in k_lower
                    assert "scientific_score" not in k_lower
                    assert "overall_score" not in k_lower
                    check_no_scores(v)
            elif isinstance(obj, list):
                for item in obj:
                    check_no_scores(item)

        check_no_scores(report)

    def test_j_no_publication_probability_is_produced(self):
        """Test J: Verifies no publication probability or acceptance prediction exists."""
        report = submission_readiness_service.build_report()

        def check_no_pub_prob(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    k_lower = str(k).lower()
                    assert "publication_probability" not in k_lower
                    assert "acceptance_probability" not in k_lower
                    assert "acceptance_chance" not in k_lower
                    if isinstance(v, str):
                        v_lower = v.lower()
                        assert "publication probability" not in v_lower
                        assert "chance of acceptance" not in v_lower
                    check_no_pub_prob(v)
            elif isinstance(obj, list):
                for item in obj:
                    check_no_pub_prob(item)

        check_no_pub_prob(report)

    def test_k_no_scientific_truth_or_global_novelty_claim_is_produced(self):
        """Test K: Verifies report never claims scientific truth, global novelty, or publication readiness."""
        report = submission_readiness_service.build_report()

        def check_guardrails(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, str):
                        v_lower = v.lower()
                        assert "research is valid" not in v_lower
                        assert "research is novel" not in v_lower
                        assert "research is publication-ready" not in v_lower
                        assert "manuscript will be accepted" not in v_lower
                        assert "gap is scientifically proven" not in v_lower
                    check_guardrails(v)
            elif isinstance(obj, list):
                for item in obj:
                    check_guardrails(item)

        check_guardrails(report)

    def test_l_corpus_limitation_is_always_present(self):
        """Test L: Corpus limitation warning is always present with required exact text."""
        report = submission_readiness_service.build_report()

        assert "corpus_limitation" in report
        lim = report["corpus_limitation"]
        assert lim["warning"] == CORPUS_LIMITATION_WARNING
        assert "This report is based only on the literature currently available in the GapGuard corpus." in lim["warning"]
        assert "Human academic review is required." in lim["warning"]
        assert lim["corpus_size"] > 0
        assert "Computer Vision" in lim["corpus_domain"]
        assert "TF-IDF" in lim["retrieval_method"]

    def test_m_api_handles_incomplete_analysis_data_safely(self):
        """Test M: POST /api/submission-readiness/analyze handles empty and incomplete payloads safely."""
        # 1. Empty payload
        resp_empty = client.post("/api/submission-readiness/analyze", json={})
        assert resp_empty.status_code == 200
        data_empty = resp_empty.json()
        assert data_empty["success"] is True
        assert data_empty["gap_review"]["analysis_status"] == STATUS_NOT_RUN
        assert data_empty["contribution_review"]["analysis_status"] == STATUS_NOT_RUN
        assert data_empty["evidence_coverage_review"]["analysis_status"] == STATUS_NOT_RUN
        assert data_empty["revision_review"]["analysis_status"] == STATUS_NOT_RUN

        # 2. Incomplete payload (only project_id provided)
        resp_partial = client.post(
            "/api/submission-readiness/analyze",
            json={"project_id": "proj-999"},
        )
        assert resp_partial.status_code == 200
        data_partial = resp_partial.json()
        assert data_partial["project_id"] == "proj-999"
        assert data_partial["corpus_limitation"]["warning"] == CORPUS_LIMITATION_WARNING

        # 3. Payload with research information executing live services safely
        resp_live = client.post(
            "/api/submission-readiness/analyze",
            json={
                "project_id": "test-proj",
                "research_information": {
                    "claimed_research_gap": "Vision transformer token attribution under variable lighting",
                    "expected_contribution": "Attribution alignment method with post-training quantization",
                    "major_claims": [
                        "Attribution alignment improves interpretability by 24%",
                        "Token quantization reduces memory budget by 45%",
                    ],
                },
            },
        )
        assert resp_live.status_code == 200
        data_live = resp_live.json()
        assert data_live["success"] is True
        assert data_live["gap_review"]["analysis_status"] in (STATUS_AVAILABLE, STATUS_REVIEW_RECOMMENDED, STATUS_INSUFFICIENT)
        assert data_live["contribution_review"]["analysis_status"] in (STATUS_AVAILABLE, STATUS_REVIEW_RECOMMENDED, STATUS_INSUFFICIENT)
        assert data_live["evidence_coverage_review"]["analysis_status"] in (STATUS_AVAILABLE, STATUS_REVIEW_RECOMMENDED, STATUS_INSUFFICIENT)
        assert len(data_live["review_checklist"]) == 9

    def test_review_checklist_tasks_are_non_scoring(self):
        """Test that the review checklist contains the 9 required academic review tasks."""
        report = submission_readiness_service.build_report()
        checklist = report["review_checklist"]
        assert len(checklist) == 9

        task_names = [item["task"] for item in checklist]
        assert "Research gap reviewed against available literature" in task_names
        assert "Potentially contradictory evidence reviewed" in task_names
        assert "Proposed contribution differentiated from relevant literature" in task_names
        assert "Major claims reviewed against available evidence" in task_names
        assert "Insufficient-evidence claims reviewed" in task_names
        assert "Evaluation metrics reviewed" in task_names
        assert "References reviewed" in task_names
        assert "Revised manuscript re-analyzed if changes were made" in task_names
        assert "Human academic review completed" in task_names

        # Verify no score is associated with checklist
        for item in checklist:
            assert "score" not in item
            assert "weight" not in item
            assert item["status"] == "Pending Review"
