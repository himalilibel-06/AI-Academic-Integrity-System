"""
GapGuard AI — Manuscript Revision Comparison REST API Endpoint

Phase 10A: Compares 13 academic fields across manuscript versions.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.revision_comparator import (
    revision_comparator_service,
    REVISION_DISCLAIMER,
)


router = APIRouter(
    prefix="/api/revision-comparison",
    tags=["Revision Comparison"],
)


class RevisionComparisonRequest(BaseModel):
    project_id: Optional[str] = None
    previous_manuscript_id: Optional[str] = None
    new_manuscript_id: Optional[str] = None
    previous_project_id: Optional[str] = None
    new_project_id: Optional[str] = None
    previous_research_info: Optional[Dict[str, Any]] = None
    new_research_info: Optional[Dict[str, Any]] = None
    previous_version_label: Optional[str] = Field("Version 1 — Initial Draft")
    new_version_label: Optional[str] = Field("Version 2 — Revised Draft")


@router.post("/compare", status_code=status.HTTP_200_OK)
async def compare_manuscript_revisions(request: RevisionComparisonRequest):
    """
    Compare two manuscript drafts belonging to the same research project.
    Identifies unchanged, added, modified, removed, and unavailable fields.
    """
    prev_proj = request.previous_project_id or request.project_id
    new_proj = request.new_project_id or request.project_id

    # Enforce same project validation
    if prev_proj and new_proj and str(prev_proj).strip() != str(new_proj).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Manuscripts must belong to the same research project. Received '{prev_proj}' and '{new_proj}'.",
        )

    try:
        result = revision_comparator_service.compare_revisions(
            previous_info=request.previous_research_info,
            new_info=request.new_research_info,
            previous_project_id=prev_proj,
            new_project_id=new_proj,
            previous_version_label=request.previous_version_label or "Version 1",
            new_version_label=request.new_version_label or "Version 2",
        )

        return result

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Revision comparison encountered an internal error: {str(exc)}",
        )
