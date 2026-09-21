import os
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from database.database import initialize_database, get_connection
from models.user import create_user, get_user_by_email
from models.course import create_course, enroll_student
from models.submission import create_submission, get_student_dashboard_stats
from models.report import create_plagiarism_report, update_report_review
from utils.auth import create_access_token


class TestStudentFeedbackTransparency(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)

        conn = get_connection()
        try:
            cursor = conn.cursor()

            # Create Users
            cls.prof_email = "prof_feedback_f5@example.com"
            cls.prof_id = cls._get_or_create_user(conn, "Dr. Rajesh Sharma", cls.prof_email, "professor")
            cls.prof_token = create_access_token({
                "sub": str(cls.prof_id),
                "email": cls.prof_email,
                "role": "professor"
            })

            cls.student_a_email = "student_a_f5@example.com"
            cls.student_a_id = cls._get_or_create_user(conn, "Kavya Patel", cls.student_a_email, "student")
            cls.student_a_token = create_access_token({
                "sub": str(cls.student_a_id),
                "email": cls.student_a_email,
                "role": "student"
            })

            cls.student_b_email = "student_b_f5@example.com"
            cls.student_b_id = cls._get_or_create_user(conn, "Rohan Verma", cls.student_b_email, "student")
            cls.student_b_token = create_access_token({
                "sub": str(cls.student_b_id),
                "email": cls.student_b_email,
                "role": "student"
            })

            # Create Course
            cursor.execute("SELECT id FROM courses WHERE code = 'CS505'")
            course_row = cursor.fetchone()
            if course_row:
                cls.course_id = course_row["id"]
            else:
                cls.course_id = create_course(
                    conn, "Advanced Algorithms", "CS505", "Advanced algorithms and data structures", cls.prof_id
                )

            # Enroll students
            for s_id in (cls.student_a_id, cls.student_b_id):
                cursor.execute("SELECT 1 FROM course_enrollments WHERE course_id = ? AND student_id = ?",
                               (cls.course_id, s_id))
                if not cursor.fetchone():
                    enroll_student(conn, cls.course_id, s_id)

            # Clean previous submissions for test accounts
            cursor.execute("DELETE FROM submissions WHERE student_id IN (?, ?)",
                           (cls.student_a_id, cls.student_b_id))
            conn.commit()

            # Create Submissions for Student A
            # Sub A1: will be reviewed with feedback
            cls.sub_a1 = create_submission(
                conn, cls.student_a_id, cls.course_id, "Kavya Assignment 1",
                "kavya_alg1.txt", original_text="Original text 1", processed_text="text 1", status="completed"
            )
            cls.rep_a1 = create_plagiarism_report(
                conn, cls.sub_a1, overall_similarity_score=28.5, risk_level="review_required",
                matches=[{"title": "Ref Alg 1", "similarity_percentage": 28.5}], review_status="pending"
            )

            # Sub A2: unreviewed submission (clean / safe)
            cls.sub_a2 = create_submission(
                conn, cls.student_a_id, cls.course_id, "Kavya Assignment 2",
                "kavya_alg2.txt", original_text="Original text 2", processed_text="text 2", status="completed"
            )
            cls.rep_a2 = create_plagiarism_report(
                conn, cls.sub_a2, overall_similarity_score=12.0, risk_level="safe",
                matches=[], review_status="pending"
            )

            # Sub B1: Student B submission with confidential feedback
            cls.sub_b1 = create_submission(
                conn, cls.student_b_id, cls.course_id, "Rohan Assignment 1",
                "rohan_alg1.txt", original_text="Rohan text", processed_text="rohan text", status="completed"
            )
            cls.rep_b1 = create_plagiarism_report(
                conn, cls.sub_b1, overall_similarity_score=45.0, risk_level="high_risk",
                matches=[{"title": "Ref Alg 2", "similarity_percentage": 45.0}], review_status="pending"
            )

            # Professor reviews Sub A1 and Sub B1
            update_report_review(
                conn, cls.rep_a1, review_status="review_required",
                professor_feedback="Please cite section 3 sources properly and explain methodology.",
                reviewed_by=cls.prof_id
            )
            update_report_review(
                conn, cls.rep_b1, review_status="flagged",
                professor_feedback="Confidential: Referred to academic board for unauthorized collaboration.",
                reviewed_by=cls.prof_id
            )

        finally:
            conn.close()

    @classmethod
    def _get_or_create_user(cls, conn, name, email, role):
        existing = get_user_by_email(conn, email)
        if existing:
            return existing["id"]
        return create_user(conn, name, email, "securepassword123", role)

    def test_01_student_submissions_return_professor_feedback(self):
        """Student submissions endpoint includes professor_feedback for reviewed submissions."""
        res = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

        # Find Sub A1
        sub_a1 = next((s for s in data["submissions"] if s["id"] == self.sub_a1), None)
        self.assertIsNotNone(sub_a1)
        self.assertIn("professor_feedback", sub_a1)
        self.assertEqual(
            sub_a1["professor_feedback"],
            "Please cite section 3 sources properly and explain methodology."
        )

    def test_02_student_submissions_return_review_status(self):
        """Student submissions endpoint includes review_status matching professor's decision."""
        res = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)

        sub_a1 = next((s for s in res.json()["submissions"] if s["id"] == self.sub_a1), None)
        self.assertIsNotNone(sub_a1)
        self.assertEqual(sub_a1["review_status"], "review_required")
        self.assertEqual(sub_a1["status"], "Review Required")

    def test_03_student_submissions_return_reviewed_at(self):
        """Student submissions endpoint includes reviewed_at timestamp string."""
        res = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)

        sub_a1 = next((s for s in res.json()["submissions"] if s["id"] == self.sub_a1), None)
        self.assertIsNotNone(sub_a1)
        self.assertIn("reviewed_at", sub_a1)
        self.assertIsNotNone(sub_a1["reviewed_at"])

    def test_04_student_submissions_return_reviewed_by_name(self):
        """Student submissions endpoint includes the reviewer's name (Dr. Rajesh Sharma)."""
        res = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)

        sub_a1 = next((s for s in res.json()["submissions"] if s["id"] == self.sub_a1), None)
        self.assertIsNotNone(sub_a1)
        self.assertEqual(sub_a1["reviewed_by_name"], "Dr. Rajesh Sharma")

    def test_05_student_isolation_feedback_access(self):
        """Student A cannot access Student B's feedback or submissions."""
        res_a = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res_a.status_code, 200)
        subs_a = res_a.json()["submissions"]

        # Ensure Student B's confidential feedback does not appear in Student A's payload
        for s in subs_a:
            self.assertNotEqual(s["id"], self.sub_b1)
            self.assertNotIn("Confidential: Referred to academic board", str(s.get("professor_feedback", "")))

        # Also direct attempt to access Student B's report yields 403 Forbidden
        res_report_b = self.client.get(f"/api/reports/{self.rep_b1}", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res_report_b.status_code, 403)

    def test_06_report_detail_returns_professor_review_info(self):
        """GET /api/reports/{id} returns review_status, professor_feedback, reviewed_at, and reviewed_by_name."""
        res = self.client.get(f"/api/reports/{self.rep_a1}", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)
        report = res.json()["report"]

        self.assertEqual(report["review_status"], "review_required")
        self.assertEqual(report["professor_feedback"], "Please cite section 3 sources properly and explain methodology.")
        self.assertEqual(report["reviewed_by_name"], "Dr. Rajesh Sharma")
        self.assertIsNotNone(report["reviewed_at"])

    def test_07_latest_report_returns_professor_review_info(self):
        """GET /api/reports/latest returns professor review details for the student's latest submission."""
        res = self.client.get("/api/reports/latest", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)
        report = res.json()["report"]
        self.assertIn("review_status", report)
        self.assertIn("professor_feedback", report)
        self.assertIn("reviewed_by_name", report)

    def test_08_all_five_review_statuses_map_correctly(self):
        """All five professor decisions map correctly to user-facing display statuses."""
        from routes.student import format_status

        # 1. Approved
        self.assertEqual(format_status("completed", "safe", "approved"), "Approved")
        self.assertEqual(format_status("completed", "high_risk", "approved"), "Approved")

        # 2. Reviewed
        self.assertEqual(format_status("completed", "safe", "reviewed"), "Reviewed")

        # 3. Review Required
        self.assertEqual(format_status("completed", "safe", "review_required"), "Review Required")

        # 4. Flagged
        self.assertEqual(format_status("completed", "safe", "flagged"), "Flagged")

        # 5. Rejected
        self.assertEqual(format_status("completed", "safe", "rejected"), "Rejected")

        # Unreviewed completed
        self.assertEqual(format_status("completed", "safe", "pending"), "Analysis Complete")
        self.assertEqual(format_status("completed", "safe", None), "Analysis Complete")

        # Processing
        self.assertEqual(format_status("processing", "safe", None), "Processing")

    def test_09_dashboard_under_review_changes_after_review(self):
        """Dashboard under_review count reflects pending high-risk items and professor review decisions."""
        conn = get_connection()
        try:
            # Create a test student with 1 high risk unreviewed (under review)
            s_test_id = self._get_or_create_user(conn, "Test Student Stats", "test_stats_f5@example.com", "student")
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM course_enrollments WHERE course_id = ? AND student_id = ?", (self.course_id, s_test_id))
            if not cursor.fetchone():
                enroll_student(conn, self.course_id, s_test_id)

            cursor.execute("DELETE FROM submissions WHERE student_id = ?", (s_test_id,))
            conn.commit()

            sub_test = create_submission(
                conn, s_test_id, self.course_id, "Stats Paper", "stats.txt",
                original_text="text", processed_text="text", status="completed"
            )
            rep_test = create_plagiarism_report(
                conn, sub_test, overall_similarity_score=50.0, risk_level="high_risk",
                matches=[], review_status="pending"
            )

            # Before professor review: under_review should be 1
            stats_before = get_student_dashboard_stats(conn, s_test_id)
            self.assertEqual(stats_before["under_review"], 1)

            # Professor approves the submission (e.g. false positive bibliography match)
            update_report_review(conn, rep_test, review_status="approved", professor_feedback="Approved after review", reviewed_by=self.prof_id)

            # After professor approval: under_review should drop to 0
            stats_after = get_student_dashboard_stats(conn, s_test_id)
            self.assertEqual(stats_after["under_review"], 0)

        finally:
            conn.close()

    def test_10_unreviewed_submissions_remain_correctly_represented(self):
        """Unreviewed completed submissions show status 'Analysis Complete' and None for feedback."""
        res = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res.status_code, 200)

        sub_a2 = next((s for s in res.json()["submissions"] if s["id"] == self.sub_a2), None)
        self.assertIsNotNone(sub_a2)
        self.assertEqual(sub_a2["status"], "Analysis Complete")
        self.assertIsNone(sub_a2["professor_feedback"])
        self.assertIsNone(sub_a2["reviewed_by_name"])
        self.assertIsNone(sub_a2["reviewed_at"])

    def test_11_students_cannot_modify_professor_feedback(self):
        """Students receive 403 Forbidden when attempting to call PUT /api/reports/{id}/review."""
        payload = {
            "review_status": "approved",
            "professor_feedback": "Malicious modification by student"
        }
        res = self.client.put(
            f"/api/reports/{self.rep_a1}/review",
            json=payload,
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Only professors can submit report reviews", res.json().get("detail", ""))

    def test_12_existing_professor_review_functionality_remains_intact(self):
        """Professor can review a report, update feedback and decision, and update submission status."""
        new_feedback = "Updated guidance: Revised citations verified."
        payload = {
            "review_status": "reviewed",
            "professor_feedback": new_feedback
        }
        res = self.client.put(
            f"/api/reports/{self.rep_a1}/review",
            json=payload,
            headers={"Authorization": f"Bearer {self.prof_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["review_status"], "reviewed")
        self.assertEqual(data["professor_feedback"], new_feedback)

        # Confirm student gets updated feedback
        res_student = self.client.get(f"/api/reports/{self.rep_a1}", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res_student.status_code, 200)
        self.assertEqual(res_student.json()["report"]["professor_feedback"], new_feedback)
        self.assertEqual(res_student.json()["report"]["review_status"], "reviewed")


if __name__ == "__main__":
    unittest.main()
