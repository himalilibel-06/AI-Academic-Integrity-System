const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Generic API request wrapper that attaches JWT Bearer header if token exists.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("auth_token");
  
  const headers = {
    ...options.headers,
  };

  // Only default to application/json when body is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.detail || data.message || "An unexpected error occurred.";
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Register a new user (student or professor).
 */
export async function registerUser({ name, email, password, role }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

/**
 * Log in a user and retrieve JWT token + user details.
 */
export async function loginUser({ email, password }) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Get active authenticated user details.
 */
export async function getCurrentUser() {
  return apiRequest("/api/auth/me", {
    method: "GET",
  });
}

/**
 * Submit an assignment document for plagiarism similarity analysis.
 */
export async function submitAssignment(formData) {
  return apiRequest("/api/submissions", {
    method: "POST",
    body: formData,
  });
}

/**
 * Get a specific plagiarism report by ID.
 */
export async function getPlagiarismReport(reportId) {
  return apiRequest(`/api/reports/${reportId}`, {
    method: "GET",
  });
}

/**
 * Get the latest plagiarism report for the logged-in student.
 */
export async function getLatestPlagiarismReport() {
  return apiRequest("/api/reports/latest", {
    method: "GET",
  });
}

/**
 * Get all available courses.
 */
export async function getCourses() {
  return apiRequest("/api/courses", {
    method: "GET",
  });
}

/**
 * Get student dashboard summary metrics, profile, and recent submissions.
 */
export async function getStudentDashboard() {
  return apiRequest("/api/student/dashboard", {
    method: "GET",
  });
}

/**
 * Get all past submissions for the logged-in student.
 */
export async function getStudentSubmissions() {
  return apiRequest("/api/student/submissions", {
    method: "GET",
  });
}

/**
 * Get professor dashboard summary metrics, profile, course overview, and recent submissions.
 */
export async function getProfessorDashboard() {
  return apiRequest("/api/professor/dashboard", {
    method: "GET",
  });
}

/**
 * Get all submissions for courses taught by the logged-in professor.
 */
export async function getProfessorSubmissions(courseId = null) {
  const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
  return apiRequest(`/api/professor/submissions${query}`, {
    method: "GET",
  });
}

/**
 * Get all courses taught by the logged-in professor with live stats.
 */
export async function getProfessorCourses() {
  return apiRequest("/api/professor/courses", {
    method: "GET",
  });
}

/**
 * Create a new academic course (professor only).
 */
export async function createCourse({ name, code, description }) {
  return apiRequest("/api/courses", {
    method: "POST",
    body: JSON.stringify({ name, code, description }),
  });
}

/**
 * Submit professor review decision and feedback for a plagiarism report.
 */
export async function updateReportReview(reportId, { review_status, professor_feedback }) {
  return apiRequest(`/api/reports/${reportId}/review`, {
    method: "PUT",
    body: JSON.stringify({ review_status, professor_feedback }),
  });
}

/**
 * Update authenticated user's profile details.
 */
export async function updateUserProfile({ name, department, institution, phone }) {
  return apiRequest("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ name, department, institution, phone }),
  });
}

/**
 * Change authenticated user's password.
 */
export async function changePassword({ current_password, new_password }) {
  return apiRequest("/api/auth/change-password", {
    method: "PUT",
    body: JSON.stringify({ current_password, new_password }),
  });
}

/**
 * Retrieve user preferences.
 */
export async function getUserPreferences() {
  return apiRequest("/api/auth/preferences", {
    method: "GET",
  });
}

/**
 * Save user preferences.
 */
export async function saveUserPreferences(preferences) {
  return apiRequest("/api/auth/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}

/**
 * Download original uploaded submission file by submission ID.
 */
export async function downloadSubmissionFile(submissionId, preferredFilename = null) {
  const token = localStorage.getItem("auth_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/download`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Failed to download submission file.";
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  let filename = preferredFilename;
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }
  if (!filename) {
    filename = `submission_${submissionId}.txt`;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

/**
 * Export official academic integrity report in HTML or JSON format.
 */
export async function exportPlagiarismReport(reportId, format = "html") {
  const token = localStorage.getItem("auth_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/export?format=${format}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Failed to export report.";
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (format === "json") {
    return await response.json();
  }

  let filename = `Academic_Integrity_Report_${reportId}.html`;
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

/**
 * Get all courses the authenticated student is currently enrolled in.
 */
export async function getStudentEnrolledCourses() {
  return apiRequest("/api/student/courses", {
    method: "GET",
  });
}

/**
 * Enroll the authenticated student in a course by ID.
 */
export async function enrollInCourse(courseId) {
  return apiRequest(`/api/courses/${courseId}/enroll`, {
    method: "POST",
  });
}

/**
 * Drop / unenroll the authenticated student from a course by ID.
 */
export async function dropCourse(courseId) {
  return apiRequest(`/api/courses/${courseId}/enroll`, {
    method: "DELETE",
  });
}

/**
 * Retrieve the student roster and integrity statistics for a course (professor only).
 */
export async function getCourseRoster(courseId) {
  return apiRequest(`/api/courses/${courseId}/roster`, {
    method: "GET",
  });
}

/**
 * Remove an enrolled student from a course roster (professor only).
 */
export async function removeStudentFromRoster(courseId, studentId) {
  return apiRequest(`/api/courses/${courseId}/roster/${studentId}`, {
    method: "DELETE",
  });
}

/**
 * Retrieve user notifications and unread count.
 */
export async function getNotifications(unreadOnly = false) {
  const query = unreadOnly ? "?unread_only=true" : "";
  return apiRequest(`/api/notifications${query}`, {
    method: "GET",
  });
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId) {
  return apiRequest(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
  });
}

/**
 * Mark all notifications for the authenticated user as read.
 */
export async function markAllNotificationsRead() {
  return apiRequest("/api/notifications/read-all", {
    method: "PUT",
  });
}


