"""
GapGuard AI — Contribution Differentiation Engine API Routes

Endpoint:
- POST /api/contribution-analysis/analyze : Compare proposed contribution against local literature corpus

IMPORTANT GUARDRAIL:
This endpoint assesses differentiation against the available local literature corpus only.
It does NOT establish global novelty, research invalidity, or originality verdicts.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from services.literature_retrieval import literature_retriever
from services.gap_analyzer import _extract_text
from services.contribution_differentiator import contribution_differentiator


router = APIRouter(
    prefix="/api/contribution-analysis",
    tags=["Contribution Differentiation"],
)


class ContributionAnalysisRequest(BaseModel):
    research_information: Dict[str, Any] = Field(
        ...,
        description="Structured academic research fields. 'expected_contribution' or 'research_problem' required."
    )
    top_k: int = Field(default=10, ge=1, le=20, description="Number of literature evidence papers to compare (1-20)")


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_contribution_differentiation(
    request: ContributionAnalysisRequest,
):
    """
    Execute 6-dimension contribution differentiation analysis against retrieved literature from the local corpus.
    Reuses existing baseline TF-IDF literature retrieval layer.
    """
    info = request.research_information
    if not isinstance(info, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'research_information' must be a valid JSON object.",
        )

    # Validate that either expected_contribution or research_problem is present
    student_contrib = _extract_text(info.get("expected_contribution", ""))
    student_problem = _extract_text(info.get("research_problem", ""))

    if not student_contrib and not student_problem:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A non-empty 'expected_contribution' or 'research_problem' is required for contribution differentiation analysis.",
        )

    # Validate top_k
    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="top_k must be an integer between 1 and 20.",
        )

    try:
        # Step 1: Reuse existing literature retrieval layer
        evidence_papers = literature_retriever.retrieve(
            research_information=info,
            top_k=request.top_k,
        )

        # Step 2: Pass retrieved papers to contribution differentiator
        analysis_result = contribution_differentiator.analyze_project_differentiation(
            research_info=info,
            evidence_papers=evidence_papers,
        )

        return {
            "success": True,
            "project_summary": analysis_result["project_summary"],
            "proposed_contribution": analysis_result["proposed_contribution"],
            "paper_analyses": analysis_result["paper_analyses"],
            "corpus_limitation": analysis_result["corpus_limitation"],
        }

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contribution differentiation encountered an internal error: {str(exc)}",
        )
