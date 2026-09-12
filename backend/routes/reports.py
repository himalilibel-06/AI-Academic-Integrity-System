import json
from fastapi import APIRouter, HTTPException, Depends, status

from database.database import get_connection
from models.report import get_report_by_id, get_latest_report_by_student
from models.submission import get_submission_with_details
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/reports", tags=["Plagiarism Reports"])


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
