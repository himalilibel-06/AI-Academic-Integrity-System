"""
GapGuard AI — Local Literature Corpus Service

Manages loading, validation, and retrieval of the local development literature corpus.
Separates data storage and record validation from retrieval and similarity algorithms.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional


CORPUS_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "literature_corpus.json"

REQUIRED_PAPER_FIELDS = [
    "paper_id",
    "title",
    "abstract",
    "keywords",
    "publication_year",
    "research_problem",
    "method",
    "dataset",
    "contribution",
    "limitations",
]


class LiteratureCorpusService:
    """
    Service responsible for loading and querying the local literature corpus.
    """

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or CORPUS_DATA_PATH
        self._corpus_metadata: Dict[str, Any] = {}
        self._papers: List[Dict[str, Any]] = []
        self._papers_by_id: Dict[str, Dict[str, Any]] = {}
        self.load_corpus()

    def load_corpus(self) -> None:
        """
        Load and validate the JSON corpus from disk.
        Raises FileNotFoundError if missing, or ValueError if records are malformed.
        """
        if not self.data_path.exists():
            raise FileNotFoundError(
                f"Literature corpus not found at {self.data_path}. Ensure literature_corpus.json exists."
            )

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict) or "papers" not in data:
            raise ValueError("Corpus JSON must contain a root object with a 'papers' array.")

        raw_papers = data.get("papers", [])
        validated_papers: List[Dict[str, Any]] = []
        by_id: Dict[str, Dict[str, Any]] = {}

        for idx, paper in enumerate(raw_papers):
            if not isinstance(paper, dict):
                raise ValueError(f"Paper record at index {idx} is not a valid dictionary.")

            # Validate required fields
            missing_fields = [f for f in REQUIRED_PAPER_FIELDS if f not in paper or paper[f] is None]
            if missing_fields:
                raise ValueError(
                    f"Paper record at index {idx} ({paper.get('paper_id', 'unknown')}) missing required fields: {missing_fields}"
                )

            pid = str(paper["paper_id"]).strip()
            if pid in by_id:
                raise ValueError(f"Duplicate paper_id '{pid}' encountered in literature corpus.")

            validated_papers.append(paper)
            by_id[pid] = paper

        self._papers = validated_papers
        self._papers_by_id = by_id
        self._corpus_metadata = {
            "corpus_type": data.get("corpus_type", "development_sample_corpus"),
            "domain": data.get("domain", "Computer Vision and Agriculture AI"),
            "version": data.get("version", "1.0.0"),
            "total_papers": len(validated_papers),
        }

    def get_metadata(self) -> Dict[str, Any]:
        """Return summary metadata about the loaded corpus."""
        return dict(self._corpus_metadata)

    def get_all_papers(
        self,
        search: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all papers with optional keyword filtering and pagination.
        """
        papers = self._papers

        if search and search.strip():
            query_lower = search.strip().lower()
            filtered = []
            for p in papers:
                kw_str = " ".join(p.get("keywords", [])).lower()
                title = p.get("title", "").lower()
                abstract = p.get("abstract", "").lower()
                prob = p.get("research_problem", "").lower()
                method = p.get("method", "").lower()
                if (
                    query_lower in title
                    or query_lower in abstract
                    or query_lower in kw_str
                    or query_lower in prob
                    or query_lower in method
                ):
                    filtered.append(p)
            papers = filtered

        start = max(0, offset)
        if limit is not None and limit > 0:
            return papers[start : start + limit]
        return papers[start:]

    def get_paper_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single paper by its unique ID. Returns None if not found.
        """
        return self._papers_by_id.get(str(paper_id).strip())

    @staticmethod
    def get_searchable_representation(paper: Dict[str, Any]) -> str:
        """
        Assemble a normalized, comprehensive text representation of a paper
        for vectorization and indexing.
        """
        parts = [
            paper.get("title", ""),
            paper.get("abstract", ""),
            " ".join(paper.get("keywords", [])),
            paper.get("research_problem", ""),
            paper.get("method", ""),
            paper.get("dataset", ""),
            paper.get("contribution", ""),
            paper.get("limitations", ""),
        ]
        return " ".join([p.strip() for p in parts if p and p.strip()])


# Singleton instance for backend reuse
literature_corpus = LiteratureCorpusService()
