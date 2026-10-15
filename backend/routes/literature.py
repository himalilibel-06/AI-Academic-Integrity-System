"""
GapGuard AI — Local Literature Corpus & Baseline Retrieval API Routes

Endpoints:
- GET /api/literature : Browse local development literature corpus
- GET /api/literature/{paper_id} : Retrieve full paper metadata by ID
- POST /api/literature/search : Execute baseline TF-IDF retrieval & ranking

IMPORTANT INVARIANT:
These endpoints return retrieved literature evidence and similarity scores.
They do NOT validate, contradict, or judge research gaps.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, status

from services.literature_corpus import literature_corpus
from services.literature_retrieval import literature_retriever


router = APIRouter(
    prefix="/api/literature",
    tags=["Literature"],
)


class LiteratureSearchRequest(BaseModel):
    query: Optional[str] = Field(None, description="Free-text research query string")
    research_information: Optional[Dict[str, Any]] = Field(
        None,
        description="Structured academic research fields (title, problem, gap, method, dataset, contribution, keywords)"
    )
    top_k: int = Field(default=10, ge=1, le=20, description="Number of results to return (1-20)")


@router.get("", status_code=status.HTTP_200_OK)
async def list_literature_corpus(
    search: Optional[str] = Query(None, description="Optional search term to filter corpus papers"),
    limit: Optional[int] = Query(50, ge=1, le=100, description="Maximum papers to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Retrieve papers from the local development literature corpus.
    """
    metadata = literature_corpus.get_metadata()
    papers = literature_corpus.get_all_papers(search=search, limit=limit, offset=offset)

    return {
        "success": True,
        "corpus_type": metadata.get("corpus_type", "development_sample_corpus"),
        "domain": metadata.get("domain", "Computer Vision and Agriculture AI"),
        "total_papers": metadata.get("total_papers", len(papers)),
        "returned_papers": len(papers),
        "papers": papers,
    }


@router.get("/{paper_id}", status_code=status.HTTP_200_OK)
async def get_literature_paper(
    paper_id: str,
):
    """
    Retrieve complete metadata for a single research paper by paper_id.
    """
    paper = literature_corpus.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID '{paper_id}' not found in local literature corpus.",
        )
    return {
        "success": True,
        "corpus_type": literature_corpus.get_metadata().get("corpus_type", "development_sample_corpus"),
        "paper": paper,
    }


@router.post("/search", status_code=status.HTTP_200_OK)
async def search_literature(
    request: LiteratureSearchRequest,
):
    """
    Retrieve and rank relevant literature papers from the local corpus using TF-IDF cosine similarity.
    Accepts raw query string or structured research_information dictionary.
    """
    # Validate top_k
    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="top_k must be an integer between 1 and 20.",
        )

    # Validate that at least one query representation is provided
    has_query = bool(request.query and request.query.strip())
    has_info = bool(request.research_information and isinstance(request.research_information, dict))

    if not has_query and not has_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search request must provide either a non-empty 'query' string or 'research_information' object.",
        )

    try:
        results = literature_retriever.retrieve(
            query=request.query,
            research_information=request.research_information,
            top_k=request.top_k,
        )

        metadata = literature_corpus.get_metadata()
        display_query = request.query or literature_retriever.construct_query_from_research_info(request.research_information)

        return {
            "success": True,
            "corpus_type": metadata.get("corpus_type", "development_sample_corpus"),
            "query": display_query[:200] + ("..." if len(display_query) > 200 else ""),
            "total_retrieved": len(results),
            "results": results,
        }

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Literature retrieval encountered an internal error: {str(exc)}",
        )
