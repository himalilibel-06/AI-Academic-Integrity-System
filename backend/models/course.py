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
