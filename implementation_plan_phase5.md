# Implementation Plan — Phase 5: Student Workflow & Dashboard APIs

## 1. Current-State Findings

### Backend Architecture
- **Framework & Entry Point**: FastAPI application initialized in `backend/main.py` with CORS middleware configured for `http://localhost:5173` and `http://127.0.0.1:5173`.
- **Database**: SQLite database at `backend/academic_integrity.db` managed by `backend/database/database.py` with foreign keys enabled (`PRAGMA foreign_keys = ON;`).
- **Existing Routers**:
  - `routes/auth.py` (`/api/auth`): `register`, `login`, `me`.
  - `routes/submissions.py` (`/api/submissions`): `POST` document upload, text extraction, preprocessing, plagiarism scoring, persistence.
  - `routes/reports.py` (`/api/reports`): `GET /latest`, `GET /{report_id}`.
  - `routes/courses.py` (`/api/courses`): `GET` course listing.
  - `routes/analysis.py` (`/api/v1`): legacy unauthenticated analyze endpoint.
- **Authentication**: JWT authentication in `backend/utils/auth.py` with `get_current_user_payload` dependency returning `{"sub": user_id, "email": email, "role": role}`.

### Frontend Architecture
- **Framework**: React with Vite and React Router (`frontend/src/App.jsx`).
- **Authentication State**: `AuthContext.jsx` manages `user`, `token`, `login`, `register`, `logout`, `isAuthenticated`.
- **Central API Client**: `frontend/src/service/api.js` provides `apiRequest` wrapper attaching JWT Bearer token and supports `FormData`.
- **Student Pages**:
  - `StudentDashboard.jsx`: Displays hardcoded mock stats (`total: 12`, `completed: 9`, `under review: 2`, `reports: 9`) and a hardcoded list of 5 mock submissions.
  - `MySubmissions.jsx`: Displays hardcoded mock array of 6 submissions, hardcoded search/filters, and links to reports using submission ID.
  - `UploadSubmission.jsx`: Integrated in Phase 4; uploads documents using `submitAssignment` and redirects to `/student/reports/:id`.
  - `PlagiarismReport.jsx`: Integrated in Phase 4; dynamically loads reports by ID or latest report.

---

## 2. What Is Already Working
1. **JWT Authentication & Authorization**: Students can register, log in, persist session token, and validate identity via `/api/auth/me`.
2. **Document Upload & Analysis Pipeline (Phase 4)**:
   - Students upload `.pdf`, `.docx`, `.txt` files.
   - Backend extracts text, cleans/preprocesses it, runs TF-IDF cosine similarity against reference documents.
   - Creates permanent SQLite records in `submissions` and `plagiarism_reports`.
   - Saves file to disk safely under `backend/uploads/`.
   - Redirects student to `/student/reports/:id`.
3. **Plagiarism Report Retrieval**: `/api/reports/{report_id}` and `/api/reports/latest` return live reports with student ownership enforcement.
4. **Courses Listing**: `/api/courses` returns active courses and seeds initial defaults if empty.
5. **Automated Test Suite**: 25/25 passing backend tests covering auth, DB schema, submission pipeline, and security checks.

---

## 3. What Is Missing
1. **Student Dashboard API (`GET /api/student/dashboard`)**:
   - No backend endpoint currently aggregates student statistics (total submissions, completed count, under review count, available reports count, average similarity score) or returns the student's recent submissions.
2. **Student Submissions API (`GET /api/student/submissions`)**:
   - No endpoint currently returns all historical submissions of a student joined with their course details, submission date, status, plagiarism similarity score, risk level, and associated report ID.
3. **Frontend Dashboard Integration (`StudentDashboard.jsx`)**:
   - `StudentDashboard.jsx` relies entirely on static constants (`student`, `summaryStats`, `recentSubmissions`).
   - Does not fetch live metrics or submissions from the backend.
   - Missing loading, empty, and error states.
   - Sidebar logout is not connected to `useAuth().logout`.
4. **Frontend Submissions Integration (`MySubmissions.jsx`)**:
   - `MySubmissions.jsx` displays a static mock array of 6 hardcoded submissions.
   - Summary cards at the top calculate numbers from static mock data.
   - Filter dropdowns use hardcoded course names.
   - Missing live API connection, loading state, empty state, and error handling.
   - Sidebar logout is not connected to `useAuth().logout`.
