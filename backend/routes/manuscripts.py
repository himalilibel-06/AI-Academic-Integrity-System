from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from services.manuscript_extractor import extract_manuscript_text
from services.research_extractor import extract_research_information


router = APIRouter(
    prefix="/api/manuscripts",
    tags=["Manuscripts"],
)


class ResearchInfoRequest(BaseModel):
    text: str = Field(..., description="Clean plain text of manuscript to extract research fields from")
    file_name: Optional[str] = Field(None, description="Optional filename for metadata tracking")


@router.post("/extract-text", status_code=status.HTTP_200_OK)
async def extract_text_from_manuscript(
    file: UploadFile = File(...),
):
    """
    Extract readable text foundation from a research manuscript (.pdf, .docx, .txt).
    
    Returns structured extraction metadata including:
    - file_name
    - file_type
    - character_count
    - word_count
    - text (normalized plain text)
    
    Does NOT store to database or run AI gap analysis in this phase.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manuscript upload must include a valid filename.",
        )

    try:
        file_bytes = await file.read()

        extraction_result = extract_manuscript_text(
            file_bytes=file_bytes,
            filename=file.filename,
        )

        return extraction_result

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Manuscript text extraction encountered an internal error: {str(exc)}",
        )


@router.post("/extract-research-info", status_code=status.HTTP_200_OK)
async def extract_research_info_from_manuscript(
    request: ResearchInfoRequest,
):
    """
    Extract structured academic research fields from manuscript text.
    
    Identifies 13 core academic fields:
    title, abstract, keywords, research_problem, research_objective,
    research_question, claimed_research_gap, proposed_method, dataset_context,
    expected_contribution, evaluation_metrics, major_claims, references.

    Does NOT validate or judge the scientific validity of claims in this phase.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manuscript text is empty. Provide non-empty manuscript text for research extraction.",
        )

    try:
        result = extract_research_information(
            text=request.text,
            file_name=request.file_name,
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Research information extraction encountered an internal error: {str(exc)}",
        )

