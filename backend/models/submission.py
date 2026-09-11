def create_submission(
    connection,
    student_id,
    course_id,
    title,
    filename,
    file_path=None,
    file_type=None,
    original_text=None,
    processed_text=None,
    status="pending"
):
    """
    Create a new student submission record.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO submissions (
            student_id, course_id, title, filename, file_path, file_type, original_text, processed_text, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (student_id, course_id, title, filename, file_path, file_type, original_text, processed_text, status)
    )

    connection.commit()
    return cursor.lastrowid


def get_submission_by_id(connection, submission_id):
    """
    Get a single submission record by ID.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, student_id, course_id, title, filename, file_path, file_type,
               original_text, processed_text, status, submitted_at
        FROM submissions
        WHERE id = ?
        """,
        (submission_id,)
    )

    return cursor.fetchone()


def get_submissions_by_student(connection, student_id):
    """
    Get all submissions by a specific student.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT s.id, s.student_id, s.course_id, s.title, s.filename, s.file_path,
               s.file_type, s.status, s.submitted_at, c.name AS course_name, c.code AS course_code
        FROM submissions s
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE s.student_id = ?
        ORDER BY s.submitted_at DESC
        """,
        (student_id,)
    )

    return cursor.fetchall()


def get_submissions_by_course(connection, course_id):
    """
    Get all submissions for a specific course.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT s.id, s.student_id, s.course_id, s.title, s.filename, s.file_path,
               s.file_type, s.status, s.submitted_at, u.name AS student_name, u.email AS student_email
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        WHERE s.course_id = ?
        ORDER BY s.submitted_at DESC
        """,
        (course_id,)
    )

    return cursor.fetchall()


def update_submission_status(connection, submission_id, status):
    """
    Update status of a submission (e.g. pending, reviewed, approved, rejected).
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE submissions
        SET status = ?
        WHERE id = ?
        """,
        (status, submission_id)
    )

    connection.commit()
    return cursor.rowcount
