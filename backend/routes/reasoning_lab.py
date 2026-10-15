"""
GapGuard AI — Reasoning Lab Router
Exposes REST endpoints for all 11 LU IV Rule-Based & Symbolic Reasoning Topics:
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
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.symbolic_reasoning.production_system import (
    ProductionRule,
    get_academic_integrity_rule_catalog,
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
from services.symbolic_reasoning.bayesian_network import BayesianNetwork

router = APIRouter(prefix="/api/reasoning-lab", tags=["Reasoning Lab"])


# ---------------------------------------------------------------------------
# REQUEST SCHEMAS
# ---------------------------------------------------------------------------

class ForwardChainingRequest(BaseModel):
    facts: List[str] = Field(..., description="Observed facts to feed into forward chaining")
    conflict_strategy: str = Field("priority", description="Strategy: priority, specificity, recency, fifo")


class BackwardChainingRequest(BaseModel):
    goal: str = Field(..., description="Target predicate to prove (e.g. REQUIRES_ACADEMIC_INTEGRITY_HEARING)")
    facts: List[str] = Field(..., description="Established facts")


class CertaintyFactorRequest(BaseModel):
    cfs: Optional[List[float]] = Field(None, description="List of certainty factors to combine")
    lexical_similarity_cf: Optional[float] = Field(0.70)
    citation_anomaly_cf: Optional[float] = Field(0.60)
    stylistic_variation_cf: Optional[float] = Field(0.40)
    author_disclaimer_cf: Optional[float] = Field(0.0)


class NonmonotonicRequest(BaseModel):
    initial_facts: List[str] = Field(default_factory=lambda: ["HIGH_TEXTUAL_OVERLAP"])
    assert_defeater: Optional[str] = Field(None, description="Defeater fact to assert, e.g. IS_AUTHORIZED_SELF_CITATION")


class ProbabilityQueryRequest(BaseModel):
    query_vars: Dict[str, str] = Field(default_factory=lambda: {"Misconduct": "True"})
    evidence_vars: Optional[Dict[str, str]] = Field(default_factory=lambda: {"Similarity": "High", "Citations": "Anomaly"})
    check_independence_pair: Optional[List[str]] = Field(default_factory=lambda: ["Similarity", "Citations"])


class BayesCalculateRequest(BaseModel):
    prior: float = Field(0.05, ge=0.0001, le=0.9999, description="Prior probability P(H)")
    sensitivity: float = Field(0.95, ge=0.0, le=1.0, description="P(E|H) True Positive Rate")
    false_positive_rate: float = Field(0.05, ge=0.00001, le=1.0, description="P(E|~H) False Positive Rate")
    hypothesis_name: Optional[str] = Field("Academic Misconduct Present")
    evidence_name: Optional[str] = Field("Detector Flags High Overlap")


class BayesNetInferRequest(BaseModel):
    query_var: str = Field("Cheating", description="Node to query: Cheating, HighOverlap, CitationAnomaly, etc.")
    evidence: Dict[str, str] = Field(
        default_factory=lambda: {"HighOverlap": "True", "CitationAnomaly": "False"},
        description="Observed variable states",
    )


class DeclarativeQueryRequest(BaseModel):
    subject: Optional[str] = Field(None, description="Subject or pattern e.g. '?paper'")
    predicate: Optional[str] = Field(None, description="Predicate or pattern e.g. 'cites'")
    obj: Optional[Any] = Field(None, description="Object or pattern e.g. 'Vaswani_2017'")


class ProceduralExecuteRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text string to process through pipeline")
    shingle_k: int = Field(3, description="N-gram length k")
    window_size: int = Field(4, description="Winnowing window size w")
    reference_fingerprints: Optional[List[int]] = Field(default_factory=list)
    similarity_threshold: float = Field(0.30)


class AdvisoryAuditRequest(BaseModel):
    observed_facts: List[str] = Field(...)
    target_goal: Optional[str] = Field("REQUIRES_ACADEMIC_INTEGRITY_HEARING")


# ---------------------------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/catalog")
def get_catalog() -> Dict[str, Any]:
    """Retrieves standard rule catalog, declarative facts, and bayesian network metadata."""
    rules = get_academic_integrity_rule_catalog()
    decl_kb = get_default_declarative_facts()
    bn = BayesianNetwork.build_academic_integrity_network()
    dist = DiscreteJointProbabilityDistribution.create_academic_integrity_distribution()

    return {
        "status": "success",
        "rules": [r.to_dict() for r in rules],
        "declarative_facts": decl_kb.get_all_facts(),
        "bayesian_network": bn.to_dict(),
        "joint_distribution": dist.to_dict(),
        "default_rules": [r.to_dict() for r in get_default_academic_integrity_defaults()],
    }


@router.post("/forward-chaining")
def run_forward_chaining(req: ForwardChainingRequest) -> Dict[str, Any]:
    """Executes data-driven forward chaining with selectable conflict resolution strategy."""
    engine = ForwardChainingEngine()
    result = engine.infer(facts=req.facts, conflict_strategy=req.conflict_strategy)
    return {"status": "success", "result": result}


@router.post("/backward-chaining")
def run_backward_chaining(req: BackwardChainingRequest) -> Dict[str, Any]:
    """Executes goal-driven backward chaining with recursive AND-OR proof tree."""
    engine = BackwardChainingEngine()
    result = engine.prove(goal=req.goal, facts=req.facts)
    return {"status": "success", "result": result}


@router.post("/certainty-factors")
def run_certainty_factors(req: CertaintyFactorRequest) -> Dict[str, Any]:
    """Calculates Shortliffe / MYCIN certainty factor combinations."""
    engine = CertaintyFactorEngine()
    if req.cfs is not None:
        result = engine.combine_multiple(req.cfs)
    else:
        result = engine.evaluate_academic_plagiarism_signals(
            lexical_similarity_cf=req.lexical_similarity_cf or 0.70,
            citation_anomaly_cf=req.citation_anomaly_cf or 0.60,
            stylistic_variation_cf=req.stylistic_variation_cf or 0.40,
            author_disclaimer_cf=req.author_disclaimer_cf or 0.0,
        )
    return {"status": "success", "result": result}


@router.post("/nonmonotonic/simulate")
def run_nonmonotonic(req: NonmonotonicRequest) -> Dict[str, Any]:
    """Simulates Reiter default logic and demonstrates dynamic belief revision on defeater."""
    engine = NonmonotonicReasoningEngine()
    engine.set_base_facts(req.initial_facts)
    initial_status = engine.get_status()

    revision_result = None
    if req.assert_defeater:
        revision_result = engine.assert_fact(req.assert_defeater)

    final_status = engine.get_status()

    return {
        "status": "success",
        "initial_status": initial_status,
        "revision_result": revision_result,
        "final_status": final_status,
    }


@router.post("/probability/analyze")
def run_probability_analysis(req: ProbabilityQueryRequest) -> Dict[str, Any]:
    """Verifies Kolmogorov axioms, computes marginals, and evaluates conditional probability."""
    dist = DiscreteJointProbabilityDistribution.create_academic_integrity_distribution()
    axioms = dist.verify_kolmogorov_axioms()

    cond_prob = None
    if req.evidence_vars:
        cond_prob = dist.conditional_probability(req.query_vars, req.evidence_vars)
    else:
        cond_prob = {"marginal": dist.marginalize(req.query_vars)}

    independence = None
    if req.check_independence_pair and len(req.check_independence_pair) == 2:
        independence = dist.check_independence(
            req.check_independence_pair[0],
            req.check_independence_pair[1],
        )

    return {
        "status": "success",
        "kolmogorov_axioms": axioms,
        "probability_result": cond_prob,
        "independence_test": independence,
        "distribution_table": dist.to_dict(),
    }


@router.post("/bayes/calculate")
def run_bayes_calculation(req: BayesCalculateRequest) -> Dict[str, Any]:
    """Calculates Bayes' Theorem posterior, posterior odds, and checks for base rate fallacy."""
    calculator = BayesTheoremCalculator()
    result = calculator.calculate(
        prior=req.prior,
        sensitivity=req.sensitivity,
        false_positive_rate=req.false_positive_rate,
        hypothesis_name=req.hypothesis_name or "Academic Misconduct Present",
        evidence_name=req.evidence_name or "Detector Flags High Overlap",
    )
    return {"status": "success", "result": result}


