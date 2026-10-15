"""
Comprehensive Test Suite for LU IV: Rule-Based and Symbolic Reasoning

Covers all 11 syllabus concepts:
1. Knowledge Representation Using Rules
2. Procedural Knowledge
3. Declarative Knowledge
4. Forward Reasoning
5. Backward Reasoning
6. Symbolic Reasoning Under Uncertainty (Certainty Factors)
7. Nonmonotonic Reasoning
8. Probability (Kolmogorov Axioms & Joint Distributions)
9. Bayes' Theorem
10. Bayesian Networks (Variable Elimination)
11. Rule-Based Systems (Unified Production System)

Plus REST API integration tests for /api/reasoning-lab/* endpoints.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient
from main import app

from services.symbolic_reasoning.production_system import (
    ProductionRule,
    get_academic_integrity_rule_catalog,
    ProceduralStep,
    ProceduralWorkflow,
    build_academic_sanitization_and_fingerprint_pipeline,
    Assertion,
    DeclarativeFactBase,
    get_default_declarative_facts,
    ProductionSystem,
)
from services.symbolic_reasoning.forward_chaining import ForwardChainingEngine
from services.symbolic_reasoning.backward_chaining import BackwardChainingEngine
from services.symbolic_reasoning.uncertainty_engine import CertaintyFactorEngine
from services.symbolic_reasoning.nonmonotonic_engine import (
    DefaultRule,
    NonmonotonicReasoningEngine,
    get_default_academic_integrity_defaults,
)
from services.symbolic_reasoning.probability_models import DiscreteJointProbabilityDistribution
from services.symbolic_reasoning.bayes_calculator import BayesTheoremCalculator
from services.symbolic_reasoning.bayesian_network import Factor, BayesianNetwork


client = TestClient(app)


# ============================================================================
# CONCEPT 1: KNOWLEDGE REPRESENTATION USING RULES
# ============================================================================

def test_production_rule_structure_and_matching():
    rule = ProductionRule(
        rule_id="R_TEST_1",
        name="Test Overlap Rule",
        conditions=["COND_A", "COND_B"],
        conclusion="CONCL_X",
        explanation="Test explanation",
        priority=5,
        certainty_factor=0.9,
    )
    assert rule.rule_id == "R_TEST_1"
    assert rule.specificity == 2
    assert rule.matches({"COND_A", "COND_B", "EXTRA"}) is True
    assert rule.matches({"COND_A"}) is False

    d = rule.to_dict()
    assert d["rule_id"] == "R_TEST_1"
    assert d["priority"] == 5
    assert d["certainty_factor"] == 0.9


def test_academic_integrity_catalog_completeness():
    catalog = get_academic_integrity_rule_catalog()
    assert len(catalog) >= 8
    rule_ids = [r.rule_id for r in catalog]
    assert "R_VERBATIM_PLAGIARISM" in rule_ids
    assert "R_FAIR_USE_EXCEPTION" in rule_ids
    assert "R_AUTHORIZED_SELF_CITATION" in rule_ids
    assert "R_HEARING_RECOMMENDED" in rule_ids


# ============================================================================
# CONCEPT 2: PROCEDURAL KNOWLEDGE
# ============================================================================

def test_procedural_step_precondition_and_postcondition_checks():
    def simple_action(state):
        state["doubled"] = state["val"] * 2
        return state

    step = ProceduralStep(
        step_id="S1",
        name="Double Value",
        description="Doubles input integer",
        action=simple_action,
        preconditions=["val"],
        postconditions=["doubled"],
    )

    # Valid execution
    res = step.execute({"val": 21})
    assert res["doubled"] == 42


def test_procedural_workflow_execution_and_precondition_failure():
    wf = ProceduralWorkflow("WF1", "Test Pipeline", "Tests execution trace")
    wf.add_step(
        ProceduralStep(
            step_id="STEP_A",
            name="Step A",
            description="Needs 'x'",
            action=lambda s: {**s, "y": s["x"] + 10},
            preconditions=["x"],
            postconditions=["y"],
        )
    )

    # Precondition failure case
    res_fail = wf.execute({})
    assert res_fail["success"] is False
    assert "Precondition failed" in res_fail["error"]

    # Success case
    res_success = wf.execute({"x": 5})
    assert res_success["success"] is True
    assert res_success["final_state"]["y"] == 15
    assert len(res_success["trace"]) == 1


def test_academic_sanitization_and_fingerprint_pipeline():
    pipeline = build_academic_sanitization_and_fingerprint_pipeline()
    raw_sample = (
        "In this study, we present a novel deep learning framework for natural language understanding. "
        "The model achieves state of the art accuracy across benchmark evaluations."
    )
    result = pipeline.execute({
        "raw_text": raw_sample,
        "shingle_k": 3,
        "window_size": 4,
        "similarity_threshold": 0.20,
    })

    assert result["success"] is True
    assert result["total_steps"] == 5
    final = result["final_state"]
    assert "normalized_text" in final
    assert "tokens" in final
    assert "shingles" in final
    assert "fingerprints" in final
    assert len(final["fingerprints"]) > 0
    assert "fingerprint_jaccard_similarity" in final


# ============================================================================
# CONCEPT 3: DECLARATIVE KNOWLEDGE
# ============================================================================

def test_declarative_fact_base_storage_and_pattern_matching():
    kb = DeclarativeFactBase()
    kb.assert_fact(Assertion("Paper_X", "author", "Alice", 1.0))
    kb.assert_fact(Assertion("Paper_X", "cites", "Paper_Y", 1.0))
    kb.assert_fact(Assertion("Paper_Z", "author", "Bob", 1.0))
    kb.assert_fact(Assertion("Paper_Z", "cites", "Paper_Y", 1.0))

    # Query with variable: find ?paper that cites Paper_Y
    matches = kb.query(subject="?paper", predicate="cites", obj="Paper_Y")
    assert len(matches) == 2
    matched_papers = {m["bindings"]["paper"] for m in matches}
    assert matched_papers == {"Paper_X", "Paper_Z"}

    # Query with variable: find ?predicate and ?value for Paper_X
    pred_matches = kb.query(subject="Paper_X", predicate="?pred", obj="?val")
    assert len(pred_matches) == 2


def test_declarative_retraction():
    kb = DeclarativeFactBase()
    kb.assert_fact(Assertion("Doc_1", "status", "pending"))
    assert len(kb.assertions) == 1

    retracted = kb.retract_fact("Doc_1", "status", "pending")
    assert retracted == 1
    assert len(kb.assertions) == 0


# ============================================================================
# CONCEPT 4: FORWARD REASONING
# ============================================================================

def test_forward_chaining_multi_step_derivation():
    engine = ForwardChainingEngine()
    initial_facts = ["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT"]

    result = engine.infer(facts=initial_facts, conflict_strategy="priority")
    assert "VERBATIM_PLAGIARISM_CONFIRMED" in result["derived_facts"]
    assert "REQUIRES_ACADEMIC_INTEGRITY_HEARING" in result["derived_facts"]
    assert result["quiescence_reached"] is True
    assert len(result["reasoning_trace"]) >= 2


def test_forward_chaining_conflict_resolution_strategies():
    r1 = ProductionRule("R1", "Priority Low", ["A"], "B", "desc", priority=1, certainty_factor=1.0)
    r2 = ProductionRule("R2", "Priority High", ["A"], "C", "desc", priority=10, certainty_factor=1.0)
    r3 = ProductionRule("R3", "Specific Rule", ["A", "D"], "E", "desc", priority=5, certainty_factor=1.0)

    engine = ForwardChainingEngine(rules=[r1, r2, r3])

    # Strategy: Priority -> R2 should fire first
    res_priority = engine.infer(["A"], conflict_strategy="priority")
    assert res_priority["fired_rules"][0] == "R2"

    # Strategy: Specificity with facts [A, D] -> R3 has 2 conditions, should fire first
    res_spec = engine.infer(["A", "D"], conflict_strategy="specificity")
    assert res_spec["fired_rules"][0] == "R3"

    # Strategy: FIFO -> R1 is first in list
    res_fifo = engine.infer(["A"], conflict_strategy="fifo")
    assert res_fifo["fired_rules"][0] == "R1"


# ============================================================================
# CONCEPT 5: BACKWARD REASONING
# ============================================================================

def test_backward_chaining_successful_goal_proof():
    engine = BackwardChainingEngine()
    known_facts = ["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT"]

    res = engine.prove(goal="REQUIRES_ACADEMIC_INTEGRITY_HEARING", facts=known_facts)
    assert res["supported"] is True
    assert res["status"] == "PROVEN"
    assert "REQUIRES_ACADEMIC_INTEGRITY_HEARING" in res["satisfied_conditions"]
    assert "VERBATIM_PLAGIARISM_CONFIRMED" in res["satisfied_conditions"]


def test_backward_chaining_unsupported_goal_identifies_missing_prerequisites():
    engine = BackwardChainingEngine()
    # Missing CITATION_ABSENT
    known_facts = ["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT"]

    res = engine.prove(goal="REQUIRES_ACADEMIC_INTEGRITY_HEARING", facts=known_facts)
    assert res["supported"] is False
    assert res["status"] == "FAILED"
    assert "CITATION_ABSENT" in res["missing_conditions"]


def test_backward_chaining_cycle_detection_guard():
    # Mutual rules: A -> B and B -> A
    cyclic_r1 = ProductionRule("R_CYC_1", "A to B", ["A"], "B", "cycle", priority=1)
    cyclic_r2 = ProductionRule("R_CYC_2", "B to A", ["B"], "A", "cycle", priority=1)
    engine = BackwardChainingEngine(rules=[cyclic_r1, cyclic_r2])

    res = engine.prove(goal="A", facts=[])
    assert res["supported"] is False
    assert "A" in res["missing_conditions"]


# ============================================================================
# CONCEPT 6: SYMBOLIC REASONING UNDER UNCERTAINTY (CERTAINTY FACTORS)
# ============================================================================

def test_certainty_factor_basic_calculus():
    cf = CertaintyFactorEngine.calculate_cf_from_belief(mb=0.85, md=0.15)
    assert cf == 0.70

    # Conjunction min rule
    conj = CertaintyFactorEngine.combine_conjunction([0.80, 0.45, 0.90])
    assert conj == 0.45

    # Disjunction max rule
    disj = CertaintyFactorEngine.combine_disjunction([0.80, 0.45, 0.90])
    assert disj == 0.90

    # Rule propagation
    prop = CertaintyFactorEngine.apply_rule(rule_cf=0.80, evidence_cf=0.50)
    assert prop == 0.40


def test_certainty_factor_positive_combination():
    # CF1 = 0.60, CF2 = 0.40 -> CF_comb = 0.60 + 0.40 * (1 - 0.60) = 0.60 + 0.16 = 0.76
    comb, formula = CertaintyFactorEngine.combine_pair(0.60, 0.40)
    assert comb == 0.76
    assert "Positive formula" in formula


def test_certainty_factor_negative_combination():
    # CF1 = -0.50, CF2 = -0.20 -> CF_comb = -0.50 + -0.20 * (1 + -0.50) = -0.50 - 0.10 = -0.60
    comb, formula = CertaintyFactorEngine.combine_pair(-0.50, -0.20)
    assert comb == -0.60
    assert "Negative formula" in formula


def test_certainty_factor_mixed_combination_and_contradiction():
    # CF1 = 0.60, CF2 = -0.30
    # CF_comb = (0.60 - 0.30) / (1 - min(0.60, 0.30)) = 0.30 / 0.70 = 0.4286
    comb, formula = CertaintyFactorEngine.combine_pair(0.60, -0.30)
    assert round(comb, 2) == 0.43

    # Direct extreme contradiction: +1.0 and -1.0
    comb_contra, formula_contra = CertaintyFactorEngine.combine_pair(1.0, -1.0)
    assert comb_contra == 0.0
    assert "canceled out" in formula_contra


def test_certainty_factor_academic_multi_signal_fusion():
    engine = CertaintyFactorEngine()
    res = engine.evaluate_academic_plagiarism_signals(
        lexical_similarity_cf=0.70,
        citation_anomaly_cf=0.60,
        stylistic_variation_cf=0.40,
        author_disclaimer_cf=-0.50,
    )
    assert res["combined_cf"] > 0.0
    assert len(res["steps"]) == 3
    assert "Definitive" in res["interpretation"] or "Marked" in res["interpretation"] or "Evidence" in res["interpretation"]


# ============================================================================
# CONCEPT 7: NONMONOTONIC REASONING
# ============================================================================

def test_nonmonotonic_default_logic_and_belief_revision():
    engine = NonmonotonicReasoningEngine()
    engine.set_base_facts(["HIGH_TEXTUAL_OVERLAP"])

    # Initially: Presumed plagiarism should be derived
    initial_beliefs = engine.get_active_beliefs()
    assert "PRESUMED_PLAGIARISM_VIOLATION" in initial_beliefs
    assert "INSTITUTIONAL_DISCIPLINARY_SANCTION" in initial_beliefs

    # Student asserts defeater fact: IS_AUTHORIZED_SELF_CITATION
    rev = engine.assert_fact("IS_AUTHORIZED_SELF_CITATION")
    assert rev["changed"] is True
    assert "PRESUMED_PLAGIARISM_VIOLATION" in rev["retracted_beliefs"]
    assert "INSTITUTIONAL_DISCIPLINARY_SANCTION" in rev["retracted_beliefs"]
    assert "PERMITTED_AUTHOR_SELF_REUSE" in rev["newly_derived_beliefs"]

    updated_beliefs = engine.get_active_beliefs()
    assert "PRESUMED_PLAGIARISM_VIOLATION" not in updated_beliefs
    assert "PERMITTED_AUTHOR_SELF_REUSE" in updated_beliefs


def test_nonmonotonic_fact_retraction_restores_default():
    engine = NonmonotonicReasoningEngine()
    engine.set_base_facts(["HIGH_TEXTUAL_OVERLAP", "IS_AUTHORIZED_SELF_CITATION"])

    # Initially exempted
    assert "PERMITTED_AUTHOR_SELF_REUSE" in engine.get_active_beliefs()
    assert "PRESUMED_PLAGIARISM_VIOLATION" not in engine.get_active_beliefs()

    # Retract authorization
    rev = engine.retract_fact("IS_AUTHORIZED_SELF_CITATION")
    assert rev["changed"] is True
    assert "PERMITTED_AUTHOR_SELF_REUSE" in rev["retracted_beliefs"]
    assert "PRESUMED_PLAGIARISM_VIOLATION" in rev["restored_beliefs"]


# ============================================================================
# CONCEPT 8: PROBABILITY
# ============================================================================

def test_kolmogorov_axioms_verification():
    dist = DiscreteJointProbabilityDistribution.create_academic_integrity_distribution()
    axioms = dist.verify_kolmogorov_axioms()
    assert axioms["all_axioms_satisfied"] is True
    assert axioms["axiom_1_non_negativity"]["passed"] is True
    assert axioms["axiom_2_normalization"]["passed"] is True
    assert axioms["axiom_3_additivity"]["passed"] is True
    assert abs(axioms["axiom_2_normalization"]["calculated_sum"] - 1.0) < 1e-5


def test_marginal_and_conditional_probability():
    dist = DiscreteJointProbabilityDistribution.create_academic_integrity_distribution()

    # P(Misconduct=True)
    p_misconduct = dist.marginalize({"Misconduct": "True"})
    assert 0.04 < p_misconduct < 0.06  # Sum is 0.038 + 0.002 + 0.010 + 0.002 = 0.052

    # P(Misconduct=True | Similarity=High, Citations=Anomaly)
    cond_res = dist.conditional_probability(
        query_vars={"Misconduct": "True"},
        evidence_vars={"Similarity": "High", "Citations": "Anomaly"},
    )
    # (High, Anomaly, True) = 0.038, (High, Anomaly, False) = 0.002 -> sum = 0.040. 0.038 / 0.040 = 0.95
    assert cond_res["conditional_probability"] == 0.95


def test_statistical_independence_check():
    dist = DiscreteJointProbabilityDistribution.create_academic_integrity_distribution()
    indep = dist.check_independence("Similarity", "Citations")
    assert "is_independent" in indep
    assert indep["is_independent"] is False  # In real data, high similarity and citation anomalies correlate


# ============================================================================
# CONCEPT 9: BAYES' THEOREM
# ============================================================================

def test_bayes_theorem_exact_calculation_and_odds():
    calc = BayesTheoremCalculator()
    # Prior = 0.10, Sensitivity = 0.90, FPR = 0.05
    # P(E|H)*P(H) = 0.90 * 0.10 = 0.09
    # P(E|~H)*P(~H) = 0.05 * 0.90 = 0.045
    # P(E) = 0.135
    # P(H|E) = 0.09 / 0.135 = 0.6667
    res = calc.calculate(prior=0.10, sensitivity=0.90, false_positive_rate=0.05)
    assert round(res["posterior_P_H_given_E"], 4) == 0.6667
    assert res["odds_verified"] is True
    assert res["bayes_factor_likelihood_ratio"] == 18.0  # 0.90 / 0.05


def test_base_rate_fallacy_demonstration():
    res = BayesTheoremCalculator.run_base_rate_fallacy_demo()
    # Prior = 0.05, Sens = 0.95, FPR = 0.05
    # Numerator = 0.95 * 0.05 = 0.0475
    # Denom = 0.0475 + 0.05 * 0.95 = 0.0950
    # Posterior = 0.5000
    assert res["posterior_P_H_given_E"] == 0.50
    assert res["base_rate_fallacy_detected"] is True
    assert "Notice: Prior" in res["explanation"]


def test_bayes_sequential_multi_evidence_updating():
    calc = BayesTheoremCalculator()
    evidence_seq = [
        {"name": "Lexical Overlap Test", "P(E|H)": 0.85, "P(E|~H)": 0.10},
        {"name": "Citation Absence Check", "P(E|H)": 0.80, "P(E|~H)": 0.15},
    ]
    res = calc.sequential_update(initial_prior=0.05, evidence_sequence=evidence_seq)
    assert res["total_evidence_steps"] == 2
    assert res["final_posterior"] > res["initial_prior"]
    assert res["final_posterior"] > 0.70


# ============================================================================
# CONCEPT 10: BAYESIAN NETWORKS
# ============================================================================

def test_bayesian_network_construction_and_dag_validation():
    bn = BayesianNetwork()
    bn.add_node("A", ["True", "False"])
    bn.add_node("B", ["True", "False"], parents=["A"])
    bn.add_node("C", ["True", "False"], parents=["B"])

    assert bn._is_dag() is True

    # Attempting to add an edge causing a cycle should raise ValueError
    with pytest.raises(ValueError):
        bn.add_node("A_Cycle", ["True", "False"], parents=["C"])
        bn.edges.append(("C", "A"))
        bn.nodes["A"]["parents"].append("C")
        if not bn._is_dag():
            raise ValueError("Cycle detected")


def test_bayesian_network_variable_elimination_exact_inference():
    bn = BayesianNetwork.build_academic_integrity_network()

    # Query: P(Cheating | HighOverlap=True, CitationAnomaly=True)
    res = bn.variable_elimination(
        query_var="Cheating",
        evidence={"HighOverlap": "True", "CitationAnomaly": "True"},
    )
    dist = res["posterior_distribution"]
    assert "True" in dist and "False" in dist
    assert abs(dist["True"] + dist["False"] - 1.0) < 1e-3
    # With both strong signals present, cheating probability should be high
    assert dist["True"] > 0.60


def test_bayesian_network_no_evidence_prior_query():
    bn = BayesianNetwork.build_academic_integrity_network()
    res = bn.variable_elimination(query_var="Difficulty")
    dist = res["posterior_distribution"]
    assert dist["Low"] == 0.60
    assert dist["High"] == 0.40


# ============================================================================
# CONCEPT 11: RULE-BASED SYSTEMS (UNIFIED PRODUCTION SYSTEM)
# ============================================================================

def test_production_system_validation():
    system = ProductionSystem()
    val = system.validate_rule_base()
    assert val["is_valid"] is True
    assert len(val["contradictory_rules"]) == 0
    assert len(val["cycles_detected"]) == 0


def test_production_system_explanation_how_and_why():
    system = ProductionSystem()

    # Forward trace sample
    fw_trace = [{
        "step": 1,
        "derived_fact": "VERBATIM_PLAGIARISM_CONFIRMED",
        "rule_id": "R_VERBATIM_PLAGIARISM",
        "rule_name": "Verbatim Copying",
        "matched_conditions": ["COND1", "COND2"],
        "explanation": "Derived because verbatim conditions matched.",
        "policy_reference": "Policy 3.1",
    }]

    how = system.explain_conclusion_how("VERBATIM_PLAGIARISM_CONFIRMED", fw_trace)
    assert how["proven"] is True
    assert how["rule_id"] == "R_VERBATIM_PLAGIARISM"

    # Why query
    rule = system.rules[0]
    why = system.explain_subgoal_why("TEXTUAL_SIMILARITY_HIGH", "REQUIRES_HEARING", rule)
    assert "justification" in why
    assert rule.rule_id in why["justification"]


def test_production_system_advisory_audit():
    system = ProductionSystem()
    facts = ["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT"]

    audit = system.run_advisory_audit(facts)
    assert audit["audit_verdict"] == "FORMAL_HEARING_MANDATED"
    assert "VERBATIM_PLAGIARISM_CONFIRMED" in audit["forward_derivation"]["derived_facts"]
    assert audit["backward_proof"]["supported"] is True


# ============================================================================
# REST API ENDPOINT INTEGRATION TESTS (/api/reasoning-lab/*)
# ============================================================================

def test_api_catalog_endpoint():
    response = client.get("/api/reasoning-lab/catalog")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["rules"]) >= 8
    assert len(data["declarative_facts"]) >= 10
    assert "bayesian_network" in data


def test_api_forward_chaining_endpoint():
    response = client.post(
        "/api/reasoning-lab/forward-chaining",
        json={
            "facts": ["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT"],
            "conflict_strategy": "priority",
        },
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert "VERBATIM_PLAGIARISM_CONFIRMED" in data["derived_facts"]


def test_api_backward_chaining_endpoint():
    response = client.post(
        "/api/reasoning-lab/backward-chaining",
        json={
            "goal": "FAIR_USE_EXEMPTION_GRANTED",
            "facts": ["OVERLAP_UNDER_QUOTA", "QUOTATION_MARKS_PRESENT", "PROPER_ATTRIBUTION_PRESENT"],
        },
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert data["supported"] is True


def test_api_certainty_factors_endpoint():
    response = client.post(
        "/api/reasoning-lab/certainty-factors",
        json={"cfs": [0.70, 0.60, 0.40, -0.20]},
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert data["combined_cf"] > 0


def test_api_nonmonotonic_endpoint():
    response = client.post(
        "/api/reasoning-lab/nonmonotonic/simulate",
        json={
            "initial_facts": ["HIGH_TEXTUAL_OVERLAP"],
            "assert_defeater": "IS_AUTHORIZED_SELF_CITATION",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "PRESUMED_PLAGIARISM_VIOLATION" in data["revision_result"]["retracted_beliefs"]


def test_api_probability_analyze_endpoint():
    response = client.post(
        "/api/reasoning-lab/probability/analyze",
        json={
            "query_vars": {"Misconduct": "True"},
            "evidence_vars": {"Similarity": "High", "Citations": "Anomaly"},
            "check_independence_pair": ["Similarity", "Citations"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["kolmogorov_axioms"]["all_axioms_satisfied"] is True
    assert data["probability_result"]["conditional_probability"] == 0.95


def test_api_bayes_calculate_endpoint():
    response = client.post(
        "/api/reasoning-lab/bayes/calculate",
        json={"prior": 0.05, "sensitivity": 0.95, "false_positive_rate": 0.05},
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert data["posterior_P_H_given_E"] == 0.50
    assert data["base_rate_fallacy_detected"] is True


def test_api_bayes_net_infer_endpoint():
    response = client.post(
        "/api/reasoning-lab/bayes-net/infer",
        json={
            "query_var": "Cheating",
            "evidence": {"HighOverlap": "True", "CitationAnomaly": "True"},
        },
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert "Cheating" == data["query_variable"]
    assert data["posterior_distribution"]["True"] > 0.60


def test_api_declarative_query_endpoint():
    response = client.post(
        "/api/reasoning-lab/declarative/query",
        json={"subject": "?paper", "predicate": "cites", "obj": "Vaswani_2017"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["match_count"] >= 1


def test_api_procedural_run_endpoint():
    response = client.post(
        "/api/reasoning-lab/procedural/run",
        json={
            "raw_text": "Sample text for testing procedural knowledge execution in the reasoning lab.",
            "shingle_k": 3,
            "window_size": 4,
            "similarity_threshold": 0.25,
        },
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert data["success"] is True
    assert len(data["trace"]) == 5


def test_api_expert_system_audit_endpoint():
    response = client.post(
        "/api/reasoning-lab/expert-system/audit",
        json={
            "observed_facts": ["TEXTUAL_SIMILARITY_HIGH", "QUOTATION_MARKS_ABSENT", "CITATION_ABSENT"],
            "target_goal": "REQUIRES_ACADEMIC_INTEGRITY_HEARING",
        },
    )
    assert response.status_code == 200
    data = response.json()["result"]
    assert data["audit_verdict"] == "FORMAL_HEARING_MANDATED"
