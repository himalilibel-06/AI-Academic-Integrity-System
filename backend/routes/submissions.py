import os
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import FileResponse

from database.database import get_connection
from models.course import get_course_by_id_or_code, is_student_enrolled
from models.submission import (
    create_submission,
    get_submission_by_id,
    get_historical_submissions_for_corpus,
    update_submission_status,
)
from models.report import create_plagiarism_report
from utils.auth import get_current_user_payload
from utils.document_extractor import extract_text
from services.text_processor import preprocess_text
from services.plagiarism_engine import calculate_similarity

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitize the uploaded file's original name."""
    base = Path(filename).name
    # Remove potentially unsafe characters
    clean = re.sub(r"[^\w\-.]", "_", base)
    return clean or "document"


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_document(
    title: str = Form(...),
    course_id: str = Form(...),
    file: UploadFile = File(...),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Submit an academic document for similarity analysis.
    Only students may submit assignments.
    """
    # 1. Authorize: only students may submit
    user_role = payload.get("role")
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students are permitted to submit assignments."
        )

    student_id = payload.get("sub")
    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing user ID."
        )

    try:
        student_id_int = int(student_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )

    # 2. Validate input fields
    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment title is required."
        )

    clean_course_input = course_id.strip()
    if not clean_course_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course selection is required."
        )

    # 3. Validate file
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A document file must be provided."
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
        )

    connection = get_connection()
    try:
        # 4. Resolve and validate course_id
        course = get_course_by_id_or_code(connection, clean_course_input)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course '{clean_course_input}' does not exist. Please select a valid course."
            )
        resolved_course_id = course["id"]

        # Verify authenticated student is enrolled in the selected course
        if not is_student_enrolled(connection, resolved_course_id, student_id_int):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You are not enrolled in '{course['code']} - {course['name']}'. Please enroll in the course before submitting."
            )

        # 5. Read file bytes
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty."
            )

        # 6. Extract document text
        try:
            extracted_text = extract_text(file_bytes, file.filename)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(err)
            )

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded document contains no readable text."
            )

        # 7. Preprocess text
        processed_text = preprocess_text(extracted_text)
        if not processed_text or not processed_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No meaningful text found after preprocessing."
            )

        # 8. Save uploaded file safely on disk
        safe_orig_name = sanitize_filename(file.filename)
        unique_file_name = f"{uuid.uuid4().hex}_{safe_orig_name}"
        saved_file_path = UPLOADS_DIR / unique_file_name

        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)

        relative_file_path = str(Path("uploads") / unique_file_name)

        # 9. Create submission record
        submission_id = create_submission(
            connection=connection,
            student_id=student_id_int,
            course_id=resolved_course_id,
            title=clean_title,
            filename=file.filename,
            file_path=relative_file_path,
            file_type=file.content_type or file_ext,
            original_text=extracted_text,
            processed_text=processed_text,
            status="pending"
        )

        # 10. Run plagiarism similarity analysis (comparing against reference corpus and prior peer submissions)
        historical_docs = get_historical_submissions_for_corpus(
            connection,
            exclude_submission_id=submission_id,
            course_id=resolved_course_id
        )
        analysis_result = calculate_similarity(processed_text, historical_documents=historical_docs)
        overall_similarity = analysis_result["overall_similarity_score"]
        risk_level = analysis_result["risk_level"]
        matches = analysis_result["matches"]

        # 11. Create plagiarism report record
        report_id = create_plagiarism_report(
            connection=connection,
            submission_id=submission_id,
            overall_similarity_score=overall_similarity,
            risk_level=risk_level,
            matches=matches,
            review_status="pending"
        )

        # 12. Update submission status to completed
        update_submission_status(connection, submission_id, "completed")

        return {
            "success": True,
            "submission_id": submission_id,
            "report_id": report_id,
            "similarity_score": overall_similarity,
            "overall_similarity_score": overall_similarity,
            "risk_level": risk_level,
            "status": "completed",
            "matches": matches
        }

    finally:
        connection.close()


@router.get("/{submission_id}/download")
def download_submission_file(
    submission_id: int,
    payload: dict = Depends(get_current_user_payload)
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
        submission = get_submission_by_id(connection, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Submission #{submission_id} not found."
            )

        # Ownership and authorization checks
        if user_role == "student":
            if submission["student_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to download this submission."
                )
        elif user_role == "professor":
            # Check if professor teaches this course
            cursor = connection.cursor()
            cursor.execute("SELECT professor_id FROM courses WHERE id = ?", (submission["course_id"],))
            course_row = cursor.fetchone()
            if not course_row or course_row["professor_id"] != user_id_int:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to download submissions for courses you do not teach."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to download this file."
            )

        file_rel = submission["file_path"]
        if not file_rel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No file associated with this submission."
            )

        # Prevent directory traversal: isolate filename and resolve strictly within UPLOADS_DIR
        safe_name = Path(file_rel).name
        full_path = (UPLOADS_DIR / safe_name).resolve()

        uploads_resolved = UPLOADS_DIR.resolve()
        try:
            full_path.relative_to(uploads_resolved)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid file path."
            )

        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission file not found on server."
            )

        # Determine download filename and media type
        download_filename = submission["filename"] or safe_name
        media_type = submission["file_type"] or "application/octet-stream"

        return FileResponse(
            path=str(full_path),
            filename=download_filename,
            media_type=media_type
        )

    finally:
        connection.close()

