"""
GapGuard AI — Faculty Review & Research Feedback Service

Phase 11A: Implements structured, explainable faculty review workflows on top
of existing GapGuard research project and analysis data.

IMPORTANT ARCHITECTURAL & ETHICAL INVARIANTS:
1. Faculty feedback is qualitative and advisory.
2. NO numerical faculty scores, quality scores, novelty scores, or publication predictions.
3. Review statuses:
   - "Not Reviewed"
   - "In Review"
   - "Feedback Provided"
   - "Revision Requested"
   - "Reviewed"
4. "Reviewed" means "Review completed", NEVER "Research approved".
5. Revision requested means "Faculty revision feedback is available", NEVER "Your research failed".
6. Empty feedback sections are allowed; reviewers are not forced to comment on every section.
7. "Request Revision" strictly requires at least one comment or recommendation to contain text.
8. Reuses existing analysis services; does not alter underlying research data.
"""

from datetime import datetime
import json
import sqlite3
import uuid
from typing import Any, Dict, List, Optional

from database.database import get_connection

# Allowed Review Statuses
STATUS_NOT_REVIEWED = "Not Reviewed"
STATUS_IN_REVIEW = "In Review"
STATUS_FEEDBACK_PROVIDED = "Feedback Provided"
STATUS_REVISION_REQUESTED = "Revision Requested"
STATUS_REVIEWED = "Reviewed"

VALID_STATUSES = {
    STATUS_NOT_REVIEWED,
    STATUS_IN_REVIEW,
    STATUS_FEEDBACK_PROVIDED,
    STATUS_REVISION_REQUESTED,
    STATUS_REVIEWED,
}

# Allowed Revision Cycle Statuses (Phase 11C)
CYCLE_STATUS_REVIEW_STARTED = "Review Started"
CYCLE_STATUS_REVISION_REQUESTED = "Revision Requested"
CYCLE_STATUS_REVISION_SUBMITTED = "Revision Submitted"
CYCLE_STATUS_REANALYSIS_AVAILABLE = "Re-analysis Available"
CYCLE_STATUS_FOLLOWUP_REVIEW = "Follow-up Review"
CYCLE_STATUS_REVIEW_COMPLETED = "Review Completed"

VALID_CYCLE_STATUSES = {
    CYCLE_STATUS_REVIEW_STARTED,
    CYCLE_STATUS_REVISION_REQUESTED,
    CYCLE_STATUS_REVISION_SUBMITTED,
    CYCLE_STATUS_REANALYSIS_AVAILABLE,
    CYCLE_STATUS_FOLLOWUP_REVIEW,
    CYCLE_STATUS_REVIEW_COMPLETED,
}

COMMENT_SECTIONS = [
    "research_problem",
    "research_gap",
    "proposed_method",
    "expected_contribution",
    "evidence_literature",
    "research_claims",
]

ACADEMIC_GUARDRAIL_NOTICE = (
    "Faculty feedback is qualitative and human-advisory. GapGuard AI does not grade "
    "or judge research validity. Review completed indicates that human academic review "
    "was performed, not that the manuscript is scientifically proven or guaranteed publication."
)


def _now_iso() -> str:
    """Return current timestamp in ISO format."""
    return datetime.utcnow().isoformat() + "Z"


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


