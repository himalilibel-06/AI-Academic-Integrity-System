from typing import Optional, List, Dict, Any


def create_custom_reference(
    connection,
    user_id: int,
    title: str,
    author: str = "",
    publication_year: str = "",
    research_field: str = "",
    filename: str = "",
    file_path: str = "",
    original_text: str = "",
    processed_text: str = "",
) -> int:
    """
    Insert a custom reference paper record into custom_references.
    Returns the new row ID.
    """
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO custom_references (
            user_id, title, author, publication_year, research_field,
            filename, file_path, original_text, processed_text
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            title.strip(),
            (author or "").strip(),
            (publication_year or "").strip(),
            (research_field or "").strip(),
            (filename or "").strip(),
            (file_path or "").strip(),
            original_text,
            processed_text,
        ),
    )
    connection.commit()
    return cursor.lastrowid


def get_custom_references_by_user(connection, user_id: int) -> List[Dict[str, Any]]:
    """
    Retrieve all custom reference papers added by a specific user.
    """
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT id, user_id, title, author, publication_year, research_field,
               filename, file_path, original_text, processed_text, created_at
        FROM custom_references
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    return [dict(r) for r in rows]


def get_custom_reference_by_id(connection, reference_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve a single custom reference paper by its primary key ID.
    """
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT id, user_id, title, author, publication_year, research_field,
               filename, file_path, original_text, processed_text, created_at
        FROM custom_references
        WHERE id = ?
        """,
        (reference_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def delete_custom_reference(connection, reference_id: int, user_id: int) -> bool:
    """
    Delete a custom reference paper, enforcing ownership (user_id must match).
    Returns True if a record was deleted, False otherwise.
    """
    cursor = connection.cursor()
    cursor.execute(
        """
        DELETE FROM custom_references
        WHERE id = ? AND user_id = ?
        """,
        (reference_id, user_id),
    )
    connection.commit()
    return cursor.rowcount > 0


def update_custom_reference_metadata(
    connection,
    reference_id: int,
    user_id: int,
    title: str,
    author: str = "",
    publication_year: str = "",
    research_field: str = "",
) -> bool:
    """
    Update title, author, publication year, and research field for a custom reference.
    Enforces ownership (user_id must match). Returns True if row was updated.
    """
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE custom_references
        SET title = ?, author = ?, publication_year = ?, research_field = ?
        WHERE id = ? AND user_id = ?
        """,
        (
            title.strip(),
            (author or "").strip(),
            (publication_year or "").strip(),
            (research_field or "").strip(),
            reference_id,
            user_id,
        ),
    )
    connection.commit()
    return cursor.rowcount > 0

