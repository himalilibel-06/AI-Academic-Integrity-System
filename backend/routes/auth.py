import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from werkzeug.security import generate_password_hash

from database.database import get_connection
from models.user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_user_profile,
    update_user_password,
    update_user_preferences,
    verify_password,
)
from utils.auth import create_access_token, get_current_user_payload


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


DEFAULT_PREFERENCES = {
    "language": "English",
    "timeZone": "India Standard Time (IST)",
    "dateFormat": "DD/MM/YYYY",
    "notifications": {
        "submissionUpdates": True,
        "reportAvailable": True,
        "reviewRequired": True,
        "systemAnnouncements": False,
    },
    "privacy": {
        "profileVisibility": "Institution Only",
        "submissionHistory": True,
        "reportVisibility": "Student and Professor",
    },
}


def parse_user_preferences(raw_pref: Optional[str]) -> dict:
    """
    Safely parse user preferences JSON from database.
    Falls back gracefully to default preferences if empty, missing, or malformed.
    """
    if not raw_pref or not str(raw_pref).strip():
        return json.loads(json.dumps(DEFAULT_PREFERENCES))
    try:
        data = json.loads(raw_pref)
        if not isinstance(data, dict):
            return json.loads(json.dumps(DEFAULT_PREFERENCES))

        merged = json.loads(json.dumps(DEFAULT_PREFERENCES))
        for k, v in data.items():
            if isinstance(v, dict) and isinstance(merged.get(k), dict):
                merged[k].update(v)
            else:
                merged[k] = v
        return merged
    except Exception:
        return json.loads(json.dumps(DEFAULT_PREFERENCES))


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: str
    department: Optional[str] = ""
    institution: Optional[str] = ""
    phone: Optional[str] = ""


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdatePreferencesRequest(BaseModel):
    language: Optional[str] = None
    timeZone: Optional[str] = None
    dateFormat: Optional[str] = None
    notifications: Optional[dict] = None
    privacy: Optional[dict] = None


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
    Return active authenticated user details including extended profile fields.
    """
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )

    connection = get_connection()

    try:
        user = get_user_by_id(connection, user_id_int)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return {
            "success": True,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "created_at": str(user["created_at"]) if user["created_at"] else None,
                "department": user["department"] if "department" in user.keys() else "",
                "institution": user["institution"] if "institution" in user.keys() else "",
                "phone": user["phone"] if "phone" in user.keys() else "",
                "preferences": user["preferences"] if "preferences" in user.keys() else "{}",
            }
        }

    finally:
        connection.close()


@router.put("/profile")
def update_profile(
    data: UpdateProfileRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Update profile details for the authenticated user.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )

    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )

    clean_dept = (data.department or "").strip()
    clean_inst = (data.institution or "").strip()
    clean_phone = (data.phone or "").strip()

    connection = get_connection()
    try:
        user = get_user_by_id(connection, user_id_int)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        update_user_profile(
            connection,
            user_id_int,
            name=clean_name,
            department=clean_dept,
            institution=clean_inst,
            phone=clean_phone
        )

        updated_user = get_user_by_id(connection, user_id_int)

        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": {
                "id": updated_user["id"],
                "name": updated_user["name"],
                "email": updated_user["email"],
                "role": updated_user["role"],
                "created_at": str(updated_user["created_at"]) if updated_user["created_at"] else None,
                "department": updated_user["department"],
                "institution": updated_user["institution"],
                "phone": updated_user["phone"],
                "preferences": updated_user["preferences"],
            }
        }
    finally:
        connection.close()


@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Change account password verifying existing password first.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )

    if not data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required"
        )

    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must contain at least 6 characters"
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password"
        )

    connection = get_connection()
    try:
        user = get_user_by_id(connection, user_id_int)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not verify_password(data.current_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        new_hash = generate_password_hash(data.new_password)
        update_user_password(connection, user_id_int, new_hash)

        return {
            "success": True,
            "message": "Password changed successfully"
        }
    finally:
        connection.close()


@router.get("/preferences")
def get_preferences(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve stored preferences for the authenticated user.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )

    connection = get_connection()
    try:
        user = get_user_by_id(connection, user_id_int)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        raw_pref = user["preferences"] if "preferences" in user.keys() else "{}"
        preferences = parse_user_preferences(raw_pref)

        return {
            "success": True,
            "preferences": preferences
        }
    finally:
        connection.close()


@router.put("/preferences")
def update_preferences(
    data: UpdatePreferencesRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Update preferences for the authenticated user.
    Merges updates with existing preferences.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )

    connection = get_connection()
    try:
        user = get_user_by_id(connection, user_id_int)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        raw_pref = user["preferences"] if "preferences" in user.keys() else "{}"
        current_prefs = parse_user_preferences(raw_pref)

        if data.language is not None:
            current_prefs["language"] = str(data.language).strip()
        if data.timeZone is not None:
            current_prefs["timeZone"] = str(data.timeZone).strip()
        if data.dateFormat is not None:
            current_prefs["dateFormat"] = str(data.dateFormat).strip()
        if data.notifications is not None and isinstance(data.notifications, dict):
            if "notifications" not in current_prefs or not isinstance(current_prefs["notifications"], dict):
                current_prefs["notifications"] = {}
            current_prefs["notifications"].update(data.notifications)
        if data.privacy is not None and isinstance(data.privacy, dict):
            if "privacy" not in current_prefs or not isinstance(current_prefs["privacy"], dict):
                current_prefs["privacy"] = {}
            current_prefs["privacy"].update(data.privacy)

        pref_json = json.dumps(current_prefs)
        update_user_preferences(connection, user_id_int, pref_json)

        return {
            "success": True,
            "message": "Preferences saved successfully",
            "preferences": current_prefs
        }
    finally:
        connection.close()