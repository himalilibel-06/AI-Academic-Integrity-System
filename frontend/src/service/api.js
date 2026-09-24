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
 * Extract plain text from manuscript file (PDF, DOCX, TXT).
 * Foundation step: File -> Text (No AI/analysis performed).
 */
export async function extractManuscriptText(file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/api/manuscripts/extract-text", {
    method: "POST",
    body: formData,
  });
}

/**
 * Extract structured academic research fields from manuscript plain text.
 * Foundation step: Text -> Structured Research Information (No AI reasoning/validation).
 */
export async function extractResearchInfo({ text, file_name }) {
  return apiRequest("/api/manuscripts/extract-research-info", {
    method: "POST",
    body: JSON.stringify({ text, file_name }),
  });
}

/**
 * Retrieve papers from the local development literature corpus.
 */
export async function getLiteratureCorpus(search = "", limit = 50, offset = 0) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  const queryString = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/literature${queryString}`, {
    method: "GET",
  });
}

/**
 * Retrieve a single paper record by its unique paper_id.
 */
export async function getLiteraturePaper(paperId) {
  return apiRequest(`/api/literature/${encodeURIComponent(paperId)}`, {
    method: "GET",
  });
}

/**
 * Search local literature corpus using free-text or structured research_information.
 * Foundation step: Retrieval & Evidence Ranking (No contradiction or validation claims).
 */
export async function searchLiterature({ query, research_information, top_k = 10 }) {
  return apiRequest("/api/literature/search", {
    method: "POST",
    body: JSON.stringify({ query, research_information, top_k }),
  });
}

/**
 * Perform rule-based Research Gap Contradiction Analysis against local literature evidence.
 * Phase 6 Reasoning Layer: Relates claimed research gap to retrieved corpus evidence.
 */
export async function analyzeResearchGap({ research_information, top_k = 10 }) {
  return apiRequest("/api/gap-analysis/analyze", {
    method: "POST",
    body: JSON.stringify({ research_information, top_k }),
  });
}

/**
 * Perform 6-dimension Contribution Differentiation Analysis against local literature evidence.
 * Phase 7 Reasoning Layer: Compares proposed contribution across 6 dimensions.
 */
export async function analyzeContributionDifferentiation({ research_information, top_k = 10 }) {
  return apiRequest("/api/contribution-analysis/analyze", {
    method: "POST",
    body: JSON.stringify({ research_information, top_k }),
  });
}

/**
 * Retrieve or build the Research Knowledge Graph for a specific project.
 * Phase 8 Reasoning Layer: Graph-based concept representation.
 */
export async function getProjectKnowledgeGraph(projectId, topK = 5) {
  return apiRequest(`/api/knowledge-graph/${encodeURIComponent(projectId)}?top_k=${topK}`, {
    method: "GET",
  });
}

/**
 * Build Knowledge Graph from dynamic research information.
 */
export async function buildKnowledgeGraph({ projectId, researchInformation, topK = 5 }) {
  return apiRequest("/api/knowledge-graph/build", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      research_information: researchInformation,
      top_k: topK,
    }),
  });
}

/**
 * Execute AI graph search algorithm (BFS, DFS, Best-First Search).
 */
export async function searchKnowledgeGraph({
  startNode,
  goalNode,
  algorithm = "bfs",
  nodes = null,
  edges = null,
  projectId = null,
  researchInformation = null,
}) {
  return apiRequest("/api/knowledge-graph/search", {
    method: "POST",
    body: JSON.stringify({
      start_node: startNode,
      goal_node: goalNode,
      algorithm,
      nodes,
      edges,
      project_id: projectId,
      research_information: researchInformation,
    }),
  });
}

/**
 * Execute Rule-Based and Bayesian Evidence Reasoning over research evidence.
 * Phase 9 Reasoning Layer: production rules, forward chaining, backward chaining, Bayesian inference.
 */
export async function analyzeReasoning({
  projectId = null,
  researchInformation = null,
  gapAnalysis = null,
  contributionAnalysis = null,
  prior = 0.5,
  backwardChainingGoal = "GAP_SUPPORTED_BY_EVIDENCE",
  topK = 5,
} = {}) {
  return apiRequest("/api/reasoning/analyze", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      research_information: researchInformation,
      gap_analysis: gapAnalysis,
      contribution_analysis: contributionAnalysis,
      prior,
      backward_chaining_goal: backwardChainingGoal,
      top_k: topK,
    }),
  });
}

/**
 * Perform Evidence Coverage Audit on research claims against local literature corpus.
 * Phase 10A: Evaluates claim coverage (Supported, Partially Supported, Insufficient).
 */
export async function analyzeEvidenceCoverage({
  projectId = null,
  manuscriptId = null,
  claims = null,
  researchInformation = null,
  topK = 5,
} = {}) {
  return apiRequest("/api/evidence-coverage/analyze", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      manuscript_id: manuscriptId,
      claims,
      research_information: researchInformation,
      top_k: topK,
    }),
  });
}

/**
 * Compare two manuscript versions belonging to the same research project.
 * Phase 10A: Deterministic field-by-field diff, change summary, and revision guidance.
 */
export async function compareManuscriptRevisions({
  projectId = null,
  previousManuscriptId = null,
  newManuscriptId = null,
  previousProjectId = null,
  newProjectId = null,
  previousResearchInfo = null,
  newResearchInfo = null,
  previousVersionLabel = "Version 1",
  newVersionLabel = "Version 2",
} = {}) {
  return apiRequest("/api/revision-comparison/compare", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      previous_manuscript_id: previousManuscriptId,
      new_manuscript_id: newManuscriptId,
      previous_project_id: previousProjectId || projectId,
      new_project_id: newProjectId || projectId,
      previous_research_info: previousResearchInfo,
      new_research_info: newResearchInfo,
      previous_version_label: previousVersionLabel,
      new_version_label: newVersionLabel,
    }),
  });
}

/**
 * Generate explainable Submission Readiness Report.
 * Phase 10B: Aggregates existing gap, contribution, evidence, and revision analyses.
 */
export async function analyzeSubmissionReadiness({
  projectId = null,
  manuscriptId = null,
  previousManuscriptId = null,
  researchInformation = null,
  previousResearchInfo = null,
  claims = null,
  gapAnalysis = null,
  contributionAnalysis = null,
  evidenceCoverage = null,
  reasoningAnalysis = null,
  revisionComparison = null,
  topK = 5,
} = {}) {
  return apiRequest("/api/submission-readiness/analyze", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      manuscript_id: manuscriptId,
      previous_manuscript_id: previousManuscriptId,
      research_information: researchInformation,
      previous_research_info: previousResearchInfo,
      claims,
      gap_analysis: gapAnalysis,
      contribution_analysis: contributionAnalysis,
      evidence_coverage: evidenceCoverage,
      reasoning_analysis: reasoningAnalysis,
      revision_comparison: revisionComparison,
      top_k: topK,
    }),
  });
}









