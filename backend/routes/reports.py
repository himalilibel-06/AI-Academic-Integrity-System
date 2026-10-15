import html
import hashlib
import io
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field

# Compatibility fix for openssl_md5 not supporting usedforsecurity argument
_orig_md5 = hashlib.md5
def _safe_md5(*args, **kwargs):
    kwargs.pop("usedforsecurity", None)
    return _orig_md5(*args, **kwargs)
hashlib.md5 = _safe_md5

from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from database.database import get_connection
from models.report import (
    get_report_by_id,
    get_latest_report_by_student,
    get_latest_report_for_professor,
    update_report_review,
)
from models.submission import get_submission_with_details
from utils.auth import get_current_user_payload

router = APIRouter(prefix="/api/reports", tags=["Plagiarism Reports"])


class ReviewReportRequest(BaseModel):
    review_status: str = Field(..., description="Review status decision: 'approved', 'rejected', 'flagged', 'reviewed', 'review_required'")
    professor_feedback: Optional[str] = Field(None, description="Optional professor comments or academic feedback")



def normalize_matches(raw_matches):
    """
    Safely deserialize and normalize plagiarism matches structure.
    Ensures every match has reference_id, title, type, similarity_percentage,
    and matched_segments (with target_snippet, source_snippet, similarity).
    """
    if not raw_matches:
        return []
    if isinstance(raw_matches, str):
        try:
            parsed = json.loads(raw_matches)
        except Exception:
            return []
    else:
        parsed = raw_matches
    if not isinstance(parsed, list):
        return []

    normalized = []
    for item in parsed:
        if isinstance(item, dict):
            raw_segments = item.get("matched_segments") or []
            clean_segments = []
            if isinstance(raw_segments, list):
                for seg in raw_segments:
                    if isinstance(seg, dict):
                        clean_segments.append({
                            "target_snippet": str(seg.get("target_snippet", "")),
                            "source_snippet": str(seg.get("source_snippet", "")),
                            "similarity": round(float(seg.get("similarity", 0.0)), 1)
                        })
            raw_type = str(item.get("type", "My Reference Resource"))
            raw_title = str(item.get("title", "Reference Document"))
            filename = str(item.get("filename", ""))
            ref_id = str(item.get("reference_id") or item.get("id", "ref"))

            is_legacy = (
                raw_type in ("Student Submission Archive", "Academic Reference Corpus")
                or raw_title.startswith("Peer Submission:")
                or ref_id.startswith("sub_")
                or "P0" in ref_id
            )

            display_type = "Historical Archived Source" if is_legacy else "User-Provided Reference"

            normalized.append({
                "reference_id": ref_id,
                "title": raw_title,
                "filename": filename,
                "type": display_type,
                "raw_type": raw_type,
                "is_legacy": is_legacy,
                "similarity_percentage": round(float(item.get("similarity_percentage", 0.0)), 2),
                "matched_segments": clean_segments
            })
    return normalized


