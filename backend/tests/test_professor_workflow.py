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
from models.course import create_course
from models.submission import create_submission
from models.report import create_plagiarism_report, get_report_by_id
from utils.auth import create_access_token


class TestProfessorWorkflow(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)

        # Setup Professor A
        cls.prof_a_email = "prof_a_phase6@example.com"
        cls.prof_a_id = cls._get_or_create_user("Dr. Anitha Kumar", cls.prof_a_email, "professor")
        cls.prof_a_token = create_access_token({
            "sub": str(cls.prof_a_id),
            "email": cls.prof_a_email,
            "role": "professor"
        })

        # Setup Professor B (different courses)
        cls.prof_b_email = "prof_b_phase6@example.com"
        cls.prof_b_id = cls._get_or_create_user("Dr. Rajesh Sharma", cls.prof_b_email, "professor")
        cls.prof_b_token = create_access_token({
            "sub": str(cls.prof_b_id),
            "email": cls.prof_b_email,
            "role": "professor"
        })

        # Setup Professor C (brand new, empty account)
        cls.prof_c_email = "prof_c_empty@example.com"
        cls.prof_c_id = cls._get_or_create_user("Dr. Empty Account", cls.prof_c_email, "professor")
        cls.prof_c_token = create_access_token({
            "sub": str(cls.prof_c_id),
            "email": cls.prof_c_email,
            "role": "professor"
        })

        # Setup Student
        cls.student_email = "student_phase6@example.com"
        cls.student_id = cls._get_or_create_user("Student Tester", cls.student_email, "student")
        cls.student_token = create_access_token({
            "sub": str(cls.student_id),
            "email": cls.student_email,
            "role": "student"
        })

        # Setup Courses for Professor A
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM courses WHERE code = 'TEST601'")
            row = cursor.fetchone()
            if row:
                cls.course_a_id = row[0]
            else:
                cls.course_a_id = create_course(
                    conn,
                    name="Advanced Robotics",
                    code="TEST601",
                    description="Autonomous systems and control",
                    professor_id=cls.prof_a_id
                )

            cursor.execute("SELECT id FROM courses WHERE code = 'TEST602'")
            row = cursor.fetchone()
            if row:
                cls.course_b_id = row[0]
            else:
                cls.course_b_id = create_course(
                    conn,
                    name="Cloud Computing",
                    code="TEST602",
                    description="Distributed cloud systems",
                    professor_id=cls.prof_b_id
                )

            # Create submissions and reports for Course A (Professor A)
            cls.sub_1_id = create_submission(
                conn,
                student_id=cls.student_id,
                course_id=cls.course_a_id,
                title="Robotics Kinematics Essay",
                filename="robotics.pdf",
                file_path="/tmp/robotics.pdf",
                file_type="application/pdf",
                original_text="Kinematics study text for robotics.",
                processed_text="kinematics study text robotics",
                status="pending"
            )
            cls.rep_1_id = create_plagiarism_report(
                conn,
                submission_id=cls.sub_1_id,
                overall_similarity_score=48.5,
                risk_level="high_risk",
                matches=[{"source": "Robotics Journal", "similarity": 48.5}],
                review_status="review_required"
            )

            cls.sub_2_id = create_submission(
                conn,
                student_id=cls.student_id,
                course_id=cls.course_a_id,
                title="Path Planning Project",
                filename="path_planning.docx",
                file_path="/tmp/path_planning.docx",
                file_type="application/docx",
                original_text="Path planning algorithms A-star.",
                processed_text="path planning algorithms a star",
                status="completed"
            )
            cls.rep_2_id = create_plagiarism_report(
                conn,
                submission_id=cls.sub_2_id,
                overall_similarity_score=12.0,
                risk_level="safe",
                matches=[],
                review_status="approved"
            )

            # Create submission for Course B (Professor B)
            cls.sub_3_id = create_submission(
                conn,
                student_id=cls.student_id,
                course_id=cls.course_b_id,
                title="Cloud Architecture Report",
                filename="cloud_arch.txt",
                file_path="/tmp/cloud_arch.txt",
                file_type="text/plain",
                original_text="Cloud microservices architecture.",
                processed_text="cloud microservices architecture",
                status="pending"
            )
            cls.rep_3_id = create_plagiarism_report(
                conn,
                submission_id=cls.sub_3_id,
                overall_similarity_score=22.0,
                risk_level="safe",
                matches=[],
                review_status="pending"
            )

        finally:
            conn.close()

    @classmethod
    def _get_or_create_user(cls, name, email, role):
        conn = get_connection()
        try:
            user = get_user_by_email(conn, email)
            if user:
                return user["id"]
            return create_user(conn, name, email, "securepassword123", role)
        finally:
            conn.close()

    def test_01_professor_dashboard_unauthorized(self):
        """Unauthenticated requests to /api/professor/dashboard must return 401."""
        response = self.client.get("/api/professor/dashboard")
        self.assertEqual(response.status_code, 401)

    def test_02_student_cannot_access_professor_dashboard(self):
        """Student token requesting /api/professor/dashboard must be rejected with 403."""
        response = self.client.get(
            "/api/professor/dashboard",
            headers={"Authorization": f"Bearer {self.student_token}"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Only professors", response.json()["detail"])

    def test_03_professor_dashboard_success(self):
        """Professor A accesses dashboard and receives accurate statistics and course overview."""
        response = self.client.get(
            "/api/professor/dashboard",
            headers={"Authorization": f"Bearer {self.prof_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["professor"]["id"], self.prof_a_id)
        self.assertEqual(data["professor"]["name"], "Dr. Anitha Kumar")
        self.assertIn("stats", data)
        self.assertGreaterEqual(data["stats"]["total_submissions"], 2)
        self.assertIn("similarity_overview", data)
        self.assertIn("review_required", data)
        self.assertIn("recent_submissions", data)
        self.assertIn("course_overview", data)

    def test_04_professor_dashboard_empty_account(self):
        """Professor C with no courses or submissions receives zeroed dashboard without errors."""
        response = self.client.get(
            "/api/professor/dashboard",
            headers={"Authorization": f"Bearer {self.prof_c_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["stats"]["total_submissions"], 0)
        self.assertEqual(data["stats"]["completed"], 0)
        self.assertEqual(data["stats"]["review_required"], 0)
        self.assertEqual(len(data["review_required"]), 0)
        self.assertEqual(len(data["recent_submissions"]), 0)
        self.assertEqual(len(data["course_overview"]), 0)

    def test_05_professor_submissions_list(self):
        """Professor A retrieves submissions belonging only to courses taught by Professor A."""
        response = self.client.get(
            "/api/professor/submissions",
            headers={"Authorization": f"Bearer {self.prof_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        sub_ids = [s["id"] for s in data["submissions"]]
        self.assertIn(self.sub_1_id, sub_ids)
        self.assertIn(self.sub_2_id, sub_ids)
        # Submission 3 belongs to Professor B's course, must NOT appear in Professor A's list
        self.assertNotIn(self.sub_3_id, sub_ids)

    def test_06_student_cannot_access_professor_submissions(self):
        """Student token accessing /api/professor/submissions must return 403."""
        response = self.client.get(
            "/api/professor/submissions",
            headers={"Authorization": f"Bearer {self.student_token}"}
        )
        self.assertEqual(response.status_code, 403)

    def test_07_professor_courses_list(self):
        """Professor A retrieves their courses with live metrics."""
        response = self.client.get(
            "/api/professor/courses",
            headers={"Authorization": f"Bearer {self.prof_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        codes = [c["code"] for c in data["courses"]]
        self.assertIn("TEST601", codes)
        self.assertNotIn("TEST602", codes)

    def test_08_create_course_success(self):
        """Professor creates a new course via POST /api/courses with professor_id assigned from JWT."""
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM courses WHERE code = 'TEST603'")
            conn.commit()
        finally:
            conn.close()

        response = self.client.post(
            "/api/courses",
            headers={"Authorization": f"Bearer {self.prof_a_token}"},
            json={
                "code": "TEST603",
                "name": "Reinforcement Learning",
                "description": "Deep Q-Learning and Policy Gradients"
            }
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["course"]["code"], "TEST603")
        self.assertEqual(data["course"]["professor_id"], self.prof_a_id)


    def test_09_create_course_duplicate_code(self):
        """Attempting to create a course with an existing code returns 409 Conflict."""
        response = self.client.post(
            "/api/courses",
            headers={"Authorization": f"Bearer {self.prof_a_token}"},
            json={
                "code": "TEST601",
                "name": "Duplicate Course",
                "description": "Duplicate test"
            }
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("already exists", response.json()["detail"])

    def test_10_student_cannot_create_course(self):
        """Students must receive 403 Forbidden when attempting to create courses."""
        response = self.client.post(
            "/api/courses",
            headers={"Authorization": f"Bearer {self.student_token}"},
            json={
                "code": "STU999",
                "name": "Illegal Student Course",
                "description": "Should fail"
            }
        )
        self.assertEqual(response.status_code, 403)

    def test_11_professor_submit_report_review_success(self):
        """Professor A reviews report #1 for their course, sets review_status to 'approved' with feedback."""
        response = self.client.put(
            f"/api/reports/{self.rep_1_id}/review",
            headers={"Authorization": f"Bearer {self.prof_a_token}"},
            json={
                "review_status": "approved",
                "professor_feedback": "Explanations are authentic despite overlap with journal reference."
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["review_status"], "approved")

        # Verify database persistence
        conn = get_connection()
        try:
            rep = get_report_by_id(conn, self.rep_1_id)
            self.assertEqual(rep["review_status"], "approved")
            self.assertEqual(rep["reviewed_by"], self.prof_a_id)
            self.assertIn("Explanations are authentic", rep["professor_feedback"])

            cursor = conn.cursor()
            cursor.execute("SELECT status FROM submissions WHERE id = ?", (self.sub_1_id,))
            sub_status = cursor.fetchone()[0]
            self.assertEqual(sub_status, "reviewed")
        finally:
            conn.close()

    def test_12_unauthorized_professor_cannot_review_other_course(self):
        """Professor B cannot review report #1 which belongs to Professor A's course (returns 403)."""
        response = self.client.put(
            f"/api/reports/{self.rep_1_id}/review",
            headers={"Authorization": f"Bearer {self.prof_b_token}"},
            json={
                "review_status": "rejected",
                "professor_feedback": "Intruder feedback"
            }
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("not authorized", response.json()["detail"])

    def test_13_student_cannot_submit_report_review(self):
        """Students must receive 403 Forbidden when attempting to submit a report review."""
        response = self.client.put(
            f"/api/reports/{self.rep_1_id}/review",
            headers={"Authorization": f"Bearer {self.student_token}"},
            json={
                "review_status": "approved",
                "professor_feedback": "Student self-review"
            }
        )
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
