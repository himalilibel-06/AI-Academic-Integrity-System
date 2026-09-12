from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database.database import get_connection
from models.course import get_all_courses, create_course
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
