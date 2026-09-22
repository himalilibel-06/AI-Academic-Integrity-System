from typing import Optional, List, Dict, Any


def create_notification(
    conn,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    link: Optional[str] = None
) -> int:
    """
    Create a new notification record for a specific user.
    Keeps all SQL queries strictly parameterized.
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO notifications (user_id, title, message, type, link, is_read)
        VALUES (?, ?, ?, ?, ?, 0)
        """,
        (
            user_id,
            title.strip(),
            message.strip(),
            notification_type.strip(),
            link.strip() if link else None
        )
    )
    conn.commit()
    return cursor.lastrowid


def get_user_notifications(
    conn,
    user_id: int,
    limit: int = 50,
    unread_only: bool = False
) -> List[Dict[str, Any]]:
    """
    Retrieve chronological notifications for a specific user.
    """
    cursor = conn.cursor()
    query = """
        SELECT id, user_id, title, message, type, link, is_read, created_at
        FROM notifications
        WHERE user_id = ?
    """
    params = [user_id]
    if unread_only:
        query += " AND is_read = 0"

    query += " ORDER BY created_at DESC, id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    return [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "title": r["title"],
            "message": r["message"],
            "type": r["type"],
            "link": r["link"],
            "is_read": bool(r["is_read"]),
            "created_at": str(r["created_at"]) if r["created_at"] else None
        }
        for r in rows
    ]


def get_unread_notification_count(conn, user_id: int) -> int:
    """
    Count unread notifications for a specific user.
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
        (user_id,)
    )
    row = cursor.fetchone()
    return row[0] if row else 0


def mark_notification_as_read(conn, notification_id: int, user_id: int) -> bool:
    """
    Mark a single notification as read, ensuring strict user ownership.
    Returns True if an unread or existing notification owned by user was updated.
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?
        """,
        (notification_id, user_id)
    )
    conn.commit()
    return cursor.rowcount > 0


def mark_all_notifications_as_read(conn, user_id: int) -> int:
    """
    Mark all unread notifications for a specific user as read.
    Returns the number of rows updated.
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ? AND is_read = 0
        """,
        (user_id,)
    )
    conn.commit()
    return cursor.rowcount
