import json


def create_plagiarism_report(
    connection,
    submission_id,
    overall_similarity_score=0.0,
    risk_level="safe",
    matches=None,
    review_status="pending"
):
    """
    Create a new plagiarism report for a submission.
    matches can be a list or dict, converted automatically to JSON string.
    """
    matches_json = json.dumps(matches) if matches is not None else None

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO plagiarism_reports (
            submission_id, overall_similarity_score, risk_level, matches, review_status
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (submission_id, overall_similarity_score, risk_level, matches_json, review_status)
    )

    connection.commit()
    return cursor.lastrowid


def get_report_by_submission_id(connection, submission_id):
    """
    Fetch plagiarism report by submission ID.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, submission_id, overall_similarity_score, risk_level, matches,
               review_status, professor_feedback, reviewed_by, reviewed_at, created_at
        FROM plagiarism_reports
        WHERE submission_id = ?
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
    Update professor review decision (e.g. approved / rejected / flag) and feedback.
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
        (review_status, professor_feedback, reviewed_by, report_id)
    )

    connection.commit()
    return cursor.rowcount
