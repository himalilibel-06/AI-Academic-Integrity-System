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


class TestProfileAndSecurityEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)

        # Create a dedicated test student
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE email IN ('profile_student@example.com', 'profile_prof@example.com')")
        conn.commit()

        cls.student_email = "profile_student@example.com"
        cls.student_password = "studentpassword123"
        cls.student_id = create_user(
            conn,
            name="Original Student Name",
            email=cls.student_email,
            password=cls.student_password,
            role="student"
        )

        cls.prof_email = "profile_prof@example.com"
        cls.prof_password = "profpassword123"
        cls.prof_id = create_user(
            conn,
            name="Original Professor Name",
            email=cls.prof_email,
            password=cls.prof_password,
            role="professor"
        )
        conn.close()

        # Obtain student token
        login_res = cls.client.post("/api/auth/login", json={
            "email": cls.student_email,
            "password": cls.student_password
        })
        cls.student_token = login_res.json()["token"]
        cls.student_headers = {"Authorization": f"Bearer {cls.student_token}"}

        # Obtain prof token
        login_prof = cls.client.post("/api/auth/login", json={
            "email": cls.prof_email,
            "password": cls.prof_password
        })
        cls.prof_token = login_prof.json()["token"]
        cls.prof_headers = {"Authorization": f"Bearer {cls.prof_token}"}

    def test_01_get_me_returns_extended_fields(self):
        """1. GET /api/auth/me returns extended profile fields (department, institution, phone, preferences)."""
        response = self.client.get("/api/auth/me", headers=self.student_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        user = data.get("user")
        self.assertIn("id", user)
        self.assertIn("name", user)
        self.assertIn("email", user)
        self.assertIn("role", user)
        self.assertIn("department", user)
        self.assertIn("institution", user)
        self.assertIn("phone", user)
        self.assertIn("preferences", user)
        self.assertEqual(user["name"], "Original Student Name")

    def test_02_update_profile_success(self):
        """2. Profile update succeeds for authenticated user."""
        payload = {
            "name": "Alex Student Updated",
            "department": "Computer Science & Engineering",
            "institution": "State University",
            "phone": "+1 555-0199"
        }
        response = self.client.put("/api/auth/profile", json=payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        user = data.get("user")
        self.assertEqual(user["name"], "Alex Student Updated")
        self.assertEqual(user["department"], "Computer Science & Engineering")
        self.assertEqual(user["institution"], "State University")
        self.assertEqual(user["phone"], "+1 555-0199")

        # Verify reflected in subsequent GET /api/auth/me
        me_res = self.client.get("/api/auth/me", headers=self.student_headers)
        me_user = me_res.json()["user"]
        self.assertEqual(me_user["name"], "Alex Student Updated")
        self.assertEqual(me_user["department"], "Computer Science & Engineering")

    def test_03_empty_name_is_rejected(self):
        """3. Empty name is rejected with 400 Bad Request."""
        payload = {
            "name": "   ",
            "department": "CS",
            "institution": "College",
            "phone": "12345"
        }
        response = self.client.put("/api/auth/profile", json=payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Name is required", response.json().get("detail", ""))

    def test_04_unauthenticated_profile_update_rejected(self):
        """4. Unauthenticated profile update is rejected with 401."""
        payload = {
            "name": "Hacker Name",
            "department": "Security",
            "institution": "None",
            "phone": "0000"
        }
        response = self.client.put("/api/auth/profile", json=payload)
        self.assertEqual(response.status_code, 401)

    def test_05_password_change_success_with_correct_current(self):
        """5. Password change succeeds with correct current password."""
        payload = {
            "current_password": "studentpassword123",
            "new_password": "newsecurepassword456"
        }
        response = self.client.put("/api/auth/change-password", json=payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get("success"))

        # Verify user can log in with new password
        login_res = self.client.post("/api/auth/login", json={
            "email": self.student_email,
            "password": "newsecurepassword456"
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.json().get("success"))

        # Update student token for subsequent tests
        self.__class__.student_token = login_res.json()["token"]
        self.__class__.student_headers = {"Authorization": f"Bearer {self.__class__.student_token}"}

    def test_06_wrong_current_password_is_rejected(self):
        """6. Wrong current password is rejected with 400."""
        payload = {
            "current_password": "completely_wrong_pass",
            "new_password": "somevalidpassword789"
        }
        response = self.client.put("/api/auth/change-password", json=payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Current password is incorrect", response.json().get("detail", ""))

    def test_07_password_shorter_than_6_chars_is_rejected(self):
        """7. Password shorter than 6 characters is rejected with 400."""
        payload = {
            "current_password": "newsecurepassword456",
            "new_password": "123"
        }
        response = self.client.put("/api/auth/change-password", json=payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 6 characters", response.json().get("detail", ""))

    def test_08_new_password_cannot_equal_current_password(self):
        """8. New password cannot equal current password."""
        payload = {
            "current_password": "newsecurepassword456",
            "new_password": "newsecurepassword456"
        }
        response = self.client.put("/api/auth/change-password", json=payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("cannot be the same", response.json().get("detail", ""))


if __name__ == "__main__":
    unittest.main()
