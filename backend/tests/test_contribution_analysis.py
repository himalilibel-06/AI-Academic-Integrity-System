"""
GapGuard AI — Contribution Differentiation Engine Tests

Verifies Phase 7 requirements:
A. Clearly differentiated contribution -> 'Clearly Differentiated'
B. Partial differentiation -> 'Partially Differentiated'
C. Potential overlap (contribution + context) -> 'Potential Overlap'
D. Contribution overlap alone -> must NOT automatically become 'Potential Overlap'
E. Needs clarification (ambiguous / incomplete info) -> 'Needs Clarification'
F. Aggregate project-level counts match individual paper classifications
G. Explainability references matched dimensions and corpus evidence
H. API integration tests for POST /api/contribution-analysis/analyze
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.contribution_differentiator import contribution_differentiator


client = TestClient(app)


class TestContributionDifferentiatorService:
    """Service-level unit tests for ContributionDifferentiatorService."""

    def test_a_clearly_differentiated_contribution(self):
        """
        Test A — Clearly differentiated contribution:
        Low overlap across relevant dimensions must yield 'Clearly Differentiated'.
        """
        paper = {
            "paper_id": "P_DIFF",
            "title": "Quantum Spin Liquids in Frustrated Kagome Antiferromagnets",
            "research_problem": "Theoretical ground state degeneracy in quantum magnet lattices.",
            "method": "Exact diagonalization and tensor network density renormalization.",
            "dataset": "Numerical lattice simulation matrices.",
            "contribution": "Mapped complete quantum phase diagram of spin-1/2 Heisenberg models.",
            "abstract": "We study frustrated magnetic spin systems using tensor networks.",
        }

        research_info = {
            "title": "Edge AI for Plant Pathology",
            "research_problem": "Deep learning crop disease detection on edge microcontrollers in rural farms.",
            "proposed_method": "Pruned 8-bit quantized vision transformer with token subsampling",
            "dataset_context": "In-field apple and citrus foliar disease photographs",
            "expected_contribution": "A real-time edge vision transformer achieving sub-15ms latency on ARM microcontrollers.",
            "evaluation_metrics": "Latency, top-1 accuracy, peak RAM",
        }

        analysis = contribution_differentiator.analyze_paper(research_info, paper)
        assert analysis["classification"] == "Clearly Differentiated"
        for dim, score in analysis["scores"].items():
            assert 0.0 <= score <= 1.0
            assert score < 0.25

    def test_b_partial_differentiation(self):
        """
        Test B — Partial differentiation:
        Paper shares research problem/techniques but has clear differences in method, dataset, or focus.
        Must yield 'Partially Differentiated'.
        """
        paper = {
            "paper_id": "P_PARTIAL",
            "title": "Field Evaluation of Foliar Crop Lesions Using Convolutional Networks",
            "research_problem": "Crop disease detection in rural agricultural environments.",
            "method": "ResNet-50 and standard dense convolutional feature extractors.",
            "dataset": "PlantVillage laboratory bench images.",
            "contribution": "Benchmark comparing ResNet and VGG on laboratory leaf closeups.",
            "abstract": "We benchmark deep convolutional architectures for crop pathology.",
        }

        research_info = {
            "title": "Edge Vision Transformers in Agricultural Orchards",
            "research_problem": "Crop disease detection in rural agricultural environments.",
            "proposed_method": "Hierarchical quantized Vision Transformer with attention pruning",
            "dataset_context": "High-occlusion dense orchard canopy photographs",
            "expected_contribution": "First low-power transformer architecture deployed on ARM Cortex-M55 microcontrollers.",
            "evaluation_metrics": "Energy efficiency, FPS, latency",
        }

        analysis = contribution_differentiator.analyze_paper(research_info, paper)
        assert analysis["classification"] == "Partially Differentiated"
        assert analysis["scores"]["problem_overlap"] >= 0.25
        assert analysis["scores"]["method_overlap"] < 0.30
        assert "differentiated" in analysis["explanation"].lower() or "partial" in analysis["explanation"].lower()

    def test_c_potential_overlap_contribution_plus_context(self):
        """
        Test C — Potential overlap:
        High contribution overlap PLUS meaningful contextual overlap (problem, method, or dataset)
        yields 'Potential Overlap'.
        """
        paper = {
            "paper_id": "P_OVERLAP",
            "title": "Lightweight Vision Transformers for Real-Time Plant Pathology on Edge Microcontrollers",
            "research_problem": "High computational complexity of Vision Transformers prevents real-time deployment on edge microcontrollers in farming areas.",
            "method": "Hierarchical token subsampling combined with 8-bit integer quantization.",
            "dataset": "InFieldCrop-50K benchmark leaf images under variable sunlight.",
            "contribution": "A compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers with high accuracy.",
            "abstract": "Automated crop diagnosis on low-power edge microcontrollers without cloud connectivity.",
        }

        research_info = {
            "title": "Edge-Optimized Vision Transformers for Plant Pathology",
            "research_problem": "High computational complexity of Vision Transformers on low-power microcontrollers in farming areas.",
            "proposed_method": "Hierarchical token subsampling and post-training 8-bit quantization",
            "dataset_context": "InFieldCrop-50K benchmark leaf images under sunlight",
            "expected_contribution": "A compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers with high accuracy.",
            "evaluation_metrics": "Latency, accuracy, memory footprint",
        }

        analysis = contribution_differentiator.analyze_paper(research_info, paper)
        assert analysis["classification"] == "Potential Overlap"
        assert analysis["scores"]["contribution_overlap"] >= 0.50
        assert (
            analysis["scores"]["problem_overlap"] >= 0.25
            or analysis["scores"]["method_overlap"] >= 0.25
            or analysis["scores"]["dataset_overlap"] >= 0.25
        )
        assert "potential overlap" in analysis["explanation"].lower()

    def test_d_contribution_overlap_alone_not_potential_overlap(self):
        """
        Test D — Contribution overlap alone:
        High contribution lexical overlap WITHOUT contextual overlap
        must NOT automatically become 'Potential Overlap'.
        """
        paper = {
            "paper_id": "P_LEXICAL_ONLY",
            "title": "Autonomous Underwater Acoustic Localization for Marine Robotics",
            "research_problem": "Acoustic signal attenuation in deep sea benthic navigation.",
            "method": "Doppler sonar velocity logging and particle filtering.",
            "dataset": "NOAA oceanographic sonar acoustic telemetry logs.",
            # Incidental overlap in generic contribution wording
            "contribution": "A compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers.",
            "abstract": "We investigate acoustic beacon tracking in oceanic trenches.",
        }

        research_info = {
            "title": "Edge AI for Plant Pathology",
            "research_problem": "Deep learning crop foliar disease detection on edge microcontrollers in agricultural farms.",
            "proposed_method": "Patch pruning attention network",
            "dataset_context": "Citrus farm foliage imagery",
            "expected_contribution": "A compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers.",
            "evaluation_metrics": "Latency, memory",
        }

        analysis = contribution_differentiator.analyze_paper(research_info, paper)
        assert analysis["scores"]["contribution_overlap"] >= 0.50
        assert analysis["scores"]["problem_overlap"] < 0.25
        assert analysis["scores"]["dataset_overlap"] < 0.25
        # Must NOT be classified as Potential Overlap because context is missing!
        assert analysis["classification"] != "Potential Overlap"

    def test_e_needs_clarification_on_incomplete_info(self):
        """
        Test E — Needs clarification:
        Ambiguous or incomplete project contribution statement produces 'Needs Clarification'.
        """
        paper = {
            "paper_id": "P001",
            "title": "Lightweight Vision Transformers for Plant Pathology",
            "research_problem": "Crop disease detection on edge hardware.",
            "method": "Quantized transformers.",
            "dataset": "PlantVillage.",
            "contribution": "Latency reduction on microcontrollers.",
        }

        research_info = {
            "title": "Crop Project",
            "research_problem": "Crop disease detection.",
            "expected_contribution": "A model.",  # Too brief / uninformative (< 3 non-stopwords)
        }

        analysis = contribution_differentiator.analyze_paper(research_info, paper)
        assert analysis["classification"] == "Needs Clarification"
        assert "brief" in analysis["explanation"].lower() or "incomplete" in analysis["explanation"].lower()

    def test_f_aggregate_counts_match_classifications(self):
        """
        Test F — Aggregate counts:
        Verify project-level summary counts match paper-level classifications.
        """
        papers = [
            {
                "paper_id": "P1",
                "title": "Quantum Physics",
                "research_problem": "Quantum lattices",
                "contribution": "Spin liquid phase",
                "method": "Exact diagonalization",
            },
            {
                "paper_id": "P2",
                "title": "Crop Disease Benchmark",
                "research_problem": "Plant disease classification",
                "contribution": "Benchmark study",
                "method": "ResNet",
            },
            {
                "paper_id": "P3",
                "title": "Edge Vision Transformers in Agriculture",
                "research_problem": "Edge microcontrollers in plant pathology",
                "contribution": "Compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers",
                "method": "Hierarchical token subsampling and 8-bit quantization",
            },
        ]

        research_info = {
            "title": "Edge Vision Transformers in Agriculture",
            "research_problem": "Edge microcontrollers in plant pathology",
            "proposed_method": "Hierarchical token subsampling and 8-bit quantization",
            "expected_contribution": "Compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers",
        }

        res = contribution_differentiator.analyze_project_differentiation(research_info, papers)
        summary = res["project_summary"]

        assert summary["total_papers_compared"] == 3
        sum_categories = (
            summary["clearly_differentiated_count"] +
            summary["partially_differentiated_count"] +
            summary["needs_clarification_count"] +
            summary["potential_overlap_count"]
        )
        assert sum_categories == summary["total_papers_compared"]
        assert len(summary["strongest_overlapping_dimensions"]) == 6
        assert len(res["paper_analyses"]) == 3

    def test_g_explainability_grounded_in_corpus(self):
        """
        Test G — Explainability:
        Explanations and evidence must refer to actual matched dimensions and corpus fields.
        """
        paper = {
            "paper_id": "P_GROUND",
            "title": "Cross-Farm Foliar Disease Detection Under Illumination Shifts",
            "research_problem": "Catastrophic accuracy degradation of agricultural models under sunlight shifts.",
            "method": "Adversarial domain alignment.",
            "dataset": "CrossFarm-Bench outdoor field photographs.",
            "contribution": "A domain-invariant feature extraction framework restoring accuracy by 19.4%.",
        }

        research_info = {
            "title": "Cross-Farm Foliar Disease Detection",
            "research_problem": "Catastrophic accuracy degradation of agricultural models under sunlight shifts.",
            "proposed_method": "Adversarial domain alignment.",
            "dataset_context": "CrossFarm-Bench outdoor field photographs.",
            "expected_contribution": "A domain-invariant feature extraction framework restoring accuracy by 19.4%.",
        }

        analysis = contribution_differentiator.analyze_paper(research_info, paper)
        assert len(analysis["matched_dimensions"]) >= 1
        assert len(analysis["relevant_corpus_evidence"]) >= 1
        assert any("accuracy" in ev.lower() or "sunlight" in ev.lower() or "domain" in ev.lower() for ev in analysis["relevant_corpus_evidence"])


class TestContributionAnalysisAPI:
    """API endpoint integration tests for POST /api/contribution-analysis/analyze."""

    def test_api_analyze_contribution_success(self):
        """API executes 6-dimension differentiation and returns project summary."""
        payload = {
            "research_information": {
                "title": "Quantized Vision Transformers for Real-Time Plant Pathology",
                "research_problem": "High computational complexity of deep vision models on edge microcontrollers in rural farms.",
                "proposed_method": "Hierarchical token subsampling and 8-bit integer quantization",
                "dataset_context": "InFieldCrop-50K benchmark leaf images under variable sunlight",
                "expected_contribution": "A compressed vision transformer architecture achieving 4.8x latency reduction on ARM microcontrollers.",
                "evaluation_metrics": "Latency, accuracy, memory footprint",
            },
            "top_k": 5,
        }

        resp = client.post("/api/contribution-analysis/analyze", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["success"] is True
        assert "project_summary" in data
        assert data["project_summary"]["total_papers_compared"] <= 5
        assert "clearly_differentiated_count" in data["project_summary"]
        assert "partially_differentiated_count" in data["project_summary"]
        assert "potential_overlap_count" in data["project_summary"]
        assert "needs_clarification_count" in data["project_summary"]
        assert "strongest_overlapping_dimensions" in data["project_summary"]

        assert len(data["paper_analyses"]) <= 5
        if data["paper_analyses"]:
            p0 = data["paper_analyses"][0]
            assert "scores" in p0
            assert "problem_overlap" in p0["scores"]
            assert "objective_overlap" in p0["scores"]
            assert "method_overlap" in p0["scores"]
            assert "dataset_overlap" in p0["scores"]
            assert "contribution_overlap" in p0["scores"]
            assert "evaluation_overlap" in p0["scores"]
            assert p0["classification"] in [
                "Clearly Differentiated",
                "Partially Differentiated",
                "Needs Clarification",
                "Potential Overlap",
            ]
            assert "matched_dimensions" in p0
            assert "explanation" in p0
            assert "relevant_corpus_evidence" in p0

        assert "corpus_limitation" in data
        assert "This analysis is based only on the available literature corpus" in data["corpus_limitation"]

    def test_api_missing_contribution_and_problem_rejected(self):
        """API rejects requests missing both expected_contribution and research_problem with 422."""
        payload = {
            "research_information": {
                "title": "A Generic Title",
                "domain": "AI",
            },
            "top_k": 5,
        }
        resp = client.post("/api/contribution-analysis/analyze", json=payload)
        assert resp.status_code == 422
        assert "expected_contribution" in resp.json()["detail"] or "research_problem" in resp.json()["detail"]

    def test_api_invalid_top_k_rejected(self):
        """API rejects top_k outside [1, 20]."""
        payload = {
            "research_information": {
                "expected_contribution": "A novel edge model.",
            },
            "top_k": 25,  # Invalid: > 20
        }
        resp = client.post("/api/contribution-analysis/analyze", json=payload)
        assert resp.status_code in [400, 422]

        payload["top_k"] = 0  # Invalid: < 1
        resp = client.post("/api/contribution-analysis/analyze", json=payload)
        assert resp.status_code in [400, 422]
