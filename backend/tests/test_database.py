import sys
import unittest
import sqlite3
import json
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.database import initialize_database, get_connection
from models.user import create_user, get_user_by_email
from models.course import create_course, get_course_by_id, enroll_student, get_student_courses
from models.submission import create_submission, get_submission_by_id, get_submissions_by_student
from models.report import create_plagiarism_report, get_report_by_submission_id, update_report_review


class TestDatabaseSchemaAndModels(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()

    def setUp(self):
        self.connection = get_connection()

    def tearDown(self):
        self.connection.close()

    def test_01_users_table_works(self):
        """Verify users table operations remain intact."""
        email = "prof_db_test@example.com"
        cursor = self.connection.cursor()
        cursor.execute("DELETE FROM users WHERE email = ?", (email,))
        self.connection.commit()

        user_id = create_user(self.connection, "Prof Database", email, "secret123", "professor")
        self.assertIsNotNone(user_id)

        user = get_user_by_email(self.connection, email)
        self.assertIsNotNone(user)
        self.assertEqual(user["name"], "Prof Database")
        self.assertEqual(user["role"], "professor")

    def test_02_courses_and_enrollment_works(self):
        """Verify courses creation and student enrollment."""
        cursor = self.connection.cursor()
        
        # Create Professor & Student
        prof_email = "prof_course@example.com"
        student_email = "student_course@example.com"
        cursor.execute("DELETE FROM users WHERE email IN (?, ?)", (prof_email, student_email))
        self.connection.commit()

        prof_id = create_user(self.connection, "Prof Alpha", prof_email, "pass123", "professor")
        student_id = create_user(self.connection, "Student Beta", student_email, "pass123", "student")

        # Create Course
        code = "CS101-TEST"
        cursor.execute("DELETE FROM courses WHERE code = ?", (code,))
        self.connection.commit()

        course_id = create_course(self.connection, "Intro to CS", code, "Fundamentals of Computer Science", prof_id)
        self.assertIsNotNone(course_id)

        course = get_course_by_id(self.connection, course_id)
        self.assertEqual(course["code"], code)
        self.assertEqual(course["professor_id"], prof_id)

        # Enroll Student
        enrollment_id = enroll_student(self.connection, course_id, student_id)
        self.assertIsNotNone(enrollment_id)

        # Verify Student Courses
        courses = get_student_courses(self.connection, student_id)
        self.assertEqual(len(courses), 1)
        self.assertEqual(courses[0]["code"], code)

        # Verify unique constraint on re-enrollment
        with self.assertRaises(sqlite3.IntegrityError):
            enroll_student(self.connection, course_id, student_id)

    def test_03_submission_and_plagiarism_report(self):
        """Verify connecting submissions to student/course and report to submission."""
        cursor = self.connection.cursor()

        prof_email = "prof_sub@example.com"
        student_email = "student_sub@example.com"
        cursor.execute("DELETE FROM users WHERE email IN (?, ?)", (prof_email, student_email))
        self.connection.commit()

        prof_id = create_user(self.connection, "Prof Submission Test", prof_email, "pass123", "professor")
        student_id = create_user(self.connection, "Student Submission Test", student_email, "pass123", "student")

        code = "AI301-SUBTEST"
        cursor.execute("DELETE FROM courses WHERE code = ?", (code,))
        self.connection.commit()

        course_id = create_course(self.connection, "AI Ethics", code, "AI Integrity and Ethics", prof_id)

        # Create Submission
        sub_id = create_submission(
            self.connection,
            student_id=student_id,
            course_id=course_id,
            title="Ethics Essay",
            filename="essay.pdf",
            file_path="uploads/essay.pdf",
            file_type="application/pdf",
            original_text="Artificial Intelligence and Ethics content.",
            processed_text="artificial intelligence ethics content",
            status="pending"
        )
        self.assertIsNotNone(sub_id)

        submission = get_submission_by_id(self.connection, sub_id)
        self.assertEqual(submission["title"], "Ethics Essay")
        self.assertEqual(submission["student_id"], student_id)
        self.assertEqual(submission["course_id"], course_id)

        # Create Plagiarism Report
        matches_data = [
            {"reference_id": "ref_1", "similarity_percentage": 25.5, "title": "Reference Paper 1"}
        ]

        report_id = create_plagiarism_report(
            self.connection,
            submission_id=sub_id,
            overall_similarity_score=25.5,
            risk_level="review_required",
            matches=matches_data,
            review_status="pending"
        )
        self.assertIsNotNone(report_id)

        report = get_report_by_submission_id(self.connection, sub_id)
        self.assertEqual(report["submission_id"], sub_id)
        self.assertEqual(report["overall_similarity_score"], 25.5)
        self.assertEqual(report["risk_level"], "review_required")

        parsed_matches = json.loads(report["matches"])
        self.assertEqual(len(parsed_matches), 1)
        self.assertEqual(parsed_matches[0]["reference_id"], "ref_1")

        # Update Professor Review
        updated = update_report_review(
            self.connection,
            report_id=report["id"],
            review_status="approved",
            professor_feedback="Properly cited and acceptable.",
            reviewed_by=prof_id
        )
        self.assertEqual(updated, 1)

        updated_report = get_report_by_submission_id(self.connection, sub_id)
        self.assertEqual(updated_report["review_status"], "approved")
        self.assertEqual(updated_report["professor_feedback"], "Properly cited and acceptable.")
        self.assertEqual(updated_report["reviewed_by"], prof_id)

    def test_04_foreign_key_enforcement(self):
        """Verify foreign key error on invalid user/course reference."""
        cursor = self.connection.cursor()

        # Invalid professor ID for course creation
        with self.assertRaises(sqlite3.IntegrityError):
            create_course(self.connection, "Ghost Course", "GHOST999", "Desc", 999999)


if __name__ == "__main__":
    unittest.main()