@router.get("/latest")
def get_latest_report(payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve the most recently generated plagiarism report for the logged-in student.
    """
    user_id = payload.get("sub")
    user_role = payload.get("role")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access latest student report."
        )

    connection = get_connection()
    try:
        report = get_latest_report_by_student(connection, user_id_int)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No plagiarism reports found for your account."
            )

        submission = get_submission_with_details(connection, report["submission_id"])
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )

        matches = normalize_matches(report["matches"])

        return {
            "success": True,
            "report": {
                "id": report["id"],
                "submission_id": report["submission_id"],
                "overall_similarity_score": report["overall_similarity_score"],
                "similarity_score": report["overall_similarity_score"],
                "risk_level": report["risk_level"],
                "matches": matches,
                "review_status": report["review_status"],
                "professor_feedback": report["professor_feedback"],
                "reviewed_by": report["reviewed_by"],
                "reviewed_by_name": report["reviewed_by_name"] if "reviewed_by_name" in report.keys() else None,
                "reviewed_at": str(report["reviewed_at"]) if report["reviewed_at"] else None,
                "created_at": str(report["created_at"]) if report["created_at"] else None,
                "submission": {
                    "id": submission["id"],
                    "title": submission["title"],
                    "filename": submission["filename"],
                    "file_type": submission["file_type"],
                    "status": submission["status"],
                    "course_id": submission["course_id"],
                    "course_name": submission["course_name"],
                    "course_code": submission["course_code"],
                    "student_id": submission["student_id"],
                    "student_name": submission["student_name"],
                    "submitted_at": str(submission["submitted_at"]) if submission["submitted_at"] else None
                }
            }
        }

    finally:
        connection.close()


@router.get("/{report_id}")
def get_report(report_id: int, payload: dict = Depends(get_current_user_payload)):
    """
    Retrieve a specific plagiarism report by ID.
    Enforces student ownership check (Student A cannot view Student B's report).
    """
    user_id = payload.get("sub")
    user_role = payload.get("role")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        report = get_report_by_id(connection, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plagiarism report #{report_id} not found."
            )

        submission = get_submission_with_details(connection, report["submission_id"])
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )

        # Ownership authorization check
        if user_role == "student":
            if submission["student_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to access another student's report."
                )
        elif user_role == "professor":
            cursor = connection.cursor()
            cursor.execute("SELECT professor_id FROM courses WHERE id = ?", (submission["course_id"],))
            course_row = cursor.fetchone()
            if not course_row or course_row["professor_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view reports for courses you do not teach."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this report."
            )

        matches = normalize_matches(report["matches"])

        return {
            "success": True,
            "report": {
                "id": report["id"],
                "submission_id": report["submission_id"],
                "overall_similarity_score": report["overall_similarity_score"],
                "similarity_score": report["overall_similarity_score"],
                "risk_level": report["risk_level"],
                "matches": matches,
                "review_status": report["review_status"],
                "professor_feedback": report["professor_feedback"],
                "reviewed_by": report["reviewed_by"],
                "reviewed_by_name": report["reviewed_by_name"] if "reviewed_by_name" in report.keys() else None,
                "reviewed_at": str(report["reviewed_at"]) if report["reviewed_at"] else None,
                "created_at": str(report["created_at"]) if report["created_at"] else None,
                "submission": {
                    "id": submission["id"],
                    "title": submission["title"],
                    "filename": submission["filename"],
                    "file_type": submission["file_type"],
                    "status": submission["status"],
                    "course_id": submission["course_id"],
                    "course_name": submission["course_name"],
                    "course_code": submission["course_code"],
                    "student_id": submission["student_id"],
                    "student_name": submission["student_name"],
                    "submitted_at": str(submission["submitted_at"]) if submission["submitted_at"] else None
                }
            }
        }

    finally:
        connection.close()


@router.put("/{report_id}/review")
def review_plagiarism_report(
    report_id: int,
    request: ReviewReportRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Update professor review decision and feedback for a plagiarism report.
    Enforces that the authenticated user is a professor who owns the course for this submission.
    """
    user_role = payload.get("role")
    if user_role != "professor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professors can submit report reviews."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        professor_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        report = get_report_by_id(connection, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plagiarism report #{report_id} not found."
            )

        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT s.id, s.course_id, c.professor_id
            FROM submissions s
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE s.id = ?
            """,
            (report["submission_id"],)
        )
        sub_row = cursor.fetchone()
        if not sub_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )

        course_prof_id = sub_row["professor_id"]
        # Check ownership: If the course has a professor assigned and it's not this professor, deny access
        if course_prof_id is not None and course_prof_id != professor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to review submissions for courses you do not teach."
            )
        # If submission has no course assigned
        if sub_row["course_id"] is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to review submissions with no assigned course."
            )

        # Normalize review status
        norm_status = request.review_status.strip().lower()
        valid_statuses = {
            "approved": "approved",
            "reviewed": "reviewed",
            "rejected": "rejected",
            "flagged": "flagged",
            "review_required": "review_required",
            "requires further investigation": "review_required",
            "pending": "pending",
            "no action required": "approved",
            "discuss with student": "review_required",
            "refer to academic committee": "flagged",
        }
        db_review_status = valid_statuses.get(norm_status, norm_status)

        # Update report review
        update_report_review(
            connection,
            report_id,
            review_status=db_review_status,
            professor_feedback=request.professor_feedback,
            reviewed_by=professor_id
        )

        # Update related submission status
        if db_review_status in ("approved", "reviewed"):
            new_sub_status = "reviewed"
        elif db_review_status in ("flagged", "rejected", "review_required"):
            new_sub_status = "review_required"
        else:
            new_sub_status = "processing"

        cursor.execute(
            "UPDATE submissions SET status = ? WHERE id = ?",
            (new_sub_status, report["submission_id"])
        )
        connection.commit()

        return {
            "success": True,
            "report_id": report_id,
            "review_status": db_review_status,
            "professor_feedback": request.professor_feedback,
            "submission_status": new_sub_status,
            "message": "Review decision saved successfully."
        }

    finally:
        connection.close()


def generate_audit_hash(report_id: int, submission_id: int, student_email: str, score: float, created_at: str) -> str:
    """Generate deterministic verification audit code for official certificate."""
    payload_str = f"REP:{report_id}|SUB:{submission_id}|STUDENT:{student_email}|SCORE:{score}|TS:{created_at}|ACADEMIC_INTEGRITY_SALT"
    return hashlib.sha256(payload_str.encode("utf-8")).hexdigest()[:24].upper()


def build_html_report(report: dict, submission: dict, matches: list, audit_hash: str) -> str:
    """
    Generate an official, self-contained, printable academic integrity certificate/report.
    Uses clean typography, CSS print rules, and fully escaped dynamic content.
    """
    rep_id = report["id"]
    sub_id = submission["id"]
    title = html.escape(submission.get("title") or "Academic Assignment")
    filename = html.escape(submission.get("filename") or "document")
    student_name = html.escape(submission.get("student_name") or "Student")
    student_email = html.escape(submission.get("student_email") or "")
    course_name = html.escape(submission.get("course_name") or "General Course")
    course_code = html.escape(submission.get("course_code") or "")
    submitted_at = html.escape(str(submission.get("submitted_at") or "Recent"))
    reviewed_at = html.escape(str(report.get("reviewed_at") or ""))
    score = round(float(report.get("overall_similarity_score", 0.0)), 1)
    risk_level = report.get("risk_level", "safe")
    review_status = html.escape(str(report.get("review_status") or "pending").capitalize())
    feedback = html.escape(str(report.get("professor_feedback") or "No feedback provided."))
    export_timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Risk badge styles
    if risk_level == "safe":
        risk_label = "Safe (Low Similarity)"
        risk_badge_class = "badge-safe"
    elif risk_level == "high_risk":
        risk_label = "High Risk"
        risk_badge_class = "badge-danger"
    else:
        risk_label = "Review Required"
        risk_badge_class = "badge-warning"

    # Matched sources rows
    sources_html_rows = ""
    for idx, m in enumerate(matches, 1):
        m_title = html.escape(m.get("title", "Reference Source"))
        m_type = html.escape(m.get("type", "Academic Corpus"))
        m_pct = round(float(m.get("similarity_percentage", 0.0)), 1)
        sources_html_rows += f"""
        <tr>
            <td style="font-weight: 500;">{idx}. {m_title}</td>
            <td style="color: #64748b;">{m_type}</td>
            <td style="font-weight: 600; text-align: right; color: #0f172a;">{m_pct}%</td>
        </tr>
        """
    if not sources_html_rows:
        sources_html_rows = '<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 12px;">No matching reference sources identified.</td></tr>'

    # Sentence-level evidence blocks
    evidence_html = ""
    evidence_found = False
    for m in matches:
        segments = m.get("matched_segments") or []
        if segments:
            evidence_found = True
            m_title = html.escape(m.get("title", "Reference Source"))
            m_type = html.escape(m.get("type", "Academic Corpus"))
            evidence_html += f"""
            <div class="evidence-source-block">
                <div class="evidence-source-header">
                    <strong>Source:</strong> {m_title} <span style="font-size: 11px; color: #64748b;">({m_type})</span>
                </div>
            """
            for seg in segments:
                t_snip = html.escape(seg.get("target_snippet", ""))
                s_snip = html.escape(seg.get("source_snippet", ""))
                seg_sim = round(float(seg.get("similarity", 0.0)), 1)
                evidence_html += f"""
                <div class="evidence-pair">
                    <div class="evidence-meta">
                        <span class="match-score">Match Confidence: {seg_sim}%</span>
                    </div>
                    <div class="evidence-columns">
                        <div class="evidence-col">
                            <div class="evidence-label">Student Submission Passage</div>
                            <div class="evidence-text target-text">{t_snip}</div>
                        </div>
                        <div class="evidence-col">
                            <div class="evidence-label">Reference Source Passage</div>
                            <div class="evidence-text source-text">{s_snip}</div>
                        </div>
                    </div>
                </div>
                """
            evidence_html += "</div>"

    if not evidence_found:
        evidence_html = """
        <div style="padding: 16px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; color: #64748b; font-size: 13px;">
            No specific overlapping sentence fragments identified above similarity threshold.
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Integrity Report #{rep_id:05d} — {title}</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background-color: #f8fafc;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
        }}
        .report-wrapper {{
            max-width: 860px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }}
        .no-print {{
            margin-bottom: 20px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }}
        .print-btn {{
            background-color: #059669;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
        }}
        .print-btn:hover {{
            background-color: #047857;
        }}
        .header-bar {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }}
        .system-title {{
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #0f172a;
        }}
        .system-subtitle {{
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        .certificate-meta {{
            text-align: right;
            font-size: 12px;
            color: #475569;
        }}
        .cert-id {{
            font-size: 15px;
            font-weight: 700;
            color: #059669;
        }}
        .grid-2 {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }}
        .card {{
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background: #ffffff;
        }}
        .card-title {{
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
        }}
        .meta-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
        }}
        .meta-row:last-child {{
            margin-bottom: 0;
        }}
        .meta-label {{
            color: #64748b;
        }}
        .meta-value {{
            font-weight: 500;
            color: #0f172a;
            text-align: right;
        }}
        .score-hero {{
            display: flex;
            align-items: center;
            gap: 24px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
        }}
        .score-circle {{
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #ffffff;
            border: 4px solid #059669;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}
        .score-num {{
            font-size: 22px;
            font-weight: 700;
            line-height: 1;
            color: #0f172a;
        }}
        .score-unit {{
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }}
        .badge {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        .badge-safe {{
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
        }}
        .badge-warning {{
            background: #fffbeb;
            color: #b45309;
            border: 1px solid #fde68a;
        }}
        .badge-danger {{
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }}
        th {{
            text-align: left;
            padding: 10px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        td {{
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
        }}
        .evidence-source-block {{
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }}
        .evidence-source-header {{
            background: #f1f5f9;
            padding: 8px 12px;
            font-size: 12px;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
        }}
        .evidence-pair {{
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
        }}
        .evidence-pair:last-child {{
            border-bottom: none;
        }}
        .evidence-meta {{
            display: flex;
            justify-content: flex-end;
            margin-bottom: 6px;
        }}
        .match-score {{
            font-size: 11px;
            font-weight: 600;
            color: #b45309;
            background: #fffbeb;
            border: 1px solid #fef3c7;
            padding: 2px 8px;
            border-radius: 4px;
        }}
        .evidence-columns {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }}
        .evidence-col {{
            background: #fafafa;
            border: 1px solid #f1f5f9;
            border-radius: 6px;
            padding: 10px;
        }}
        .evidence-label {{
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
        }}
        .evidence-text {{
            font-size: 12px;
            line-height: 1.5;
            color: #1e293b;
        }}
        .target-text {{
            border-left: 3px solid #f59e0b;
            padding-left: 8px;
        }}
        .source-text {{
            border-left: 3px solid #64748b;
            padding-left: 8px;
        }}
        .footer-audit {{
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #94a3b8;
        }}
        @media print {{
            body {{
                background: #ffffff;
                padding: 0;
            }}
            .report-wrapper {{
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }}
            .no-print {{
                display: none;
            }}
            .evidence-source-block {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    <div class="report-wrapper">
        <div class="no-print">
            <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>

        <div class="header-bar">
            <div>
                <div class="system-title">Academic Integrity Verification Report</div>
                <div class="system-subtitle">Originality &amp; Similarity Analysis Certificate</div>
            </div>
            <div class="certificate-meta">
                <div class="cert-id">#AIR-{rep_id:05d}</div>
                <div>Issued: {export_timestamp}</div>
            </div>
        </div>

        <div class="score-hero">
            <div class="score-circle">
                <div class="score-num">{score}%</div>
                <div class="score-unit">Similarity</div>
            </div>
            <div style="flex: 1;">
                <div style="margin-bottom: 6px;">
                    <span class="badge {risk_badge_class}">{risk_label}</span>
                    <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Review Status: <strong>{review_status}</strong></span>
                </div>
                <div style="font-size: 13px; color: #475569;">
                    Document similarity analysis completed across user-provided reference documents and saved custom references.
                </div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-title">Submission Details</div>
                <div class="meta-row">
                    <span class="meta-label">Title</span>
                    <span class="meta-value">{title}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">File</span>
                    <span class="meta-value">{filename}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Submitted</span>
                    <span class="meta-value">{submitted_at}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Analysis Type</span>
                    <span class="meta-value">Direct Reference &amp; Literature Check</span>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Student &amp; Review Info</div>
                <div class="meta-row">
                    <span class="meta-label">Student</span>
                    <span class="meta-value">{student_name}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Email</span>
                    <span class="meta-value">{student_email}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Instructor Decision</span>
                    <span class="meta-value">{review_status}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Instructor Feedback</span>
                    <span class="meta-value">{feedback}</span>
                </div>
            </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
            <div class="card-title">Matched Sources Summary</div>
            <table>
                <thead>
                    <tr>
                        <th>Source Document</th>
                        <th>Corpus Category</th>
                        <th style="text-align: right;">Similarity</th>
                    </tr>
                </thead>
                <tbody>
                    {sources_html_rows}
                </tbody>
            </table>
        </div>

        <div class="card" style="margin-bottom: 24px;">
            <div class="card-title">Sentence-Level Match Evidence</div>
            {evidence_html}
        </div>

        <div class="footer-audit">
            <div>
                <strong>Verification Hash:</strong> {audit_hash}
            </div>
            <div>
                AI Academic Integrity System &bull; Secure Audit Trail
            </div>
        </div>
    </div>
</body>
</html>
"""


def build_pdf_report(report: dict, submission: dict, matches: list, audit_hash: str) -> bytes:
    """
    Generate an official, professional, downloadable PDF Academic Integrity Report using ReportLab.
    Contains metadata, similarity metrics, matching sources, sentence-level evidence,
    methodology details, and academic disclaimers.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )

    h2_style = ParagraphStyle(
        "Heading2Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )

    bold_label = ParagraphStyle(
        "BoldLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    meta_val = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )

    passage_target_style = ParagraphStyle(
        "PassageTarget",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#92400e"),
    )

    passage_source_style = ParagraphStyle(
        "PassageSource",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )

    elements = []

    # Header banner
    elements.append(Paragraph("GapGuard AI — Academic Integrity Report", title_style))
    elements.append(Paragraph("AI-Based Plagiarism Detection &amp; Similarity Evidence Audit", subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=12))

    # Verification / Metadata bar
    export_ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    meta_table_data = [
        [
            Paragraph("<b>Verification Audit Code:</b>", bold_label),
            Paragraph(f"<font color='#2563eb'><b>{html.escape(audit_hash)}</b></font>", meta_val),
            Paragraph("<b>Generated:</b>", bold_label),
            Paragraph(export_ts, meta_val),
        ],
        [
            Paragraph("<b>Document Title:</b>", bold_label),
            Paragraph(html.escape(submission.get("title") or "Untitled Document"), meta_val),
            Paragraph("<b>Author / Student:</b>", bold_label),
            Paragraph(html.escape(submission.get("student_name") or "Student Scholar"), meta_val),
        ],
        [
            Paragraph("<b>Analysis Type:</b>", bold_label),
            Paragraph("Direct Reference &amp; Literature Check", meta_val),
            Paragraph("<b>Original File:</b>", bold_label),
            Paragraph(html.escape(submission.get("filename") or "document"), meta_val),
        ],
    ]
    meta_table = Table(meta_table_data, colWidths=[130, 160, 100, 150])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # Overall Similarity & Risk Block
    score = round(float(report.get("overall_similarity_score", 0.0)), 1)
    risk_level = report.get("risk_level", "safe")

    if risk_level == "safe":
        risk_bg = colors.HexColor("#ecfdf5")
        risk_color = colors.HexColor("#047857")
        risk_text = "Safe (Low Similarity Evidence)"
    elif risk_level == "high_risk":
        risk_bg = colors.HexColor("#fef2f2")
        risk_color = colors.HexColor("#b91c1c")
        risk_text = "High Risk (Substantial Textual Overlap)"
    else:
        risk_bg = colors.HexColor("#fffbeb")
        risk_color = colors.HexColor("#b45309")
        risk_text = "Review Required (Moderate Overlap)"

    rev_feedback = html.escape(report.get("professor_feedback") or "No instructor comments recorded.")
    score_card_data = [
        [
            Paragraph(f"<font size=24 color='{risk_color.hexval()}'><b>{score}%</b></font><br/><font size=8 color='#64748b'>Overall Document Similarity</font>", body_style),
            Paragraph(f"<b>Classification:</b> <font color='{risk_color.hexval()}'><b>{risk_text}</b></font><br/>"
                      f"<b>Review Status:</b> {html.escape(str(report.get('review_status') or 'Pending Review').capitalize())}<br/>"
                      f"<b>Professor Feedback:</b> {rev_feedback}", body_style)
        ]
    ]
    score_table = Table(score_card_data, colWidths=[160, 380])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), risk_bg),
        ("BOX", (0, 0), (-1, -1), 1, risk_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 14))

    # Matched Sources Section
    elements.append(Paragraph("Matching Reference Sources", h2_style))
    sources_data = [
        [
            Paragraph("<b>#</b>", bold_label),
            Paragraph("<b>Source Title</b>", bold_label),
            Paragraph("<b>Source Type</b>", bold_label),
            Paragraph("<b>Overlap %</b>", bold_label),
        ]
    ]

    for idx, m in enumerate(matches, 1):
        m_title = html.escape(m.get("title") or m.get("filename") or "Reference Document")
        m_type = html.escape(m.get("type") or "User-Provided Reference")
        m_pct = round(float(m.get("similarity_percentage", 0.0)), 1)
        sources_data.append([
            Paragraph(str(idx), body_style),
            Paragraph(m_title, body_style),
            Paragraph(m_type, body_style),
            Paragraph(f"<b>{m_pct}%</b>", body_style),
        ])

    if len(sources_data) == 1:
        sources_data.append([
            Paragraph("-", body_style),
            Paragraph("No matching reference sources identified.", body_style),
            Paragraph("-", body_style),
            Paragraph("0.0%", body_style),
        ])

    sources_table = Table(sources_data, colWidths=[24, 300, 160, 56])
    sources_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (3, 0), (3, -1), "RIGHT"),
    ]))
    elements.append(sources_table)
    elements.append(Spacer(1, 14))

    # Sentence-Level Passage Evidence Section
    has_passages = False
    evidence_elements = []
    evidence_elements.append(Paragraph("Passage-Level Textual Evidence", h2_style))

    for m in matches:
        segments = m.get("matched_segments") or []
        if segments:
            has_passages = True
            m_title = html.escape(m.get("title", "Reference Source"))
            m_type = html.escape(m.get("type", "Academic Corpus"))
            evidence_elements.append(Spacer(1, 4))
            evidence_elements.append(Paragraph(f"<b>Source:</b> {m_title} <font color='#64748b'>({m_type})</font>", bold_label))

            for s_idx, seg in enumerate(segments, 1):
                t_snip = html.escape(seg.get("target_snippet", ""))
                s_snip = html.escape(seg.get("source_snippet", ""))
                sim = round(float(seg.get("similarity", 0.0)), 1)

                seg_table_data = [
                    [
                        Paragraph(f"<b>Passage #{s_idx} &bull; Match Confidence: {sim}%</b>", bold_label),
                        Paragraph("", bold_label),
                    ],
                    [
                        Paragraph("<b>Submitted Document Passage:</b>", bold_label),
                        Paragraph("<b>Corresponding Reference Passage:</b>", bold_label),
                    ],
                    [
                        Paragraph(f"&ldquo;{t_snip}&rdquo;", passage_target_style),
                        Paragraph(f"&ldquo;{s_snip}&rdquo;", passage_source_style),
                    ]
                ]
                seg_table = Table(seg_table_data, colWidths=[265, 275])
                seg_table.setStyle(TableStyle([
                    ("SPAN", (0, 0), (1, 0)),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
                    ("BACKGROUND", (0, 1), (0, 2), colors.HexColor("#fffbeb")),
                    ("BACKGROUND", (1, 1), (1, 2), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]))
                evidence_elements.append(Spacer(1, 3))
                evidence_elements.append(seg_table)

    if has_passages:
        elements.extend(evidence_elements)
        elements.append(Spacer(1, 14))

    # Methodology & Disclaimer (KeepTogether)
    notes_data = [
        [
            Paragraph("<b>Similarity Methodology:</b> Document text is extracted and normalized, vectorized using TF-IDF n-grams, and evaluated using cosine similarity against user-supplied reference documents and saved custom references. Sentence-level evidence is extracted using sequence alignment heuristics. Overall similarity represents the maximum single-source cosine similarity across all evaluated reference documents.", disclaimer_style)
        ],
        [
            Paragraph("<b>Academic Disclaimer:</b> Similarity percentage represents textual overlap identified by algorithmic comparison. It does not by itself constitute proof of plagiarism or academic dishonesty. Course instructors evaluate contextual evidence, quotation formatting, disciplinary standards, and citations before making an academic integrity determination.", disclaimer_style)
        ]
    ]
    notes_table = Table(notes_data, colWidths=[540])
    notes_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))

    elements.append(KeepTogether([
        Paragraph("Analysis Methodology &amp; Academic Notice", h2_style),
        Spacer(1, 4),
        notes_table
    ]))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


