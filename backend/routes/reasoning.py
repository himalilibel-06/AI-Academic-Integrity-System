"""
GapGuard AI — Reasoning API Endpoints (Phase 9)

Provides REST endpoints for:
1. Rule-Based Reasoning (forward chaining & backward chaining)
2. Bayesian Evidence Reasoning: P(Gap Supported | Available Evidence)
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.rule_engine import (
    RuleEngineService,
    rule_engine_service,
    get_default_rules,
)
from services.bayesian_reasoner import (
    BayesianEvidenceReasonerService,
    bayesian_reasoner_service,
    CORPUS_LIMITATION_STATEMENT,
)
from services.gap_analyzer import gap_analyzer
from services.contribution_differentiator import contribution_differentiator
from services.literature_retrieval import literature_retriever


router = APIRouter(prefix="/api/reasoning", tags=["Reasoning"])


class ResearchInformationInput(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None
    research_problem: Optional[str] = None
    research_objective: Optional[str] = None
    claimed_research_gap: Optional[str] = None
    proposed_method: Optional[str] = None
    dataset_context: Optional[str] = None
    expected_contribution: Optional[str] = None
    evaluation_metrics: Optional[str] = None
    keywords: Optional[List[str]] = None


class ReasoningAnalysisRequest(BaseModel):
    project_id: Optional[str] = None
    research_information: Optional[ResearchInformationInput] = None
    gap_analysis: Optional[Dict[str, Any]] = None
    contribution_analysis: Optional[Dict[str, Any]] = None
    prior: float = Field(0.50, ge=0.01, le=0.99, description="Prior probability P(Gap Supported)")
    backward_chaining_goal: Optional[str] = Field(
        "GAP_SUPPORTED_BY_EVIDENCE",
        description="Goal to prove via backward chaining",
    )
    top_k: int = Field(5, ge=1, le=20)


@router.post("/analyze")
async def analyze_reasoning(request: ReasoningAnalysisRequest):
    """
    Executes Rule-Based Reasoning (Forward & Backward Chaining) and
    Bayesian Evidence Reasoning over research evidence.
    """
    # 1. Validate input requirements
    info = request.research_information
    gap_res = request.gap_analysis
    contrib_res = request.contribution_analysis

    # If neither analysis is provided and no research information is given, reject
    if not gap_res and not contrib_res and not info and not request.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either research_information, project_id, or analysis results must be provided.",
        )

    # 2. Derive Phase 6 and Phase 7 analyses if not explicitly supplied
    project_title = "Research Study"

    if info:
        info_dict = info.model_dump(exclude_none=True) if hasattr(info, "model_dump") else info.dict(exclude_none=True)
        project_title = info_dict.get("title") or project_title

        if not gap_res and (info_dict.get("claimed_research_gap") or info_dict.get("research_problem")):
            # Retrieve evidence and execute gap analysis
            claimed_gap = info_dict.get("claimed_research_gap") or info_dict.get("research_problem") or ""
            retrieved = literature_retriever.retrieve(query=claimed_gap, top_k=request.top_k)
            # Ensure claimed_research_gap exists for analyze_gap
            if not info_dict.get("claimed_research_gap"):
                info_dict["claimed_research_gap"] = claimed_gap
            gap_res = gap_analyzer.analyze_gap(
                research_info=info_dict,
                evidence_papers=retrieved,
            )

        if not contrib_res and (info_dict.get("expected_contribution") or info_dict.get("research_problem")):
            contrib_text = info_dict.get("expected_contribution") or info_dict.get("research_problem") or ""
            retrieved = literature_retriever.retrieve(query=contrib_text, top_k=request.top_k)
            if not info_dict.get("expected_contribution"):
                info_dict["expected_contribution"] = contrib_text
            contrib_res = contribution_differentiator.analyze_project_differentiation(
                research_info=info_dict,
                evidence_papers=retrieved,
            )

    # 3. Extract symbolic facts
    initial_facts = rule_engine_service.extract_facts_from_analyses(
        gap_analysis=gap_res,
        contribution_analysis=contrib_res,
    )

    # If facts are empty because of minimal info, provide fallback neutral fact
    if not initial_facts:
        initial_facts = ["EVIDENCE_SIGNAL_INSUFFICIENT"]

    # 4. Forward Chaining
    fw_result = rule_engine_service.forward_chain(facts=initial_facts)

    # 5. Backward Chaining
    target_goal = (request.backward_chaining_goal or "GAP_SUPPORTED_BY_EVIDENCE").strip()
    bw_result = rule_engine_service.backward_chain(
        goal=target_goal,
        facts=initial_facts,
    )

    # Pre-evaluate standard goals for convenient frontend inspection
    standard_goals = [
        "GAP_SUPPORTED_BY_EVIDENCE",
        "POTENTIAL_GAP_CONTRADICTION",
        "CONTRIBUTION_DIFFERENTIATED",
        "POTENTIAL_CONTRIBUTION_OVERLAP",
        "RESEARCH_DIRECTION_VIABLE",
    ]
    goals_eval = {}
    for g in standard_goals:
        eval_res = rule_engine_service.backward_chain(goal=g, facts=initial_facts)
        goals_eval[g] = {
            "supported": eval_res["supported"],
            "satisfied_conditions": eval_res["satisfied_conditions"],
            "missing_conditions": eval_res["missing_conditions"],
            "explanation": eval_res["explanation"],
        }

    # 6. Bayesian Evidence Reasoning
    bayesian_result = bayesian_reasoner_service.evaluate_from_analyses(
        gap_analysis=gap_res,
        contribution_analysis=contrib_res,
        prior=request.prior,
    )

    return {
        "project_title": project_title,
        "rule_based_reasoning": {
            "rules": [r.to_dict() for r in get_default_rules()],
            "initial_facts": fw_result["initial_facts"],
            "fired_rules": fw_result["fired_rules"],
            "derived_facts": fw_result["derived_facts"],
            "reasoning_trace": fw_result["reasoning_trace"],
        },
        "forward_chaining": fw_result,
        "backward_chaining": {
            "primary_goal": target_goal,
            "result": bw_result,
            "available_goals_evaluation": goals_eval,
        },
        "bayesian_reasoning": bayesian_result,
        "corpus_limitation_statement": CORPUS_LIMITATION_STATEMENT,
    }
