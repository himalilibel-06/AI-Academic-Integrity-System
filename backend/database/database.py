import sqlite3
from pathlib import Path


# Location of the SQLite database
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "academic_integrity.db"


def get_connection():
    """
    Create and return a connection to the SQLite database.
    Enforces foreign key constraint checks.
    """
    connection = sqlite3.connect(DATABASE_PATH)

    # Enable foreign key support in SQLite
    connection.execute("PRAGMA foreign_keys = ON;")

    # Allows column access by name
    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():
    """
    Create the required database tables and indexes safely.
    """

    connection = get_connection()
    cursor = connection.cursor()

    # 1. Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Safe non-destructive migration for extended profile and preferences columns
    cursor.execute("PRAGMA table_info(users)")
    existing_user_columns = {row["name"] for row in cursor.fetchall()}

    columns_to_add = [
        ("department", "TEXT DEFAULT ''"),
        ("institution", "TEXT DEFAULT ''"),
        ("phone", "TEXT DEFAULT ''"),
        ("preferences", "TEXT DEFAULT '{}'"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in existing_user_columns:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")

    # 2. Courses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            description TEXT,
            professor_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 3. Course Enrollments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(course_id, student_id),
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 4. Submissions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_id INTEGER,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT,
            file_type TEXT,
            original_text TEXT,
            processed_text TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
        )
    """)

    # 5. Plagiarism Reports table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plagiarism_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER UNIQUE NOT NULL,
            overall_similarity_score REAL DEFAULT 0.0,
            risk_level TEXT DEFAULT 'safe',
            matches TEXT,
            review_status TEXT DEFAULT 'pending',
            professor_feedback TEXT,
            reviewed_by INTEGER,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # Useful Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course_enrollments(student_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_submissions_course ON submissions(course_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_submission ON plagiarism_reports(submission_id)")

    connection.commit()
    connection.close()


if __name__ == "__main__":
    initialize_database()
    print("Database initialized successfully!")