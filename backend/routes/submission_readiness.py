"""
GapGuard AI — Submission Readiness REST API Endpoint

Phase 10B: Aggregates existing analysis results into a pre-submission review dashboard.

IMPORTANT GUARDRAIL:
This endpoint aggregates existing corpus-based analyses for academic review.
It does NOT predict publication acceptance, novel validity, or scientific truth.
It does NOT compute a "readiness score" or "publication probability".
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.submission_readiness import (
    submission_readiness_service,
    CORPUS_LIMITATION_WARNING,
)


router = APIRouter(
    prefix="/api/submission-readiness",
    tags=["Submission Readiness"],
)


class SubmissionReadinessRequest(BaseModel):
    project_id: Optional[str] = None
    manuscript_id: Optional[str] = None
    previous_manuscript_id: Optional[str] = None
    research_information: Optional[Dict[str, Any]] = None
    previous_research_info: Optional[Dict[str, Any]] = None
    claims: Optional[List[Any]] = None
    gap_analysis: Optional[Dict[str, Any]] = None
    contribution_analysis: Optional[Dict[str, Any]] = None
    evidence_coverage: Optional[Dict[str, Any]] = None
    reasoning_analysis: Optional[Dict[str, Any]] = None
    revision_comparison: Optional[Dict[str, Any]] = None
    top_k: int = Field(default=5, ge=1, le=20, description="Top-K evidence papers (1-20)")


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_submission_readiness(request: SubmissionReadinessRequest):
    """
    Generate an explainable Submission Readiness Report by aggregating
    existing analysis outputs (gap analysis, contribution differentiation,
    evidence coverage, reasoning, and revision comparison).

    Safely handles missing or incomplete analysis modules.
    Does NOT calculate a single scientific score or publication probability.
    """
    try:
        report = submission_readiness_service.build_report(
            research_information=request.research_information,
            gap_analysis=request.gap_analysis,
            contribution_analysis=request.contribution_analysis,
            evidence_coverage=request.evidence_coverage,
            reasoning_analysis=request.reasoning_analysis,
            revision_comparison=request.revision_comparison,
            previous_research_info=request.previous_research_info,
            claims=request.claims,
            project_id=request.project_id,
            manuscript_id=request.manuscript_id,
            previous_manuscript_id=request.previous_manuscript_id,
            top_k=request.top_k,
        )

        return report

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Submission readiness aggregation encountered an error: {str(exc)}",
        )
