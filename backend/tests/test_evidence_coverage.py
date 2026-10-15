"""
GapGuard AI — Tests for Evidence Coverage Auditor (Phase 10A)

Verifies:
A. Supported claim gets correct status (similarity >= 0.50).
B. Partially supported claim gets correct status (similarity >= 0.25).
C. Insufficient claim gets correct status (similarity < 0.25).
D. Empty claim does not crash and returns Insufficient Evidence.
E. Aggregate coverage calculation is correct.
F. Zero usable claims returns null coverage safely.
G. No fabricated evidence is generated.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.evidence_coverage import (
    EvidenceCoverageService,
    evidence_coverage_service,
    STATUS_SUPPORTED,
    STATUS_PARTIALLY_SUPPORTED,
    STATUS_INSUFFICIENT,
    CORPUS_LIMITATION_STATEMENT,
)

client = TestClient(app)


class MockRetriever:
    """Mock retriever returning controlled similarity scores for deterministic unit testing."""
    def __init__(self, papers_to_return=None):
        self.papers_to_return = papers_to_return or []

    def retrieve(self, query=None, top_k=5):
        return self.papers_to_return


class TestEvidenceCoverageAuditor:
    """Unit and integration test suite for Evidence Coverage Auditor."""

    def test_a_supported_claim_gets_correct_status(self):
        """Test A: Claim with strongest similarity >= 0.50 gets 'Supported by Available Evidence'."""
        mock_papers = [
            {
                "id": "paper_high",
                "title": "High Similarity Paper on Quantization",
                "similarity_score": 0.62,
                "publication_year": 2024,
                "abstract": "We present comprehensive empirical benchmarks for post-training quantization.",
                "matched_fields": ["title", "abstract"],
            },
            {
                "id": "paper_low",
                "title": "Lower Similarity Paper",
                "similarity_score": 0.31,
                "abstract": "General overview.",
                "matched_fields": ["title"],
            }
        ]
        svc = EvidenceCoverageService(retriever=MockRetriever(mock_papers))
        res = svc.audit_claim("Quantized neural networks reduce memory footprint by 75%.")

        assert res["is_usable"] is True
        assert res["evidence_status"] == STATUS_SUPPORTED
        assert res["strongest_similarity_score"] == 0.62
        assert "paper_high" in res["matched_paper_ids"]
        assert len(res["matched_papers"]) == 2

    def test_b_partially_supported_claim_gets_correct_status(self):
        """Test B: Claim with strongest similarity in [0.25, 0.50) gets 'Partially Supported'."""
        mock_papers = [
            {
                "id": "paper_partial",
                "title": "Partial Alignment Study",
                "similarity_score": 0.38,
                "contribution": "Evaluates edge compute latency in sensor networks.",
                "matched_fields": ["contribution"],
            }
        ]
        svc = EvidenceCoverageService(retriever=MockRetriever(mock_papers))
        res = svc.audit_claim("Edge microcontrollers experience memory bandwidth saturation.")

        assert res["is_usable"] is True
        assert res["evidence_status"] == STATUS_PARTIALLY_SUPPORTED
        assert res["strongest_similarity_score"] == 0.38
        assert "paper_partial" in res["matched_paper_ids"]

    def test_c_insufficient_claim_gets_correct_status(self):
        """Test C: Claim with strongest similarity < 0.25 gets 'Insufficient Evidence'."""
        mock_papers = [
            {
                "id": "paper_weak",
                "title": "Unrelated Topic Study",
                "similarity_score": 0.14,
                "abstract": "Astrophysical spectroscopy methods.",
                "matched_fields": ["title"],
            }
        ]
        svc = EvidenceCoverageService(retriever=MockRetriever(mock_papers))
        res = svc.audit_claim("Deep learning accelerators for precision agriculture.")

        assert res["is_usable"] is True
        assert res["evidence_status"] == STATUS_INSUFFICIENT
        assert res["strongest_similarity_score"] == 0.14

    def test_d_empty_claim_does_not_crash(self):
        """Test D: Empty, None, or unusable claim strings return Insufficient Evidence safely."""
        svc = EvidenceCoverageService(retriever=MockRetriever([]))

        for empty_val in ["", "   ", None, "N/A", "null"]:
            res = svc.audit_claim(empty_val)
            assert res["is_usable"] is False
            assert res["evidence_status"] == STATUS_INSUFFICIENT
            assert res["strongest_similarity_score"] == 0.0
            assert res["matched_paper_ids"] == []
            assert "No usable claim text" in res["reason"]

    def test_e_aggregate_coverage_calculation_is_correct(self):
        """Test E: Coverage percentage is correctly computed as (supported / usable) * 100."""
        # 3 claims: 2 supported, 1 partially supported, 1 empty (unusable)
        # Total claims = 4, usable = 3, supported = 2 -> coverage = (2 / 3) * 100 = 66.67%
        def dynamic_mock(claim, top_k=5):
            text = str(claim)
            if "supported" in text.lower():
                return [{"id": "p1", "title": "P1", "similarity_score": 0.58, "abstract": "P1 abstract"}]
            if "partial" in text.lower():
                return [{"id": "p2", "title": "P2", "similarity_score": 0.35, "abstract": "P2 abstract"}]
            return [{"id": "p3", "title": "P3", "similarity_score": 0.10, "abstract": "P3 abstract"}]

        class DynamicRetriever:
            def retrieve(self, query=None, top_k=5):
                return dynamic_mock(query, top_k)

        svc = EvidenceCoverageService(retriever=DynamicRetriever())
        claims = [
            "This is a supported claim with strong evidence.",
            "Another supported claim with solid grounding.",
            "A partial claim with moderate overlap.",
            "   ",  # unusable
        ]

        result = svc.audit_claims(claims=claims)
        cov = result["overall_coverage"]

        assert cov["total_claims"] == 4
        assert cov["usable_claims"] == 3
        assert cov["supported_claims"] == 2
        assert cov["partially_supported_claims"] == 1
        assert cov["insufficient_evidence_claims"] == 1
        assert cov["coverage_percentage"] == 66.67
        assert "66.7%" in cov["status_message"] or "66.67%" in cov["status_message"]

    def test_f_zero_usable_claims_returns_null_coverage_safely(self):
        """Test F: Zero usable claims safely yields coverage_percentage = None and clean status message."""
        svc = EvidenceCoverageService(retriever=MockRetriever([]))
        claims = ["", "  ", None]

        result = svc.audit_claims(claims=claims)
        cov = result["overall_coverage"]

        assert cov["total_claims"] == 3
        assert cov["usable_claims"] == 0
        assert cov["coverage_percentage"] is None
        assert "Insufficient claim data" in cov["status_message"]

    def test_g_no_fabricated_evidence_is_generated(self):
        """Test G: Excerpts reflect actual paper fields or are blank; no LLM invention occurs."""
        mock_papers = [
            {
                "id": "paper_real",
                "title": "Documented Limitation Paper",
                "similarity_score": 0.55,
                "abstract": "Exact abstract sentence from existing corpus record.",
                "matched_fields": ["abstract"],
            }
        ]
        svc = EvidenceCoverageService(retriever=MockRetriever(mock_papers))
        res = svc.audit_claim("Explicit claim test")

        assert len(res["matched_papers"]) == 1
        p = res["matched_papers"][0]
        assert p["excerpt"] == "Exact abstract sentence from existing corpus record."
        assert p["paper_id"] == "paper_real"


class TestEvidenceCoverageAPI:
    """REST API endpoint tests for POST /api/evidence-coverage/analyze."""

    def test_api_evidence_coverage_with_claims(self):
        """API test: Endpoint succeeds with explicit list of claims."""
        payload = {
            "project_id": "proj_demo",
            "claims": [
                "Quantized models run efficiently on embedded microcontrollers.",
                "Knowledge graph reasoning provides explainable inference traces.",
            ],
            "top_k": 3,
        }
        response = client.post("/api/evidence-coverage/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["project_id"] == "proj_demo"
        assert "overall_coverage" in data
        assert "claim_analyses" in data
        assert len(data["claim_analyses"]) == 2
        assert "corpus_limitation_statement" in data
        assert data["corpus_limitation_statement"] == CORPUS_LIMITATION_STATEMENT

    def test_api_evidence_coverage_rejects_empty_request(self):
        """API test: Request with no claims, info, or IDs returns 400 Bad Request."""
        response = client.post("/api/evidence-coverage/analyze", json={"top_k": 5})
        assert response.status_code == 400
        assert "Either 'claims'" in response.json()["detail"]
