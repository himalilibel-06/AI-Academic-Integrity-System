from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.database import get_connection
from models.user import create_user, get_user_by_email, verify_password


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


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


@router.post("/login")
def login_user(data: LoginRequest):
    """
    Authenticate user with email and password.
    """

    email_clean = data.email.strip().lower()

    if not email_clean:
        raise HTTPException(
            status_code=400,
            detail="Email is required"
        )

    if not data.password:
        raise HTTPException(
            status_code=400,
            detail="Password is required"
        )

    connection = get_connection()

    try:
        user = get_user_by_email(connection, email_clean)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Verify password hash
        if not verify_password(data.password, user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        }

    finally:
        connection.close()