5. **Flexible Report ID Lookup (`GET /api/reports/{id}`)**:
   - Currently looks up reports only by `plagiarism_reports.id`. If a frontend link passes `submission_id`, the endpoint returns 404. Supporting lookup by either `report_id` or `submission_id` ensures robust navigation from all pages.

---

## 4. Backend Changes Required

### 1. New Route Module: `backend/routes/student.py`
Create dedicated student router with prefix `/api/student`:
- **`GET /api/student/dashboard`**:
  - Enforce JWT authentication via `Depends(get_current_user_payload)`.
  - Enforce `payload.get("role") == "student"` (return HTTP 403 Forbidden for professors).
  - Extract student ID from `payload.get("sub")`.
  - Fetch student profile details (name, email, initials).
  - Compute statistics from database:
    - `total_submissions`: Count of student's submissions.
    - `completed_submissions`: Count where status is `completed`.
    - `under_review`: Count where submission is under review or report risk level is `review_required`.
    - `reports_available`: Count of generated plagiarism reports for this student.
    - `average_similarity`: Average similarity percentage across student's reports (rounded to 1 decimal place; `0.0` if no reports).
  - Fetch recent submissions (top 5 by `submitted_at DESC`):
    - `id`, `title`, `filename`, `course_name`, `course_code`, `status`, `submitted_at`, `similarity_score`, `risk_level`, `report_id`.
  - Return structured JSON response.

- **`GET /api/student/submissions`**:
  - Enforce JWT authentication via `Depends(get_current_user_payload)`.
  - Enforce `payload.get("role") == "student"` (return HTTP 403 Forbidden for professors).
  - Extract student ID from `payload.get("sub")`.
  - Fetch all submissions for the student ordered by `submitted_at DESC` joined with courses and plagiarism reports.
  - Return list of submissions with all display metadata.

### 2. Update Model Helpers in `backend/models/submission.py`
- Add `get_student_dashboard_stats(connection, student_id)`:
  - Runs aggregated counts for total, completed, pending/under-review, reports count, and average similarity.
- Add `get_student_submissions_with_reports(connection, student_id, limit=None)`:
  - Queries submissions joined with `courses` and `plagiarism_reports` to return submission details alongside report ID, similarity score, risk level, and review status.

### 3. Update Report Model in `backend/models/report.py`
- Add `get_report_by_id_or_submission_id(connection, identifier)`:
  - Queries `plagiarism_reports` where `id = identifier OR submission_id = identifier`.

### 4. Update Report Route in `backend/routes/reports.py`
- Update `GET /api/reports/{report_id}` to use `get_report_by_id_or_submission_id`, enabling navigation whether the caller passes a report ID or a submission ID.

### 5. Register Student Router in `backend/main.py`
- Import `router as student_router` from `routes.student`.
- Mount `app.include_router(student_router)`.

---

## 5. Frontend Changes Required

### 1. Update `frontend/src/service/api.js`
Add helper functions wrapping the new endpoints:
```javascript
export async function getStudentDashboard() {
  return apiRequest("/api/student/dashboard", { method: "GET" });
}

export async function getStudentSubmissions() {
  return apiRequest("/api/student/submissions", { method: "GET" });
}
```

### 2. Update `frontend/src/pages/StudentDashboard.jsx`
- Replace mock constants with live state (`dashboardData`, `loading`, `error`).
- Use `useEffect` to call `getStudentDashboard()`.
- Display real user profile info (name, email, initials).
- Render live summary cards:
  - Total Submissions
  - Completed Submissions
  - Under Review
  - Reports Available
- Render live `Recent Submissions` table and mobile cards:
  - Title, Course code & name, Formatted date, Status badge, Similarity score badge.
  - "View Report" button linking to `/student/reports/${item.report_id || item.id}`.
- Provide clean empty state when student has no submissions yet ("No submissions yet" with "Upload Assignment" button).
- Add loading indicator and error alert with retry button.
- Wire up sidebar logout button to `useAuth().logout`.

### 3. Update `frontend/src/pages/MySubmissions.jsx`
- Replace mock `submissions` array with live state (`submissions`, `loading`, `error`).
- Use `useEffect` to call `getStudentSubmissions()`.
- Calculate summary stats dynamically from live array (Total, Completed, Processing, Review Required).
- Dynamically populate the Course filter dropdown with actual courses present in the student's submissions.
- Implement client-side filtering for Search query, Status filter, and Course filter.
- In the table and card view:
  - Display actual assignment title, course, formatted date, status badge, similarity score.
  - Link "View Report" to `/student/reports/${submission.report_id || submission.id}`.
