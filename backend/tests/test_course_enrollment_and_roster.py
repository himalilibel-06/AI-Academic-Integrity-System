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
from models.course import (
    create_course,
    is_student_enrolled,
    enroll_student,
    unenroll_student,
    get_student_courses,
    get_course_roster_with_integrity_stats,
)
from utils.auth import create_access_token


class TestCourseEnrollmentAndRoster(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)

        # Setup test professors
        cls.prof_a_email = "prof_a_feat4@example.com"
        cls.prof_a_id = cls._get_or_create_user("Professor Alpha", cls.prof_a_email, "professor")
        cls.prof_a_token = create_access_token({
            "sub": str(cls.prof_a_id),
            "email": cls.prof_a_email,
            "role": "professor"
        })

        cls.prof_b_email = "prof_b_feat4@example.com"
        cls.prof_b_id = cls._get_or_create_user("Professor Beta", cls.prof_b_email, "professor")
        cls.prof_b_token = create_access_token({
            "sub": str(cls.prof_b_id),
            "email": cls.prof_b_email,
            "role": "professor"
        })

        # Setup test students
        cls.student_x_email = "student_x_feat4@example.com"
        cls.student_x_id = cls._get_or_create_user("Student X", cls.student_x_email, "student")
        cls.student_x_token = create_access_token({
            "sub": str(cls.student_x_id),
            "email": cls.student_x_email,
            "role": "student"
        })

        cls.student_y_email = "student_y_feat4@example.com"
        cls.student_y_id = cls._get_or_create_user("Student Y", cls.student_y_email, "student")
        cls.student_y_token = create_access_token({
            "sub": str(cls.student_y_id),
            "email": cls.student_y_email,
            "role": "student"
        })

        # Setup courses
        conn = get_connection()
        try:
            cursor = conn.cursor()
            # Course A (owned by Prof A)
            cursor.execute("SELECT id FROM courses WHERE code = 'CS501' LIMIT 1")
            row_a = cursor.fetchone()
            if row_a:
                cls.course_a_id = row_a[0]
            else:
                cls.course_a_id = create_course(
                    conn, "Advanced Distributed Systems", "CS501", "Distributed computing concepts", cls.prof_a_id
                )

            # Course B (owned by Prof B)
            cursor.execute("SELECT id FROM courses WHERE code = 'CS502' LIMIT 1")
            row_b = cursor.fetchone()
            if row_b:
                cls.course_b_id = row_b[0]
            else:
                cls.course_b_id = create_course(
                    conn, "Quantum Computing", "CS502", "Quantum algorithms and theory", cls.prof_b_id
                )

            # Course C (owned by Prof A, for drop tests)
            cursor.execute("SELECT id FROM courses WHERE code = 'CS503' LIMIT 1")
            row_c = cursor.fetchone()
            if row_c:
                cls.course_c_id = row_c[0]
            else:
                cls.course_c_id = create_course(
                    conn, "Cybersecurity Analytics", "CS503", "Security analytics and protocols", cls.prof_a_id
                )

            # Clean any leftover enrollments from prior test runs for these users
            cursor.execute("DELETE FROM course_enrollments WHERE student_id IN (?, ?)", (cls.student_x_id, cls.student_y_id))
            conn.commit()
        finally:
            conn.close()

    @classmethod
    def _get_or_create_user(cls, name, email, role):
        conn = get_connection()
        try:
            existing = get_user_by_email(conn, email)
            if existing:
                return existing["id"]
            return create_user(conn, name, email, "securepass123", role)
        finally:
            conn.close()

    def test_01_unauthenticated_enrollment_returns_401(self):
        """1. Unauthenticated enrollment returns 401."""
        response = self.client.post(f"/api/courses/{self.course_a_id}/enroll")
        self.assertEqual(response.status_code, 401)

    def test_02_student_enrolls_returns_201(self):
        """2. Authenticated student can enroll in a course -> 201 Created."""
        headers = {"Authorization": f"Bearer {self.student_x_token}"}
        response = self.client.post(f"/api/courses/{self.course_a_id}/enroll", headers=headers)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("course", {}).get("code"), "CS501")

        # Verify in database
        conn = get_connection()
        try:
            self.assertTrue(is_student_enrolled(conn, self.course_a_id, self.student_x_id))
        finally:
            conn.close()

    def test_03_duplicate_enrollment_returns_409(self):
        """3. Duplicate enrollment attempt returns 409 Conflict."""
        headers = {"Authorization": f"Bearer {self.student_x_token}"}
        response = self.client.post(f"/api/courses/{self.course_a_id}/enroll", headers=headers)
        self.assertEqual(response.status_code, 409)
        self.assertIn("already enrolled", response.json().get("detail", "").lower())

    def test_04_student_sees_own_enrolled_courses(self):
        """4. Student can retrieve their own enrolled courses list."""
        headers = {"Authorization": f"Bearer {self.student_x_token}"}
        response = self.client.get("/api/student/courses", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        course_codes = [c["code"] for c in data["courses"]]
        self.assertIn("CS501", course_codes)

        # Check returned fields
        cs501 = next(c for c in data["courses"] if c["code"] == "CS501")
        self.assertIn("professor_name", cs501)
        self.assertIn("professor_email", cs501)
        self.assertIn("enrolled_at", cs501)
        self.assertIn("submission_count", cs501)

    def test_05_student_cannot_see_another_students_courses(self):
        """5. Student courses endpoint only returns the caller's courses, not another student's."""
        headers_y = {"Authorization": f"Bearer {self.student_y_token}"}
        response_y = self.client.get("/api/student/courses", headers=headers_y)
        self.assertEqual(response_y.status_code, 200)
        data_y = response_y.json()
        course_codes_y = [c["code"] for c in data_y["courses"]]
        # student_y has not enrolled in CS501
        self.assertNotIn("CS501", course_codes_y)

    def test_06_student_drops_own_course_success(self):
        """6. Student drops own course -> success 200, enrollment removed."""
        # First enroll student_x in course_c
        headers = {"Authorization": f"Bearer {self.student_x_token}"}
        enroll_res = self.client.post(f"/api/courses/{self.course_c_id}/enroll", headers=headers)
        self.assertEqual(enroll_res.status_code, 201)

        # Drop course_c
        drop_res = self.client.delete(f"/api/courses/{self.course_c_id}/enroll", headers=headers)
        self.assertEqual(drop_res.status_code, 200)
        self.assertTrue(drop_res.json().get("success"))

        # Verify not enrolled anymore
        conn = get_connection()
        try:
            self.assertFalse(is_student_enrolled(conn, self.course_c_id, self.student_x_id))
        finally:
            conn.close()

        # Dropping again returns 404
        drop_again = self.client.delete(f"/api/courses/{self.course_c_id}/enroll", headers=headers)
        self.assertEqual(drop_again.status_code, 404)

    def test_07_student_cannot_drop_another_students_enrollment(self):
        """7. Student cannot drop another student's enrollment."""
        # student_y attempts to drop course_a (which student_x is enrolled in, but student_y is not)
        headers_y = {"Authorization": f"Bearer {self.student_y_token}"}
        response = self.client.delete(f"/api/courses/{self.course_a_id}/enroll", headers=headers_y)
        self.assertEqual(response.status_code, 404)

        # Confirm student_x is STILL enrolled in course_a
        conn = get_connection()
        try:
            self.assertTrue(is_student_enrolled(conn, self.course_a_id, self.student_x_id))
        finally:
            conn.close()

    def test_08_student_cannot_access_professor_roster(self):
        """8. Student role receives 403 Forbidden when requesting course roster."""
        headers = {"Authorization": f"Bearer {self.student_x_token}"}
        response = self.client.get(f"/api/courses/{self.course_a_id}/roster", headers=headers)
        self.assertEqual(response.status_code, 403)
        self.assertIn("professors", response.json().get("detail", "").lower())

    def test_09_professor_sees_own_course_roster(self):
        """9. Professor sees roster for courses they own."""
        headers = {"Authorization": f"Bearer {self.prof_a_token}"}
        response = self.client.get(f"/api/courses/{self.course_a_id}/roster", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        roster = data.get("roster", [])
        student_ids = [s["student_id"] for s in roster]
        self.assertIn(self.student_x_id, student_ids)

        # Verify roster student fields
        student_entry = next(s for s in roster if s["student_id"] == self.student_x_id)
        self.assertEqual(student_entry["student_name"], "Student X")
        self.assertEqual(student_entry["student_email"], self.student_x_email)
        self.assertIn("enrollment_date", student_entry)
        self.assertIn("total_submissions", student_entry)
        self.assertIn("average_similarity", student_entry)
        self.assertIn("risk_level", student_entry)

    def test_10_professor_cannot_see_another_professors_roster(self):
        """10. Professor attempting to view another professor's roster receives 403 Forbidden."""
        headers_b = {"Authorization": f"Bearer {self.prof_b_token}"}
        # Prof B tries to view Course A (owned by Prof A)
        response = self.client.get(f"/api/courses/{self.course_a_id}/roster", headers=headers_b)
        self.assertEqual(response.status_code, 403)
        self.assertIn("permission", response.json().get("detail", "").lower())

    def test_11_roster_includes_submission_count(self):
        """11. Roster contains dynamic submission counts for students."""
        # Student X submits a document to Course A
        content = b"Advanced distributed systems use consensus algorithms such as Paxos and Raft to ensure reliability."
        files = {"file": ("dist_sys.txt", io.BytesIO(content), "text/plain")}
        data = {"title": "Consensus in Distributed Systems", "course_id": "CS501"}
        headers_x = {"Authorization": f"Bearer {self.student_x_token}"}

        sub_res = self.client.post("/api/submissions", data=data, files=files, headers=headers_x)
        self.assertEqual(sub_res.status_code, 201)

        # Now check roster as Prof A
        headers_prof = {"Authorization": f"Bearer {self.prof_a_token}"}
        roster_res = self.client.get(f"/api/courses/{self.course_a_id}/roster", headers=headers_prof)
        self.assertEqual(roster_res.status_code, 200)
        student_entry = next(s for s in roster_res.json()["roster"] if s["student_id"] == self.student_x_id)
        self.assertGreaterEqual(student_entry["total_submissions"], 1)

    def test_12_roster_includes_average_similarity(self):
        """12. Roster contains computed average similarity score and risk level."""
        headers_prof = {"Authorization": f"Bearer {self.prof_a_token}"}
        roster_res = self.client.get(f"/api/courses/{self.course_a_id}/roster", headers=headers_prof)
        self.assertEqual(roster_res.status_code, 200)
        student_entry = next(s for s in roster_res.json()["roster"] if s["student_id"] == self.student_x_id)
        self.assertIsInstance(student_entry["average_similarity"], float)
        self.assertIn(student_entry["risk_level"], ["safe", "review_required", "high_risk"])

    def test_13_professor_removes_student_success(self):
        """13. Professor can remove an enrolled student from their course roster."""
        # Enroll Student Y in Course A
        headers_y = {"Authorization": f"Bearer {self.student_y_token}"}
        enroll_res = self.client.post(f"/api/courses/{self.course_a_id}/enroll", headers=headers_y)
        self.assertEqual(enroll_res.status_code, 201)

        # Prof A removes Student Y
        headers_prof = {"Authorization": f"Bearer {self.prof_a_token}"}
        remove_res = self.client.delete(
            f"/api/courses/{self.course_a_id}/roster/{self.student_y_id}",
            headers=headers_prof
        )
        self.assertEqual(remove_res.status_code, 200)
        self.assertTrue(remove_res.json().get("success"))

        # Confirm Student Y is no longer enrolled
        conn = get_connection()
        try:
            self.assertFalse(is_student_enrolled(conn, self.course_a_id, self.student_y_id))
        finally:
            conn.close()

        # Removing again returns 404
        remove_again = self.client.delete(
            f"/api/courses/{self.course_a_id}/roster/{self.student_y_id}",
            headers=headers_prof
        )
        self.assertEqual(remove_again.status_code, 404)

    def test_14_professor_cannot_remove_student_from_another_professors_course(self):
        """14. Professor cannot remove a student from another professor's course -> 403."""
        # Prof B attempts to remove Student X from Course A (owned by Prof A)
        headers_b = {"Authorization": f"Bearer {self.prof_b_token}"}
        response = self.client.delete(
            f"/api/courses/{self.course_a_id}/roster/{self.student_x_id}",
            headers=headers_b
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("permission", response.json().get("detail", "").lower())

        # Verify Student X is STILL enrolled in Course A
        conn = get_connection()
        try:
            self.assertTrue(is_student_enrolled(conn, self.course_a_id, self.student_x_id))
        finally:
            conn.close()

    def test_15_unauthenticated_roster_access(self):
        """15. Unauthenticated roster access returns 401."""
        get_res = self.client.get(f"/api/courses/{self.course_a_id}/roster")
        self.assertEqual(get_res.status_code, 401)

        del_res = self.client.delete(f"/api/courses/{self.course_a_id}/roster/{self.student_x_id}")
        self.assertEqual(del_res.status_code, 401)

    def test_16_non_enrolled_student_submission_rejected(self):
        """16. Non-enrolled student submission is rejected with 403 Forbidden."""
        # Student Y is NOT enrolled in Course B (CS502)
        content = b"Quantum computing leverages superposition and entanglement for computational speedups."
        files = {"file": ("quantum.txt", io.BytesIO(content), "text/plain")}
        data = {"title": "Quantum Principles", "course_id": "CS502"}
        headers_y = {"Authorization": f"Bearer {self.student_y_token}"}

        response = self.client.post("/api/submissions", data=data, files=files, headers=headers_y)
        self.assertEqual(response.status_code, 403)
        self.assertIn("not enrolled", response.json().get("detail", "").lower())

    def test_17_enrolled_student_submission_succeeds(self):
        """17. Enrolled student submission succeeds with 201 Created and analysis report."""
        # Enroll Student Y in Course B
        headers_y = {"Authorization": f"Bearer {self.student_y_token}"}
        enroll_res = self.client.post(f"/api/courses/{self.course_b_id}/enroll", headers=headers_y)
        self.assertEqual(enroll_res.status_code, 201)

        # Submit to Course B
        content = b"Quantum computing leverages superposition and entanglement for massive computational speedups in polynomial time."
        files = {"file": ("quantum_report.txt", io.BytesIO(content), "text/plain")}
        data = {"title": "Quantum Principles Essay", "course_id": "CS502"}

        response = self.client.post("/api/submissions", data=data, files=files, headers=headers_y)
        self.assertEqual(response.status_code, 201)
        res_data = response.json()
        self.assertTrue(res_data.get("success"))
        self.assertIn("submission_id", res_data)
        self.assertIn("report_id", res_data)
        self.assertIn("similarity_score", res_data)
        self.assertEqual(res_data.get("status"), "completed")

    def test_18_existing_submission_workflow_remains_functional(self):
        """18. Existing submission workflow remains functional: report retrieval and details work."""
        headers_x = {"Authorization": f"Bearer {self.student_x_token}"}
        # Student X accesses their submissions list
        sub_list_res = self.client.get("/api/student/submissions", headers=headers_x)
        self.assertEqual(sub_list_res.status_code, 200)
        submissions = sub_list_res.json().get("submissions", [])
        self.assertTrue(len(submissions) >= 1)

        latest_sub = submissions[0]
        report_id = latest_sub["report_id"]

        # Student accesses their report
        report_res = self.client.get(f"/api/reports/{report_id}", headers=headers_x)
        self.assertEqual(report_res.status_code, 200)
        report_data = report_res.json()
        self.assertTrue(report_data.get("success"))
        self.assertIn("overall_similarity_score", report_data["report"])
        self.assertIn("risk_level", report_data["report"])
        self.assertIn("matches", report_data["report"])


if __name__ == "__main__":
    unittest.main()
