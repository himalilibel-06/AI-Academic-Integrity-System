import io
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
from models.course import create_course, seed_default_courses_if_empty
from models.submission import create_submission
from models.report import create_plagiarism_report
from utils.auth import create_access_token


class TestStudentDashboardAndWorkflow(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        conn = get_connection()
        try:
            seed_default_courses_if_empty(conn)
        finally:
            conn.close()

        cls.client = TestClient(app)

        # Setup Student A (with submissions)
        cls.student_a_email = "student_a_phase5@example.com"
        cls.student_a_id = cls._get_or_create_user("Alice Student", cls.student_a_email, "student")
        cls.student_a_token = create_access_token({
            "sub": str(cls.student_a_id),
            "email": cls.student_a_email,
            "role": "student"
        })

        # Setup Student B (with different submissions)
        cls.student_b_email = "student_b_phase5@example.com"
        cls.student_b_id = cls._get_or_create_user("Bob Student", cls.student_b_email, "student")
        cls.student_b_token = create_access_token({
            "sub": str(cls.student_b_id),
            "email": cls.student_b_email,
            "role": "student"
        })

        # Setup Student C (empty account, zero submissions)
        cls.student_c_email = "student_c_empty@example.com"
        cls.student_c_id = cls._get_or_create_user("Charlie Empty", cls.student_c_email, "student")
        cls.student_c_token = create_access_token({
            "sub": str(cls.student_c_id),
            "email": cls.student_c_email,
            "role": "student"
        })

        # Setup Professor (should be rejected from student dashboard)
        cls.prof_email = "prof_phase5@example.com"
        cls.prof_id = cls._get_or_create_user("Prof Phase 5", cls.prof_email, "professor")
        cls.prof_token = create_access_token({
            "sub": str(cls.prof_id),
            "email": cls.prof_email,
            "role": "professor"
        })

        # Setup Course
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM courses WHERE code = 'CS402' LIMIT 1")
            row = cursor.fetchone()
            if row:
                cls.course_id = row[0]
            else:
                cls.course_id = create_course(
                    conn, "Artificial Intelligence", "CS402", "AI course", cls.prof_id
                )

            # Clean previous submissions for Student A and B
            cursor.execute("DELETE FROM submissions WHERE student_id IN (?, ?, ?)",
                           (cls.student_a_id, cls.student_b_id, cls.student_c_id))
            conn.commit()

            # Seed 2 submissions for Student A:
            # Sub A1: Completed, similarity 15.0, risk safe
            sub_a1 = create_submission(
                conn, cls.student_a_id, cls.course_id, "Alice Paper 1",
                "alice_paper1.txt", original_text="Text 1", processed_text="text 1", status="completed"
            )
            rep_a1 = create_plagiarism_report(
                conn, sub_a1, overall_similarity_score=15.0, risk_level="safe", matches=[{"title": "Ref 1"}]
            )

            # Sub A2: Completed, similarity 35.0, risk review_required
            sub_a2 = create_submission(
                conn, cls.student_a_id, cls.course_id, "Alice Paper 2",
                "alice_paper2.txt", original_text="Text 2", processed_text="text 2", status="completed"
            )
            rep_a2 = create_plagiarism_report(
                conn, sub_a2, overall_similarity_score=35.0, risk_level="review_required", matches=[{"title": "Ref 2"}]
            )

            # Seed 1 submission for Student B:
            sub_b1 = create_submission(
                conn, cls.student_b_id, cls.course_id, "Bob Paper 1",
                "bob_paper1.txt", original_text="Bob Text", processed_text="bob text", status="completed"
            )
            rep_b1 = create_plagiarism_report(
                conn, sub_b1, overall_similarity_score=8.0, risk_level="safe", matches=[]
            )

            cls.sub_a1 = sub_a1
            cls.rep_a1 = rep_a1
            cls.sub_b1 = sub_b1
            cls.rep_b1 = rep_b1

        finally:
            conn.close()

    @classmethod
    def _get_or_create_user(cls, name, email, role):
        conn = get_connection()
        try:
            existing = get_user_by_email(conn, email)
            if existing:
                return existing["id"]
            return create_user(conn, name, email, "securepassword123", role)
        finally:
            conn.close()

    def test_01_dashboard_requires_auth(self):
        """Dashboard endpoint returns 401 when accessed without authorization."""
        res = self.client.get("/api/student/dashboard")
        self.assertEqual(res.status_code, 401)

    def test_02_professor_cannot_access_student_dashboard(self):
        """Professors receive 403 Forbidden when calling student dashboard."""
        headers = {"Authorization": f"Bearer {self.prof_token}"}
        res = self.client.get("/api/student/dashboard", headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Only students can access", res.json().get("detail", ""))

    def test_03_student_dashboard_returns_real_calculated_stats(self):
        """Student A receives real aggregated statistics and recent submissions from database."""
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        res = self.client.get("/api/student/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertTrue(data.get("success"))

        # Verify student details
        self.assertEqual(data["student"]["name"], "Alice Student")
        self.assertEqual(data["student"]["email"], self.student_a_email)
        self.assertEqual(data["student"]["initials"], "AS")

        # Verify statistics:
        # Student A has 2 submissions, both completed, 1 with review_required, 2 reports, avg similarity = (15+35)/2 = 25.0
        stats = data["stats"]
        self.assertEqual(stats["total_submissions"], 2)
        self.assertEqual(stats["completed"], 2)
        self.assertEqual(stats["under_review"], 1)
        self.assertEqual(stats["reports_available"], 2)
        self.assertAlmostEqual(stats["average_similarity"], 25.0, places=1)

        # Verify recent submissions list
        recent = data["recent_submissions"]
        self.assertEqual(len(recent), 2)
        titles = [item["title"] for item in recent]
        self.assertIn("Alice Paper 1", titles)
        self.assertIn("Alice Paper 2", titles)
        self.assertNotIn("Bob Paper 1", titles)  # Isolation check

    def test_04_empty_student_account_dashboard(self):
        """Newly registered student with zero submissions receives valid zero stats without error."""
        headers = {"Authorization": f"Bearer {self.student_c_token}"}
        res = self.client.get("/api/student/dashboard", headers=headers)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertTrue(data.get("success"))
        stats = data["stats"]
        self.assertEqual(stats["total_submissions"], 0)
        self.assertEqual(stats["completed"], 0)
        self.assertEqual(stats["under_review"], 0)
        self.assertEqual(stats["reports_available"], 0)
        self.assertEqual(stats["average_similarity"], 0.0)
        self.assertEqual(len(data["recent_submissions"]), 0)

    def test_05_submissions_endpoint_requires_auth(self):
        """Submissions history endpoint returns 401 without auth."""
        res = self.client.get("/api/student/submissions")
        self.assertEqual(res.status_code, 401)

    def test_06_professor_cannot_access_student_submissions(self):
        """Professors receive 403 Forbidden when calling student submissions."""
        headers = {"Authorization": f"Bearer {self.prof_token}"}
        res = self.client.get("/api/student/submissions", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_07_student_sees_only_own_submissions(self):
        """Student A cannot see Student B's submissions and vice-versa."""
        # Alice
        res_a = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_a_token}"})
        self.assertEqual(res_a.status_code, 200)
        subs_a = res_a.json()["submissions"]
        self.assertEqual(len(subs_a), 2)
        for sub in subs_a:
            self.assertIn("Alice", sub["title"])
            self.assertNotIn("Bob", sub["title"])

        # Bob
        res_b = self.client.get("/api/student/submissions", headers={"Authorization": f"Bearer {self.student_b_token}"})
        self.assertEqual(res_b.status_code, 200)
        subs_b = res_b.json()["submissions"]
        self.assertEqual(len(subs_b), 1)
        self.assertEqual(subs_b[0]["title"], "Bob Paper 1")

    def test_08_submissions_payload_metadata(self):
        """Submissions include report_id, similarity, risk_level, course, and formatted date."""
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        res = self.client.get("/api/student/submissions", headers=headers)
        self.assertEqual(res.status_code, 200)

        sub = res.json()["submissions"][0]
        self.assertIn("id", sub)
        self.assertIn("title", sub)
        self.assertIn("course", sub)
        self.assertIn("course_code", sub)
        self.assertIn("status", sub)
        self.assertIn("similarity", sub)
        self.assertIn("risk_level", sub)
        self.assertIn("report_id", sub)
        self.assertIn("date", sub)

    def test_09_existing_phase4_report_endpoint_reused(self):
        """Phase 4 report endpoint GET /api/reports/{id} continues to work with report_id."""
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        res = self.client.get(f"/api/reports/{self.rep_a1}", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["report"]["id"], self.rep_a1)

    def test_10_unauthorized_student_cannot_access_other_report(self):
        """Student B cannot access Student A's report (403 Forbidden)."""
        headers = {"Authorization": f"Bearer {self.student_b_token}"}
        res = self.client.get(f"/api/reports/{self.rep_a1}", headers=headers)
        self.assertEqual(res.status_code, 403)


if __name__ == "__main__":
    unittest.main()
