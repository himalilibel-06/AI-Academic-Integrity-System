import os
import re
import uuid
import json
from pathlib import Path
from typing import Optional, List

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    status,
)
from fastapi.responses import FileResponse

from database.database import get_connection
from models.course import get_course_by_id_or_code, is_student_enrolled
from models.submission import (
    create_submission,
    get_submission_by_id,
    update_submission_status,
)
from models.custom_reference import (
    get_custom_references_by_user,
    create_custom_reference,
)
from models.report import create_plagiarism_report
from utils.auth import get_current_user_payload
from utils.document_extractor import extract_text
from services.text_processor import preprocess_text
from services.plagiarism_engine import calculate_similarity


router = APIRouter(
    prefix="/api/submissions",
    tags=["Submissions"],
)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

REFERENCES_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "references"
REFERENCES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitize the uploaded file's original name."""
    base = Path(filename).name

    # Remove potentially unsafe characters
    clean = re.sub(r"[^\w\-.]", "_", base)

    return clean or "document"


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_document(
    file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    custom_reference_ids: Optional[str] = Form(None),
    reference_files: Optional[List[UploadFile]] = File(None),
    reference_file: Optional[UploadFile] = File(None),
    document: Optional[UploadFile] = File(None),
    paper: Optional[UploadFile] = File(None),
    payload: dict = Depends(get_current_user_payload),
):
    """
    Submit an academic document for similarity analysis.
    Only students may submit assignments.
    """

    # 1. Authorize: only students may submit
    user_role = payload.get("role")

    if user_role not in ["student", "user"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students are permitted to submit assignments.",
        )

    student_id = payload.get("sub")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID.",
        )

    try:
        student_id_int = int(student_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
        )

    # 2. Validate primary research paper file
    primary_file = file or document or paper
    if not primary_file or not getattr(primary_file, "filename", None) or not primary_file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A document file must be provided.",
        )

    file_ext = Path(primary_file.filename).suffix.lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT.",
        )

    # 3. Resolve title with safe fallback to file stem
    clean_title = (title or "").strip()
    if not clean_title:
        file_stem = Path(primary_file.filename).stem.strip()
        clean_title = file_stem if file_stem else "Research Paper"

    clean_course_input = (course_id or "").strip()
    resolved_course_id = None

    connection = get_connection()

    try:
        # 4. Resolve optional course_id if explicitly provided
        if clean_course_input:
            course = get_course_by_id_or_code(
                connection,
                clean_course_input,
            )
            if not course:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Course '{clean_course_input}' not found.",
                )
            if not is_student_enrolled(connection, course["id"], student_id_int):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not enrolled in this course.",
                )
            resolved_course_id = course["id"]

        # 5. Read file bytes
        file_bytes = await primary_file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty.",
            )

        # 6. Extract document text
        try:
            extracted_text = extract_text(
                file_bytes,
                primary_file.filename,
            )
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(err),
            )

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded document contains no readable text.",
            )

        # 7. Preprocess text
        processed_text = preprocess_text(extracted_text)

        if not processed_text or not processed_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No meaningful text found after preprocessing.",
            )

        # 8. Save uploaded file safely on disk
        safe_orig_name = sanitize_filename(primary_file.filename)

        unique_file_name = (
            f"{uuid.uuid4().hex}_{safe_orig_name}"
        )

        saved_file_path = UPLOADS_DIR / unique_file_name

        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)

        relative_file_path = str(
            Path("uploads") / unique_file_name
        )

        # 9. Create submission record
        submission_id = create_submission(
            connection=connection,
            student_id=student_id_int,
            course_id=resolved_course_id,
            title=clean_title,
            filename=primary_file.filename,
            file_path=relative_file_path,
            file_type=primary_file.content_type or file_ext,
            original_text=extracted_text,
            processed_text=processed_text,
            status="pending",
        )

        # 10. Process and extract uploaded reference documents (if provided)
        all_incoming_refs = []
        if reference_files:
            if isinstance(reference_files, list):
                all_incoming_refs.extend(reference_files)
            else:
                all_incoming_refs.append(reference_files)
        if reference_file:
            all_incoming_refs.append(reference_file)

        new_custom_refs = []
        if all_incoming_refs:
            for ref_file in all_incoming_refs:
                if not ref_file or not getattr(ref_file, "filename", None):
                    continue
                if not ref_file.filename.strip():
                    continue

                ref_ext = Path(ref_file.filename).suffix.lower()
                if ref_ext not in ALLOWED_EXTENSIONS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Unsupported format for reference file '{ref_file.filename}'. Please upload PDF, DOCX, or TXT.",
                    )

                ref_bytes = await ref_file.read()
                if not ref_bytes or len(ref_bytes.strip()) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Uploaded reference file '{ref_file.filename}' is empty.",
                    )

                try:
                    ref_extracted = extract_text(ref_bytes, ref_file.filename)
                except ValueError as err:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Error reading reference file '{ref_file.filename}': {err}",
                    )

                if not ref_extracted or not ref_extracted.strip():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"No readable text could be extracted from reference file '{ref_file.filename}'.",
                    )

                ref_processed = preprocess_text(ref_extracted)

                safe_ref_name = sanitize_filename(ref_file.filename)
                unique_ref_name = f"{uuid.uuid4().hex}_{safe_ref_name}"
                saved_ref_disk_path = REFERENCES_UPLOAD_DIR / unique_ref_name
                with open(saved_ref_disk_path, "wb") as rf:
                    rf.write(ref_bytes)
                ref_rel_path = str(Path("uploads") / "references" / unique_ref_name)

                ref_title = Path(ref_file.filename).stem or ref_file.filename
                new_ref_id = create_custom_reference(
                    connection=connection,
                    user_id=student_id_int,
                    title=ref_title,
                    filename=ref_file.filename,
                    file_path=ref_rel_path,
                    original_text=ref_extracted,
                    processed_text=ref_processed,
                )
                new_custom_refs.append({
                    "id": new_ref_id,
                    "title": ref_title,
                    "filename": ref_file.filename,
                    "original_text": ref_extracted,
                    "processed_text": ref_processed,
                })

        # Gather references strictly for user-provided similarity calculation
        custom_refs = list(new_custom_refs)
        existing_refs = get_custom_references_by_user(
            connection,
            student_id_int,
        )

        if custom_reference_ids and custom_reference_ids.strip():
            raw_sel = custom_reference_ids.strip()
            if raw_sel.lower() in ("none", "[]", "empty"):
                # User explicitly requested no saved references to be included
                pass
            elif raw_sel.lower() == "all":
                for r in existing_refs:
                    if not any(nr.get("id") == r.get("id") for nr in custom_refs):
                        custom_refs.append(r)
            else:
                try:
                    if raw_sel.startswith("["):
                        parsed_ids = {int(x) for x in json.loads(raw_sel) if str(x).isdigit()}
                    else:
                        parsed_ids = {int(x.strip()) for x in raw_sel.split(",") if x.strip().isdigit()}
                    if parsed_ids:
                        for r in existing_refs:
                            if r.get("id") in parsed_ids and not any(nr.get("id") == r.get("id") for nr in custom_refs):
                                custom_refs.append(r)
                except Exception:
                    pass
        elif not new_custom_refs:
            # Fallback to saved references if no reference files were uploaded in this submission
            for r in existing_refs:
                if not any(nr.get("id") == r.get("id") for nr in custom_refs):
                    custom_refs.append(r)

        analysis_result = calculate_similarity(
            target_text=processed_text,
            custom_references=custom_refs,
            original_text=extracted_text,
            exclude_submission_id=submission_id,
        )

        overall_similarity = analysis_result[
            "overall_similarity_score"
        ]

        risk_level = analysis_result["risk_level"]

        matches = analysis_result["matches"]

        # Store explainable similarity evidence
        evidence_details = {
            "similarity_evidence": analysis_result.get(
                "evidence_summary",
                {},
            )
        }

        # 11. Create plagiarism report record
        report_id = create_plagiarism_report(
            connection=connection,
            submission_id=submission_id,
            overall_similarity_score=overall_similarity,
            risk_level=risk_level,
            matches=matches,
            review_status="pending",
            evidence_details=evidence_details,
        )

        # 12. Update submission status to completed
        update_submission_status(
            connection,
            submission_id,
            "completed",
        )

        return {
            "success": True,
            "submission_id": submission_id,
            "report_id": report_id,
            "similarity_score": overall_similarity,
            "overall_similarity_score": overall_similarity,
            "risk_level": risk_level,
            "status": "completed",
            "matches": matches,
            "evidence_details": evidence_details,
        }

    finally:
        connection.close()