- Provide clean empty states:
  - When no submissions exist in account ("No submissions yet" with link to Upload).
  - When search/filter returns no matches ("No submissions match your filters").
- Add loading spinner and error banner with retry option.
- Wire up sidebar logout button to `useAuth().logout`.

---

## 6. Database Changes
**No database schema alterations are required.**
- The existing SQLite tables (`users`, `courses`, `course_enrollments`, `submissions`, `plagiarism_reports`) established in Phase 2 and utilized in Phase 4 contain all required fields.
- Submissions store `student_id`, `course_id`, `title`, `filename`, `status`, `submitted_at`.
- Plagiarism reports store `submission_id`, `overall_similarity_score`, `risk_level`, `review_status`, `matches`, `created_at`.
- All queries will use standard SQL `JOIN`s with existing indexed foreign keys.

---

## 7. Authentication & Security Considerations
- **Strict JWT Verification**: Every student endpoint (`/api/student/dashboard`, `/api/student/submissions`) must execute the `get_current_user_payload` dependency.
- **Role Validation**: If `payload.get("role") != "student"`, return HTTP 403 Forbidden. Professors cannot call student endpoints.
- **Identity Isolation**: Student ID is extracted strictly from the validated JWT token (`payload.get("sub")`). The client cannot specify or override the student ID via query params or request body.
- **Data Confidentiality**: SQL queries explicitly filter by `WHERE s.student_id = ?`. Student A can never view Student B's submissions, dashboard metrics, or reports.

---

## 8. API Endpoint Specifications

### `GET /api/student/dashboard`
- **Auth**: Bearer JWT (Role: student)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "student": {
      "id": 1,
      "name": "Alex Student",
      "email": "student@example.com",
      "initials": "AS"
    },
    "stats": {
      "total_submissions": 4,
      "completed": 3,
      "under_review": 1,
      "reports_available": 3,
      "average_similarity": 14.2
    },
    "recent_submissions": [
      {
        "id": 10,
        "title": "AI Ethics Essay",
        "filename": "ai_ethics.pdf",
        "course": "Artificial Intelligence",
        "course_code": "CS402",
        "submitted_at": "2026-09-12 10:30:00",
        "date": "Sep 12, 2026",
        "status": "Completed",
        "similarity": 12.5,
        "risk_level": "safe",
        "report_id": 8
      }
    ]
  }
  ```
- **Error (401 Unauthorized)**: Missing or invalid JWT.
- **Error (403 Forbidden)**: User role is not student.

### `GET /api/student/submissions`
- **Auth**: Bearer JWT (Role: student)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "submissions": [
      {
        "id": 10,
        "title": "AI Ethics Essay",
        "filename": "ai_ethics.pdf",
        "course": "Artificial Intelligence",
        "course_code": "CS402",
        "submitted_at": "2026-09-12 10:30:00",
        "date": "Sep 12, 2026",
        "status": "Completed",
        "similarity": 12.5,
        "risk_level": "safe",
        "report_id": 8
      }
    ]
  }
  ```
- **Error (401 Unauthorized)**: Missing or invalid JWT.
- **Error (403 Forbidden)**: User role is not student.

---

## 9. Exact Files That Would Be Modified
1. `backend/models/submission.py`: Add `get_student_dashboard_stats` and `get_student_submissions_with_reports`.
2. `backend/models/report.py`: Add `get_report_by_id_or_submission_id`.
3. `backend/routes/reports.py`: Update report lookup to support both report ID and submission ID.
4. `backend/main.py`: Register `student_router`.
5. `frontend/src/service/api.js`: Add `getStudentDashboard` and `getStudentSubmissions`.
6. `frontend/src/pages/StudentDashboard.jsx`: Connect live dashboard API, loading/error states, dynamic stats and recent submissions table.
7. `frontend/src/pages/MySubmissions.jsx`: Connect live submissions API, dynamic filtering, stats cards, and report links.

---

## 10. Exact Files That Would Be Created
1. `backend/routes/student.py`: Router containing `/api/student/dashboard` and `/api/student/submissions`.
2. `backend/tests/test_student_dashboard.py`: Comprehensive test suite verifying all Phase 5 endpoints, authorization, calculations, and security.

---

## 11. Testing Strategy

