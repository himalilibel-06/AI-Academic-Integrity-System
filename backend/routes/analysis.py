from fastapi import APIRouter, UploadFile, File, HTTPException

from services.analysis_service import analyze_document


router = APIRouter(
    prefix="/api/v1",
    tags=["Analysis"]
)


@router.post("/analyze")
async def analyze_uploaded_document(
    file: UploadFile = File(...)
):
    """
    Receive an uploaded document and analyze it
    for plagiarism.
    """

    # Check file type
    allowed_extensions = (".txt", ".pdf", ".docx")

    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, and TXT files are supported."
        )

    try:
        # Read uploaded file
        file_bytes = await file.read()

        # Analyze document
        result = analyze_document(
            file_bytes,
            file.filename
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(error)}"
        )