from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from database.database import get_connection
from models.notification import (
    get_user_notifications,
    get_unread_notification_count,
    mark_notification_as_read,
    mark_all_notifications_as_read,
)
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


def get_authenticated_user_id(payload: dict) -> int:
    """Extract and validate integer user ID from JWT payload."""
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


@router.get("")
def list_user_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    limit: int = Query(50, ge=1, le=100, description="Maximum notifications to return"),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieve notifications and unread count for the authenticated user.
    """
    user_id = get_authenticated_user_id(payload)

    connection = get_connection()
    try:
        notifications = get_user_notifications(
            connection,
            user_id=user_id,
            limit=limit,
            unread_only=unread_only
        )
        unread_count = get_unread_notification_count(connection, user_id)

        return {
            "success": True,
            "notifications": notifications,
            "unread_count": unread_count
        }
    finally:
        connection.close()


@router.put("/{notification_id}/read")
def mark_single_notification_read(
    notification_id: int,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Mark a single notification as read.
    Enforces strict user ownership: returns 404 if not found, 403 if owned by another user.
    """
    user_id = get_authenticated_user_id(payload)

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT user_id FROM notifications WHERE id = ?", (notification_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification #{notification_id} not found."
            )

        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to modify another user's notification."
            )

        mark_notification_as_read(connection, notification_id, user_id)
        unread_count = get_unread_notification_count(connection, user_id)

        return {
            "success": True,
            "notification_id": notification_id,
            "unread_count": unread_count,
            "message": "Notification marked as read."
        }
    finally:
        connection.close()


@router.put("/read-all")
def mark_all_user_notifications_read(
    payload: dict = Depends(get_current_user_payload)
):
    """
    Mark all unread notifications for the authenticated user as read.
    """
    user_id = get_authenticated_user_id(payload)

    connection = get_connection()
    try:
        updated_count = mark_all_notifications_as_read(connection, user_id)
        return {
            "success": True,
            "updated_count": updated_count,
            "unread_count": 0,
            "message": "All notifications marked as read."
        }
    finally:
        connection.close()
