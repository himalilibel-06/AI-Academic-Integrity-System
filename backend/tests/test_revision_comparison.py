"""
GapGuard AI — Tests for Manuscript Revision Comparison (Phase 10A)

Verifies:
H. Unchanged field detected.
I. Modified field detected.
J. Added field detected.
K. Removed field detected.
L. Major claims list additions/removals detected.
M. Comparing manuscripts from different projects is rejected safely.
N. Missing extraction data is handled safely.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.revision_comparator import (
    RevisionComparatorService,
    revision_comparator_service,
    STATUS_UNCHANGED,
    STATUS_ADDED,
    STATUS_MODIFIED,
    STATUS_REMOVED,
    STATUS_NOT_AVAILABLE,
    REVISION_DISCLAIMER,
)

client = TestClient(app)


class TestRevisionComparatorService:
    """Unit test suite for RevisionComparatorService."""

    def test_h_unchanged_field_detected(self):
        """Test H: Identical text between versions is labeled 'Unchanged' with similarity 1.0."""
        prev_info = {
            "title": "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
            "research_problem": "Attribution opacity in vision-language models for clinical diagnostics.",
        }
        new_info = {
            "title": "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
            "research_problem": "Attribution opacity in vision-language models for clinical diagnostics.",
        }

        res = revision_comparator_service.compare_revisions(
            previous_info=prev_info,
            new_info=new_info,
            previous_project_id="proj_01",
            new_project_id="proj_01",
        )

        title_comp = res["field_comparisons"]["title"]
        assert title_comp["change_status"] == STATUS_UNCHANGED
        assert title_comp["similarity"] == 1.0

        problem_comp = res["field_comparisons"]["research_problem"]
        assert problem_comp["change_status"] == STATUS_UNCHANGED
        assert problem_comp["similarity"] == 1.0

    def test_i_modified_field_detected(self):
        """Test I: Text modified between versions is labeled 'Modified' with diff similarity."""
        prev_info = {
            "claimed_research_gap": "Vision transformers exceed microcontroller memory budgets in agriculture.",
        }
        new_info = {
            "claimed_research_gap": "Vision transformers exceed microcontroller memory budgets and battery limits in remote IoT sensors.",
        }

        res = revision_comparator_service.compare_revisions(
            previous_info=prev_info,
            new_info=new_info,
            previous_project_id="proj_01",
            new_project_id="proj_01",
        )

        gap_comp = res["field_comparisons"]["claimed_research_gap"]
        assert gap_comp["change_status"] == STATUS_MODIFIED
        assert 0.0 < gap_comp["similarity"] < 1.0
        assert res["revision_summary"]["key_change_flags"]["claimed_research_gap_changed"] is True
        assert any("gap" in g.lower() for g in res["priority_guidance"])

    def test_j_added_field_detected(self):
        """Test J: Field present in new version but absent in previous version is labeled 'Added'."""
        prev_info = {
            "title": "Initial Study Draft",
            "proposed_method": None,
        }
        new_info = {
            "title": "Initial Study Draft",
            "proposed_method": "A multi-stage pruning and INT8 post-training quantization pipeline.",
        }

        res = revision_comparator_service.compare_revisions(
            previous_info=prev_info,
            new_info=new_info,
            previous_project_id="proj_01",
            new_project_id="proj_01",
        )

        method_comp = res["field_comparisons"]["proposed_method"]
        assert method_comp["change_status"] == STATUS_ADDED
        assert method_comp["previous_value"] is None
        assert "quantization" in method_comp["new_value"]
        assert res["revision_summary"]["fields_added"] >= 1

    def test_k_removed_field_detected(self):
        """Test K: Field present in previous version but cleared in new version is labeled 'Removed'."""
        prev_info = {
            "dataset_context": "CheXpert and MIMIC-CXR benchmark datasets.",
        }
        new_info = {
            "dataset_context": None,
        }

        res = revision_comparator_service.compare_revisions(
            previous_info=prev_info,
            new_info=new_info,
            previous_project_id="proj_01",
            new_project_id="proj_01",
        )

        dataset_comp = res["field_comparisons"]["dataset_context"]
        assert dataset_comp["change_status"] == STATUS_REMOVED
        assert dataset_comp["new_value"] is None
        assert res["revision_summary"]["fields_removed"] >= 1

    def test_l_major_claims_list_additions_removals_detected(self):
        """Test L: List fields track added_items, removed_items, and retained_items item by item."""
        prev_info = {
            "major_claims": [
                "INT8 quantization preserves 98.5% of baseline accuracy.",
                "Inference latency is reduced by 3.2x on ARM Cortex-M55.",
                "Deprecated claim on legacy FPGA hardware.",
            ],
            "references": [
                "Vaswani et al., 2017",
                "Devlin et al., 2019",
            ]
        }
        new_info = {
            "major_claims": [
                "INT8 quantization preserves 98.5% of baseline accuracy.",
                "Inference latency is reduced by 3.2x on ARM Cortex-M55.",
                "New claim on zero-shot generalization to unseen crop diseases.",
            ],
            "references": [
                "Vaswani et al., 2017",
                "Devlin et al., 2019",
                "Dosovitskiy et al., 2021",
            ]
        }

        res = revision_comparator_service.compare_revisions(
            previous_info=prev_info,
            new_info=new_info,
            previous_project_id="proj_01",
            new_project_id="proj_01",
        )

        claims_comp = res["field_comparisons"]["major_claims"]
        assert claims_comp["change_status"] == STATUS_MODIFIED
        assert len(claims_comp["retained_items"]) == 2
        assert len(claims_comp["added_items"]) == 1
        assert "New claim on zero-shot" in claims_comp["added_items"][0]
        assert len(claims_comp["removed_items"]) == 1
        assert "legacy FPGA" in claims_comp["removed_items"][0]

        ref_comp = res["field_comparisons"]["references"]
        assert ref_comp["change_status"] == STATUS_MODIFIED
        assert len(ref_comp["retained_items"]) == 2
        assert len(ref_comp["added_items"]) == 1
        assert "Dosovitskiy" in ref_comp["added_items"][0]

    def test_m_comparing_manuscripts_from_different_projects_is_rejected_safely(self):
        """Test M: Attempting to compare revisions from disparate projects raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            revision_comparator_service.compare_revisions(
                previous_info={"title": "Project A"},
                new_info={"title": "Project B"},
                previous_project_id="project_alpha",
                new_project_id="project_beta",
            )
        assert "same research project" in str(exc_info.value)

    def test_n_missing_extraction_data_is_handled_safely(self):
        """Test N: Missing or empty extraction dicts return Not Available without crashing."""
        res = revision_comparator_service.compare_revisions(
            previous_info=None,
            new_info={},
            previous_project_id="proj_01",
            new_project_id="proj_01",
        )

        summary = res["revision_summary"]
        assert summary["total_fields_compared"] == 13
        assert summary["fields_unavailable"] == 13
        assert summary["fields_modified"] == 0
        assert summary["fields_added"] == 0
        assert summary["fields_removed"] == 0
        assert res["disclaimer"] == REVISION_DISCLAIMER


