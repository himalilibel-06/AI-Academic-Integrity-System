"""
GapGuard AI — Faculty Review REST API Endpoints

Phase 11A: Endpoints for faculty reviewers to provide structured qualitative feedback
on student research projects, and for students to view faculty feedback.

Endpoints:
- POST /api/faculty-review/create : Start or retrieve active faculty review for a project
- GET  /api/faculty-review/{project_id} : Retrieve faculty review for a project
- PUT  /api/faculty-review/{review_id} : Save qualitative feedback & recommendations
- POST /api/faculty-review/{review_id}/request-revision : Request revision (requires feedback)
- POST /api/faculty-review/{review_id}/complete : Mark review completed ("Reviewed")
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.faculty_review import (
    faculty_review_service,
    ACADEMIC_GUARDRAIL_NOTICE,
    STATUS_IN_REVIEW,
)

router = APIRouter(
    prefix="/api/faculty-review",
    tags=["Faculty Review"],
)


class CreateReviewRequest(BaseModel):
    project_id: str = Field(..., description="Target Research Project ID")
    project_title: Optional[str] = Field(None, description="Optional project title")
    student_id: Optional[str] = Field(None, description="Optional student account ID")
    reviewer_id: Optional[str] = Field(None, description="Reviewer faculty ID")
    reviewer_name: Optional[str] = Field(None, description="Reviewer faculty display name")
    initial_status: Optional[str] = Field(STATUS_IN_REVIEW, description="Initial review status")


class SaveFeedbackRequest(BaseModel):
    comments: Optional[Dict[str, str]] = Field(
        None,
        description="Structured comments for research problem, gap, method, contribution, literature, claims."
    )
    recommendations: Optional[str] = Field(None, description="Overall qualitative recommendations")
    reviewer_name: Optional[str] = Field(None, description="Updated reviewer display name")


class RequestRevisionRequest(BaseModel):
    comments: Optional[Dict[str, str]] = Field(
        None,
        description="Structured comments with revision guidance."
    )
    recommendations: Optional[str] = Field(None, description="Overall revision recommendations")
    reviewer_name: Optional[str] = Field(None, description="Reviewer display name")


class CompleteReviewRequest(BaseModel):
    comments: Optional[Dict[str, str]] = Field(None)
    recommendations: Optional[str] = Field(None)
    reviewer_name: Optional[str] = Field(None)


@router.post("/create", status_code=status.HTTP_200_OK)
async def create_or_start_review(request: CreateReviewRequest):
    """
    Start a faculty review for a research project or return the active review safely.
    Rejects unknown projects safely with HTTP 404.
    """
    if not request.project_id or not request.project_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A non-empty 'project_id' is required to create a faculty review.",
        )

    try:
        review = faculty_review_service.create_or_get_review(
            project_id=request.project_id.strip(),
            reviewer_id=request.reviewer_id,
            reviewer_name=request.reviewer_name,
            student_id=request.student_id,
            initial_status=request.initial_status or STATUS_IN_REVIEW,
        )
        return {
            "success": True,
            "review": review,
            "message": "Faculty review session initialized.",
        }
    except ValueError as val_err:
        err_msg = str(val_err)
        if "not found" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Encountered an internal error while creating faculty review: {str(exc)}",
        )


@router.get("/projects", status_code=status.HTTP_200_OK)
async def list_faculty_review_projects():
    """
    List all research projects available for faculty review.
    Phase 11B: Derives review status dynamically from existing faculty review records.
    Provides counts for workflow management without scores or rankings.
    """
    try:
        data = faculty_review_service.list_projects_for_review()
        return {
            "success": True,
            **data,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load faculty review projects: {str(exc)}",
        )


@router.get("/{project_id}", status_code=status.HTTP_200_OK)
async def get_faculty_review_for_project(project_id: str):
    """
    Retrieve faculty review for a research project.
    Accessible to both faculty and students.
    Returns HTTP 404 if project is completely unknown.
    """
    clean_id = project_id.strip() if project_id else ""
    if not clean_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id must be provided.",
        )

    review = faculty_review_service.get_review_by_project_id(clean_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research project '{clean_id}' not found.",
        )

    return {
        "success": True,
        "project_id": clean_id,
        "review": review,
    }


@router.put("/{review_id}", status_code=status.HTTP_200_OK)
async def save_faculty_feedback(review_id: str, request: SaveFeedbackRequest):
    """
    Save qualitative faculty comments and recommendations for a review.
    Empty sections are permitted.
    """
    clean_rev_id = review_id.strip() if review_id else ""
    if not clean_rev_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="review_id must be provided.",
        )

    try:
        updated = faculty_review_service.save_feedback(
            review_id=clean_rev_id,
            comments=request.comments,
            recommendations=request.recommendations,
            reviewer_name=request.reviewer_name,
        )
        return {
            "success": True,
            "review": updated,
            "message": "Faculty feedback saved successfully.",
        }
    except ValueError as val_err:
        err_msg = str(val_err)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error saving feedback: {str(exc)}",
        )


@router.post("/{review_id}/request-revision", status_code=status.HTTP_200_OK)
async def request_revision_for_review(review_id: str, request: RequestRevisionRequest):
    """
    Set review status to 'Revision Requested'.
    Requires at least one comment or recommendation to contain text.
    """
    clean_rev_id = review_id.strip() if review_id else ""
    if not clean_rev_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="review_id must be provided.",
        )

    try:
        updated = faculty_review_service.request_revision(
            review_id=clean_rev_id,
            comments=request.comments,
            recommendations=request.recommendations,
            reviewer_name=request.reviewer_name,
        )
        return {
            "success": True,
            "review": updated,
            "message": "Faculty revision feedback is available.",
        }
    except ValueError as val_err:
        err_msg = str(val_err)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error requesting revision: {str(exc)}",
        )


@router.post("/{review_id}/complete", status_code=status.HTTP_200_OK)
async def complete_faculty_review(review_id: str, request: CompleteReviewRequest):
    """
    Mark faculty review as 'Reviewed'.
    Academic guardrail: 'Reviewed' denotes 'Review completed', not 'Research approved'.
    """
    clean_rev_id = review_id.strip() if review_id else ""
    if not clean_rev_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="review_id must be provided.",
        )

    try:
        updated = faculty_review_service.complete_review(
            review_id=clean_rev_id,
            comments=request.comments,
            recommendations=request.recommendations,
            reviewer_name=request.reviewer_name,
        )
        return {
            "success": True,
            "review": updated,
            "message": "Review completed",
        }
    except ValueError as val_err:
        err_msg = str(val_err)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error completing review: {str(exc)}",
        )
