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


def get_submission_with_details(connection, submission_id):
    """
    Get a single submission record with joined course and student information.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT s.id, s.student_id, s.course_id, s.title, s.filename, s.file_path,
               s.file_type, s.original_text, s.processed_text, s.status, s.submitted_at,
               c.name AS course_name, c.code AS course_code,
               u.name AS student_name, u.email AS student_email
        FROM submissions s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN users u ON s.student_id = u.id
        WHERE s.id = ?
        """,
        (submission_id,)
    )

    return cursor.fetchone()


def get_student_dashboard_stats(connection, student_id):
    """
    Compute dashboard statistics for a specific student.
    Returns: total_submissions, completed_submissions, under_review,
             reports_available, average_similarity.
    """
    cursor = connection.cursor()

    # Total submissions
    cursor.execute(
        "SELECT COUNT(*) FROM submissions WHERE student_id = ?",
        (student_id,)
    )
    total_submissions = cursor.fetchone()[0]

    # Completed submissions
    cursor.execute(
        "SELECT COUNT(*) FROM submissions WHERE student_id = ? AND status = 'completed'",
        (student_id,)
    )
    completed_submissions = cursor.fetchone()[0]

    # Under review submissions (risk requires review or flagged)
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM submissions s
        LEFT JOIN plagiarism_reports r ON r.submission_id = s.id
        WHERE s.student_id = ? AND (
            r.risk_level IN ('review_required', 'high_risk')
            OR r.review_status = 'review_required'
            OR s.status = 'review_required'
        )
        """,
        (student_id,)
    )
    under_review = cursor.fetchone()[0]

    # Reports available count
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM plagiarism_reports r
        JOIN submissions s ON r.submission_id = s.id
        WHERE s.student_id = ?
        """,
        (student_id,)
    )
    reports_available = cursor.fetchone()[0]

    # Average similarity percentage
    cursor.execute(
        """
        SELECT COALESCE(ROUND(AVG(r.overall_similarity_score), 1), 0.0)
        FROM plagiarism_reports r
        JOIN submissions s ON r.submission_id = s.id
        WHERE s.student_id = ?
        """,
        (student_id,)
    )
    avg_score = cursor.fetchone()[0]

    return {
        "total_submissions": total_submissions,
        "completed": completed_submissions,
        "under_review": under_review,
        "reports_available": reports_available,
        "average_similarity": float(avg_score) if avg_score is not None else 0.0,
    }


def get_student_submissions_with_reports(connection, student_id, limit=None):
    """
    Get all submissions by a student joined with course and report details.
    """
    cursor = connection.cursor()

    query = """
        SELECT s.id, s.student_id, s.course_id, s.title, s.filename, s.file_path,
               s.file_type, s.status, s.submitted_at,
               c.name AS course_name, c.code AS course_code,
               r.id AS report_id, r.overall_similarity_score AS similarity_score,
               r.risk_level, r.review_status
        FROM submissions s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN plagiarism_reports r ON r.submission_id = s.id
        WHERE s.student_id = ?
        ORDER BY s.submitted_at DESC, s.id DESC
    """

    params = [student_id]
    if limit is not None:
        query += " LIMIT ?"
        params.append(limit)

    cursor.execute(query, tuple(params))
    return cursor.fetchall()