### Backend Automated Unit Tests (`test_student_dashboard.py`)
1. **`test_01_dashboard_requires_auth`**: Unauthenticated GET `/api/student/dashboard` returns 401.
2. **`test_02_professor_cannot_access_student_dashboard`**: Professor token calling `/api/student/dashboard` returns 403 Forbidden.
3. **`test_03_student_dashboard_returns_real_stats`**: Student with submissions receives exact counts (`total`, `completed`, `under_review`, `reports_available`, `average_similarity`).
4. **`test_04_empty_student_account_dashboard`**: Newly registered student with zero submissions receives zeroed stats without error (`total: 0`, `average_similarity: 0.0`, empty `recent_submissions: []`).
5. **`test_05_submissions_endpoint_requires_auth`**: Unauthenticated GET `/api/student/submissions` returns 401.
6. **`test_06_professor_cannot_access_student_submissions`**: Professor token calling `/api/student/submissions` returns 403 Forbidden.
7. **`test_07_student_sees_only_own_submissions`**: Student A and Student B each submit assignments; calling `/api/student/submissions` verifies Student A sees only Student A's records.
8. **`test_08_submissions_contain_report_and_similarity_metadata`**: Returned submissions include `report_id`, `similarity`, `risk_level`, and `course_code`.
9. **`test_09_report_lookup_by_submission_id_and_report_id`**: Confirms `/api/reports/{id}` works with either ID.
10. **`test_10_regression_suite`**: Verify all 25 existing tests in `test_auth.py`, `test_database.py`, and `test_submissions.py` continue to pass.

### Frontend Build Verification
- Execute `npm run build` in `frontend/` to confirm 0 compilation or bundling errors.

---

## 12. Potential Risks & Mitigations
1. **Risk**: Empty submissions array causing `NaN` in average similarity calculations.
   - **Mitigation**: SQL query uses `COALESCE(ROUND(AVG(overall_similarity_score), 1), 0.0)`.
2. **Risk**: Status string mismatch between backend (`completed`, `pending`) and frontend badge styles (`Completed`, `Processing`, `Review Required`).
   - **Mitigation**: Standardize status normalization helper on both backend and frontend so badges consistently render the proper style.
3. **Risk**: Discrepancy between `submission_id` and `report_id` in links.
   - **Mitigation**: Include both `id` (submission) and `report_id` in the API payload, and allow the report lookup endpoint to accept either.

---

## 13. Step-by-Step Implementation Order
1. **Backend Models**: Add dashboard stats and submission history queries to `backend/models/submission.py` and `backend/models/report.py`.
2. **Backend Routes**: Create `backend/routes/student.py` and register it in `backend/main.py`. Update `backend/routes/reports.py`.
3. **Backend Testing**: Implement `backend/tests/test_student_dashboard.py` and execute full test suite (`backend\venv\Scripts\python.exe -m unittest discover -s backend/tests`).
4. **Frontend API**: Update `frontend/src/service/api.js` with `getStudentDashboard()` and `getStudentSubmissions()`.
5. **Frontend Pages**:
   - Update `StudentDashboard.jsx` to fetch live data and handle all states.
   - Update `MySubmissions.jsx` to fetch live data, compute dynamic filters and stats, and link to reports.
6. **Frontend Build Verification**: Run `npm run build` in `frontend/`.
7. **Comprehensive End-to-End Verification**: Validate full flow from Login -> Dashboard -> Submissions -> Reports.

---

## 14. Expected Final Student Workflow
```
1. Student logs in (/login)
       ↓
2. Student Dashboard (/student/dashboard)
   - Real welcome name and initials
   - Live summary stats (Total Submissions, Completed, Under Review, Reports Available)
   - Real recent submissions with status and similarity scores
   - Direct link to "View Report" or "Upload Assignment"
       ↓
3. Upload Assignment (/student/upload)
   - Real course selection from backend
   - Upload file (.pdf, .docx, .txt)
   - Live plagiarism analysis and database persistence
       ↓
4. Plagiarism Report (/student/reports/:id)
   - Real document details, similarity percentage, circular score gauge, matched reference sources
       ↓
5. Submission History (/student/submissions)
   - Complete list of all historical submissions
   - Live search by title or course
   - Filter by status and course
   - Dynamic summary metric cards
   - Click "View Report" to view any past submission's report
```

---

## 15. Git Checkpoint Strategy After Phase 5
- After implementation and full test verification:
  - Stage only Phase 5 files.
  - Commit with message: `"Complete Phase 5 student workflow and dashboard integration"`
  - Verify clean working tree.
  - Do NOT push to GitHub without explicit instruction.