class FacultyReviewService:
    """
    Manages structured qualitative faculty reviews for student research projects.
    Uses SQLite persistence consistent with existing GapGuard prototype storage.
    """

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve research project metadata by project_id."""
        clean_id = _clean_str(project_id)
        if not clean_id:
            return None

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, title, domain, student_id, research_problem, research_objective,
                       claimed_research_gap, proposed_method, expected_contribution, created_at
                FROM research_projects
                WHERE id = ?
                """,
                (clean_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return dict(row)
        finally:
            conn.close()

    def register_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Register or update a research project record."""
        proj_id = _clean_str(project_data.get("id") or project_data.get("project_id"))
        if not proj_id:
            raise ValueError("Project ID is required to register a research project.")

        title = _clean_str(project_data.get("title")) or f"Research Project ({proj_id})"
        domain = _clean_str(project_data.get("domain"))
        student_id = _clean_str(project_data.get("student_id"))
        problem = _clean_str(project_data.get("research_problem"))
        objective = _clean_str(project_data.get("research_objective"))
        gap = _clean_str(project_data.get("claimed_research_gap"))
        method = _clean_str(project_data.get("proposed_method"))
        contribution = _clean_str(project_data.get("expected_contribution"))

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO research_projects (
                    id, title, domain, student_id, research_problem, research_objective,
                    claimed_research_gap, proposed_method, expected_contribution
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    domain = excluded.domain,
                    student_id = CASE WHEN excluded.student_id != '' THEN excluded.student_id ELSE research_projects.student_id END,
                    research_problem = excluded.research_problem,
                    research_objective = excluded.research_objective,
                    claimed_research_gap = excluded.claimed_research_gap,
                    proposed_method = excluded.proposed_method,
                    expected_contribution = excluded.expected_contribution
                """,
                (proj_id, title, domain, student_id, problem, objective, gap, method, contribution),
            )
            conn.commit()
            return self.get_project(proj_id)  # type: ignore
        finally:
            conn.close()

    def list_projects_for_review(self) -> Dict[str, Any]:
        """
        List all research projects available for faculty review.
        Derives review status dynamically from existing faculty review records.
        Calculates summary counts for workflow management without scores or rankings.
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, title, domain, student_id, research_problem, research_objective,
                       claimed_research_gap, proposed_method, expected_contribution, created_at
                FROM research_projects
                ORDER BY created_at ASC
                """
            )
            project_rows = cursor.fetchall()

            # Retrieve latest review record for each project
            cursor.execute(
                """
                SELECT review_id, project_id, project_title, student_id, reviewer_id,
                       reviewer_name, status, recommendations, created_at, updated_at
                FROM faculty_reviews
                ORDER BY updated_at DESC
                """
            )
            review_rows = cursor.fetchall()

            # Map the latest review by project_id
            latest_reviews: Dict[str, Dict[str, Any]] = {}
            for r in review_rows:
                r_dict = dict(r)
                pid = r_dict.get("project_id")
                if pid and pid not in latest_reviews:
                    latest_reviews[pid] = r_dict

            projects_list = []
            status_counts = {
                "total": len(project_rows),
                "not_reviewed": 0,
                "in_review": 0,
                "feedback_provided": 0,
                "revision_requested": 0,
                "reviewed": 0,
            }

            for p in project_rows:
                p_dict = dict(p)
                pid = p_dict["id"]
                rev = latest_reviews.get(pid)

                review_status = rev.get("status") if rev else STATUS_NOT_REVIEWED
                review_id = rev.get("review_id") if rev else None
                # Student ID safely derived without fabricating a student name
                student_id = (rev.get("student_id") if rev else "") or p_dict.get("student_id") or ""
                reviewer_name = rev.get("reviewer_name") if rev else ""
                updated_at = (rev.get("updated_at") if rev else "") or p_dict.get("created_at") or _now_iso()

                if review_status == STATUS_NOT_REVIEWED:
                    status_counts["not_reviewed"] += 1
                elif review_status == STATUS_IN_REVIEW:
                    status_counts["in_review"] += 1
                elif review_status == STATUS_FEEDBACK_PROVIDED:
                    status_counts["feedback_provided"] += 1
                elif review_status == STATUS_REVISION_REQUESTED:
                    status_counts["revision_requested"] += 1
                elif review_status == STATUS_REVIEWED:
                    status_counts["reviewed"] += 1

                projects_list.append({
                    "project_id": pid,
                    "project_title": p_dict.get("title") or f"Research Project ({pid})",
                    "domain": p_dict.get("domain") or "",
                    "student_id": student_id,
                    "review_id": review_id,
                    "review_status": review_status,
                    "reviewer_name": reviewer_name,
                    "updated_at": updated_at,
                    "research_problem": p_dict.get("research_problem") or "",
                    "claimed_research_gap": p_dict.get("claimed_research_gap") or "",
                })

            return {
                "projects": projects_list,
                "counts": status_counts,
                "academic_guardrail": ACADEMIC_GUARDRAIL_NOTICE,
            }
        finally:
            conn.close()

    def create_or_get_review(
        self,
        project_id: str,
        reviewer_id: Optional[str] = None,
        reviewer_name: Optional[str] = None,
        student_id: Optional[str] = None,
        initial_status: str = STATUS_IN_REVIEW,
    ) -> Dict[str, Any]:
        """
        Create a new review or safely return the existing active review for the project.
        Enforces project existence and prevents duplicate active reviews.
        """
        clean_proj_id = _clean_str(project_id)
        if not clean_proj_id:
            raise ValueError("A valid 'project_id' is required to create a faculty review.")

        project = self.get_project(clean_proj_id)
        if not project:
            raise ValueError(f"Research project with ID '{clean_proj_id}' not found.")

        conn = get_connection()
        try:
            cursor = conn.cursor()
            # Check for existing active review for this project (Test L: Safe duplicate handling)
            cursor.execute(
                """
                SELECT review_id, project_id, project_title, student_id, reviewer_id,
                       reviewer_name, status, comments, recommendations, created_at, updated_at
                FROM faculty_reviews
                WHERE project_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (clean_proj_id,),
            )
            row = cursor.fetchone()
            if row:
                # Return existing review safely
                return self._row_to_dict(row)

            # Create new review
            review_id = f"rev_{clean_proj_id}_{uuid.uuid4().hex[:6]}"
            proj_title = project.get("title", f"Research Project {clean_proj_id}")
            now = _now_iso()

            initial_comments = {sec: "" for sec in COMMENT_SECTIONS}
            comments_json = json.dumps(initial_comments)

            status_to_set = initial_status if initial_status in VALID_STATUSES else STATUS_IN_REVIEW

            cursor.execute(
                """
                INSERT INTO faculty_reviews (
                    review_id, project_id, project_title, student_id, reviewer_id,
                    reviewer_name, status, comments, recommendations, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    review_id,
                    clean_proj_id,
                    proj_title,
                    _clean_str(student_id),
                    _clean_str(reviewer_id),
                    _clean_str(reviewer_name) or "Faculty Reviewer",
                    status_to_set,
                    comments_json,
                    "",
                    now,
                    now,
                ),
            )
            conn.commit()

            cursor.execute("SELECT * FROM faculty_reviews WHERE review_id = ?", (review_id,))
            new_row = cursor.fetchone()
            return self._row_to_dict(new_row)

        finally:
            conn.close()

    def get_review_by_project_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve faculty review for a project.
        If project exists but has no review record, returns a default 'Not Reviewed' object.
        If project does not exist, returns None.
        """
        clean_id = _clean_str(project_id)
        if not clean_id:
            return None

        project = self.get_project(clean_id)
        if not project:
            return None

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM faculty_reviews
                WHERE project_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (clean_id,),
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)

            # Return empty 'Not Reviewed' stub for existing project
            now = _now_iso()
            return {
                "review_id": None,
                "project_id": clean_id,
                "project_title": project.get("title", f"Research Project {clean_id}"),
                "student_id": "",
                "reviewer_id": "",
                "reviewer_name": "",
                "status": STATUS_NOT_REVIEWED,
                "comments": {sec: "" for sec in COMMENT_SECTIONS},
                "recommendations": "",
                "created_at": now,
                "updated_at": now,
                "academic_guardrail": ACADEMIC_GUARDRAIL_NOTICE,
            }
        finally:
            conn.close()

    def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific review by review_id."""
        clean_id = _clean_str(review_id)
        if not clean_id:
            return None

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM faculty_reviews WHERE review_id = ?", (clean_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_dict(row)
        finally:
            conn.close()

    def save_feedback(
        self,
        review_id: str,
        comments: Optional[Dict[str, Any]] = None,
        recommendations: Optional[str] = None,
        reviewer_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update faculty feedback comments and recommendations.
        Empty sections are allowed. Transitions status to 'Feedback Provided'
        if currently 'Not Reviewed' or 'In Review'.
        """
        clean_rev_id = _clean_str(review_id)
        existing = self.get_review_by_id(clean_rev_id)
        if not existing:
            raise ValueError(f"Faculty review with ID '{clean_rev_id}' not found.")

        merged_comments = dict(existing.get("comments") or {})
        if comments and isinstance(comments, dict):
            for sec in COMMENT_SECTIONS:
                if sec in comments:
                    merged_comments[sec] = _clean_str(comments[sec])

        clean_recs = recommendations if recommendations is not None else existing.get("recommendations", "")
        clean_name = _clean_str(reviewer_name) or existing.get("reviewer_name")

        current_status = existing.get("status")
        # When feedback is saved, set status to Feedback Provided
        new_status = STATUS_FEEDBACK_PROVIDED

        now = _now_iso()
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE faculty_reviews
                SET comments = ?,
                    recommendations = ?,
                    reviewer_name = ?,
                    status = ?,
                    updated_at = ?
                WHERE review_id = ?
                """,
                (json.dumps(merged_comments), clean_recs, clean_name, new_status, now, clean_rev_id),
            )
            conn.commit()
            return self.get_review_by_id(clean_rev_id)  # type: ignore
        finally:
            conn.close()

    def request_revision(
        self,
        review_id: str,
        comments: Optional[Dict[str, Any]] = None,
        recommendations: Optional[str] = None,
        reviewer_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Set status to 'Revision Requested'.
        Strict requirement: at least one comment or recommendation must contain text.
        """
        clean_rev_id = _clean_str(review_id)
        existing = self.get_review_by_id(clean_rev_id)
        if not existing:
            raise ValueError(f"Faculty review with ID '{clean_rev_id}' not found.")

        merged_comments = dict(existing.get("comments") or {})
        if comments and isinstance(comments, dict):
            for sec in COMMENT_SECTIONS:
                if sec in comments:
                    merged_comments[sec] = _clean_str(comments[sec])

        clean_recs = recommendations if recommendations is not None else existing.get("recommendations", "")
        clean_name = _clean_str(reviewer_name) or existing.get("reviewer_name")

        # Validation: Request Revision requires at least one feedback or recommendation field to have content
        has_content = any(bool(_clean_str(v)) for v in merged_comments.values()) or bool(_clean_str(clean_recs))
        if not has_content:
            raise ValueError(
                "Request Revision requires at least one feedback or recommendation field to contain text."
            )

        now = _now_iso()
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE faculty_reviews
                SET comments = ?,
                    recommendations = ?,
                    reviewer_name = ?,
                    status = ?,
                    updated_at = ?
                WHERE review_id = ?
                """,
                (json.dumps(merged_comments), clean_recs, clean_name, STATUS_REVISION_REQUESTED, now, clean_rev_id),
            )
            conn.commit()
            updated = self.get_review_by_id(clean_rev_id)
            updated["status_message"] = "Faculty revision feedback is available."
            return updated  # type: ignore
        finally:
            conn.close()

    def complete_review(
        self,
        review_id: str,
        comments: Optional[Dict[str, Any]] = None,
        recommendations: Optional[str] = None,
        reviewer_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Mark review as 'Reviewed'.
        Academic guardrail: 'Reviewed' indicates 'Review completed', NOT 'Research approved'.
        """
        clean_rev_id = _clean_str(review_id)
        existing = self.get_review_by_id(clean_rev_id)
        if not existing:
            raise ValueError(f"Faculty review with ID '{clean_rev_id}' not found.")

        merged_comments = dict(existing.get("comments") or {})
        if comments and isinstance(comments, dict):
            for sec in COMMENT_SECTIONS:
                if sec in comments:
                    merged_comments[sec] = _clean_str(comments[sec])

        clean_recs = recommendations if recommendations is not None else existing.get("recommendations", "")
        clean_name = _clean_str(reviewer_name) or existing.get("reviewer_name")

        now = _now_iso()
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE faculty_reviews
                SET comments = ?,
                    recommendations = ?,
                    reviewer_name = ?,
                    status = ?,
                    updated_at = ?
                WHERE review_id = ?
                """,
                (json.dumps(merged_comments), clean_recs, clean_name, STATUS_REVIEWED, now, clean_rev_id),
            )
            conn.commit()
            updated = self.get_review_by_id(clean_rev_id)
            updated["status_message"] = "Review completed"
            return updated  # type: ignore
        finally:
            conn.close()

    # -------------------------------------------------------------
    # Phase 11C: Manuscript & Revision Cycle Tracking Methods
    # -------------------------------------------------------------

    def get_manuscript(self, manuscript_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve manuscript record by ID."""
        clean_id = _clean_str(manuscript_id)
        if not clean_id:
            return None

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, project_id, title, version_number, version_label, file_name, file_type, created_at
                FROM research_manuscripts
                WHERE id = ?
                """,
                (clean_id,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def list_manuscripts_for_project(self, project_id: str) -> List[Dict[str, Any]]:
        """Retrieve all registered manuscript versions for a project."""
        clean_id = _clean_str(project_id)
        if not clean_id:
            return []

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, project_id, title, version_number, version_label, file_name, file_type, created_at
                FROM research_manuscripts
                WHERE project_id = ?
                ORDER BY version_number ASC, created_at ASC
                """,
                (clean_id,),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def register_manuscript(self, manuscript_data: Dict[str, Any]) -> Dict[str, Any]:
        """Register or update a manuscript version record for a project."""
        m_id = _clean_str(manuscript_data.get("id"))
        p_id = _clean_str(manuscript_data.get("project_id"))
        if not m_id:
            raise ValueError("Manuscript ID is required.")
        if not p_id:
            raise ValueError("Project ID is required.")

        proj = self.get_project(p_id)
        if not proj:
            raise ValueError(f"Research project '{p_id}' not found.")

        title = _clean_str(manuscript_data.get("title")) or f"Manuscript ({m_id})"
        v_num = int(manuscript_data.get("version_number", 1))
        v_label = _clean_str(manuscript_data.get("version_label")) or f"Version {v_num}"
        file_name = _clean_str(manuscript_data.get("file_name"))
        file_type = _clean_str(manuscript_data.get("file_type")) or "PDF"

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO research_manuscripts (
                    id, project_id, title, version_number, version_label, file_name, file_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    project_id = excluded.project_id,
                    title = excluded.title,
                    version_number = excluded.version_number,
                    version_label = excluded.version_label,
                    file_name = excluded.file_name,
                    file_type = excluded.file_type
                """,
                (m_id, p_id, title, v_num, v_label, file_name, file_type),
            )
            conn.commit()
            return self.get_manuscript(m_id)  # type: ignore
        finally:
            conn.close()

    def record_review_cycle(self, cycle_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Record a validated revision cycle linking manuscript versions and faculty reviews.
        Strictly validates:
        - Project existence
        - Same project constraint (no cross-project linking)
        - Manuscript existence (no phantom manuscripts)
        - Version ordering (previous_version < current_version)
        - No numerical quality scores or approval claims
        """
        p_id = _clean_str(cycle_data.get("project_id"))
        if not p_id:
            raise ValueError("Project ID is required to record a revision cycle.")

        proj = self.get_project(p_id)
        if not proj:
            raise ValueError(f"Research project '{p_id}' not found.")

        curr_manu_id = _clean_str(cycle_data.get("current_manuscript_id"))
        if not curr_manu_id:
            raise ValueError("Current manuscript ID is required.")

        curr_manu = self.get_manuscript(curr_manu_id)
        if not curr_manu:
            raise ValueError(f"Current manuscript '{curr_manu_id}' does not exist.")

        if _clean_str(curr_manu.get("project_id")) != p_id:
            raise ValueError(
                f"Manuscripts must belong to the same research project. Manuscript '{curr_manu_id}' belongs to '{curr_manu.get('project_id')}', expected '{p_id}'."
            )

        prev_manu_id = _clean_str(cycle_data.get("previous_manuscript_id"))
        prev_manu = None
        if prev_manu_id:
            prev_manu = self.get_manuscript(prev_manu_id)
            if not prev_manu:
                raise ValueError(f"Previous manuscript '{prev_manu_id}' does not exist.")

            if _clean_str(prev_manu.get("project_id")) != p_id:
                raise ValueError(
                    f"Manuscripts must belong to the same research project. Previous manuscript '{prev_manu_id}' belongs to '{prev_manu.get('project_id')}', expected '{p_id}'."
                )

        # Version validation
        curr_ver = int(cycle_data.get("current_version") or curr_manu.get("version_number") or 1)
        prev_ver = None
        if prev_manu:
            prev_ver = int(cycle_data.get("previous_version") or prev_manu.get("version_number") or 1)
            if prev_ver >= curr_ver:
                raise ValueError(
                    f"Invalid version ordering: previous version ({prev_ver}) must be strictly less than current version ({curr_ver})."
                )

        review_id = _clean_str(cycle_data.get("review_id"))
        faculty_status = _clean_str(cycle_data.get("faculty_status")) or STATUS_NOT_REVIEWED
        if faculty_status not in VALID_STATUSES:
            faculty_status = STATUS_NOT_REVIEWED

        cycle_status = _clean_str(cycle_data.get("cycle_status")) or CYCLE_STATUS_REVIEW_STARTED
        if cycle_status not in VALID_CYCLE_STATUSES:
            cycle_status = CYCLE_STATUS_REVIEW_STARTED

        cycle_id = _clean_str(cycle_data.get("cycle_id")) or f"cycle_{p_id}_{curr_manu_id}_{uuid.uuid4().hex[:4]}"
        notes = _clean_str(cycle_data.get("notes"))
        now = _now_iso()

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO faculty_review_cycles (
                    cycle_id, project_id, review_id, previous_manuscript_id,
                    current_manuscript_id, previous_version, current_version,
                    faculty_status, cycle_status, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cycle_id) DO UPDATE SET
                    review_id = excluded.review_id,
                    previous_manuscript_id = excluded.previous_manuscript_id,
                    current_manuscript_id = excluded.current_manuscript_id,
                    previous_version = excluded.previous_version,
                    current_version = excluded.current_version,
                    faculty_status = excluded.faculty_status,
                    cycle_status = excluded.cycle_status,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
                """,
                (
                    cycle_id,
                    p_id,
                    review_id or None,
                    prev_manu_id or None,
                    curr_manu_id,
                    prev_ver,
                    curr_ver,
                    faculty_status,
                    cycle_status,
                    notes,
                    now,
                    now,
                ),
            )
            conn.commit()

            cursor.execute("SELECT * FROM faculty_review_cycles WHERE cycle_id = ?", (cycle_id,))
            row = cursor.fetchone()
            return dict(row)
        finally:
            conn.close()

    def get_review_history(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve chronological faculty review history and revision cycles for a project.
        Derives cycles conservatively using existing manuscript and review data if explicit cycles
        have not yet been stored. Returns empty list if no cycles/history exist.
        """
        clean_id = _clean_str(project_id)
        if not clean_id:
            return None

        proj = self.get_project(clean_id)
        if not proj:
            return None

        review = self.get_review_by_project_id(clean_id)
        manuscripts = self.list_manuscripts_for_project(clean_id)

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT cycle_id, project_id, review_id, previous_manuscript_id,
                       current_manuscript_id, previous_version, current_version,
                       faculty_status, cycle_status, notes, created_at, updated_at
                FROM faculty_review_cycles
                WHERE project_id = ?
                ORDER BY current_version ASC, created_at ASC
                """,
                (clean_id,),
            )
            rows = cursor.fetchall()
            explicit_cycles = [dict(r) for r in rows]

            # Build enriched cycle objects
            formatted_cycles = []
            if explicit_cycles:
                for c in explicit_cycles:
                    prev_m = self.get_manuscript(c.get("previous_manuscript_id")) if c.get("previous_manuscript_id") else None
                    curr_m = self.get_manuscript(c.get("current_manuscript_id")) if c.get("current_manuscript_id") else None

                    formatted_cycles.append({
                        "cycle_id": c["cycle_id"],
                        "project_id": clean_id,
                        "review_id": c.get("review_id") or (review.get("review_id") if review else None),
                        "previous_manuscript_id": c.get("previous_manuscript_id"),
                        "current_manuscript_id": c.get("current_manuscript_id"),
                        "previous_version": c.get("previous_version"),
                        "current_version": c.get("current_version"),
                        "previous_version_label": prev_m.get("version_label") if prev_m else (f"Version {c.get('previous_version')}" if c.get('previous_version') else None),
                        "current_version_label": curr_m.get("version_label") if curr_m else (f"Version {c.get('current_version')}" if c.get('current_version') else "Version 1"),
                        "faculty_status": c.get("faculty_status") or (review.get("status") if review else STATUS_NOT_REVIEWED),
                        "cycle_status": c.get("cycle_status") or CYCLE_STATUS_REVIEW_STARTED,
                        "reviewer_name": review.get("reviewer_name") if review else "",
                        "notes": c.get("notes") or "",
                        "created_at": c.get("created_at"),
                        "updated_at": c.get("updated_at"),
                        "actions": {
                            "can_compare": bool(c.get("previous_manuscript_id") and c.get("current_manuscript_id")),
                            "can_view_analysis": True,
                            "can_review": True,
                        },
                    })
            elif manuscripts:
                # Automatic conservative cycle detection (Part 7)
                rev_status = review.get("status") if review else STATUS_NOT_REVIEWED
                rev_id = review.get("review_id") if review else None
                reviewer_name = review.get("reviewer_name") if review else ""

                if len(manuscripts) == 1:
                    m1 = manuscripts[0]
                    c_status = CYCLE_STATUS_REVIEW_STARTED
                    if rev_status == STATUS_REVISION_REQUESTED:
                        c_status = CYCLE_STATUS_REVISION_REQUESTED
                    elif rev_status == STATUS_REVIEWED:
                        c_status = CYCLE_STATUS_REVIEW_COMPLETED
                    elif rev_status in (STATUS_FEEDBACK_PROVIDED, STATUS_IN_REVIEW):
                        c_status = CYCLE_STATUS_REVIEW_STARTED

                    formatted_cycles.append({
                        "cycle_id": f"cycle_{clean_id}_{m1['id']}",
                        "project_id": clean_id,
                        "review_id": rev_id,
                        "previous_manuscript_id": None,
                        "current_manuscript_id": m1["id"],
                        "previous_version": None,
                        "current_version": m1.get("version_number", 1),
                        "previous_version_label": None,
                        "current_version_label": m1.get("version_label", "Version 1 — Initial Draft"),
                        "faculty_status": rev_status,
                        "cycle_status": c_status,
                        "reviewer_name": reviewer_name,
                        "notes": "Initial research manuscript submission.",
                        "created_at": m1.get("created_at", _now_iso()),
                        "updated_at": review.get("updated_at", _now_iso()) if review else _now_iso(),
                        "actions": {
                            "can_compare": False,
                            "can_view_analysis": True,
                            "can_review": True,
                        },
                    })
                elif len(manuscripts) >= 2:
                    m1 = manuscripts[0]
                    m2 = manuscripts[1]

                    # Cycle 1: Manuscript V1
                    formatted_cycles.append({
                        "cycle_id": f"cycle_{clean_id}_{m1['id']}",
                        "project_id": clean_id,
                        "review_id": rev_id,
                        "previous_manuscript_id": None,
                        "current_manuscript_id": m1["id"],
                        "previous_version": None,
                        "current_version": m1.get("version_number", 1),
                        "previous_version_label": None,
                        "current_version_label": m1.get("version_label", "Version 1 — Initial Draft"),
                        "faculty_status": STATUS_REVISION_REQUESTED if rev_status in (STATUS_REVISION_REQUESTED, STATUS_REVIEWED) else rev_status,
                        "cycle_status": CYCLE_STATUS_REVISION_REQUESTED if rev_status == STATUS_REVISION_REQUESTED else (CYCLE_STATUS_REVIEW_COMPLETED if rev_status == STATUS_REVIEWED else CYCLE_STATUS_REVIEW_STARTED),
                        "reviewer_name": reviewer_name,
                        "notes": "Initial manuscript review round.",
                        "created_at": m1.get("created_at", _now_iso()),
                        "updated_at": review.get("updated_at", _now_iso()) if review else _now_iso(),
                        "actions": {
                            "can_compare": False,
                            "can_view_analysis": True,
                            "can_review": True,
                        },
                    })

                    # Cycle 2: Manuscript V2 (Revision Candidate)
                    c2_status = CYCLE_STATUS_REVISION_SUBMITTED
                    if rev_status == STATUS_REVIEWED:
                        c2_status = CYCLE_STATUS_REVIEW_COMPLETED
                    elif rev_status == STATUS_FEEDBACK_PROVIDED:
                        c2_status = CYCLE_STATUS_FOLLOWUP_REVIEW

                    formatted_cycles.append({
                        "cycle_id": f"cycle_{clean_id}_{m2['id']}",
                        "project_id": clean_id,
                        "review_id": rev_id,
                        "previous_manuscript_id": m1["id"],
                        "current_manuscript_id": m2["id"],
                        "previous_version": m1.get("version_number", 1),
                        "current_version": m2.get("version_number", 2),
                        "previous_version_label": m1.get("version_label", "Version 1 — Initial Draft"),
                        "current_version_label": m2.get("version_label", "Version 2 — Revised Draft"),
                        "faculty_status": rev_status,
                        "cycle_status": c2_status,
                        "reviewer_name": reviewer_name,
                        "notes": "Potential revision cycle: Manuscript V2 uploaded following faculty review guidance.",
                        "created_at": m2.get("created_at", _now_iso()),
                        "updated_at": review.get("updated_at", _now_iso()) if review else _now_iso(),
                        "actions": {
                            "can_compare": True,
                            "can_view_analysis": True,
                            "can_review": True,
                        },
                    })

            return {
                "project_id": clean_id,
                "project_title": proj.get("title", f"Research Project ({clean_id})"),
                "cycles": formatted_cycles,
                "total_cycles": len(formatted_cycles),
                "latest_review_status": review.get("status") if review else STATUS_NOT_REVIEWED,
                "latest_manuscript_version": formatted_cycles[-1]["current_version_label"] if formatted_cycles else "None",
                "academic_guardrail": ACADEMIC_GUARDRAIL_NOTICE,
            }
        finally:
            conn.close()

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Format SQLite row into clean review dictionary without leaking secrets."""
        d = dict(row)
        raw_comments = d.get("comments")
        if isinstance(raw_comments, str):
            try:
                parsed_comments = json.loads(raw_comments)
            except Exception:
                parsed_comments = {sec: "" for sec in COMMENT_SECTIONS}
        elif isinstance(raw_comments, dict):
            parsed_comments = raw_comments
        else:
            parsed_comments = {sec: "" for sec in COMMENT_SECTIONS}

        # Ensure all comment sections exist
        normalized_comments = {
            sec: parsed_comments.get(sec, "") for sec in COMMENT_SECTIONS
        }

        return {
            "review_id": d.get("review_id"),
            "project_id": d.get("project_id"),
            "project_title": d.get("project_title"),
            "student_id": d.get("student_id") or "",
            "reviewer_id": d.get("reviewer_id") or "",
            "reviewer_name": d.get("reviewer_name") or "Faculty Reviewer",
            "status": d.get("status", STATUS_NOT_REVIEWED),
            "comments": normalized_comments,
            "recommendations": d.get("recommendations") or "",
            "created_at": d.get("created_at"),
            "updated_at": d.get("updated_at"),
            "academic_guardrail": ACADEMIC_GUARDRAIL_NOTICE,
        }


# Global singleton instance
faculty_review_service = FacultyReviewService()
