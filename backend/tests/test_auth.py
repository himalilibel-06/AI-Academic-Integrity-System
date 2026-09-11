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


class TestAuthEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)

    def test_01_health_and_root(self):
        """Test health check and root endpoints."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())

    def test_02_register_user_success(self):
        """Test registering a new student user."""
        test_email = "teststudent_phase1@example.com"
        
        # Clean up existing test user if present
        conn = get_connection()
        conn.cursor().execute("DELETE FROM users WHERE email = ?", (test_email,))
        conn.commit()
        conn.close()

        payload = {
            "name": "Test Student Phase 1",
            "email": test_email,
            "password": "securepassword123",
            "role": "student"
        }

        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIn("user_id", data)

    def test_03_register_duplicate_email(self):
        """Test registering with an existing email returns 400."""
        payload = {
            "name": "Duplicate User",
            "email": "teststudent_phase1@example.com",
            "password": "anotherpassword",
            "role": "student"
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Email already registered", response.json().get("detail", ""))

    def test_04_login_success(self):
        """Test logging in with valid credentials."""
        payload = {
            "email": "teststudent_phase1@example.com",
            "password": "securepassword123"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["email"], "teststudent_phase1@example.com")
        self.assertEqual(data["user"]["role"], "student")

    def test_05_login_invalid_password(self):
        """Test logging in with incorrect password returns 401."""
        payload = {
            "email": "teststudent_phase1@example.com",
            "password": "wrongpassword"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid email or password", response.json().get("detail", ""))

    def test_06_login_nonexistent_user(self):
        """Test logging in with non-existent email returns 401."""
        payload = {
            "email": "nobody_phase1@example.com",
            "password": "somepassword"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid email or password", response.json().get("detail", ""))

    def test_07_analysis_route_registered(self):
        """Test that /api/v1/analyze route is registered and accepts requests."""
        # Sending an empty request should return 422 (validation error for missing file) not 404
        response = self.client.post("/api/v1/analyze")
        self.assertNotEqual(response.status_code, 404)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
