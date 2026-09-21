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
from models.course import create_course
from models.submission import create_submission, get_submission_by_id
from models.report import create_plagiarism_report, get_report_by_id
from utils.auth import create_access_token
from services.plagiarism_engine import extract_matching_segments, calculate_similarity


class TestReportExportAndEvidence(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)
        cls.uploads_dir = BACKEND_DIR / "uploads"
        cls.uploads_dir.mkdir(parents=True, exist_ok=True)

        # Setup Test Users
        cls.student_a_email = "student_a_f3@example.com"
        cls.student_a_id = cls._get_or_create_user("Student A", cls.student_a_email, "student")
        cls.student_a_token = create_access_token({
            "sub": str(cls.student_a_id),
            "email": cls.student_a_email,
            "role": "student"
        })

        cls.student_b_email = "student_b_f3@example.com"
        cls.student_b_id = cls._get_or_create_user("Student B", cls.student_b_email, "student")
        cls.student_b_token = create_access_token({
            "sub": str(cls.student_b_id),
            "email": cls.student_b_email,
            "role": "student"
        })

        cls.prof_owner_email = "prof_owner_f3@example.com"
        cls.prof_owner_id = cls._get_or_create_user("Dr. Course Owner", cls.prof_owner_email, "professor")
        cls.prof_owner_token = create_access_token({
            "sub": str(cls.prof_owner_id),
            "email": cls.prof_owner_email,
            "role": "professor"
        })

        cls.prof_other_email = "prof_other_f3@example.com"
        cls.prof_other_id = cls._get_or_create_user("Dr. Unrelated Prof", cls.prof_other_email, "professor")
        cls.prof_other_token = create_access_token({
            "sub": str(cls.prof_other_id),
            "email": cls.prof_other_email,
            "role": "professor"
        })

        # Setup Courses
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM courses WHERE code = 'F3_CRS1'")
            row = cursor.fetchone()
            if row:
                cls.course_id = row[0]
            else:
                cls.course_id = create_course(
                    conn,
                    name="Ethics and Computing",
                    code="F3_CRS1",
                    description="Academic integrity and ethical design",
                    professor_id=cls.prof_owner_id
                )

            # Create a real test file in uploads
            cls.test_file_path = cls.uploads_dir / "f3_test_doc.txt"
            cls.test_file_content = b"Artificial intelligence is transforming higher education rapidly and significantly."
            with open(cls.test_file_path, "wb") as f:
                f.write(cls.test_file_content)

            # Create submission for Student A
            cls.submission_a_id = create_submission(
                conn,
                student_id=cls.student_a_id,
                course_id=cls.course_id,
                title="AI in Academic Settings",
                filename="f3_test_doc.txt",
                file_path=str(cls.test_file_path),
                file_type="text/plain",
                original_text="Artificial intelligence is transforming higher education rapidly and significantly. Students utilize tools for research.",
                processed_text="artificial intelligence transforming higher education rapidly significantly students utilize tools research",
                status="completed"
            )

            # Create Report for Student A with matched segments
            cls.report_a_id = create_plagiarism_report(
                conn,
                submission_id=cls.submission_a_id,
                overall_similarity_score=42.5,
                risk_level="high_risk",
                matches=[
                    {
                        "reference_id": 1,
                        "title": "Journal of AI Ethics",
                        "type": "Academic Reference Corpus",
                        "similarity_percentage": 42.5,
                        "matched_segments": [
                            {
                                "target_snippet": "Artificial intelligence is transforming higher education rapidly and significantly.",
                                "source_snippet": "Artificial intelligence is rapidly transforming higher education in significant ways.",
                                "similarity": 88.0
                            }
                        ]
                    }
                ],
                review_status="review_required"
            )

            # Create Legacy Report without matched_segments (for backward compatibility testing)
            cls.legacy_submission_id = create_submission(
                conn,
                student_id=cls.student_a_id,
                course_id=cls.course_id,
                title="Legacy Submission",
                filename="legacy.txt",
                file_path=str(cls.uploads_dir / "legacy_dummy.txt"),
                file_type="text/plain",
                original_text="Legacy test content.",
                processed_text="legacy test content",
                status="completed"
            )
            cls.legacy_report_id = create_plagiarism_report(
                conn,
                submission_id=cls.legacy_submission_id,
                overall_similarity_score=20.0,
                risk_level="review_required",
                matches=[
                    {
                        "reference_id": 2,
                        "title": "Legacy Reference Document",
                        "similarity": 20.0
                    }
                ],
                review_status="approved"
            )

        finally:
            conn.close()

    @classmethod
    def tearDownClass(cls):
        # Cleanup test files created in uploads
        if hasattr(cls, "test_file_path") and cls.test_file_path.exists():
            try:
                cls.test_file_path.unlink()
            except Exception:
                pass

    @classmethod
    def _get_or_create_user(cls, name, email, role):
        conn = get_connection()
        try:
            user = get_user_by_email(conn, email)
            if user:
                return user["id"]
            return create_user(conn, name=name, email=email, password="dummy_password_123", role=role)
        finally:
            conn.close()

    # --- Evidence Extraction Unit Tests ---

    def test_sentence_extraction_high_similarity(self):
        target = "Machine learning algorithms can automatically detect patterns in complex datasets. They require quality training data."
        reference = "Machine learning algorithms can easily identify patterns in complex datasets. They need good training samples."
        matches = extract_matching_segments(target, reference, threshold=0.55)
        self.assertGreaterEqual(len(matches), 1)
        first_match = matches[0]
        self.assertIn("target_snippet", first_match)
        self.assertIn("source_snippet", first_match)
        self.assertIn("similarity", first_match)
        self.assertGreaterEqual(first_match["similarity"], 55.0)

    def test_sentence_extraction_dissimilar_text(self):
        target = "Photosynthesis occurs in plant cells containing chloroplasts."
        reference = "Quantum computing relies on superposition and entanglement of qubits."
        matches = extract_matching_segments(target, reference, threshold=0.6)
        self.assertEqual(len(matches), 0)

    def test_historical_submissions_cross_comparison(self):
        target = "Neural networks are models inspired by biological brain architectures."
        historical = [
            {
                "id": 999,
                "title": "Prior Student Paper",
                "processed_text": "neural networks are models inspired by biological brain architectures and cognitive science",
                "original_text": "Neural networks are models inspired by biological brain architectures and cognitive science.",
                "student_name": "Past Student"
            }
        ]
        result = calculate_similarity(target, historical_documents=historical)
        self.assertIn("matches", result)
        student_matches = [m for m in result["matches"] if m.get("type") == "Student Submission Archive"]
        self.assertGreaterEqual(len(student_matches), 1)
        self.assertIn("matched_segments", student_matches[0])

    # --- Official Report Export API Tests ---

    def test_student_can_export_own_report_html(self):
        response = self.client.get(
            f"/api/reports/{self.report_a_id}/export?format=html",
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers.get("content-type", ""))
        self.assertIn("attachment", response.headers.get("content-disposition", ""))
        html_content = response.text
        self.assertIn("Academic Integrity Verification Report", html_content)
        self.assertIn("AI in Academic Settings", html_content)
        self.assertIn("Student A", html_content)
        self.assertIn("Journal of AI Ethics", html_content)
        self.assertIn("Verification Hash", html_content)

    def test_student_can_export_own_report_json(self):
        response = self.client.get(
            f"/api/reports/{self.report_a_id}/export?format=json",
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIn("audit_hash", data)
        self.assertIn("report", data)
        self.assertIn("matches", data["report"])
        matches = data["report"]["matches"]
        self.assertGreaterEqual(len(matches), 1)
        self.assertIn("matched_segments", matches[0])

    def test_professor_can_export_course_student_report(self):
        response = self.client.get(
            f"/api/reports/{self.report_a_id}/export?format=html",
            headers={"Authorization": f"Bearer {self.prof_owner_token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers.get("content-type", ""))

    def test_unauthorized_student_cannot_export_report(self):
        response = self.client.get(
            f"/api/reports/{self.report_a_id}/export?format=html",
            headers={"Authorization": f"Bearer {self.student_b_token}"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("not authorized", response.json().get("detail", "").lower())

    def test_unauthorized_professor_cannot_export_report(self):
        response = self.client.get(
            f"/api/reports/{self.report_a_id}/export?format=html",
            headers={"Authorization": f"Bearer {self.prof_other_token}"}
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_export_rejected(self):
        response = self.client.get(f"/api/reports/{self.report_a_id}/export?format=html")
        self.assertEqual(response.status_code, 401)

    def test_export_nonexistent_report_returns_404(self):
        response = self.client.get(
            "/api/reports/999999/export?format=html",
            headers={"Authorization": f"Bearer {self.prof_owner_token}"}
        )
        self.assertEqual(response.status_code, 404)

    # --- Submission File Download API Tests ---

    def test_student_can_download_own_submission_file(self):
        response = self.client.get(
            f"/api/submissions/{self.submission_a_id}/download",
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, self.test_file_content)
        self.assertIn("attachment", response.headers.get("content-disposition", ""))
        self.assertIn("f3_test_doc.txt", response.headers.get("content-disposition", ""))

    def test_professor_can_download_student_submission_file(self):
        response = self.client.get(
            f"/api/submissions/{self.submission_a_id}/download",
            headers={"Authorization": f"Bearer {self.prof_owner_token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, self.test_file_content)

    def test_unauthorized_student_cannot_download_submission(self):
        response = self.client.get(
            f"/api/submissions/{self.submission_a_id}/download",
            headers={"Authorization": f"Bearer {self.student_b_token}"}
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthorized_professor_cannot_download_submission(self):
        response = self.client.get(
            f"/api/submissions/{self.submission_a_id}/download",
            headers={"Authorization": f"Bearer {self.prof_other_token}"}
        )
        self.assertEqual(response.status_code, 403)

    def test_download_missing_file_returns_404(self):
        # legacy_submission_id has a non-existent file path
        response = self.client.get(
            f"/api/submissions/{self.legacy_submission_id}/download",
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(response.status_code, 404)

    # --- Backward Compatibility Tests ---

    def test_legacy_report_backward_compatibility(self):
        # Ensure report with legacy match format exports without crash
        response = self.client.get(
            f"/api/reports/{self.legacy_report_id}/export?format=json",
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        matches = data["report"]["matches"]
        self.assertGreaterEqual(len(matches), 1)
        self.assertEqual(matches[0]["matched_segments"], [])

        # HTML export also succeeds
        html_resp = self.client.get(
            f"/api/reports/{self.legacy_report_id}/export?format=html",
            headers={"Authorization": f"Bearer {self.student_a_token}"}
        )
        self.assertEqual(html_resp.status_code, 200)
        self.assertIn("Academic Integrity Verification Report", html_resp.text)


if __name__ == "__main__":
    unittest.main()
