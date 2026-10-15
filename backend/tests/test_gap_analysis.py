"""
GapGuard AI — Research Gap Contradiction Checker Tests

Verifies Phase 6 requirements:
1. Missing claimed gap is rejected safely.
2. Empty evidence produces Insufficient Evidence.
3. Strong limitation alignment produces Supported by Available Evidence.
4. Direct contribution overlap produces Potentially Contradicted.
5. Partial evidence produces Partially Supported.
6. Scores are normalized between 0 and 1.
7. Evidence statements originate from corpus fields.
8. Overall counts are mathematically correct.
9. Existing literature retrieval layer is reused.
10. API endpoint succeeds.
11. API validation works (rejects missing gap, invalid top_k).
12. No prohibited claims (such as "research is not novel" or "plagiarism") are produced.
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
from services.gap_analyzer import gap_analyzer, compute_overlap, tokenize, CORPUS_LIMITATION_STATEMENT
from services.literature_retrieval import literature_retriever


client = TestClient(app)


class TestResearchGapAnalyzerService:
    """Service-level unit tests for ResearchGapAnalyzer."""

    def test_missing_claimed_gap_rejected(self):
        """Missing or empty claimed research gap raises ValueError."""
        with pytest.raises(ValueError, match="Claimed research gap is required"):
            gap_analyzer.analyze_gap(
                research_info={"title": "Test", "claimed_research_gap": ""},
                evidence_papers=[{"paper_id": "P001", "title": "Test Paper"}],
            )

        with pytest.raises(ValueError, match="Claimed research gap is required"):
            gap_analyzer.analyze_gap(
                research_info={"title": "Test"},
                evidence_papers=[],
            )

    def test_empty_evidence_produces_insufficient_evidence(self):
        """Empty evidence list produces Insufficient Evidence status safely."""
        res = gap_analyzer.analyze_gap(
            research_info={
                "title": "Edge AI",
                "claimed_research_gap": "Limited research on microcontrollers in field agriculture.",
            },
            evidence_papers=[],
        )
        assert res["overall_assessment"]["status"] == "Insufficient Evidence"
        assert res["overall_assessment"]["evidence_count"] == 0
        assert res["overall_assessment"]["supporting"] == 0
        assert res["overall_assessment"]["potentially_contradicted"] == 0
        assert res["paper_analyses"] == []
        assert "This analysis is based only on the available literature corpus" in res["corpus_limitation"]

    def test_strong_limitation_alignment_produces_supported(self):
        """
        When evidence paper explicitly documents a limitation matching student's gap,
        and does not claim to solve it, status is Supported by Available Evidence.
        """
        sample_paper = {
            "paper_id": "P_SUPP",
            "title": "Vision Models for Plant Leaf Inspection",
            "research_problem": "Leaf disease detection on agricultural crops.",
            "method": "Convolutional Neural Network",
            "dataset": "Single-leaf closeup datasets",
            "contribution": "Demonstrated 94% accuracy on isolated laboratory leaf closeups.",
            "limitations": "Evaluated primarily on single-leaf closeups; multi-leaf overlapping canopies in dense orchards degrade precision.",
            "abstract": "Laboratory leaf detection study.",
        }

        research_info = {
            "title": "Dense Canopy Multi-Leaf Diagnosis",
            "research_problem": "Crop disease detection in dense orchard canopies.",
            "claimed_research_gap": "Evaluated primarily on single-leaf closeups; multi-leaf overlapping canopies in dense orchards remain unaddressed.",
            "proposed_method": "Multi-scale attention segmentation",
            "dataset_context": "Orchard canopy field images",
            "expected_contribution": "Canopy segmentation for overlapping foliage",
        }

        analysis = gap_analyzer.analyze_paper_evidence(research_info, sample_paper)
        assert analysis["evidence_relationship"] == "Supported by Available Evidence"
        assert analysis["scores"]["limitation_alignment"] >= 0.35
        assert analysis["scores"]["contribution_overlap"] < 0.40
        assert "Review Recommended" not in analysis["evidence_relationship"]
        assert len(analysis["evidence"]) >= 1
        assert "orchards" in analysis["evidence"][0].lower() or any("limitation" in s.lower() for s in analysis["evidence"])

    def test_direct_contribution_overlap_produces_potentially_contradicted(self):
        """
        When evidence paper reports a contribution directly addressing what student claims is missing,
        status is Potentially Contradicted.
        """
        sample_paper = {
            "paper_id": "P_CONTRA",
            "title": "Cross-Farm Domain Adaptation for Crop Foliar Disease Detection Under Acute Illumination Shifts",
            "research_problem": "Catastrophic accuracy degradation of agricultural deep models when transferred across different geographical farms exhibiting diverse solar illumination angles and shadow artifacts.",
            "method": "Adversarial domain alignment using dual gradient-reversal classifiers with illumination-invariant contrastive loss.",
            "dataset": "CrossFarm-Bench comprising paired studio images and uncurated outdoor field images across 8 farms.",
            "contribution": "A domain-invariant feature extraction framework that restores field transfer accuracy under acute illumination shifts across farms.",
            "limitations": "Requires unlabeled target-domain images captured at test farms during calibration.",
            "abstract": "We introduce SolarAdapt, an unsupervised adversarial domain adaptation framework that disentangles invariant structural lesion features from transient photometric illumination artifacts.",
        }

        research_info = {
            "title": "Cross-Farm Illumination Robustness",
            "research_problem": "Agricultural deep models fail across geographical farms exhibiting diverse solar illumination angles.",
            "claimed_research_gap": "A domain-invariant feature extraction framework under acute illumination shifts across farms has not been demonstrated.",
            "proposed_method": "Domain alignment",
            "dataset_context": "Outdoor field images",
            "expected_contribution": "Illumination invariant feature extraction",
        }

        analysis = gap_analyzer.analyze_paper_evidence(research_info, sample_paper)
        assert analysis["evidence_relationship"] == "Potentially Contradicted"
        assert analysis["scores"]["contribution_overlap"] >= 0.45
        assert "Review this paper and clarify how the proposed research differs" in analysis["recommendation"]
        assert any("contribution" in s.lower() or "illumination" in s.lower() for s in analysis["evidence"])

    def test_partial_evidence_produces_partially_supported(self):
        """
        When evidence overlaps with the claimed gap but the paper addresses only part
        of the claimed missing area (prompt Section 8 example), status is Partially Supported.
        """
        sample_paper = {
            "paper_id": "P_PART",
            "title": "Field Evaluation of Crop Disease Detection Under Overcast Conditions",
            "research_problem": "Evaluating deep learning crop disease models under real-world field conditions.",
            "method": "Convolutional neural network benchmark",
            "dataset": "Outdoor farm field photographs",
            "contribution": "Evaluates field images under one environmental condition (overcast lighting).",
            "limitations": "Conducted across a single agricultural season in one region.",
            "abstract": "We evaluate agricultural models under outdoor conditions.",
        }

        research_info = {
            "title": "Comprehensive Robustness Across Variable Field Conditions",
            "research_problem": "Evaluating deep learning crop disease models under real-world field conditions.",
            "claimed_research_gap": "Existing methods fail under real-world field conditions with variable illumination and canopy occlusion.",
            "proposed_method": "Multi-condition contrastive learning",
            "dataset_context": "Multi-season diverse field captures",
            "expected_contribution": "Robustness across diverse field illumination and occlusion",
        }

        analysis = gap_analyzer.analyze_paper_evidence(research_info, sample_paper)
        assert analysis["evidence_relationship"] == "Partially Supported"
        assert analysis["scores"]["problem_overlap"] >= 0.20 or analysis["scores"]["contribution_overlap"] >= 0.20
        assert "differentiation" in analysis["reason"].lower() or "partial" in analysis["reason"].lower()

    def test_scores_are_within_zero_to_one(self):
        """All overlap dimension scores must be within [0.0, 1.0]."""
        test_info = {
            "title": "AI in Agriculture",
            "claimed_research_gap": "Transformers on edge microcontrollers in rural orchards.",
            "research_problem": "Edge computing plant pathology.",
            "proposed_method": "Pruned attention",
            "dataset_context": "Field crops",
            "expected_contribution": "Low latency inference",
        }
        test_paper = {
            "paper_id": "P001",
            "title": "Lightweight Vision Transformers for Real-Time Plant Pathology on Edge Microcontrollers",
            "research_problem": "High computational complexity of Vision Transformers on battery hardware.",
            "method": "8-bit quantization and token subsampling.",
            "dataset": "PlantVillage and InFieldCrop-50K.",
            "contribution": "Compressed vision transformer with 4.8x latency reduction.",
            "limitations": "Evaluated primarily on single-leaf closeups in orchards.",
        }
        analysis = gap_analyzer.analyze_paper_evidence(test_info, test_paper)
        for dim, score in analysis["scores"].items():
            assert 0.0 <= score <= 1.0, f"Score for {dim} was {score}, expected between 0 and 1."

    def test_evidence_statements_originate_from_corpus_fields(self):
        """Grounded explainability: evidence statements must include actual text from paper fields."""
        paper = {
            "paper_id": "P_GROUNDED",
            "title": "Autonomous Drone Scouting for Orchard Pest Localization",
            "research_problem": "Aerial drone navigation under dense orchard tree canopies.",
            "method": "Simultaneous Localization and Mapping with LiDAR",
            "dataset": "Citrus orchard sensor logs",
            "contribution": "Autonomous flight path generation beneath 4-meter tree canopies.",
            "limitations": "Sensor drift in high wind velocities exceeds safety thresholds.",
        }
        info = {
            "claimed_research_gap": "Sensor drift in high wind velocities during aerial drone navigation.",
            "research_problem": "Aerial drone navigation under dense orchard tree canopies.",
        }
        analysis = gap_analyzer.analyze_paper_evidence(info, paper)
        combined_evidence = " ".join(analysis["evidence"]).lower()
        # Verify paper's exact words appear in the generated evidence statements
        assert "drone navigation" in combined_evidence or "orchard" in combined_evidence or "wind" in combined_evidence

    def test_overall_counts_are_mathematically_correct(self):
        """Total evidence count equals the sum of individual relationship categories."""
        papers = [
            {
                "paper_id": "P1",
                "title": "Paper 1",
                "contribution": "Directly solves the exact claimed gap with domain invariant features.",
                "research_problem": "Problem 1",
                "limitations": "None",
            },
            {
                "paper_id": "P2",
                "title": "Paper 2",
                "contribution": "Lab only",
                "research_problem": "Problem 1",
                "limitations": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            },
            {
                "paper_id": "P3",
                "title": "Paper 3",
                "contribution": "Unrelated topic",
                "research_problem": "Completely unrelated subject matter xyz",
                "limitations": "Unrelated",
            },
        ]
        info = {
            "claimed_research_gap": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            "research_problem": "Problem 1",
        }
        res = gap_analyzer.analyze_gap(info, papers)
        counts = res["overall_assessment"]
        assert counts["evidence_count"] == 3
        sum_categories = (
            counts["supporting"] +
            counts["partial"] +
            counts["potentially_contradicted"] +
            counts["insufficient"]
        )
        assert sum_categories == counts["evidence_count"]

    def test_no_prohibited_claims_produced(self):
        """
        Strict academic guardrail: Output must NEVER claim 'research is not novel',
        'gap is false', 'plagiarism', or 'invalid'.
        """
        prohibited = [
            "research is not novel",
            "your research is not novel",
            "gap is false",
            "you copied",
            "plagiarism detected",
            "research is invalid",
            "guaranteed originality",
            "novelty confirmed",
        ]
        sample_paper = {
            "paper_id": "P001",
            "title": "Test Paper",
            "research_problem": "Test Problem",
            "contribution": "Test Contribution",
            "limitations": "Test Limitation",
        }
        info = {
            "claimed_research_gap": "Test Contribution has not been explored in existing research.",
            "research_problem": "Test Problem",
        }
        res = gap_analyzer.analyze_gap(info, [sample_paper])
        full_text = str(res).lower()
        for phrase in prohibited:
            assert phrase not in full_text, f"Prohibited phrase '{phrase}' found in analyzer output!"

    def test_a_mixed_evidence_overall_status(self):
        """
        Test A — Mixed evidence:
        Evidence containing at least one supporting paper and at least one potentially contradictory paper.
        Expected: overall_status == 'Partially Supported'
        (Even when supporting papers outnumber contradictory papers; no majority voting).
        """
        papers = [
            {
                "paper_id": "P_SUPP_1",
                "title": "Supporting Paper 1",
                "research_problem": "Leaf disease detection on edge hardware.",
                "dataset": "Orchard field photos",
                "contribution": "Laboratory baseline tests only.",
                "limitations": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            },
            {
                "paper_id": "P_SUPP_2",
                "title": "Supporting Paper 2",
                "research_problem": "Leaf disease detection on edge hardware.",
                "dataset": "Orchard field photos",
                "contribution": "Initial model scaling.",
                "limitations": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            },
            {
                "paper_id": "P_CONTRA_1",
                "title": "Contradicting Paper",
                "research_problem": "Leaf disease detection on edge hardware in dense orchards.",
                "dataset": "Orchard field photos",
                "contribution": "Evaluated primarily on multi-leaf overlapping canopies in dense orchards with high accuracy.",
                "limitations": "Evaluated only on apple trees.",
            },
        ]
        info = {
            "claimed_research_gap": "Evaluated primarily on single leaves; multi-leaf overlapping canopies in dense orchards remain unaddressed.",
            "research_problem": "Leaf disease detection on edge hardware in dense orchards.",
            "dataset_context": "Orchard field photos",
        }
        res = gap_analyzer.analyze_gap(info, papers)
        assessment = res["overall_assessment"]
        assert assessment["supporting"] >= 1
        assert assessment["potentially_contradicted"] >= 1
        # Crucial check: overall status MUST be Partially Supported
        assert assessment["status"] == "Partially Supported"
        assert assessment["overall_status"] == "Partially Supported"

    def test_b_contribution_overlap_alone_not_contradicted(self):
        """
        Test B — Contribution overlap alone:
        High contribution_overlap with low problem_overlap, low dataset_overlap, and low limitation_alignment
        must NOT be classified as 'Potentially Contradicted'.
        (Similar words alone != Potential contradiction).
        """
        paper_unrelated_context = {
            "paper_id": "P_UNRELATED",
            "title": "Astrophysical Signal Processing and Galaxy Spectral Decomposition",
            "research_problem": "Radio telescope spectral calibration in interstellar astrophysics.",
            "method": "Fourier spectral filtering",
            "dataset": "Hubble and James Webb Deep Space spectroscopic archives",
            # Contribution borrows similar words from gap claim, but in an astrophysics context
            "contribution": "Demonstrated dynamic thermal throttling and voltage scaling under extreme outdoor heat.",
            "limitations": "Signal distortion at sub-millimeter radio frequencies.",
        }
        info = {
            "title": "Edge AI for Plant Pathology",
            "research_problem": "Deep learning crop foliar disease detection on edge microcontrollers in agricultural farms.",
            "claimed_research_gap": "Dynamic thermal throttling and voltage scaling under extreme outdoor heat.",
            "dataset_context": "Agricultural farm field images",
        }
        analysis = gap_analyzer.analyze_paper_evidence(info, paper_unrelated_context)
        assert analysis["scores"]["contribution_overlap"] >= 0.45
        assert analysis["scores"]["problem_overlap"] < 0.20
        assert analysis["scores"]["dataset_overlap"] < 0.20
        assert analysis["scores"]["limitation_alignment"] < 0.20
        # Critical assertion: must NOT be Potentially Contradicted
        assert analysis["evidence_relationship"] != "Potentially Contradicted"

    def test_c_contribution_plus_context_is_potentially_contradicted(self):
        """
        Test C — Contribution + context:
        High contribution_overlap AND meaningful problem/context overlap
        is classified as 'Potentially Contradicted'.
        """
        paper_with_context = {
            "paper_id": "P_RELEVANT_CONTRA",
            "title": "Thermal-Aware Deep Learning for Edge Crop Disease Detection",
            "research_problem": "Agricultural plant pathology deep models suffer failure on edge microcontrollers.",
            "method": "Dynamic frequency scaling network",
            "dataset": "Outdoor farm field temperature logs and crop photographs",
            "contribution": "A dynamic thermal throttling and voltage scaling framework under extreme outdoor heat for crop disease detection.",
            "limitations": "Only evaluated on ARM processors.",
        }
        info = {
            "title": "Edge AI for Plant Pathology",
            "research_problem": "Agricultural plant pathology deep models on edge microcontrollers.",
            "claimed_research_gap": "Dynamic thermal throttling and voltage scaling under extreme outdoor heat.",
            "dataset_context": "Outdoor farm field crop photographs",
        }
        analysis = gap_analyzer.analyze_paper_evidence(info, paper_with_context)
        assert analysis["scores"]["contribution_overlap"] >= 0.45
        assert (
            analysis["scores"]["problem_overlap"] >= 0.20
            or analysis["scores"]["dataset_overlap"] >= 0.20
        )
        assert analysis["evidence_relationship"] == "Potentially Contradicted"
        # Verify explainability includes contribution and context field
        assert "contribution" in analysis["reason"].lower()
        assert "research context" in analysis["reason"].lower()

    def test_d_supporting_evidence_only_overall_status(self):
        """
        Test D — Supporting evidence only:
        When literature contains supporting papers without contradictory evidence,
        overall status is 'Supported by Available Evidence'.
        """
        papers = [
            {
                "paper_id": "P_SUPP_ONLY_1",
                "title": "Supporting Paper A",
                "research_problem": "Plant disease classification.",
                "contribution": "Laboratory evaluation.",
                "limitations": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            },
            {
                "paper_id": "P_SUPP_ONLY_2",
                "title": "Supporting Paper B",
                "research_problem": "Plant disease classification.",
                "contribution": "Initial model benchmark.",
                "limitations": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            },
        ]
        info = {
            "claimed_research_gap": "Evaluated primarily on single leaves; multi-leaf canopies remain open future work.",
            "research_problem": "Plant disease classification.",
        }
        res = gap_analyzer.analyze_gap(info, papers)
        assert res["overall_assessment"]["status"] == "Supported by Available Evidence"
        assert res["overall_assessment"]["supporting"] >= 1
        assert res["overall_assessment"]["potentially_contradicted"] == 0

    def test_e_no_useful_evidence_overall_status(self):
        """
        Test E — No useful evidence:
        When all evidence is insufficient, overall status is 'Insufficient Evidence'.
        """
        papers = [
            {
                "paper_id": "P_UNUSEFUL_1",
                "title": "Quantum Spin Liquids in Frustrated Magnets",
                "research_problem": "Condensed matter physics.",
                "contribution": "Theoretical phase diagrams.",
                "limitations": "Low temperature approximations.",
            },
            {
                "paper_id": "P_UNUSEFUL_2",
                "title": "High-Pressure Synthesis of Superconducting Hydrides",
                "research_problem": "Materials science crystallography.",
                "contribution": "Diamond anvil cell measurements.",
                "limitations": "Diamond culet deformation.",
            },
        ]
        info = {
            "claimed_research_gap": "Lightweight MobileNet on agricultural microcontrollers under wind motion.",
            "research_problem": "Crop disease detection on drones.",
        }
        res = gap_analyzer.analyze_gap(info, papers)
        assert res["overall_assessment"]["status"] == "Insufficient Evidence"
        assert res["overall_assessment"]["insufficient"] == 2
        assert res["overall_assessment"]["supporting"] == 0
        assert res["overall_assessment"]["potentially_contradicted"] == 0


class TestResearchGapAnalysisAPI:
    """API endpoint integration tests for POST /api/gap-analysis/analyze."""

    def test_api_analyze_gap_success(self):
        """API successfully retrieves evidence and analyzes gap against local corpus."""
        payload = {
            "research_information": {
                "title": "Low-Power Vision Transformers for Plant Pathology",
                "research_problem": "High computational complexity of deep vision models on edge microcontrollers in rural farms.",
                "claimed_research_gap": "Evaluated primarily on single-leaf closeups; multi-leaf overlapping canopies in dense orchards degrade precision.",
                "proposed_method": "Quantized hierarchical transformer with canopy attention",
                "dataset_context": "In-field orchard leaf images",
                "expected_contribution": "Canopy-level multi-leaf classification on ARM microcontrollers",
                "keywords": ["Vision Transformers", "Edge Computing", "Plant Pathology"],
            },
            "top_k": 5,
        }
        resp = client.post("/api/gap-analysis/analyze", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["success"] is True
        assert "overall_assessment" in data
        assert "status" in data["overall_assessment"]
        assert data["overall_assessment"]["evidence_count"] <= 5
        assert len(data["paper_analyses"]) <= 5
        assert data["claimed_research_gap"] == payload["research_information"]["claimed_research_gap"]
        assert "corpus_limitation" in data
        assert "This analysis is based only on the available literature corpus" in data["corpus_limitation"]

        # Check structure of paper analyses
        if data["paper_analyses"]:
            p0 = data["paper_analyses"][0]
            assert "paper_id" in p0
            assert "evidence_relationship" in p0
            assert p0["evidence_relationship"] in [
                "Supported by Available Evidence",
                "Partially Supported",
                "Potentially Contradicted",
                "Insufficient Evidence",
            ]
            assert "scores" in p0
            assert "problem_overlap" in p0["scores"]
            assert "contribution_overlap" in p0["scores"]
            assert "limitation_alignment" in p0["scores"]
            assert "evidence" in p0
            assert "reason" in p0
            assert "recommendation" in p0

    def test_api_missing_claimed_gap_rejected(self):
        """API rejects requests missing claimed_research_gap with 422."""
        payload = {
            "research_information": {
                "title": "A Study on AI",
                "research_problem": "Some problem description",
                # claimed_research_gap is missing!
            },
            "top_k": 5,
        }
        resp = client.post("/api/gap-analysis/analyze", json=payload)
        assert resp.status_code == 422
        assert "claimed_research_gap" in resp.json()["detail"]

    def test_api_empty_claimed_gap_rejected(self):
        """API rejects requests with empty/whitespace claimed_research_gap."""
        payload = {
            "research_information": {
                "title": "A Study on AI",
                "claimed_research_gap": "   ",
            },
            "top_k": 5,
        }
        resp = client.post("/api/gap-analysis/analyze", json=payload)
        assert resp.status_code == 422
        assert "claimed_research_gap" in resp.json()["detail"]

    def test_api_invalid_top_k_rejected(self):
        """API rejects top_k outside [1, 20]."""
        payload = {
            "research_information": {
                "claimed_research_gap": "Some valid gap statement.",
            },
            "top_k": 30,  # Invalid: > 20
        }
        resp = client.post("/api/gap-analysis/analyze", json=payload)
        assert resp.status_code in [400, 422]

        payload["top_k"] = 0  # Invalid: < 1
        resp = client.post("/api/gap-analysis/analyze", json=payload)
        assert resp.status_code in [400, 422]

    def test_api_reuses_literature_retrieval(self):
        """Verification that existing literature retriever is invoked."""
        # Querying with a specific agricultural problem should retrieve papers from literature_retriever
        payload = {
            "research_information": {
                "title": "Few-Shot Meta-Learning for Rare Crop Pathogens",
                "research_problem": "Supervised deep learning requires thousands of training samples per class, making early detection of newly emerging crop diseases impractical.",
                "claimed_research_gap": "Adaptive class prototypes for 1-shot rare crop disease identification with fewer than 5 exemplars have not been studied.",
                "proposed_method": "Episodic meta-learning with metric relation networks",
            },
            "top_k": 3,
        }
        resp = client.post("/api/gap-analysis/analyze", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Verify papers returned originated from local literature corpus
        paper_ids = [p["paper_id"] for p in data["paper_analyses"]]
        assert len(paper_ids) > 0
        assert any(pid.startswith("P") for pid in paper_ids)
