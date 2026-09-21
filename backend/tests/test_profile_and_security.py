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

        # Create dedicated test users
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE email IN ('profile_student@example.com', 'profile_prof@example.com', 'pref_user_b@example.com')")
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

        cls.user_b_email = "pref_user_b@example.com"
        cls.user_b_password = "userbpassword123"
        cls.user_b_id = create_user(
            conn,
            name="User B For Isolation",
            email=cls.user_b_email,
            password=cls.user_b_password,
            role="student"
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

        # Obtain user B token
        login_b = cls.client.post("/api/auth/login", json={
            "email": cls.user_b_email,
            "password": cls.user_b_password
        })
        cls.user_b_token = login_b.json()["token"]
        cls.user_b_headers = {"Authorization": f"Bearer {cls.user_b_token}"}

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

    def test_09_get_default_preferences(self):
        """9. GET /api/auth/preferences returns application default preferences when not yet set."""
        response = self.client.get("/api/auth/preferences", headers=self.user_b_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        prefs = data.get("preferences")
        self.assertEqual(prefs.get("language"), "English")
        self.assertEqual(prefs.get("timeZone"), "India Standard Time (IST)")
        self.assertEqual(prefs.get("dateFormat"), "DD/MM/YYYY")
        self.assertIn("notifications", prefs)
        self.assertIn("privacy", prefs)
        self.assertTrue(prefs["notifications"]["submissionUpdates"])

    def test_10_update_preferences_success(self):
        """10. PUT /api/auth/preferences successfully updates and persists user settings."""
        update_payload = {
            "language": "Tamil",
            "timeZone": "UTC",
            "dateFormat": "YYYY-MM-DD",
            "notifications": {
                "systemAnnouncements": True,
                "reviewRequired": False
            },
            "privacy": {
                "profileVisibility": "Private",
                "submissionHistory": False
            }
        }
        response = self.client.put("/api/auth/preferences", json=update_payload, headers=self.student_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        saved = data.get("preferences")
        self.assertEqual(saved["language"], "Tamil")
        self.assertEqual(saved["timeZone"], "UTC")
        self.assertEqual(saved["dateFormat"], "YYYY-MM-DD")
        self.assertTrue(saved["notifications"]["systemAnnouncements"])
        self.assertFalse(saved["notifications"]["reviewRequired"])
        self.assertEqual(saved["privacy"]["profileVisibility"], "Private")
        self.assertFalse(saved["privacy"]["submissionHistory"])

        # Reload via GET /api/auth/preferences and confirm persistence
        get_res = self.client.get("/api/auth/preferences", headers=self.student_headers)
        self.assertEqual(get_res.status_code, 200)
        reloaded = get_res.json().get("preferences")
        self.assertEqual(reloaded["language"], "Tamil")
        self.assertEqual(reloaded["dateFormat"], "YYYY-MM-DD")
        self.assertTrue(reloaded["notifications"]["systemAnnouncements"])

    def test_11_unauthenticated_preferences_rejected(self):
        """11. Preferences endpoints reject unauthenticated requests with 401."""
        get_res = self.client.get("/api/auth/preferences")
        self.assertEqual(get_res.status_code, 401)

        put_res = self.client.put("/api/auth/preferences", json={"language": "Hindi"})
        self.assertEqual(put_res.status_code, 401)

    def test_12_preferences_isolation(self):
        """12. Preferences changes made by User A do not affect User B."""
        # User B's preferences should still have default language "English"
        b_res = self.client.get("/api/auth/preferences", headers=self.user_b_headers)
        self.assertEqual(b_res.status_code, 200)
        b_prefs = b_res.json()["preferences"]
        self.assertEqual(b_prefs["language"], "English")

        # Student's preferences should still be "Tamil"
        a_res = self.client.get("/api/auth/preferences", headers=self.student_headers)
        self.assertEqual(a_res.status_code, 200)
        a_prefs = a_res.json()["preferences"]
        self.assertEqual(a_prefs["language"], "Tamil")

    def test_13_partial_preferences_update_merges_without_erasing(self):
        """13. Partial preference updates merge cleanly without clearing other settings."""
        partial_payload = {
            "language": "Spanish"
        }
        res = self.client.put("/api/auth/preferences", json=partial_payload, headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        prefs = res.json()["preferences"]
        self.assertEqual(prefs["language"], "Spanish")
        # Timezone and date format from previous test should remain intact
        self.assertEqual(prefs["timeZone"], "UTC")
        self.assertEqual(prefs["dateFormat"], "YYYY-MM-DD")
        # Notifications should still have previous values
        self.assertTrue(prefs["notifications"]["systemAnnouncements"])


if __name__ == "__main__":
    unittest.main()
