import os
import re
import uuid
from pathlib import Path
from typing import Optional
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    status,
)

from pydantic import BaseModel
from database.database import get_connection
from models.custom_reference import (
    create_custom_reference,
    get_custom_references_by_user,
    get_custom_reference_by_id,
    delete_custom_reference,
    update_custom_reference_metadata,
)
from utils.auth import get_current_user_payload
from utils.document_extractor import extract_text
from services.text_processor import preprocess_text

router = APIRouter(
    prefix="/api/references/custom",
    tags=["Custom References"],
)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

REFERENCES_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "references"
REFERENCES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename."""
    base = Path(filename).name
    clean = re.sub(r"[^\w\-.]", "_", base)
    return clean or "reference_document"


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_custom_reference(
    title: str = Form(...),
    author: Optional[str] = Form(None),
    publication_year: Optional[str] = Form(None),
    research_field: Optional[str] = Form(None),
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    payload: dict = Depends(get_current_user_payload),
):
    """
    Create a new custom reference resource for the authenticated scholar.
    Accepts metadata and either an uploaded document (PDF, DOCX, TXT)
    or direct pasted reference text.
    """
    user_id = payload.get("sub")
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

    # Validate Title
    clean_title = (title or "").strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reference paper title is required.",
        )

    clean_author = (author or "").strip()
    clean_year = (publication_year or "").strip()
    clean_field = (research_field or "").strip()

    extracted_text = ""
    saved_filename = ""
    saved_file_rel_path = ""

    # Priority 1: Check if file is provided
    if file and file.filename:
        filename = file.filename
        file_ext = Path(filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{file_ext}'. Please upload PDF, DOCX, or TXT.",
            )

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded reference file is empty.",
            )

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference file exceeds the 25 MB size limit.",
            )

        try:
            extracted_text = extract_text(file_bytes, filename)
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to extract text from document: {str(err)}",
            )

        safe_orig_name = sanitize_filename(filename)
        unique_file_name = f"{uuid.uuid4().hex}_{safe_orig_name}"
        saved_file_path = REFERENCES_UPLOAD_DIR / unique_file_name

        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)

        saved_filename = filename
        saved_file_rel_path = str(Path("uploads") / "references" / unique_file_name)

    # Priority 2: Check if text_content is provided
    elif text_content and text_content.strip():
        extracted_text = text_content.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide reference content by uploading a document (PDF, DOCX, TXT) or pasting text.",
        )

    if not extracted_text or not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The reference resource contains no readable text.",
        )

    processed_text = preprocess_text(extracted_text)
    if not processed_text or not processed_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No meaningful words found after processing reference text.",
        )

    connection = get_connection()
    try:
        ref_id = create_custom_reference(
            connection=connection,
            user_id=user_id_int,
            title=clean_title,
            author=clean_author,
            publication_year=clean_year,
            research_field=clean_field,
            filename=saved_filename,
            file_path=saved_file_rel_path,
            original_text=extracted_text,
            processed_text=processed_text,
        )

        return {
            "success": True,
            "message": f"Custom reference '{clean_title}' added successfully.",
            "reference": {
                "id": ref_id,
                "title": clean_title,
                "author": clean_author,
                "publication_year": clean_year,
                "research_field": clean_field,
                "filename": saved_filename,
                "resource_type": "My References",
                "preview": extracted_text[:280] + ("..." if len(extracted_text) > 280 else ""),
            },
        }
    finally:
        connection.close()


@router.get("", status_code=status.HTTP_200_OK)
def list_custom_references(
    payload: dict = Depends(get_current_user_payload),
):
    """
    Retrieve all custom reference papers belonging to the authenticated scholar.
    """
    user_id = payload.get("sub")
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
        refs = get_custom_references_by_user(connection, user_id_int)
        return {
            "success": True,
            "total_references": len(refs),
            "references": [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "author": r["author"] or "",
                    "publication_year": r["publication_year"] or "",
                    "research_field": r["research_field"] or "",
                    "filename": r["filename"] or "",
                    "resource_type": "My References",
                    "created_at": str(r["created_at"]) if r["created_at"] else "",
                    "preview": (r["original_text"] or "")[:280] + (
                        "..." if len(r["original_text"] or "") > 280 else ""
                    ),
                }
                for r in refs
            ],
        }
    finally:
        connection.close()


@router.delete("/{reference_id}", status_code=status.HTTP_200_OK)
def remove_custom_reference(
    reference_id: int,
    payload: dict = Depends(get_current_user_payload),
):
    """
    Delete a custom reference paper belonging to the authenticated scholar.
    Enforces strict ownership: scholars cannot delete other scholars' references.
    """
    user_id = payload.get("sub")
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
        existing = get_custom_reference_by_id(connection, reference_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reference resource #{reference_id} not found.",
            )

        if existing["user_id"] != user_id_int:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to delete another scholar's reference resource.",
            )

        deleted = delete_custom_reference(connection, reference_id, user_id_int)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reference resource #{reference_id} could not be deleted.",
            )

        # Remove local disk file if exists
        if existing.get("file_path"):
            full_disk_path = Path(__file__).resolve().parent.parent / existing["file_path"]
            if full_disk_path.exists():
                try:
                    full_disk_path.unlink()
                except Exception:
                    pass

        return {
            "success": True,
            "message": f"Reference resource '{existing['title']}' deleted successfully.",
        }
    finally:
        connection.close()


class UpdateCustomReferenceRequest(BaseModel):
    title: str
    author: Optional[str] = ""
    publication_year: Optional[str] = ""
    research_field: Optional[str] = ""


@router.put("/{reference_id}", status_code=status.HTTP_200_OK)
def update_custom_reference(
    reference_id: int,
    request: UpdateCustomReferenceRequest,
    payload: dict = Depends(get_current_user_payload),
):
    """
    Update metadata (title, author, publication_year, research_field) of a custom reference paper.
    Enforces ownership: scholar can only update their own reference resources.
    """
    user_id = payload.get("sub")
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

    clean_title = (request.title or "").strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reference paper title cannot be empty.",
        )

    connection = get_connection()
    try:
        existing = get_custom_reference_by_id(connection, reference_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reference resource #{reference_id} not found.",
            )

        if existing["user_id"] != user_id_int:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to edit another scholar's reference resource.",
            )

        updated = update_custom_reference_metadata(
            connection=connection,
            reference_id=reference_id,
            user_id=user_id_int,
            title=clean_title,
            author=request.author or "",
            publication_year=request.publication_year or "",
            research_field=request.research_field or "",
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update reference resource metadata.",
            )

        ref_updated = get_custom_reference_by_id(connection, reference_id)

        return {
            "success": True,
            "message": f"Reference resource '{clean_title}' updated successfully.",
            "reference": {
                "id": ref_updated["id"],
                "title": ref_updated["title"],
                "author": ref_updated["author"] or "",
                "publication_year": ref_updated["publication_year"] or "",
                "research_field": ref_updated["research_field"] or "",
                "filename": ref_updated["filename"] or "",
                "resource_type": "My References",
                "created_at": str(ref_updated["created_at"]) if ref_updated.get("created_at") else "",
                "preview": (ref_updated["original_text"] or "")[:280] + (
                    "..." if len(ref_updated["original_text"] or "") > 280 else ""
                ),
            },
        }
    finally:
        connection.close()

