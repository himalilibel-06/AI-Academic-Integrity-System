import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from database.database import get_connection
from models.report import (
    get_report_by_id,
    get_latest_report_by_student,
    update_report_review,
)
from models.submission import get_submission_with_details
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/reports", tags=["Plagiarism Reports"])


class ReviewReportRequest(BaseModel):
    review_status: str = Field(..., description="Review status decision: 'approved', 'rejected', 'flagged', 'reviewed', 'review_required'")
    professor_feedback: Optional[str] = Field(None, description="Optional professor comments or academic feedback")



@router.get("/latest")
def get_latest_report(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve the most recently generated plagiarism report for the logged-in student.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        report = get_latest_report_by_student(connection, user_id_int)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No plagiarism reports found for your account."
            )

        submission = get_submission_with_details(connection, report["submission_id"])
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )

        # Parse matches JSON safely
        matches = []
        if report["matches"]:
            try:
                matches = json.loads(report["matches"])
            except (json.JSONDecodeError, TypeError):
                matches = []

        return {
            "success": True,
            "report": {
                "id": report["id"],
                "submission_id": report["submission_id"],
                "overall_similarity_score": report["overall_similarity_score"],
                "similarity_score": report["overall_similarity_score"],
                "risk_level": report["risk_level"],
                "matches": matches,
                "review_status": report["review_status"],
                "professor_feedback": report["professor_feedback"],
                "reviewed_by": report["reviewed_by"],
                "reviewed_at": str(report["reviewed_at"]) if report["reviewed_at"] else None,
                "created_at": str(report["created_at"]) if report["created_at"] else None,
                "submission": {
                    "id": submission["id"],
                    "title": submission["title"],
                    "filename": submission["filename"],
                    "file_type": submission["file_type"],
                    "status": submission["status"],
                    "course_id": submission["course_id"],
                    "course_name": submission["course_name"],
                    "course_code": submission["course_code"],
                    "student_id": submission["student_id"],
                    "student_name": submission["student_name"],
                    "submitted_at": str(submission["submitted_at"]) if submission["submitted_at"] else None
                }
            }
        }

    finally:
        connection.close()


@router.get("/{report_id}")
def get_report(report_id: int, payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve a specific plagiarism report by ID.
    Enforces student ownership check (Student A cannot view Student B's report).
    """
    user_id = payload.get("sub")
    user_role = payload.get("role")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        report = get_report_by_id(connection, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plagiarism report #{report_id} not found."
            )

        submission = get_submission_with_details(connection, report["submission_id"])
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )

        # Ownership authorization check
        if user_role == "student" and submission["student_id"] != user_id_int:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access another student's report."
            )

        # Parse matches JSON safely
        matches = []
        if report["matches"]:
            try:
                matches = json.loads(report["matches"])
            except (json.JSONDecodeError, TypeError):
                matches = []

        return {
            "success": True,
            "report": {
                "id": report["id"],
                "submission_id": report["submission_id"],
                "overall_similarity_score": report["overall_similarity_score"],
                "similarity_score": report["overall_similarity_score"],
                "risk_level": report["risk_level"],
                "matches": matches,
                "review_status": report["review_status"],
                "professor_feedback": report["professor_feedback"],
                "reviewed_by": report["reviewed_by"],
                "reviewed_at": str(report["reviewed_at"]) if report["reviewed_at"] else None,
                "created_at": str(report["created_at"]) if report["created_at"] else None,
                "submission": {
                    "id": submission["id"],
                    "title": submission["title"],
                    "filename": submission["filename"],
                    "file_type": submission["file_type"],
                    "status": submission["status"],
                    "course_id": submission["course_id"],
                    "course_name": submission["course_name"],
                    "course_code": submission["course_code"],
                    "student_id": submission["student_id"],
                    "student_name": submission["student_name"],
                    "submitted_at": str(submission["submitted_at"]) if submission["submitted_at"] else None
                }
            }
        }

    finally:
        connection.close()


@router.put("/{report_id}/review")
def review_plagiarism_report(
    report_id: int,
    request: ReviewReportRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Update professor review decision and feedback for a plagiarism report.
    Enforces that the authenticated user is a professor who owns the course for this submission.
    """
    user_role = payload.get("role")
    if user_role != "professor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professors can submit report reviews."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        professor_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        report = get_report_by_id(connection, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plagiarism report #{report_id} not found."
            )

        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT s.id, s.course_id, c.professor_id
            FROM submissions s
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE s.id = ?
            """,
            (report["submission_id"],)
        )
        sub_row = cursor.fetchone()
        if not sub_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )

        course_prof_id = sub_row["professor_id"]
        # Check ownership: If the course has a professor assigned and it's not this professor, deny access
        if course_prof_id is not None and course_prof_id != professor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to review submissions for courses you do not teach."
            )
        # If submission has no course assigned
        if sub_row["course_id"] is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to review submissions with no assigned course."
            )

        # Normalize review status
        norm_status = request.review_status.strip().lower()
        valid_statuses = {
            "approved": "approved",
            "reviewed": "reviewed",
            "rejected": "rejected",
            "flagged": "flagged",
            "review_required": "review_required",
            "requires further investigation": "review_required",
            "pending": "pending",
            "no action required": "approved",
            "discuss with student": "review_required",
            "refer to academic committee": "flagged",
        }
        db_review_status = valid_statuses.get(norm_status, norm_status)

        # Update report review
        update_report_review(
            connection,
            report_id,
            review_status=db_review_status,
            professor_feedback=request.professor_feedback,
            reviewed_by=professor_id
        )

        # Update related submission status
        if db_review_status in ("approved", "reviewed"):
            new_sub_status = "reviewed"
        elif db_review_status in ("flagged", "rejected", "review_required"):
            new_sub_status = "review_required"
        else:
            new_sub_status = "processing"

        cursor.execute(
            "UPDATE submissions SET status = ? WHERE id = ?",
            (new_sub_status, report["submission_id"])
        )
        connection.commit()

        return {
            "success": True,
            "report_id": report_id,
            "review_status": db_review_status,
            "professor_feedback": request.professor_feedback,
            "submission_status": new_sub_status,
            "message": "Review decision saved successfully."
        }

    finally:
        connection.close()