@router.get("/{submission_id}/download")
def download_submission_file(
    submission_id: int,
    payload: dict = Depends(get_current_user_payload),
):
    """
    Download the original uploaded document for a submission.

    Enforces authorization:

    - Students may only download their own submissions.
    - Professors may only download submissions for courses they teach.
    """

    user_id = payload.get("sub")
    user_role = payload.get("role")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID.",
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
        )

    connection = get_connection()

    try:
        submission = get_submission_by_id(
            connection,
            submission_id,
        )

        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Submission #{submission_id} not found.",
            )

        # Ownership and authorization checks
        if user_role in ["student", "user"]:

            if submission["student_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "You are not authorized to download "
                        "this submission."
                    ),
                )

        elif user_role == "professor":

            # Check if professor teaches this course
            cursor = connection.cursor()

            cursor.execute(
                "SELECT professor_id FROM courses WHERE id = ?",
                (submission["course_id"],),
            )

            course_row = cursor.fetchone()

            if (
                not course_row
                or course_row["professor_id"] != user_id_int
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "You are not authorized to download "
                        "submissions for courses you do not teach."
                    ),
                )

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to download this file.",
            )

        file_rel = submission["file_path"]

        if not file_rel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No file associated with this submission.",
            )

        # Prevent directory traversal
        safe_name = Path(file_rel).name

        full_path = (
            UPLOADS_DIR / safe_name
        ).resolve()

        uploads_resolved = UPLOADS_DIR.resolve()

        try:
            full_path.relative_to(uploads_resolved)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid file path.",
            )

        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission file not found on server.",
            )

        # Determine download filename and media type
        download_filename = (
            submission["filename"] or safe_name
        )

        media_type = (
            submission["file_type"]
            or "application/octet-stream"
        )

        return FileResponse(
            path=str(full_path),
            filename=download_filename,
            media_type=media_type,
        )

    finally:
        connection.close()