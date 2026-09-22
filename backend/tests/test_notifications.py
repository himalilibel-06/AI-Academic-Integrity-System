import io
import json
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
from models.user import create_user, get_user_by_email, update_user_preferences
from models.course import create_course, enroll_student
from models.notification import (
    create_notification,
    get_user_notifications,
    get_unread_notification_count,
    mark_notification_as_read,
    mark_all_notifications_as_read,
)
from utils.auth import create_access_token


class TestNotifications(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_database()
        cls.client = TestClient(app)

        conn = get_connection()
        try:
            cursor = conn.cursor()

            # Create Users
            cls.prof_email = "prof_notif_f6@example.com"
            cls.prof_id = cls._get_or_create_user(conn, "Dr. Vikram Seth", cls.prof_email, "professor")
            cls.prof_token = create_access_token({
                "sub": str(cls.prof_id),
                "email": cls.prof_email,
                "role": "professor"
            })

            cls.student_a_email = "student_a_f6@example.com"
            cls.student_a_id = cls._get_or_create_user(conn, "Aarav Gupta", cls.student_a_email, "student")
            cls.student_a_token = create_access_token({
                "sub": str(cls.student_a_id),
                "email": cls.student_a_email,
                "role": "student"
            })

            cls.student_b_email = "student_b_f6@example.com"
            cls.student_b_id = cls._get_or_create_user(conn, "Diya Sharma", cls.student_b_email, "student")
            cls.student_b_token = create_access_token({
                "sub": str(cls.student_b_id),
                "email": cls.student_b_email,
                "role": "student"
            })

            # Create test course
            cursor.execute("SELECT id FROM courses WHERE code = 'CS606'")
            course_row = cursor.fetchone()
            if course_row:
                cls.course_id = course_row["id"]
                cursor.execute("UPDATE courses SET professor_id = ? WHERE id = ?", (cls.prof_id, cls.course_id))
            else:
                cls.course_id = create_course(
                    conn, "Information Retrieval", "CS606", "Search and text retrieval systems", cls.prof_id
                )

            # Ensure student_a is enrolled
            cursor.execute("SELECT 1 FROM course_enrollments WHERE course_id = ? AND student_id = ?",
                           (cls.course_id, cls.student_a_id))
            if not cursor.fetchone():
                enroll_student(conn, cls.course_id, cls.student_a_id)

            conn.commit()
        finally:
            conn.close()

    @classmethod
    def _get_or_create_user(cls, conn, name, email, role):
        user = get_user_by_email(conn, email)
        if user:
            return user["id"]
        return create_user(conn, name, email, "password123", role)

    def setUp(self):
        # Clean notifications and test submissions for test users before each test
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notifications WHERE user_id IN (?, ?, ?)",
                           (self.prof_id, self.student_a_id, self.student_b_id))
            cursor.execute("DELETE FROM submissions WHERE student_id IN (?, ?)",
                           (self.student_a_id, self.student_b_id))
            conn.commit()
        finally:
            conn.close()

    # 1. Unauthenticated GET /api/notifications -> 401
    def test_01_unauthenticated_get_notifications_returns_401(self):
        resp = self.client.get("/api/notifications")
        self.assertEqual(resp.status_code, 401)

    # 2. Authenticated user with no notifications -> empty list + unread_count 0
    def test_02_authenticated_user_with_no_notifications_returns_empty_and_zero_unread(self):
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["notifications"], [])
        self.assertEqual(data["unread_count"], 0)

    # 3. Notification creation works
    def test_03_notification_creation_works(self):
        conn = get_connection()
        try:
            notif_id = create_notification(
                conn,
                user_id=self.student_a_id,
                title="System Update",
                message="Welcome to the academic integrity portal.",
                notification_type="system",
                link="/student/dashboard"
            )
            self.assertIsInstance(notif_id, int)
            self.assertGreater(notif_id, 0)

            notifs = get_user_notifications(conn, self.student_a_id)
            self.assertEqual(len(notifs), 1)
            self.assertEqual(notifs[0]["title"], "System Update")
            self.assertEqual(notifs[0]["is_read"], False)
            self.assertEqual(notifs[0]["link"], "/student/dashboard")
        finally:
            conn.close()

    # 4. Student submission creates professor notification
    def test_04_student_submission_creates_professor_notification(self):
        # Enable submission updates preference for professor
        conn = get_connection()
        try:
            update_user_preferences(conn, self.prof_id, json.dumps({
                "notifications": {"submissionUpdates": True, "highSimilarity": True}
            }))
        finally:
            conn.close()

        file_content = b"Photosynthesis in green plants converts light energy into chemical energy stored in carbohydrate molecules such as glucose."
        files = {"file": ("submission_notif_test.txt", io.BytesIO(file_content), "text/plain")}
        data = {"title": "Botany Assignment", "course_id": str(self.course_id)}
        headers = {"Authorization": f"Bearer {self.student_a_token}"}

        resp = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(resp.status_code, 201)

        # Verify professor received notification
        prof_headers = {"Authorization": f"Bearer {self.prof_token}"}
        notif_resp = self.client.get("/api/notifications", headers=prof_headers)
        self.assertEqual(notif_resp.status_code, 200)
        notif_data = notif_resp.json()
        self.assertGreaterEqual(notif_data["unread_count"], 1)

        titles = [n["title"] for n in notif_data["notifications"]]
        self.assertTrue(any("Submission" in t for t in titles))

    # 5. High similarity creates high_similarity notification when preference allows
    def test_05_high_similarity_creates_high_similarity_notification_when_preference_allows(self):
        # Set professor preference with highSimilarity enabled
        conn = get_connection()
        try:
            update_user_preferences(conn, self.prof_id, json.dumps({
                "notifications": {"highSimilarity": True, "submissionUpdates": True}
            }))
        finally:
            conn.close()

        # Text matching reference corpus (high similarity)
        file_content = b"Artificial intelligence is a field of computer science that focuses on creating intelligent systems."
        files = {"file": ("high_sim_test.txt", io.BytesIO(file_content), "text/plain")}
        data = {"title": "AI High Sim Essay", "course_id": str(self.course_id)}
        headers = {"Authorization": f"Bearer {self.student_a_token}"}

        resp = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(resp.status_code, 201)

        prof_headers = {"Authorization": f"Bearer {self.prof_token}"}
        notif_resp = self.client.get("/api/notifications", headers=prof_headers)
        self.assertEqual(notif_resp.status_code, 200)
        notifs = notif_resp.json()["notifications"]

        high_sim_notifs = [n for n in notifs if n["type"] == "high_similarity"]
        self.assertGreaterEqual(len(high_sim_notifs), 1)
        self.assertEqual(high_sim_notifs[0]["title"], "High Similarity Alert")
        self.assertIn("Aarav Gupta", high_sim_notifs[0]["message"])
        self.assertTrue(high_sim_notifs[0]["link"].startswith("/professor/reports/"))

    # 6. High similarity does not create high_similarity alert when preference disables it
    def test_06_high_similarity_does_not_create_that_alert_when_preference_disables_it(self):
        # Disable highSimilarity preference for professor
        conn = get_connection()
        try:
            update_user_preferences(conn, self.prof_id, json.dumps({
                "notifications": {"highSimilarity": False, "reviewRequired": False, "submissionUpdates": True}
            }))
        finally:
            conn.close()

        file_content = b"Artificial intelligence is a field of computer science that focuses on creating intelligent systems."
        files = {"file": ("high_sim_disabled.txt", io.BytesIO(file_content), "text/plain")}
        data = {"title": "AI Essay No Alert", "course_id": str(self.course_id)}
        headers = {"Authorization": f"Bearer {self.student_a_token}"}

        resp = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(resp.status_code, 201)

        prof_headers = {"Authorization": f"Bearer {self.prof_token}"}
        notif_resp = self.client.get("/api/notifications", headers=prof_headers)
        self.assertEqual(notif_resp.status_code, 200)
        notifs = notif_resp.json()["notifications"]

        # Must NOT contain high_similarity type
        high_sim_notifs = [n for n in notifs if n["type"] == "high_similarity"]
        self.assertEqual(len(high_sim_notifs), 0)

    # 7. Course enrollment creates professor notification
    def test_07_course_enrollment_creates_professor_notification(self):
        # Create a new course where student_b is NOT yet enrolled
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM courses WHERE code = 'CS607'")
            row = cursor.fetchone()
            if row:
                c_new_id = row["id"]
                cursor.execute("UPDATE courses SET professor_id = ? WHERE id = ?", (self.prof_id, c_new_id))
                cursor.execute("DELETE FROM course_enrollments WHERE course_id = ?", (c_new_id,))
                conn.commit()
            else:
                c_new_id = create_course(conn, "Natural Language Processing", "CS607", "NLP principles", self.prof_id)
        finally:
            conn.close()

        # Student B enrolls in CS607
        b_headers = {"Authorization": f"Bearer {self.student_b_token}"}
        enroll_resp = self.client.post(f"/api/courses/{c_new_id}/enroll", headers=b_headers)
        self.assertEqual(enroll_resp.status_code, 201)

        # Verify professor received course_enrollment notification
        prof_headers = {"Authorization": f"Bearer {self.prof_token}"}
        notif_resp = self.client.get("/api/notifications", headers=prof_headers)
        self.assertEqual(notif_resp.status_code, 200)
        notifs = notif_resp.json()["notifications"]

        enroll_notifs = [n for n in notifs if n["type"] == "course_enrollment"]
        self.assertGreaterEqual(len(enroll_notifs), 1)
        self.assertEqual(enroll_notifs[0]["title"], "New Course Enrollment")
        self.assertIn("Diya Sharma", enroll_notifs[0]["message"])
        self.assertIn("CS607", enroll_notifs[0]["message"])

    # 8. Professor review creates student notification
    def test_08_professor_review_creates_student_notification(self):
        # Submit an assignment by Student A
        file_content = b"Original research methodology text for review event test."
        files = {"file": ("review_notif_test.txt", io.BytesIO(file_content), "text/plain")}
        data = {"title": "Review Target Essay", "course_id": str(self.course_id)}
        headers = {"Authorization": f"Bearer {self.student_a_token}"}

        sub_resp = self.client.post("/api/submissions", data=data, files=files, headers=headers)
        self.assertEqual(sub_resp.status_code, 201)
        report_id = sub_resp.json()["report_id"]

        # Ensure student A has reviewReminders preference enabled (or default)
        conn = get_connection()
        try:
            update_user_preferences(conn, self.student_a_id, json.dumps({
                "notifications": {"reviewReminders": True, "reportAvailable": True}
            }))
        finally:
            conn.close()

        # Professor reviews the report
        prof_headers = {"Authorization": f"Bearer {self.prof_token}"}
        review_payload = {
            "review_status": "approved",
            "professor_feedback": "Excellent original research and strong citations."
        }
        rev_resp = self.client.put(f"/api/reports/{report_id}/review", json=review_payload, headers=prof_headers)
        self.assertEqual(rev_resp.status_code, 200)

        # Student A checks notifications
        student_headers = {"Authorization": f"Bearer {self.student_a_token}"}
        notif_resp = self.client.get("/api/notifications", headers=student_headers)
        self.assertEqual(notif_resp.status_code, 200)
        notifs = notif_resp.json()["notifications"]

        review_notifs = [n for n in notifs if n["type"] == "review_decision"]
        self.assertGreaterEqual(len(review_notifs), 1)
        self.assertIn("Approved", review_notifs[0]["message"])
        self.assertIn("Dr. Vikram Seth", review_notifs[0]["message"])
        self.assertIn("Instructor feedback is available", review_notifs[0]["message"])
        self.assertEqual(review_notifs[0]["link"], f"/student/reports/{report_id}")

    # 9. Student A cannot retrieve Student B's notifications
    def test_09_student_a_cannot_retrieve_student_b_notifications(self):
        # Create a private notification for Student B
        conn = get_connection()
        try:
            create_notification(
                conn,
                user_id=self.student_b_id,
                title="Confidential Diya Alert",
                message="Private feedback note for Diya only.",
                notification_type="review_decision",
                link="/student/reports/999"
            )
        finally:
            conn.close()

        # Student A fetches their own notifications
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(resp.status_code, 200)
        messages = [n["message"] for n in resp.json()["notifications"]]
        self.assertNotIn("Private feedback note for Diya only.", messages)

    # 10. Student A cannot mark Student B's notification as read
    def test_10_student_a_cannot_mark_student_b_notification_as_read(self):
        conn = get_connection()
        try:
            notif_b_id = create_notification(
                conn,
                user_id=self.student_b_id,
                title="Student B Alert",
                message="Only student B may update this.",
                notification_type="system"
            )
        finally:
            conn.close()

        # Student A attempts to mark Student B's notification
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.put(f"/api/notifications/{notif_b_id}/read", headers=headers)
        self.assertEqual(resp.status_code, 403)

    # 11. Mark single notification as read works
    def test_11_mark_single_notification_as_read_works(self):
        conn = get_connection()
        try:
            notif_id = create_notification(
                conn,
                user_id=self.student_a_id,
                title="Single Read Test",
                message="Testing mark single as read.",
                notification_type="system"
            )
        finally:
            conn.close()

        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.put(f"/api/notifications/{notif_id}/read", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])

        # Verify DB state
        get_resp = self.client.get("/api/notifications", headers=headers)
        notifs = get_resp.json()["notifications"]
        target = next((n for n in notifs if n["id"] == notif_id), None)
        self.assertIsNotNone(target)
        self.assertTrue(target["is_read"])

    # 12. Unread count decreases correctly
    def test_12_unread_count_decreases_correctly(self):
        conn = get_connection()
        try:
            n1 = create_notification(conn, self.student_a_id, "N1", "M1", "system")
            n2 = create_notification(conn, self.student_a_id, "N2", "M2", "system")
        finally:
            conn.close()

        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        before_resp = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(before_resp.json()["unread_count"], 2)

        # Mark n1 read
        self.client.put(f"/api/notifications/{n1}/read", headers=headers)

        after_resp = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(after_resp.json()["unread_count"], 1)

    # 13. Mark all as read works
    def test_13_mark_all_as_read_works(self):
        conn = get_connection()
        try:
            create_notification(conn, self.student_a_id, "N1", "M1", "system")
            create_notification(conn, self.student_a_id, "N2", "M2", "system")
            create_notification(conn, self.student_a_id, "N3", "M3", "system")
        finally:
            conn.close()

        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.put("/api/notifications/read-all", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["updated_count"], 3)
        self.assertEqual(resp.json()["unread_count"], 0)

    # 14. Unread count becomes zero after mark-all
    def test_14_unread_count_becomes_zero_after_mark_all(self):
        conn = get_connection()
        try:
            create_notification(conn, self.student_a_id, "N1", "M1", "system")
        finally:
            conn.close()

        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        self.client.put("/api/notifications/read-all", headers=headers)

        get_resp = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(get_resp.json()["unread_count"], 0)
        self.assertTrue(all(n["is_read"] for n in get_resp.json()["notifications"]))

    # 15. Notification ownership is enforced
    def test_15_notification_ownership_is_enforced(self):
        # Non-existent notification returns 404
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.put("/api/notifications/999999/read", headers=headers)
        self.assertEqual(resp.status_code, 404)

    # 16. Notification links contain only valid internal routes
    def test_16_notification_links_contain_only_valid_internal_routes(self):
        conn = get_connection()
        try:
            create_notification(
                conn,
                user_id=self.student_a_id,
                title="Route Test",
                message="Testing link format.",
                notification_type="review_decision",
                link="/student/reports/42"
            )
        finally:
            conn.close()

        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        resp = self.client.get("/api/notifications", headers=headers)
        notif = resp.json()["notifications"][0]
        self.assertTrue(notif["link"].startswith("/"))
        self.assertNotIn("http://", notif["link"])
        self.assertNotIn("https://", notif["link"])

    # 17. Duplicate or invalid actions do not create spurious notifications
    def test_17_duplicate_enrollment_does_not_create_notification(self):
        # Student A is already enrolled in CS606. Attempting duplicate enrollment should fail (409)
        # and NOT create an extra notification for the professor
        headers = {"Authorization": f"Bearer {self.student_a_token}"}
        dup_resp = self.client.post(f"/api/courses/{self.course_id}/enroll", headers=headers)
        self.assertEqual(dup_resp.status_code, 409)

        # Verify professor has no notifications created
        prof_headers = {"Authorization": f"Bearer {self.prof_token}"}
        notif_resp = self.client.get("/api/notifications", headers=prof_headers)
        self.assertEqual(notif_resp.json()["unread_count"], 0)


if __name__ == "__main__":
    unittest.main()
