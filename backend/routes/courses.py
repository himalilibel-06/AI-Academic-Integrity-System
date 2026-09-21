from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database.database import get_connection
from models.course import (
    get_all_courses,
    create_course,
    get_course_by_id,
    enroll_student,
    unenroll_student,
    is_student_enrolled,
    get_course_roster_with_integrity_stats,
)
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/courses", tags=["Courses"])


class CreateCourseRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Course name, e.g. 'Deep Learning'")
    code: str = Field(..., min_length=2, max_length=20, description="Course code, e.g. 'CS405'")
    description: Optional[str] = Field("", max_length=500, description="Course description")


@router.get("")
def list_courses(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve all academic courses available for submission.
    Requires authentication.
    """
    connection = get_connection()
    try:
        courses = get_all_courses(connection)
        return {
            "success": True,
            "courses": [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "code": c["code"],
                    "description": c["description"],
                    "professor_id": c["professor_id"],
                    "created_at": str(c["created_at"]) if c["created_at"] else None
                }
                for c in courses
            ]
        }
    finally:
        connection.close()


@router.post("", status_code=status.HTTP_201_CREATED)
def add_course(
    request: CreateCourseRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Create a new course. Only professors are permitted to create courses.
    The professor_id is automatically assigned from the authenticated user's JWT.
    """
    user_role = payload.get("role")
    if user_role != "professor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professors can create new courses."
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

    clean_code = request.code.strip().upper()
    clean_name = request.name.strip()
    clean_desc = (request.description or "").strip()

    if not clean_code or not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course code and name are required."
        )

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM courses WHERE UPPER(code) = UPPER(?)", (clean_code,))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Course with code '{clean_code}' already exists."
            )

        course_id = create_course(connection, clean_name, clean_code, clean_desc, professor_id)

        return {
            "success": True,
            "course": {
                "id": course_id,
                "name": clean_name,
                "code": clean_code,
                "description": clean_desc,
                "professor_id": professor_id,
            },
            "message": f"Course '{clean_code} - {clean_name}' created successfully."
        }
    finally:
        connection.close()


@router.post("/{course_id}/enroll", status_code=status.HTTP_201_CREATED)
def enroll_in_course(
    course_id: int,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Enroll the authenticated student in a course.
    Only students are permitted to enroll.
    """
    user_role = payload.get("role")
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can enroll in courses."
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
        course = get_course_by_id(connection, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        if is_student_enrolled(connection, course_id, student_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You are already enrolled in {course['code']} - {course['name']}."
            )

        enroll_student(connection, course_id, student_id)

        return {
            "success": True,
            "message": f"Successfully enrolled in {course['code']} - {course['name']}.",
            "course": {
                "id": course["id"],
                "code": course["code"],
                "name": course["name"],
                "description": course["description"],
            }
        }
    finally:
        connection.close()


@router.delete("/{course_id}/enroll")
def drop_course(
    course_id: int,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Drop/unenroll the authenticated student from a course.
    Only students can unenroll themselves.
    """
    user_role = payload.get("role")
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can drop courses."
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
        course = get_course_by_id(connection, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        if not is_student_enrolled(connection, course_id, student_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not enrolled in this course."
            )

        unenroll_student(connection, course_id, student_id)

        return {
            "success": True,
            "message": f"Successfully dropped course {course['code']} - {course['name']}."
        }
    finally:
        connection.close()


@router.get("/{course_id}/roster")
def get_course_roster(
    course_id: int,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieve the student roster with integrity statistics for a course.
    Only the owning professor is permitted to view the roster.
    """
    user_role = payload.get("role")
    if user_role != "professor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professors can view course rosters."
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
        course = get_course_by_id(connection, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        if course["professor_id"] != professor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view the roster for this course."
            )

        roster = get_course_roster_with_integrity_stats(connection, course_id, professor_id)

        return {
            "success": True,
            "course": {
                "id": course["id"],
                "code": course["code"],
                "name": course["name"],
                "description": course["description"],
            },
            "roster": roster or [],
            "total_students": len(roster) if roster else 0
        }
    finally:
        connection.close()


@router.delete("/{course_id}/roster/{student_id}")
def remove_student_from_roster(
    course_id: int,
    student_id: int,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Remove a student from a course roster.
    Only the owning professor is permitted to remove students.
    """
    user_role = payload.get("role")
    if user_role != "professor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professors can remove students from course rosters."
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
        course = get_course_by_id(connection, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        if course["professor_id"] != professor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this course roster."
            )

        if not is_student_enrolled(connection, course_id, student_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student enrollment not found in this course."
            )

        unenroll_student(connection, course_id, student_id)

        return {
            "success": True,
            "message": "Student successfully removed from course roster."
        }
    finally:
        connection.close()

