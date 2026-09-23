"""
GapGuard AI — Research Gap Contradiction Checker API Routes

Endpoint:
- POST /api/gap-analysis/analyze : Evaluate claimed research gap against local literature evidence

IMPORTANT GUARDRAIL:
This endpoint performs rule-based relationship reasoning over available corpus literature.
It does NOT establish global novelty, scientific truth, or academic misconduct.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from services.literature_retrieval import literature_retriever
from services.gap_analyzer import gap_analyzer, _extract_text


router = APIRouter(
    prefix="/api/gap-analysis",
    tags=["Gap Analysis"],
)


class GapAnalysisRequest(BaseModel):
    research_information: Dict[str, Any] = Field(
        ...,
        description="Structured academic research fields. 'claimed_research_gap' is required."
    )
    top_k: int = Field(default=10, ge=1, le=20, description="Number of literature evidence papers to retrieve (1-20)")


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_research_gap(
    request: GapAnalysisRequest,
):
    """
    Analyze a claimed research gap against retrieved literature evidence from the local corpus.
    Reuses existing baseline TF-IDF literature retrieval layer.
    """
    info = request.research_information
    if not isinstance(info, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'research_information' must be a JSON object containing 'claimed_research_gap'.",
        )

    # Validate that claimed_research_gap exists and is non-empty
    raw_gap = info.get("claimed_research_gap")
    claimed_gap_text = _extract_text(raw_gap)
    if not claimed_gap_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A non-empty 'claimed_research_gap' is required for research gap contradiction analysis.",
        )

    # Validate top_k
    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="top_k must be an integer between 1 and 20.",
        )

    try:
        # Step 1: Reuse existing literature retrieval service (no duplicate retrieval logic)
        evidence_papers = literature_retriever.retrieve(
            research_information=info,
            top_k=request.top_k,
        )

        # Step 2: Pass retrieved papers to gap analyzer
        analysis_result = gap_analyzer.analyze_gap(
            research_info=info,
            evidence_papers=evidence_papers,
        )

        return {
            "success": True,
            "overall_assessment": analysis_result["overall_assessment"],
            "claimed_research_gap": analysis_result["claimed_research_gap"],
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
            detail=f"Gap analysis encountered an internal error: {str(exc)}",
        )
