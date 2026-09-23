import json


def create_plagiarism_report(
    connection,
    submission_id,
    overall_similarity_score=0.0,
    risk_level="safe",
    matches=None,
    review_status="pending",
    evidence_details=None
):
    """
    Create a new EduGuard report.

    Existing similarity evidence is stored in `matches`.
    Additional explainable evidence is stored in `evidence_details`.
    """

    matches_json = json.dumps(matches) if matches is not None else None
    evidence_json = json.dumps(
        evidence_details if evidence_details is not None else {}
    )

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO plagiarism_reports (
            submission_id,
            overall_similarity_score,
            risk_level,
            matches,
            review_status,
            evidence_details
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            submission_id,
            overall_similarity_score,
            risk_level,
            matches_json,
            review_status,
            evidence_json
        )
    )

    connection.commit()
    return cursor.lastrowid


def get_report_by_submission_id(connection, submission_id):
    """
    Fetch report by submission ID, including explainable evidence.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT r.id,
               r.submission_id,
               r.overall_similarity_score,
               r.risk_level,
               r.matches,
               r.review_status,
               r.professor_feedback,
               r.reviewed_by,
               r.reviewed_at,
               r.created_at,
               r.evidence_details,
               u_prof.name AS reviewed_by_name
        FROM plagiarism_reports r
        LEFT JOIN users u_prof ON r.reviewed_by = u_prof.id
        WHERE r.submission_id = ?
        """,
        (submission_id,)
    )

    return cursor.fetchone()


def update_report_review(
    connection,
    report_id,
    review_status,
    professor_feedback=None,
    reviewed_by=None
):
    """
    Update professor review decision and feedback.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE plagiarism_reports
        SET review_status = ?,
            professor_feedback = ?,
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (
            review_status,
            professor_feedback,
            reviewed_by,
            report_id
        )
    )

    connection.commit()
    return cursor.rowcount


def get_report_by_id(connection, report_id):
    """
    Fetch report by report ID, including explainable evidence.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT r.id,
               r.submission_id,
               r.overall_similarity_score,
               r.risk_level,
               r.matches,
               r.review_status,
               r.professor_feedback,
               r.reviewed_by,
               r.reviewed_at,
               r.created_at,
               r.evidence_details,
               u_prof.name AS reviewed_by_name
        FROM plagiarism_reports r
        LEFT JOIN users u_prof ON r.reviewed_by = u_prof.id
        WHERE r.id = ?
        """,
        (report_id,)
    )

    return cursor.fetchone()


def get_latest_report_by_student(connection, student_id):
    """
    Fetch the latest report submitted by a specific student,
    including explainable evidence.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT r.id,
               r.submission_id,
               r.overall_similarity_score,
               r.risk_level,
               r.matches,
               r.review_status,
               r.professor_feedback,
               r.reviewed_by,
               r.reviewed_at,
               r.created_at,
               r.evidence_details,
               u_prof.name AS reviewed_by_name
        FROM plagiarism_reports r
        JOIN submissions s ON r.submission_id = s.id
        LEFT JOIN users u_prof ON r.reviewed_by = u_prof.id
        WHERE s.student_id = ?
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 1
        """,
        (student_id,)
    )

    return cursor.fetchone()