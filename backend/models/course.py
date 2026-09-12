def create_course(connection, name, code, description, professor_id):
    """
    Create a new course taught by a professor.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO courses (name, code, description, professor_id)
        VALUES (?, ?, ?, ?)
        """,
        (name, code, description, professor_id)
    )

    connection.commit()
    return cursor.lastrowid


def get_course_by_id(connection, course_id):
    """
    Get course details by ID.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, code, description, professor_id, created_at
        FROM courses
        WHERE id = ?
        """,
        (course_id,)
    )

    return cursor.fetchone()


def get_courses_by_professor(connection, professor_id):
    """
    Get all courses created by a specific professor.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, code, description, professor_id, created_at
        FROM courses
        WHERE professor_id = ?
        ORDER BY created_at DESC
        """,
        (professor_id,)
    )

    return cursor.fetchall()


def enroll_student(connection, course_id, student_id):
    """
    Enroll a student into a course.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO course_enrollments (course_id, student_id)
        VALUES (?, ?)
        """,
        (course_id, student_id)
    )

    connection.commit()
    return cursor.lastrowid


def get_student_courses(connection, student_id):
    """
    Get all courses a student is enrolled in.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT c.id, c.name, c.code, c.description, c.professor_id, ce.enrolled_at
        FROM courses c
        JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE ce.student_id = ?
        ORDER BY ce.enrolled_at DESC
        """,
        (student_id,)
    )

    return cursor.fetchall()


def get_all_courses(connection):
    """
    Get all courses available in the system.
    """
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, code, description, professor_id, created_at
        FROM courses
        ORDER BY code ASC
        """
    )

    return cursor.fetchall()


def get_course_by_id_or_code(connection, identifier):
    """
    Find a course by its numeric ID or course code (e.g. 'CS402' or 2).
    """
    cursor = connection.cursor()

    # Try numeric ID first
    try:
        numeric_id = int(identifier)
        cursor.execute(
            """
            SELECT id, name, code, description, professor_id, created_at
            FROM courses
            WHERE id = ?
            """,
            (numeric_id,)
        )
        course = cursor.fetchone()
        if course:
            return course
    except (ValueError, TypeError):
        pass

    # Try matching course code
    cursor.execute(
        """
        SELECT id, name, code, description, professor_id, created_at
        FROM courses
        WHERE UPPER(code) = UPPER(?)
        """,
        (str(identifier).strip(),)
    )
    return cursor.fetchone()


def seed_default_courses_if_empty(connection):
    """
    Seed initial academic courses for testing/development if courses do not yet exist.
    """
    cursor = connection.cursor()

    # Look for an existing professor or create a default instructor
    cursor.execute("SELECT id FROM users WHERE role = 'professor' LIMIT 1")
    prof_row = cursor.fetchone()

    if prof_row:
        prof_id = prof_row[0]
    else:
        from models.user import create_user
        prof_id = create_user(
            connection,
            name="Dr. Anitha Kumar",
            email="instructor_phase4@example.com",
            password="securepassword123",
            role="professor"
        )

    default_courses = [
        ("Machine Learning", "CS401", "Introduction to Machine Learning and Data Analysis"),
        ("Artificial Intelligence", "CS402", "Artificial Intelligence Concepts and Reasoning"),
        ("Database Management", "CS403", "Relational Databases and SQL"),
        ("Computer Networks", "CS404", "Computer Networking and Protocols"),
    ]

    for name, code, description in default_courses:
        cursor.execute("SELECT id FROM courses WHERE code = ?", (code,))
        if not cursor.fetchone():
            create_course(connection, name, code, description, prof_id)


def get_professor_courses_with_stats(connection, professor_id):
    """
    Get all courses taught by a professor along with dynamic metrics:
    enrolled students count, submission count, pending reviews count, and average similarity score.
    """
    cursor = connection.cursor()

    query = """
        SELECT c.id, c.name, c.code, c.description, c.professor_id, c.created_at,
               COUNT(DISTINCT ce.student_id) AS student_count,
               COUNT(DISTINCT s.id) AS submission_count,
               COUNT(DISTINCT CASE
                   WHEN s.status IN ('pending', 'processing', 'review_required')
                     OR r.review_status IN ('pending', 'review_required')
                     OR r.risk_level IN ('review_required', 'high_risk')
                   THEN s.id
               END) AS pending_reviews,
               COALESCE(ROUND(AVG(r.overall_similarity_score), 1), 0.0) AS avg_similarity
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN submissions s ON c.id = s.course_id
        LEFT JOIN plagiarism_reports r ON s.id = r.submission_id
        WHERE c.professor_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC, c.id DESC
    """
    cursor.execute(query, (professor_id,))
    return cursor.fetchall()

