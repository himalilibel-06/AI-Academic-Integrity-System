"""
GapGuard AI — Tests for Rule-Based Reasoning Engine (Forward Chaining)

Verifies:
A. Rule fires when all conditions are satisfied.
B. Rule does not fire when a required condition is missing.
C. Forward chaining derives facts through multiple rules.
D. Forward chaining stops when no new facts are produced.
E. Every derived fact has a reasoning trace.
"""

import sys
from pathlib import Path
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.rule_engine import (
    Rule,
    RuleEngineService,
    rule_engine_service,
    get_default_rules,
)


class TestRuleEngineService:
    """Test suite for deterministic production rule engine and forward chaining."""

    def test_a_rule_fires_when_all_conditions_satisfied(self):
        """Test A: Rule fires and produces conclusion when all premise conditions are met."""
        # Rule R1 requires GAP_LIMITATION_ALIGNMENT_PRESENT and GAP_CONTRIBUTION_OVERLAP_LOW
        facts = ["GAP_LIMITATION_ALIGNMENT_PRESENT", "GAP_CONTRIBUTION_OVERLAP_LOW"]
        result = rule_engine_service.forward_chain(facts)

        assert "R1" in result["fired_rules"]
        assert "GAP_SUPPORTED_BY_EVIDENCE" in result["derived_facts"]
        assert "GAP_SUPPORTED_BY_EVIDENCE" in result["final_facts"]

    def test_b_rule_does_not_fire_when_condition_missing(self):
        """Test B: Rule remains inactive if one or more conditions are missing."""
        # Only 1 of 2 conditions present
        facts = ["GAP_LIMITATION_ALIGNMENT_PRESENT"]
        result = rule_engine_service.forward_chain(facts)

        assert "R1" not in result["fired_rules"]
        assert "GAP_SUPPORTED_BY_EVIDENCE" not in result["derived_facts"]
        assert result["derived_facts"] == []

    def test_c_forward_chaining_derives_facts_through_multiple_rules(self):
        """Test C: Multi-step inference chaining derives higher-order conclusions."""
        # Initial facts satisfy R1 (Gap Supported) and R3 (Contribution Differentiated)
        # In turn, R6 (Research Direction Viable) requires both R1 and R3 conclusions!
        facts = [
            "GAP_LIMITATION_ALIGNMENT_PRESENT",
            "GAP_CONTRIBUTION_OVERLAP_LOW",
            "CONTRIBUTION_LEXICAL_OVERLAP_LOW",
            "CONTRIBUTION_CONTEXT_OVERLAP_LIMITED",
        ]
        result = rule_engine_service.forward_chain(facts)

        assert "R1" in result["fired_rules"]
        assert "R3" in result["fired_rules"]
        assert "R6" in result["fired_rules"]

        assert "GAP_SUPPORTED_BY_EVIDENCE" in result["derived_facts"]
        assert "CONTRIBUTION_DIFFERENTIATED" in result["derived_facts"]
        assert "RESEARCH_DIRECTION_VIABLE" in result["derived_facts"]

    def test_d_forward_chaining_stops_when_no_new_facts_produced(self):
        """Test D: Forward chaining halts cleanly at fixpoint without infinite loops."""
        facts = ["UNRELATED_FACT_ALPHA", "UNRELATED_FACT_BETA"]
        result = rule_engine_service.forward_chain(facts)

        assert result["fired_rules"] == []
        assert result["derived_facts"] == []
        assert len(result["reasoning_trace"]) == 0
        assert result["final_facts"] == sorted(facts)

    def test_e_every_derived_fact_has_a_reasoning_trace(self):
        """Test E: All derived facts have complete explainability traces with rule info."""
        facts = [
            "GAP_CONTRIBUTION_COLLISION_DETECTED",
            "MEANINGFUL_CONTEXTUAL_OVERLAP_PRESENT",
        ]
        result = rule_engine_service.forward_chain(facts)

        # R2 fires, then R7 fires
        assert "R2" in result["fired_rules"]
        assert "R7" in result["fired_rules"]
        assert len(result["reasoning_trace"]) == 2

        trace_r2 = result["reasoning_trace"][0]
        assert trace_r2["rule_id"] == "R2"
        assert trace_r2["derived_fact"] == "POTENTIAL_GAP_CONTRADICTION"
        assert "explanation" in trace_r2
        assert len(trace_r2["explanation"]) > 10

        trace_r7 = result["reasoning_trace"][1]
        assert trace_r7["rule_id"] == "R7"
        assert trace_r7["derived_fact"] == "PEER_REVIEW_RECOMMENDED"
        assert "POTENTIAL_GAP_CONTRADICTION" in trace_r7["matched_conditions"]

    def test_audit_d_supporting_count_alone_does_not_create_limitation_alignment_when_absent(self):
        """Phase 9.1 Audit Test D: Strong supporting-paper count alone does not create limitation-alignment fact."""
        # Gap analysis has supporting count > 0, but no limitation-alignment evidence in paper_analyses
        gap_without_limitation = {
            "overall_status": "Supported by Available Evidence",
            "evidence_summary": {
                "supporting_count": 3,
                "potentially_contradicted_count": 0,
            },
            "paper_analyses": [
                {
                    "paper_id": "P1",
                    "scores": {
                        "limitation_alignment": 0.05,  # Well below 0.25 threshold
                        "contribution_overlap": 0.10,
                    },
                    "evidence": ["General discussion without limitation claims."],
                }
            ],
        }

        facts = rule_engine_service.extract_facts_from_analyses(gap_analysis=gap_without_limitation)

        # STRONG_SUPPORTING_EVIDENCE_EXISTS must be present
        assert "STRONG_SUPPORTING_EVIDENCE_EXISTS" in facts
        # GAP_LIMITATION_ALIGNMENT_PRESENT must NOT be present
        assert "GAP_LIMITATION_ALIGNMENT_PRESENT" not in facts

        # Consequently, Rule R1 (which requires GAP_LIMITATION_ALIGNMENT_PRESENT) must NOT fire
        res = rule_engine_service.forward_chain(facts)
        assert "R1" not in res["fired_rules"]
        assert "GAP_SUPPORTED_BY_EVIDENCE" not in res["derived_facts"]

    def test_audit_e_actual_limitation_alignment_evidence_produces_appropriate_rule_conclusion(self):
        """Phase 9.1 Audit Test E: Actual limitation-alignment evidence produces GAP_LIMITATION_ALIGNMENT_PRESENT and fires R1."""
        gap_with_limitation = {
            "overall_status": "Supported by Available Evidence",
            "evidence_summary": {
                "supporting_count": 2,
                "potentially_contradicted_count": 0,
            },
            "paper_analyses": [
                {
                    "paper_id": "P2",
                    "scores": {
                        "limitation_alignment": 0.38,  # Satisfies Phase 6 LIMITATION_SUPPORT_THRESHOLD (0.25)
                        "contribution_overlap": 0.12,
                    },
                    "evidence": ["Author explicitly documents limitation matching the claimed gap."],
                }
            ],
        }

        facts = rule_engine_service.extract_facts_from_analyses(gap_analysis=gap_with_limitation)

        # Both facts must be properly extracted
        assert "STRONG_SUPPORTING_EVIDENCE_EXISTS" in facts
        assert "GAP_LIMITATION_ALIGNMENT_PRESENT" in facts
        assert "GAP_CONTRIBUTION_OVERLAP_LOW" in facts

        # Forward chaining should fire R1 and conclude GAP_SUPPORTED_BY_EVIDENCE
        res = rule_engine_service.forward_chain(facts)
        assert "R1" in res["fired_rules"]
        assert "GAP_SUPPORTED_BY_EVIDENCE" in res["derived_facts"]

