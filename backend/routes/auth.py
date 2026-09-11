from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database.database import get_connection
from models.user import create_user, get_user_by_email, verify_password
from utils.auth import create_access_token, get_current_user_payload


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
    Authenticate user with email and password, returning JWT access token.
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

        token_data = {
            "sub": str(user["id"]),
            "email": user["email"],
            "role": user["role"]
        }
        access_token = create_access_token(token_data)

        return {
            "success": True,
            "message": "Login successful",
            "token": access_token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        }

    finally:
        connection.close()


@router.get("/me")
def get_current_user(payload: dict = Depends(get_current_user_payload)):
    """
    Return active authenticated user details.
    """
    user_email = payload.get("email")

    if not user_email:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    connection = get_connection()

    try:
        user = get_user_by_email(connection, user_email)

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return {
            "success": True,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "created_at": str(user["created_at"]) if user["created_at"] else None
            }
        }

    finally:
        connection.close()