@router.post("/bayes-net/infer")
def run_bayes_net_inference(req: BayesNetInferRequest) -> Dict[str, Any]:
    """Executes exact Variable Elimination on 5-Node Academic Integrity Bayesian Network."""
    bn = BayesianNetwork.build_academic_integrity_network()
    try:
        result = bn.variable_elimination(query_var=req.query_var, evidence=req.evidence)
        return {"status": "success", "result": result}
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@router.post("/declarative/query")
def run_declarative_query(req: DeclarativeQueryRequest) -> Dict[str, Any]:
    """Executes relational unification pattern matching over declarative knowledge base."""
    kb = get_default_declarative_facts()
    matches = kb.query(subject=req.subject, predicate=req.predicate, obj=req.obj)
    return {
        "status": "success",
        "query": {"subject": req.subject, "predicate": req.predicate, "obj": req.obj},
        "match_count": len(matches),
        "results": matches,
    }


@router.post("/procedural/run")
def run_procedural_pipeline(req: ProceduralExecuteRequest) -> Dict[str, Any]:
    """Executes the procedural text sanitization & fingerprinting workflow."""
    pipeline = build_academic_sanitization_and_fingerprint_pipeline()
    payload = {
        "raw_text": req.raw_text,
        "shingle_k": req.shingle_k,
        "window_size": req.window_size,
        "reference_fingerprints": req.reference_fingerprints or [],
        "similarity_threshold": req.similarity_threshold,
    }
    result = pipeline.execute(payload)
    return {"status": "success", "result": result}


@router.post("/expert-system/audit")
def run_expert_system_audit(req: AdvisoryAuditRequest) -> Dict[str, Any]:
    """Executes unified Production System advisory audit with HOW/WHY explanations."""
    system = ProductionSystem()
    result = system.run_advisory_audit(
        observed_facts=req.observed_facts,
        target_goal=req.target_goal,
    )
    return {"status": "success", "result": result}
