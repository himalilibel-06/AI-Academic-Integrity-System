from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status

from database.database import get_connection
from models.course import get_student_courses
from models.submission import (
    get_student_dashboard_stats,
    get_student_submissions_with_reports,
)
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/student", tags=["Student"])


def format_date(dt_str) -> str:
    """Format ISO/SQLite timestamp into a readable date string like 'Sep 12, 2026'."""
    if not dt_str:
        return "Recent"
    try:
        dt = datetime.fromisoformat(str(dt_str).replace(" ", "T"))
        return dt.strftime("%b %d, %Y")
    except Exception:
        return str(dt_str)[:10]


def format_status(raw_status: str, risk_level: str, review_status: Optional[str] = None) -> str:
    """
    Map raw database status, automated risk level, and professor review decision
    to user-friendly display status with professor decision priority:
    - approved → "Approved"
    - reviewed → "Reviewed"
    - review_required → "Review Required"
    - flagged → "Flagged"
    - rejected → "Rejected"
    - if no professor review exists and raw processing status is completed → "Analysis Complete"
    """
    if review_status:
        norm_rev = str(review_status).strip().lower()
        if norm_rev == "approved":
            return "Approved"
        elif norm_rev == "reviewed":
            return "Reviewed"
        elif norm_rev == "review_required":
            return "Review Required"
        elif norm_rev == "flagged":
            return "Flagged"
        elif norm_rev == "rejected":
            return "Rejected"

    if raw_status in ("pending", "processing"):
        return "Processing"

    if raw_status in ("completed", "reviewed", "approved"):
        return "Analysis Complete"

    if risk_level == "review_required":
        return "Review Required"

    return (raw_status or "Processing").capitalize()


def get_initials(name: str) -> str:
    """Extract up to 2 initials from user's name."""
    if not name:
        return "ST"
    parts = [p for p in name.strip().split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return name[:2].upper()


@router.get("/dashboard")
def get_student_dashboard(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve aggregated dashboard statistics and recent submissions
    for the authenticated student.
    """
    user_role = payload.get("role")
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access the student dashboard."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        student_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (student_id,))
        user_row = cursor.fetchone()

        student_name = user_row["name"] if user_row else "Student"
        student_email = user_row["email"] if user_row else payload.get("email", "")

        # Compute real statistics from SQLite
        stats = get_student_dashboard_stats(connection, student_id)

        # Retrieve top 5 recent submissions with report details
        recent_rows = get_student_submissions_with_reports(connection, student_id, limit=5)

        recent_submissions = []
        for row in recent_rows:
            display_status = format_status(row["status"], row["risk_level"], row["review_status"])
            recent_submissions.append({
                "id": row["id"],
                "title": row["title"],
                "filename": row["filename"],
                "course": row["course_name"] or "General Course",
                "course_code": row["course_code"] or "",
                "status": display_status,
                "raw_status": row["status"],
                "similarity": (
                    round(float(row["similarity_score"]), 1)
                    if row["similarity_score"] is not None
                    else None
                ),
                "risk_level": row["risk_level"],
                "review_status": row["review_status"],
                "professor_feedback": row["professor_feedback"],
                "reviewed_at": str(row["reviewed_at"]) if row["reviewed_at"] else None,
                "reviewed_by_name": row["reviewed_by_name"],
                "report_id": row["report_id"],
                "date": format_date(row["submitted_at"]),
                "submitted_at": str(row["submitted_at"]) if row["submitted_at"] else None,
            })

        return {
            "success": True,
            "student": {
                "id": student_id,
                "name": student_name,
                "email": student_email,
                "initials": get_initials(student_name),
            },
            "stats": stats,
            "recent_submissions": recent_submissions,
        }

    finally:
        connection.close()


@router.get("/submissions")
def get_student_submissions(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve all historical submissions for the authenticated student,
    joined with course metadata, similarity metrics, and report IDs.
    """
    user_role = payload.get("role")
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access student submissions."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        student_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        submission_rows = get_student_submissions_with_reports(connection, student_id)

        submissions_list = []
        for row in submission_rows:
            display_status = format_status(row["status"], row["risk_level"], row["review_status"])
            submissions_list.append({
                "id": row["id"],
                "title": row["title"],
                "filename": row["filename"],
                "course": row["course_name"] or "General Course",
                "course_code": row["course_code"] or "",
                "status": display_status,
                "raw_status": row["status"],
                "similarity": (
                    round(float(row["similarity_score"]), 1)
                    if row["similarity_score"] is not None
                    else None
                ),
                "risk_level": row["risk_level"],
                "review_status": row["review_status"],
                "professor_feedback": row["professor_feedback"],
                "reviewed_at": str(row["reviewed_at"]) if row["reviewed_at"] else None,
                "reviewed_by_name": row["reviewed_by_name"],
                "report_id": row["report_id"],
                "date": format_date(row["submitted_at"]),
                "submitted_at": str(row["submitted_at"]) if row["submitted_at"] else None,
            })

        return {
            "success": True,
            "submissions": submissions_list,
        }

    finally:
        connection.close()


@router.get("/courses")
def get_student_enrolled_courses(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve all courses the authenticated student is currently enrolled in,
    including course code, name, professor info, enrollment date, and submission count.
    """
    user_role = payload.get("role")
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access enrolled courses."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        student_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        courses = get_student_courses(connection, student_id)
        return {
            "success": True,
            "courses": [
                {
                    "id": c["id"],
                    "code": c["code"],
                    "name": c["name"],
                    "description": c["description"] or "",
                    "professor_id": c["professor_id"],
                    "professor_name": c["professor_name"] or "Faculty Instructor",
                    "professor_email": c["professor_email"] or "",
                    "enrolled_at": str(c["enrolled_at"]) if c["enrolled_at"] else None,
                    "submission_count": c["submission_count"] or 0,
                }
                for c in courses
            ],
            "total_courses": len(courses)
        }
    finally:
        connection.close()

