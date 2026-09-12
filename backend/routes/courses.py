from fastapi import APIRouter, Depends

from database.database import get_connection
from models.course import get_all_courses
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/courses", tags=["Courses"])


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
