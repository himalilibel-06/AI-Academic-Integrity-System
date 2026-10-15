"""
GapGuard AI — Tests for Backward Chaining and Combined Reasoning API

Verifies:
F. Supported goal returns true.
G. Unsupported goal returns false.
H. Missing prerequisite is reported.
I. Cyclic rule dependencies do not cause infinite recursion.
P. Reasoning endpoint works.
Q. Invalid/incomplete input is handled safely.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.rule_engine import Rule, RuleEngineService, rule_engine_service


client = TestClient(app)


class TestBackwardChaining:
    """Test suite for backward chaining proof search and cycle prevention."""

    def test_f_supported_goal_returns_true(self):
        """Test F: Goal supported by available facts evaluates to True."""
        facts = [
            "GAP_LIMITATION_ALIGNMENT_PRESENT",
            "GAP_CONTRIBUTION_OVERLAP_LOW",
        ]
        res = rule_engine_service.backward_chain(
            goal="GAP_SUPPORTED_BY_EVIDENCE",
            facts=facts,
        )

        assert res["supported"] is True
        assert "GAP_LIMITATION_ALIGNMENT_PRESENT" in res["satisfied_conditions"]
        assert "GAP_CONTRIBUTION_OVERLAP_LOW" in res["satisfied_conditions"]
        assert len(res["missing_conditions"]) == 0
        assert "R1" in res["rules_considered"]

    def test_g_unsupported_goal_returns_false(self):
        """Test G: Goal unsupported due to absent conditions evaluates to False."""
        facts = ["UNRELATED_FACT"]
        res = rule_engine_service.backward_chain(
            goal="GAP_SUPPORTED_BY_EVIDENCE",
            facts=facts,
        )

        assert res["supported"] is False
        assert len(res["missing_conditions"]) > 0

    def test_h_missing_prerequisite_is_reported(self):
        """Test H: Missing prerequisites are explicitly identified."""
        # Has alignment, but missing GAP_CONTRIBUTION_OVERLAP_LOW
        facts = ["GAP_LIMITATION_ALIGNMENT_PRESENT"]
        res = rule_engine_service.backward_chain(
            goal="GAP_SUPPORTED_BY_EVIDENCE",
            facts=facts,
        )

        assert res["supported"] is False
        assert "GAP_CONTRIBUTION_OVERLAP_LOW" in res["missing_conditions"]
        assert "GAP_LIMITATION_ALIGNMENT_PRESENT" in res["satisfied_conditions"]

    def test_i_cyclic_rule_dependencies_do_not_cause_infinite_recursion(self):
        """Test I: Cyclic rules (A -> B and B -> A) terminate safely without recursion error."""
        cyclic_rules = [
            Rule(
                rule_id="C1",
                name="Rule C1",
                conditions=["FACT_B"],
                conclusion="FACT_A",
                explanation="Cycle rule 1",
            ),
            Rule(
                rule_id="C2",
                name="Rule C2",
                conditions=["FACT_A"],
                conclusion="FACT_B",
                explanation="Cycle rule 2",
            ),
        ]
        cyclic_engine = RuleEngineService(rules=cyclic_rules)

        # Neither FACT_A nor FACT_B is known initially
        res = cyclic_engine.backward_chain(goal="FACT_A", facts=[])
        assert res["supported"] is False
        assert "FACT_B" in res["missing_conditions"] or "FACT_A" in res["missing_conditions"]


class TestReasoningAPI:
    """Test suite for POST /api/reasoning/analyze endpoint."""

    def test_p_reasoning_endpoint_works_with_research_info(self):
        """Test P: POST /api/reasoning/analyze returns complete rule-based and Bayesian output."""
        payload = {
            "research_information": {
                "title": "Lightweight Crop Disease Detection",
                "claimed_research_gap": "Vision transformers exceed microcontroller memory budgets in agriculture.",
                "research_problem": "High computational complexity of vision models on rural edge hardware.",
                "expected_contribution": "A compressed 8-bit quantized vision transformer.",
                "proposed_method": "Hierarchical token subsampling and post-training quantization.",
            },
            "prior": 0.50,
            "backward_chaining_goal": "GAP_SUPPORTED_BY_EVIDENCE",
            "top_k": 3,
        }
        response = client.post("/api/reasoning/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "rule_based_reasoning" in data
        assert "forward_chaining" in data
        assert "backward_chaining" in data
        assert "bayesian_reasoning" in data
        assert "corpus_limitation_statement" in data

        # Verify Forward Chaining fields
        fw = data["forward_chaining"]
        assert "initial_facts" in fw
        assert "fired_rules" in fw
        assert "derived_facts" in fw

        # Verify Backward Chaining fields
        bw = data["backward_chaining"]
        assert bw["primary_goal"] == "GAP_SUPPORTED_BY_EVIDENCE"
        assert "result" in bw
        assert "available_goals_evaluation" in bw

        # Verify Bayesian fields
        bayes = data["bayesian_reasoning"]
        assert bayes["prior"] == 0.50
        assert "posterior" in bayes
        assert "likelihood" in bayes
        assert "marginal_probability" in bayes
        assert 0.0 <= bayes["posterior"] <= 1.0

    def test_p_reasoning_endpoint_works_with_explicit_analyses(self):
        """Test P2: POST /api/reasoning/analyze operates correctly with pre-computed analysis summaries."""
        mock_gap = {
            "overall_status": "Supported by Available Evidence",
            "evidence_summary": {
                "supporting_count": 2,
                "potentially_contradicted_count": 0,
                "partially_supported_count": 0,
                "total_papers_analyzed": 5,
            },
            "paper_analyses": [
                {
                    "scores": {
                        "limitation_alignment_score": 0.45,
                        "contribution_overlap_score": 0.15,
                    }
                }
            ],
        }
        mock_contrib = {
            "aggregate_summary": {
                "clearly_differentiated_count": 4,
                "potential_overlap_count": 0,
                "total_papers_compared": 5,
            }
        }
        payload = {
            "gap_analysis": mock_gap,
            "contribution_analysis": mock_contrib,
            "prior": 0.50,
        }
        response = client.post("/api/reasoning/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()

        # Both R1 and R3 should fire, deriving R6
        fw = data["forward_chaining"]
        assert "GAP_SUPPORTED_BY_EVIDENCE" in fw["derived_facts"]
        assert "CONTRIBUTION_DIFFERENTIATED" in fw["derived_facts"]
        assert "RESEARCH_DIRECTION_VIABLE" in fw["derived_facts"]

        # Bayesian posterior should show strong or moderate support
        bayes = data["bayesian_reasoning"]
        assert bayes["posterior"] > 0.50

    def test_q_invalid_incomplete_input_handled_safely(self):
        """Test Q: Empty payload without project_id, info, or analyses returns HTTP 400."""
        empty_payload = {
            "prior": 0.50,
        }
        response = client.post("/api/reasoning/analyze", json=empty_payload)
        assert response.status_code == 400
        assert "Either research_information" in response.json()["detail"]
