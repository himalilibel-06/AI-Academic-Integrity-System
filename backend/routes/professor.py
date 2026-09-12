from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status

from database.database import get_connection
from models.course import get_professor_courses_with_stats
from models.submission import (
    get_professor_dashboard_stats,
    get_submissions_for_professor,
)
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/professor", tags=["Professor"])


def format_date(dt_str) -> str:
    """Format ISO/SQLite timestamp into a readable date string like 'Sep 12, 2026'."""
    if not dt_str:
        return "Recent"
    try:
        dt = datetime.fromisoformat(str(dt_str).replace(" ", "T"))
        return dt.strftime("%b %d, %Y")
    except Exception:
        return str(dt_str)[:10]


def get_initials(name: str) -> str:
    """Extract up to 2 initials from user's name."""
    if not name:
        return "PR"
    parts = [p for p in name.strip().split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return name[:2].upper()


def format_display_status(raw_status: str, risk_level: str, review_status: str, similarity: Optional[float]) -> str:
    """Determine clean display status for professor view."""
    if review_status in ("approved", "reviewed"):
        return "Reviewed"
    if risk_level == "high_risk" or (similarity is not None and similarity > 40.0):
        return "High Similarity"
    if risk_level == "review_required" or review_status == "review_required":
        return "Review Required"
    if raw_status in ("completed", "reviewed", "approved"):
        return "Completed"
    if raw_status in ("pending", "processing"):
        return "Processing"
    return (raw_status or "Processing").capitalize()


def require_professor(payload: dict) -> int:
    """Validate that the authenticated user is a professor and return user ID."""
    user_role = payload.get("role")
    if user_role != "professor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professors can access this endpoint."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        return int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )


@router.get("/dashboard")
def get_professor_dashboard(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve aggregated dashboard statistics, course summaries,
    review-required submissions, and recent submissions for the authenticated professor.
    """
    professor_id = require_professor(payload)

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (professor_id,))
        user_row = cursor.fetchone()

        prof_name = user_row["name"] if user_row else "Professor"
        prof_email = user_row["email"] if user_row else payload.get("email", "")

        # Compute real statistics from SQLite
        stats = get_professor_dashboard_stats(connection, professor_id)

        # Retrieve submissions requiring review (limit to top 4)
        review_rows = get_submissions_for_professor(connection, professor_id, limit=4, review_only=True)
        review_required_list = []
        for row in review_rows:
            sim = round(float(row["similarity_score"]), 1) if row["similarity_score"] is not None else None
            disp_status = format_display_status(row["status"], row["risk_level"], row["review_status"], sim)
            course_text = f"{row['course_code']} - {row['course_name']}" if row["course_code"] else (row["course_name"] or "General Course")
            review_required_list.append({
                "id": row["id"],
                "report_id": row["report_id"],
                "student": row["student_name"],
                "assignment": row["title"],
                "course": course_text,
                "date": format_date(row["submitted_at"]),
                "similarity": sim,
                "status": disp_status,
                "risk_level": row["risk_level"],
            })

        # Retrieve recent submissions (top 6)
        recent_rows = get_submissions_for_professor(connection, professor_id, limit=6)
        recent_submissions = []
        for row in recent_rows:
            sim = round(float(row["similarity_score"]), 1) if row["similarity_score"] is not None else None
            disp_status = format_display_status(row["status"], row["risk_level"], row["review_status"], sim)
            course_text = row["course_code"] or row["course_name"] or "General"
            recent_submissions.append({
                "id": row["id"],
                "report_id": row["report_id"],
                "student": row["student_name"],
                "assignment": row["title"],
                "course": course_text,
                "date": format_date(row["submitted_at"]),
                "similarity": sim,
                "status": disp_status,
            })

        # Retrieve course breakdown overview
        course_rows = get_professor_courses_with_stats(connection, professor_id)
        course_overview = []
        for c in course_rows:
            course_overview.append({
                "id": c["id"],
                "code": c["code"],
                "name": c["name"],
                "students": c["student_count"],
                "submissions": c["submission_count"],
                "pendingReview": c["pending_reviews"],
                "similarityReviews": c["submission_count"],
                "averageSimilarity": c["avg_similarity"],
            })

        return {
            "success": True,
            "professor": {
                "id": professor_id,
                "name": prof_name,
                "email": prof_email,
                "initials": get_initials(prof_name),
            },
            "stats": {
                "total_submissions": stats["total_submissions"],
                "completed": stats["completed"],
                "processing": stats["processing"],
                "review_required": stats["review_required"],
                "high_similarity": stats["high_similarity"],
            },
            "similarity_overview": stats["similarity_overview"],
            "review_required": review_required_list,
            "recent_submissions": recent_submissions,
            "course_overview": course_overview,
        }

    finally:
        connection.close()


@router.get("/submissions")
def get_professor_submissions(
    course_id: Optional[int] = None,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieve all historical student submissions for courses taught by the authenticated professor.
    """
    professor_id = require_professor(payload)

    connection = get_connection()
    try:
        rows = get_submissions_for_professor(connection, professor_id, course_id=course_id)

        submissions_list = []
        for row in rows:
            sim = round(float(row["similarity_score"]), 1) if row["similarity_score"] is not None else None
            disp_status = format_display_status(row["status"], row["risk_level"], row["review_status"], sim)
            course_display = (
                f"{row['course_code']} - {row['course_name']}"
                if row["course_code"] and row["course_name"]
                else (row["course_name"] or "General Course")
            )

            # Map raw review_status to display
            rev_status = "Pending"
            if row["review_status"] in ("approved", "reviewed"):
                rev_status = "Reviewed"
            elif row["review_status"] in ("flagged", "review_required"):
                rev_status = "Pending"

            submissions_list.append({
                "id": row["id"],
                "report_id": row["report_id"],
                "student": row["student_name"],
                "student_email": row["student_email"],
                "assignment": row["title"],
                "filename": row["filename"],
                "course": row["course_name"] or "General Course",
                "course_code": row["course_code"] or "",
                "course_display": course_display,
                "date": format_date(row["submitted_at"]),
                "submitted_at": str(row["submitted_at"]) if row["submitted_at"] else None,
                "similarity": sim,
                "status": disp_status,
                "reviewStatus": rev_status,
                "raw_review_status": row["review_status"],
                "risk_level": row["risk_level"],
                "professor_feedback": row["professor_feedback"],
                "reviewed_at": str(row["reviewed_at"]) if row["reviewed_at"] else None,
            })

        return {
            "success": True,
            "submissions": submissions_list,
        }

    finally:
        connection.close()


@router.get("/courses")
def get_professor_courses(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve all courses taught by the authenticated professor with dynamic statistics.
    """
    professor_id = require_professor(payload)

    connection = get_connection()
    try:
        rows = get_professor_courses_with_stats(connection, professor_id)

        courses_list = []
        for c in rows:
            courses_list.append({
                "id": c["id"],
                "code": c["code"],
                "name": c["name"],
                "description": c["description"] or "",
                "students": c["student_count"],
                "submissions": c["submission_count"],
                "pendingReviews": c["pending_reviews"],
                "averageSimilarity": round(float(c["avg_similarity"]), 1),
                "status": "Active",
                "created_at": str(c["created_at"]) if c["created_at"] else None,
            })

        return {
            "success": True,
            "courses": courses_list,
        }

    finally:
        connection.close()
