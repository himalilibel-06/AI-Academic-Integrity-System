"""
GapGuard AI — Evidence Coverage REST API Endpoint

Phase 10A: Evaluates research claims against local literature corpus.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.evidence_coverage import (
    evidence_coverage_service,
    CORPUS_LIMITATION_STATEMENT,
)


router = APIRouter(
    prefix="/api/evidence-coverage",
    tags=["Evidence Coverage"],
)


class EvidenceCoverageRequest(BaseModel):
    project_id: Optional[str] = None
    manuscript_id: Optional[str] = None
    claims: Optional[List[str]] = None
    research_information: Optional[Dict[str, Any]] = None
    top_k: int = Field(5, ge=1, le=20)


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_evidence_coverage(request: EvidenceCoverageRequest):
    """
    Audit extracted research claims against available local literature corpus.
    Produces individual claim evidence assessments and overall coverage percentage.
    """
    has_claims = request.claims is not None and len(request.claims) > 0
    has_info = request.research_information is not None and len(request.research_information) > 0

    if not has_claims and not has_info and not request.manuscript_id and not request.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'claims', 'research_information', 'manuscript_id', or 'project_id' must be provided.",
        )

    try:
        result = evidence_coverage_service.audit_claims(
            claims=request.claims,
            research_information=request.research_information,
            top_k=request.top_k,
        )

        return {
            "project_id": request.project_id,
            "manuscript_id": request.manuscript_id,
            "overall_coverage": result["overall_coverage"],
            "claim_analyses": result["claim_analyses"],
            "corpus_limitation_statement": CORPUS_LIMITATION_STATEMENT,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence coverage audit encountered an internal error: {str(exc)}",
        )