@router.get("/{report_id}/export")
def export_plagiarism_report(
    report_id: int,
    format: str = Query("html", pattern="^(html|json|pdf)$"),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Export an official academic integrity report.
    Supports formats: html (default), pdf, and json.
    Authorization:
    - Students may export only their own reports.
    - Professors may export reports for courses they teach.
    """
    user_id = payload.get("sub")
    user_role = payload.get("role")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    connection = get_connection()
    try:
        report_row = get_report_by_id(connection, report_id)
        if not report_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plagiarism report #{report_id} not found."
            )
        report = dict(report_row)

        submission_row = get_submission_with_details(connection, report["submission_id"])
        if not submission_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated submission not found."
            )
        submission = dict(submission_row)

        # Authorization checks
        if user_role == "student":
            if submission["student_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to export another student's report."
                )
        elif user_role == "professor":
            cursor = connection.cursor()
            cursor.execute("SELECT professor_id FROM courses WHERE id = ?", (submission["course_id"],))
            course_row = cursor.fetchone()
            if not course_row or course_row["professor_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to export reports for courses you do not teach."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to export this report."
            )

        matches = normalize_matches(report["matches"])
        audit_hash = generate_audit_hash(
            report_id=report["id"],
            submission_id=submission["id"],
            student_email=submission.get("student_email") or "",
            score=report.get("overall_similarity_score") or 0.0,
            created_at=str(report.get("created_at") or "")
        )

        if format == "json":
            return {
                "success": True,
                "audit_hash": audit_hash,
                "export_timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "report": {
                    "id": report["id"],
                    "submission_id": report["submission_id"],
                    "overall_similarity_score": report["overall_similarity_score"],
                    "risk_level": report["risk_level"],
                    "review_status": report["review_status"],
                    "professor_feedback": report["professor_feedback"],
                    "reviewed_by": report["reviewed_by"],
                    "reviewed_by_name": report.get("reviewed_by_name"),
                    "reviewed_at": str(report["reviewed_at"]) if report["reviewed_at"] else None,
                    "created_at": str(report["created_at"]) if report["created_at"] else None,
                    "matches": matches,
                    "submission": {
                        "id": submission["id"],
                        "title": submission["title"],
                        "filename": submission["filename"],
                        "file_type": submission["file_type"],
                        "status": submission["status"],
                        "course_id": submission["course_id"],
                        "course_name": submission["course_name"],
                        "course_code": submission["course_code"],
                        "student_id": submission["student_id"],
                        "student_name": submission["student_name"],
                        "submitted_at": str(submission["submitted_at"]) if submission["submitted_at"] else None
                    }
                }
            }

        if format == "pdf":
            pdf_bytes = build_pdf_report(report, submission, matches, audit_hash)
            filename = f"Integrity_Report_{report_id}.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )

        # Default: Generate HTML report
        html_content = build_html_report(report, submission, matches, audit_hash)
        filename = f"Integrity_Report_{report_id}.html"

        return HTMLResponse(
            content=html_content,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    finally:
        connection.close()