class TestRevisionComparisonAPI:
    """REST API endpoint tests for POST /api/revision-comparison/compare."""

    def test_api_revision_comparison_success(self):
        """API test: Endpoint returns complete field diff and guidance for valid payload."""
        payload = {
            "project_id": "proj_demo",
            "previous_project_id": "proj_demo",
            "new_project_id": "proj_demo",
            "previous_version_label": "Version 1",
            "new_version_label": "Version 2",
            "previous_research_info": {
                "title": "Initial Title",
                "claimed_research_gap": "Memory limits on IoT.",
            },
            "new_research_info": {
                "title": "Initial Title",
                "claimed_research_gap": "Memory and battery limits on IoT.",
            },
        }

        response = client.post("/api/revision-comparison/compare", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "revision_summary" in data
        assert "field_comparisons" in data
        assert "priority_guidance" in data
        assert data["revision_summary"]["fields_unchanged"] >= 1
        assert data["revision_summary"]["fields_modified"] >= 1

    def test_api_revision_comparison_rejects_cross_project(self):
        """API test: Cross-project comparison returns 400 Bad Request."""
        payload = {
            "previous_project_id": "project_1",
            "new_project_id": "project_2",
            "previous_research_info": {},
            "new_research_info": {},
        }
        response = client.post("/api/revision-comparison/compare", json=payload)
        assert response.status_code == 400
        assert "same research project" in response.json()["detail"]
