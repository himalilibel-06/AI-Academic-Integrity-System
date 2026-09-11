from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.database import get_connection
from models.user import create_user, get_user_by_email


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


@router.post("/register")
def register_user(data: RegisterRequest):

    # Basic validation
    if not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    if not data.email.strip():
        raise HTTPException(
            status_code=400,
            detail="Email is required"
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters"
        )

    if data.role not in ["student", "professor"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )

    connection = get_connection()

    try:
        # Check whether email already exists
        existing_user = get_user_by_email(
            connection,
            data.email.strip().lower()
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        # Create user
        user_id = create_user(
            connection,
            data.name.strip(),
            data.email.strip().lower(),
            data.password,
            data.role
        )

        return {
            "success": True,
            "message": "User registered successfully",
            "user_id": user_id
        }

    finally:
        connection.close()