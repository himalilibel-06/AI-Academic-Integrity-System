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
from models.course import create_course, seed_default_courses_if_empty, is_student_enrolled, enroll_student
from models.submission import get_submission_by_id
from models.report import get_report_by_id
from utils.auth import create_access_token


class TestSubmissionAndReportPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        conn = get_connection()
        try:
            seed_default_courses_if_empty(conn)
        finally:
            conn.close()

        cls.client = TestClient(app)

        # Setup test student 1
        cls.student1_email = "phase4_student1@example.com"
        cls.student1_id = cls._get_or_create_user("Phase 4 Student 1", cls.student1_email, "student")
        cls.student1_token = create_access_token({
            "sub": str(cls.student1_id),
            "email": cls.student1_email,
            "role": "student"
        })

        # Setup test student 2 (for unauthorized access check)
        cls.student2_email = "phase4_student2@example.com"
        cls.student2_id = cls._get_or_create_user("Phase 4 Student 2", cls.student2_email, "student")
        cls.student2_token = create_access_token({
            "sub": str(cls.student2_id),
            "email": cls.student2_email,
            "role": "student"
        })

        # Setup test professor (for role verification check)
        cls.prof_email = "phase4_prof@example.com"
        cls.prof_id = cls._get_or_create_user("Phase 4 Professor", cls.prof_email, "professor")
        cls.prof_token = create_access_token({
            "sub": str(cls.prof_id),
            "email": cls.prof_email,
            "role": "professor"
        })

        # Ensure a test course exists
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM courses WHERE code = 'CS402' LIMIT 1")
            row = cursor.fetchone()
            if row:
                cls.test_course_id = row[0]
            else:
                cls.test_course_id = create_course(
                    conn, "Artificial Intelligence", "CS402", "AI course", cls.prof_id
                )

            # Ensure test student 1 is enrolled in test courses (CS401, CS402)
            cursor.execute("SELECT id FROM courses WHERE code IN ('CS401', 'CS402')")
            for c_row in cursor.fetchall():
                if not is_student_enrolled(conn, c_row[0], cls.student1_id):
                    enroll_student(conn, c_row[0], cls.student1_id)
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

    def test_01_submission_requires_authentication(self):
        """1. Submission endpoint requires authentication."""
        files = {"file": ("test.txt", io.BytesIO(b"Some text content"), "text/plain")}
        data = {"title": "Test Assignment", "course_id": "CS402"}
        response = self.client.post("/api/submissions", data=data, files=files)
        self.assertEqual(response.status_code, 401)

    def test_02_only_students_can_submit(self):
        """Professor attempting to submit receives 403 Forbidden."""
        files = {"file": ("test.txt", io.BytesIO(b"Some text content"), "text/plain")}
        data = {"title": "Prof Assignment", "course_id": "CS402"}
        headers = {"Authorization": f"Bearer {self.prof_token}"}
        response = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(response.status_code, 403)
        self.assertIn("Only students are permitted", response.json().get("detail", ""))

    def test_03_unsupported_file_type_rejected(self):
        """3. Unsupported file type is rejected with 400."""
        files = {"file": ("script.py", io.BytesIO(b"print('hello')"), "text/x-python")}
        data = {"title": "Code Assignment", "course_id": "CS402"}
        headers = {"Authorization": f"Bearer {self.student1_token}"}
        response = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json().get("detail", ""))

    def test_04_empty_document_rejected(self):
        """4. Empty document is rejected with 400."""
        files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
        data = {"title": "Empty Assignment", "course_id": "CS402"}
        headers = {"Authorization": f"Bearer {self.student1_token}"}
        response = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(response.status_code, 400)

        # Also test whitespace-only document
        files_ws = {"file": ("whitespace.txt", io.BytesIO(b"   \n\t  \n  "), "text/plain")}
        response_ws = self.client.post("/api/submissions", data=data, files=files_ws, headers=headers)
        self.assertEqual(response_ws.status_code, 400)
        self.assertIn("no readable text", response_ws.json().get("detail", "").lower())

    def test_05_valid_submission_succeeds_and_creates_report(self):
        """2, 5, 6. Valid student submission succeeds, saves to SQLite submissions and plagiarism_reports."""
        content = (
            b"Artificial intelligence is a field of computer science that focuses on "
            b"creating intelligent systems and machine learning models for education."
        )
        files = {"file": ("ai_paper.txt", io.BytesIO(content), "text/plain")}
        data = {"title": "AI Ethics Paper", "course_id": "CS402"}
        headers = {"Authorization": f"Bearer {self.student1_token}"}

        response = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(response.status_code, 201)
        res_data = response.json()

        self.assertTrue(res_data.get("success"))
        self.assertIn("submission_id", res_data)
        self.assertIn("report_id", res_data)
        self.assertIn("similarity_score", res_data)
        self.assertIn("risk_level", res_data)
        self.assertEqual(res_data["status"], "completed")

        submission_id = res_data["submission_id"]
        report_id = res_data["report_id"]

        # 5. Verify submission stored in SQLite
        conn = get_connection()
        try:
            sub = get_submission_by_id(conn, submission_id)
            self.assertIsNotNone(sub)
            self.assertEqual(sub["title"], "AI Ethics Paper")
            self.assertEqual(sub["student_id"], self.student1_id)
            self.assertEqual(sub["status"], "completed")
            self.assertTrue(len(sub["original_text"]) > 0)
            self.assertTrue(len(sub["processed_text"]) > 0)

            # 6. Verify plagiarism report stored in SQLite
            report = get_report_by_id(conn, report_id)
            self.assertIsNotNone(report)
            self.assertEqual(report["submission_id"], submission_id)
            self.assertEqual(report["overall_similarity_score"], res_data["similarity_score"])
            self.assertEqual(report["risk_level"], res_data["risk_level"])
        finally:
            conn.close()

        # Save IDs for subsequent retrieval tests
        TestSubmissionAndReportPipeline.created_submission_id = submission_id
        TestSubmissionAndReportPipeline.created_report_id = report_id

    def test_06_report_retrieval_owner_success(self):
        """7. Report retrieval works for the submission owner."""
        report_id = getattr(self, "created_report_id", None)
        self.assertIsNotNone(report_id, "Report ID must be created in test_05")

        headers = {"Authorization": f"Bearer {self.student1_token}"}
        response = self.client.get(f"/api/reports/{report_id}", headers=headers)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get("success"))
        report = data["report"]
        self.assertEqual(report["id"], report_id)
        self.assertIn("overall_similarity_score", report)
        self.assertIn("risk_level", report)
        self.assertIn("matches", report)
        self.assertIsInstance(report["matches"], list)
        self.assertIn("submission", report)
        self.assertEqual(report["submission"]["title"], "AI Ethics Paper")

    def test_07_report_retrieval_unauthorized_student_forbidden(self):
        """8. Another student cannot access the report (403 Forbidden)."""
        report_id = getattr(self, "created_report_id", None)
        self.assertIsNotNone(report_id, "Report ID must be created in test_05")

        # Student 2 tries to access Student 1's report
        headers = {"Authorization": f"Bearer {self.student2_token}"}
        response = self.client.get(f"/api/reports/{report_id}", headers=headers)
        self.assertEqual(response.status_code, 403)
        self.assertIn("not authorized", response.json().get("detail", "").lower())

    def test_08_get_latest_report(self):
        """Latest report endpoint returns the student's most recent report."""
        headers = {"Authorization": f"Bearer {self.student1_token}"}
        response = self.client.get("/api/reports/latest", headers=headers)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get("success"))
        report = data["report"]
        self.assertEqual(report["id"], self.created_report_id)

    def test_09_courses_endpoint_returns_courses(self):
        """GET /api/courses returns list of available courses."""
        headers = {"Authorization": f"Bearer {self.student1_token}"}
        response = self.client.get("/api/courses", headers=headers)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIn("courses", data)
        self.assertTrue(len(data["courses"]) > 0)
        codes = [c["code"] for c in data["courses"]]
        self.assertIn("CS402", codes)

    def test_10_valid_docx_submission(self):
        """Valid .docx file upload and plagiarism analysis succeeds."""
        import docx
        doc = docx.Document()
        doc.add_paragraph("Machine learning allows computer systems to learn from data and improve their performance.")
        docx_io = io.BytesIO()
        doc.save(docx_io)
        docx_io.seek(0)

        files = {"file": ("assignment.docx", docx_io, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        data = {"title": "ML DOCX Report", "course_id": "CS401"}
        headers = {"Authorization": f"Bearer {self.student1_token}"}

        response = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(response.status_code, 201)
        res_data = response.json()
        self.assertTrue(res_data.get("success"))
        self.assertIn("report_id", res_data)
        self.assertIn("similarity_score", res_data)

    def test_11_empty_pdf_rejected(self):
        """PDF with no extractable text is rejected with 400."""
        minimal_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n192\n%%EOF"
        )
        files = {"file": ("empty.pdf", io.BytesIO(minimal_pdf), "application/pdf")}
        data = {"title": "Empty PDF Assignment", "course_id": "CS402"}
        headers = {"Authorization": f"Bearer {self.student1_token}"}

        response = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("no readable text", response.json().get("detail", "").lower())


if __name__ == "__main__":
    unittest.main()
