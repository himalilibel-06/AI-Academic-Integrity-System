import hashlib
import os
import sys
import tempfile
import sqlite3
import unittest
from pathlib import Path
from unittest.mock import patch

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import database.database as db_module
import routes.reports as reports_routes
from main import app
from fastapi.testclient import TestClient
from models.user import create_user
from models.course import create_course
from models.submission import create_submission
from models.report import create_plagiarism_report
from utils.auth import create_access_token


class TestReportAuthorizationSafe(unittest.TestCase):
    """
    Isolated authorization test suite for report access endpoints.
    Guarantees test safety by using a temporary SQLite database and verifying
    that live database records are never modified.
    """

    @classmethod
    def setUpClass(cls):
        # 1. Record live database hash for safety verification
        cls.live_db_path = BACKEND_DIR / "academic_integrity.db"
        if cls.live_db_path.exists():
            cls.live_db_initial_hash = hashlib.sha256(cls.live_db_path.read_bytes()).hexdigest()
        else:
            cls.live_db_initial_hash = None

        # 2. Create isolated temporary directory & SQLite database
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.temp_db_path = Path(cls.temp_dir.name) / "test_isolated_auth.db"

        # Patch DATABASE_PATH and get_connection to point to temp database
        def get_isolated_connection():
            conn = sqlite3.connect(cls.temp_db_path)
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.row_factory = sqlite3.Row
            return conn

        cls.db_patcher = patch.object(db_module, "DATABASE_PATH", cls.temp_db_path)
        cls.conn_patcher_db = patch.object(db_module, "get_connection", side_effect=get_isolated_connection)
        cls.conn_patcher_routes = patch.object(reports_routes, "get_connection", side_effect=get_isolated_connection)

        cls.db_patcher.start()
        cls.conn_patcher_db.start()
        cls.conn_patcher_routes.start()

        # Initialize schema inside isolated database
        db_module.initialize_database()

        # 3. Seed isolated fixtures
        conn = get_isolated_connection()
        try:
            # Users
            cls.student_a_id = create_user(conn, "Student Alpha", "student_alpha@test.edu", "pass123", "student")
            cls.student_b_id = create_user(conn, "Student Beta", "student_beta@test.edu", "pass123", "student")
            cls.prof_a_id = create_user(conn, "Professor Alice", "prof_alice@test.edu", "pass123", "professor")
            cls.prof_b_id = create_user(conn, "Professor Bob", "prof_bob@test.edu", "pass123", "professor")
            cls.auditor_id = create_user(conn, "External Auditor", "auditor@test.edu", "pass123", "auditor")

            # JWT Tokens
            cls.token_student_a = create_access_token({"sub": str(cls.student_a_id), "email": "student_alpha@test.edu", "role": "student"})
            cls.token_student_b = create_access_token({"sub": str(cls.student_b_id), "email": "student_beta@test.edu", "role": "student"})
            cls.token_prof_a = create_access_token({"sub": str(cls.prof_a_id), "email": "prof_alice@test.edu", "role": "professor"})
            cls.token_prof_b = create_access_token({"sub": str(cls.prof_b_id), "email": "prof_bob@test.edu", "role": "professor"})
            cls.token_auditor = create_access_token({"sub": str(cls.auditor_id), "email": "auditor@test.edu", "role": "auditor"})

            # Courses
            cls.course_a_id = create_course(conn, "Data Ethics", "CS-101", "Ethics in Computing", cls.prof_a_id)
            cls.course_b_id = create_course(conn, "Compiler Design", "CS-201", "Compiler Architecture", cls.prof_b_id)

            # Submissions:
            # - Submission A: Student A in Course A (taught by Professor A)
            cls.sub_a_id = create_submission(
                conn,
                student_id=cls.student_a_id,
                course_id=cls.course_a_id,
                title="Ethics in LLMs",
                filename="doc_alpha.txt",
                file_path=str(cls.temp_db_path.parent / "doc_alpha.txt"),
                file_type="text/plain",
                original_text="Artificial intelligence ethics in machine learning systems.",
                processed_text="artificial intelligence ethics machine learning systems",
                status="completed"
            )

            # - Submission B: Student B in Course B (taught by Professor B)
            cls.sub_b_id = create_submission(
                conn,
                student_id=cls.student_b_id,
                course_id=cls.course_b_id,
                title="Compiler Optimizations",
                filename="doc_beta.txt",
                file_path=str(cls.temp_db_path.parent / "doc_beta.txt"),
                file_type="text/plain",
                original_text="Intermediate representations and SSA form transformations.",
                processed_text="intermediate representations ssa form transformations",
                status="completed"
            )

            # - Submission C: Student A with no assigned course (course_id = None)
            cls.sub_c_id = create_submission(
                conn,
                student_id=cls.student_a_id,
                course_id=None,
                title="Independent Research",
                filename="doc_gamma.txt",
                file_path=str(cls.temp_db_path.parent / "doc_gamma.txt"),
                file_type="text/plain",
                original_text="Independent exploration without course enrollment.",
                processed_text="independent exploration without course enrollment",
                status="completed"
            )

            # Reports:
            cls.rep_a_id = create_plagiarism_report(
                conn,
                submission_id=cls.sub_a_id,
                overall_similarity_score=18.5,
                risk_level="low_risk",
                matches=[
                    {
                        "reference_id": 1,
                        "title": "Ethics Guidelines",
                        "type": "Academic Reference Corpus",
                        "similarity_percentage": 18.5,
                        "matched_segments": [
                            {
                                "target_snippet": "Artificial intelligence ethics in machine learning systems.",
                                "source_snippet": "Artificial intelligence ethics in systems.",
                                "similarity": 85.0
                            }
                        ]
                    }
                ],
                review_status="approved",
                evidence_details={"sentence_level_evidence": []}
            )

            cls.rep_b_id = create_plagiarism_report(
                conn,
                submission_id=cls.sub_b_id,
                overall_similarity_score=45.0,
                risk_level="review_required",
                matches=[
                    {
                        "reference_id": 2,
                        "title": "SSA Foundations",
                        "type": "Academic Reference Corpus",
                        "similarity_percentage": 45.0,
                        "matched_segments": [
                            {
                                "target_snippet": "Intermediate representations and SSA form transformations.",
                                "source_snippet": "Intermediate representations SSA transformations.",
                                "similarity": 90.0
                            }
                        ]
                    }
                ],
                review_status="review_required",
                evidence_details={"sentence_level_evidence": []}
            )

            cls.rep_c_id = create_plagiarism_report(
                conn,
                submission_id=cls.sub_c_id,
                overall_similarity_score=5.0,
                risk_level="safe",
                matches=[],
                review_status="approved",
                evidence_details={}
            )

        finally:
            conn.close()

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Stop patchers
        cls.conn_patcher_routes.stop()
        cls.conn_patcher_db.stop()
        cls.db_patcher.stop()

        # Clean up temporary directory
        cls.temp_dir.cleanup()

        # Verify live database was untouched
        if cls.live_db_initial_hash and cls.live_db_path.exists():
            final_hash = hashlib.sha256(cls.live_db_path.read_bytes()).hexdigest()
            assert final_hash == cls.live_db_initial_hash, "SAFETY VIOLATION: Live database was altered during tests!"

    def test_01_student_a_can_access_own_report(self):
        """Student A successfully retrieves Student A's own plagiarism report (200 OK)."""
        response = self.client.get(
            f"/api/reports/{self.rep_a_id}",
            headers={"Authorization": f"Bearer {self.token_student_a}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        report = data["report"]
        self.assertEqual(report["id"], self.rep_a_id)
        self.assertEqual(report["submission_id"], self.sub_a_id)
        self.assertEqual(report["submission"]["student_id"], self.student_a_id)
        self.assertEqual(report["overall_similarity_score"], 18.5)
        self.assertEqual(report["risk_level"], "low_risk")

    def test_02_student_a_cannot_access_student_b_report(self):
        """Student A receives 403 Forbidden when attempting to view Student B's report."""
        response = self.client.get(
            f"/api/reports/{self.rep_b_id}",
            headers={"Authorization": f"Bearer {self.token_student_a}"}
        )
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("not authorized", data.get("detail", "").lower())
        self.assertIn("another student", data.get("detail", "").lower())

    def test_03_professor_a_can_access_report_from_assigned_course(self):
        """Professor A successfully retrieves a report for a submission in Professor A's course (200 OK)."""
        response = self.client.get(
            f"/api/reports/{self.rep_a_id}",
            headers={"Authorization": f"Bearer {self.token_prof_a}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        report = data["report"]
        self.assertEqual(report["id"], self.rep_a_id)
        self.assertEqual(report["submission"]["course_id"], self.course_a_id)

    def test_04_professor_a_cannot_access_report_from_unassigned_course(self):
        """Professor A receives 403 Forbidden when attempting to view a report for Professor B's course."""
        response = self.client.get(
            f"/api/reports/{self.rep_b_id}",
            headers={"Authorization": f"Bearer {self.token_prof_a}"}
        )
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("not authorized", data.get("detail", "").lower())
        self.assertIn("courses you do not teach", data.get("detail", "").lower())

    def test_05_professor_cannot_access_report_without_assigned_course(self):
        """Professor A receives 403 Forbidden when attempting to view a report with no assigned course."""
        response = self.client.get(
            f"/api/reports/{self.rep_c_id}",
            headers={"Authorization": f"Bearer {self.token_prof_a}"}
        )
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("not authorized", data.get("detail", "").lower())

    def test_06_unauthenticated_access_rejected(self):
        """Unauthenticated requests without Authorization header are rejected with 401 Unauthorized."""
        response = self.client.get(f"/api/reports/{self.rep_a_id}")
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertIn("token", data.get("detail", "").lower())

    def test_07_invalid_token_rejected(self):
        """Requests with an invalid token are rejected with 401 Unauthorized."""
        response = self.client.get(
            f"/api/reports/{self.rep_a_id}",
            headers={"Authorization": "Bearer invalid.token.value"}
        )
        self.assertEqual(response.status_code, 401)

    def test_08_invalid_or_nonexistent_report_id_returns_404(self):
        """Request for a nonexistent report ID returns 404 Not Found."""
        response = self.client.get(
            "/api/reports/999999",
            headers={"Authorization": f"Bearer {self.token_student_a}"}
        )
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn("not found", data.get("detail", "").lower())

    def test_09_unauthorized_role_rejected(self):
        """Users with roles other than 'student' or 'professor' receive 403 Forbidden."""
        response = self.client.get(
            f"/api/reports/{self.rep_a_id}",
            headers={"Authorization": f"Bearer {self.token_auditor}"}
        )
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("not authorized", data.get("detail", "").lower())

    def test_10_latest_report_endpoint_enforces_student_only_access(self):
        """
        GET /api/reports/latest allows students to get their latest report,
        and forbids access to non-student roles.
        """
        # Student A gets latest report -> 200
        res_stu = self.client.get(
            "/api/reports/latest",
            headers={"Authorization": f"Bearer {self.token_student_a}"}
        )
        self.assertEqual(res_stu.status_code, 200)
        self.assertTrue(res_stu.json()["success"])

        # Professor A attempts to call /latest -> 403
        res_prof = self.client.get(
            "/api/reports/latest",
            headers={"Authorization": f"Bearer {self.token_prof_a}"}
        )
        self.assertEqual(res_prof.status_code, 403)

    def test_11_export_authorization_consistency(self):
        """
        Export endpoint /export has identical authorization rules:
        - Student A can export Report A, but cannot export Report B.
        - Professor A can export Report A, but cannot export Report B.
        """
        # Student A export own report -> 200
        res_s_own = self.client.get(
            f"/api/reports/{self.rep_a_id}/export?format=json",
            headers={"Authorization": f"Bearer {self.token_student_a}"}
        )
        self.assertEqual(res_s_own.status_code, 200)

        # Student A export other report -> 403
        res_s_other = self.client.get(
            f"/api/reports/{self.rep_b_id}/export?format=json",
            headers={"Authorization": f"Bearer {self.token_student_a}"}
        )
        self.assertEqual(res_s_other.status_code, 403)

        # Professor A export course report -> 200
        res_p_own = self.client.get(
            f"/api/reports/{self.rep_a_id}/export?format=json",
            headers={"Authorization": f"Bearer {self.token_prof_a}"}
        )
        self.assertEqual(res_p_own.status_code, 200)

        # Professor A export other course report -> 403
        res_p_other = self.client.get(
            f"/api/reports/{self.rep_b_id}/export?format=json",
            headers={"Authorization": f"Bearer {self.token_prof_a}"}
        )
        self.assertEqual(res_p_other.status_code, 403)

    def test_12_live_database_remains_unmodified(self):
        """Verify that backend/academic_integrity.db remains bit-for-bit identical to its pre-test state."""
        if self.live_db_initial_hash and self.live_db_path.exists():
            current_hash = hashlib.sha256(self.live_db_path.read_bytes()).hexdigest()
            self.assertEqual(
                current_hash,
                self.live_db_initial_hash,
                "Test altered the live academic_integrity.db file!"
            )


if __name__ == "__main__":
    unittest.main()