def get_professor_dashboard_stats(connection, professor_id):
    """
    Calculate summary statistics across all courses taught by the given professor.
    """
    cursor = connection.cursor()

    # Total submissions across professor's courses
    cursor.execute(
        """
        SELECT COUNT(DISTINCT s.id)
        FROM submissions s
        JOIN courses c ON s.course_id = c.id
        WHERE c.professor_id = ?
        """,
        (professor_id,)
    )
    total_submissions = cursor.fetchone()[0] or 0

    # Completed/reviewed submissions
    cursor.execute(
        """
        SELECT COUNT(DISTINCT s.id)
        FROM submissions s
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN plagiarism_reports r ON r.submission_id = s.id
        WHERE c.professor_id = ?
          AND (s.status IN ('completed', 'reviewed', 'approved') OR r.review_status IN ('reviewed', 'approved'))
        """,
        (professor_id,)
    )
    completed = cursor.fetchone()[0] or 0

    # Processing submissions
    cursor.execute(
        """
        SELECT COUNT(DISTINCT s.id)
        FROM submissions s
        JOIN courses c ON s.course_id = c.id
        WHERE c.professor_id = ?
          AND s.status IN ('pending', 'processing')
        """,
        (professor_id,)
    )
    processing = cursor.fetchone()[0] or 0

    # Review required submissions
    cursor.execute(
        """
        SELECT COUNT(DISTINCT s.id)
        FROM submissions s
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN plagiarism_reports r ON r.submission_id = s.id
        WHERE c.professor_id = ?
          AND (
            s.status = 'review_required'
            OR r.review_status = 'review_required'
            OR r.risk_level = 'review_required'
          )
        """,
        (professor_id,)
    )
    review_required = cursor.fetchone()[0] or 0

    # High similarity submissions (>40% or high_risk)
    cursor.execute(
        """
        SELECT COUNT(DISTINCT s.id)
        FROM submissions s
        JOIN courses c ON s.course_id = c.id
        JOIN plagiarism_reports r ON r.submission_id = s.id
        WHERE c.professor_id = ?
          AND (r.risk_level = 'high_risk' OR r.overall_similarity_score > 40.0)
        """,
        (professor_id,)
    )
    high_similarity = cursor.fetchone()[0] or 0

    # Similarity breakdown: Low (<15%), Moderate (15-40%), High (>40%)
    cursor.execute(
        """
        SELECT
            COUNT(CASE WHEN r.overall_similarity_score < 15.0 THEN 1 END) AS low_sim,
            COUNT(CASE WHEN r.overall_similarity_score >= 15.0 AND r.overall_similarity_score <= 40.0 THEN 1 END) AS mod_sim,
            COUNT(CASE WHEN r.overall_similarity_score > 40.0 THEN 1 END) AS high_sim,
            COUNT(r.id) AS total_reports
        FROM plagiarism_reports r
        JOIN submissions s ON r.submission_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE c.professor_id = ?
        """,
        (professor_id,)
    )
    sim_row = cursor.fetchone()
    total_rep = sim_row["total_reports"] if sim_row and sim_row["total_reports"] else 0
    low_count = sim_row["low_sim"] if sim_row else 0
    mod_count = sim_row["mod_sim"] if sim_row else 0
    high_count = sim_row["high_sim"] if sim_row else 0

    low_pct = round((low_count / total_rep) * 100, 1) if total_rep > 0 else 0.0
    mod_pct = round((mod_count / total_rep) * 100, 1) if total_rep > 0 else 0.0
    high_pct = round((high_count / total_rep) * 100, 1) if total_rep > 0 else 0.0

    similarity_overview = [
        {"label": "Low Similarity", "value": low_pct, "color": "bg-green-500", "count": low_count},
        {"label": "Moderate Similarity", "value": mod_pct, "color": "bg-amber-500", "count": mod_count},
        {"label": "High Similarity", "value": high_pct, "color": "bg-red-500", "count": high_count},
    ]

    return {
        "total_submissions": total_submissions,
        "completed": completed,
        "processing": processing,
        "review_required": review_required,
        "high_similarity": high_similarity,
        "similarity_overview": similarity_overview,
    }


def get_submissions_for_professor(connection, professor_id, course_id=None, limit=None, review_only=False):
    """
    Get all submissions for courses taught by the given professor, joined with student and report details.
    """
    cursor = connection.cursor()

    query = """
        SELECT s.id, s.student_id, s.course_id, s.title, s.filename, s.file_path,
               s.file_type, s.status, s.submitted_at,
               u.name AS student_name, u.email AS student_email,
               c.name AS course_name, c.code AS course_code,
               r.id AS report_id, r.overall_similarity_score AS similarity_score,
               r.risk_level, r.review_status, r.professor_feedback, r.reviewed_at
        FROM submissions s
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON s.student_id = u.id
        LEFT JOIN plagiarism_reports r ON r.submission_id = s.id
        WHERE c.professor_id = ?
    """
    params = [professor_id]

    if course_id is not None:
        query += " AND s.course_id = ?"
        params.append(course_id)

    if review_only:
        query += """
            AND (
                s.status = 'review_required'
                OR r.review_status IN ('pending', 'review_required')
                OR r.risk_level IN ('high_risk', 'review_required')
                OR r.overall_similarity_score > 35.0
            )
        """

    query += " ORDER BY s.submitted_at DESC, s.id DESC"

    if limit is not None:
        query += " LIMIT ?"
        params.append(limit)

    cursor.execute(query, tuple(params))
    return cursor.fetchall()

