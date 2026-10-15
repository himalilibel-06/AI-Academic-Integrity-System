"""
GapGuard AI — Local Literature Baseline Retrieval Service

Implements deterministic TF-IDF and Cosine Similarity baseline retrieval
over the local literature corpus.

IMPORTANT ARCHITECTURAL INVARIANT:
This module performs LITERATURE RETRIEVAL and EVIDENCE RANKING only.
It does NOT perform research-gap contradiction checking, novelty verification,
or claim invalidation. A high similarity score simply indicates textual and topical
proximity to existing literature.
"""

import re
from typing import Any, Dict, List, Optional, Set
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from services.literature_corpus import LiteratureCorpusService, literature_corpus


STOPWORDS_EXTRA = {
    "the", "a", "an", "in", "on", "at", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "can", "could", "will", "would", "shall", "should",
    "and", "but", "if", "or", "because", "as", "until", "while", "this", "that",
    "these", "those", "we", "our", "us", "paper", "study", "propose", "method",
}


def _extract_field_text(value: Any) -> str:
    """Extract plain text from string or structured research-info field dictionary."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        if "text" in value and value["text"]:
            return str(value["text"]).strip()
        if "items" in value and isinstance(value["items"], list):
            return " ".join([str(item).strip() for item in value["items"] if item])
    if isinstance(value, (list, tuple)):
        return " ".join([str(item).strip() for item in value if item])
    return str(value).strip()


class LiteratureRetrievalService:
    """
    Deterministic TF-IDF baseline retrieval service for the local literature corpus.
    """

    def __init__(self, corpus_service: Optional[LiteratureCorpusService] = None):
        self.corpus_service = corpus_service or literature_corpus
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._tfidf_matrix: Optional[np.ndarray] = None
        self._indexed_papers: List[Dict[str, Any]] = []
        self._build_index()

    def _build_index(self) -> None:
        """Fit TF-IDF vectorizer over all corpus documents."""
        papers = self.corpus_service.get_all_papers()
        self._indexed_papers = papers

        if not papers:
            self._vectorizer = None
            self._tfidf_matrix = None
            return

        corpus_texts = [
            self.corpus_service.get_searchable_representation(paper)
            for paper in papers
        ]

        self._vectorizer = TfidfVectorizer(
            stop_words="english",
            max_df=0.95,
            sublinear_tf=True,
            ngram_range=(1, 2),
            min_df=1,
        )
        self._tfidf_matrix = self._vectorizer.fit_transform(corpus_texts)

    def reload_index(self) -> None:
        """Reload corpus and re-fit TF-IDF vectorizer."""
        self.corpus_service.load_corpus()
        self._build_index()

    @staticmethod
    def construct_query_from_research_info(info: Optional[Dict[str, Any]]) -> str:
        """
        Synthesize a composite retrieval query from student research information.
        Missing or null fields are safely omitted.
        """
        if not info or not isinstance(info, dict):
            return ""

        components: List[str] = []

        # Weighted priority order for academic literature matching
        priority_keys = [
            "title",
            "research_problem",
            "claimed_research_gap",
            "proposed_method",
            "expected_contribution",
            "dataset_context",
            "domain",
            "keywords",
        ]

        for key in priority_keys:
            if key in info and info[key]:
                field_str = _extract_field_text(info[key])
                if field_str:
                    components.append(field_str)

        # Include any remaining top-level non-metadata keys
        for k, v in info.items():
            if k not in priority_keys and k not in ("extraction_metadata", "references", "evaluation_metrics"):
                field_str = _extract_field_text(v)
                if field_str:
                    components.append(field_str)

        return " ".join(components).strip()

    def _detect_matched_fields(
        self,
        paper: Dict[str, Any],
        salient_terms: Set[str],
    ) -> List[str]:
        """
        Explainability helper: identify which specific sections of a corpus paper
        contain salient query terms.
        """
        if not salient_terms:
            return ["title", "abstract"]

        matched: List[str] = []
        field_targets = [
            ("title", paper.get("title", "")),
            ("abstract", paper.get("abstract", "")),
            ("research_problem", paper.get("research_problem", "")),
            ("method", paper.get("method", "")),
            ("dataset", paper.get("dataset", "")),
            ("contribution", paper.get("contribution", "")),
            ("limitations", paper.get("limitations", "")),
        ]

        for field_name, field_val in field_targets:
            if not field_val:
                continue
            field_tokens = set(re.findall(r"[a-z0-9\-]+", str(field_val).lower()))
            overlap = salient_terms.intersection(field_tokens)
            if overlap:
                matched.append(field_name)

        return matched if matched else ["title", "abstract"]

    def retrieve(
        self,
        query: Optional[str] = None,
        research_information: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Execute TF-IDF cosine similarity search across local literature corpus.

        Parameters:
        - query: Raw search string
        - research_information: Structured research information dictionary
        - top_k: Maximum number of results to return (1 to 20)

        Returns:
        List of ranked paper records with similarity scores and matched fields.
        """
        # Validate top_k
        if not isinstance(top_k, int) or top_k < 1 or top_k > 20:
            raise ValueError(f"top_k must be an integer between 1 and 20. Received: {top_k}")

        # Assemble unified query text
        query_parts: List[str] = []
        if query and query.strip():
            query_parts.append(query.strip())
        if research_information:
            structured_query = self.construct_query_from_research_info(research_information)
            if structured_query:
                query_parts.append(structured_query)

        full_query = " ".join(query_parts).strip()

        # Handle empty query gracefully
        if not full_query:
            return []

        if self._vectorizer is None or self._tfidf_matrix is None or not self._indexed_papers:
            return []

        # Vectorize query and compute cosine similarities
        query_vec = self._vectorizer.transform([full_query])
        similarities = cosine_similarity(query_vec, self._tfidf_matrix).flatten()

        # Extract top salient terms from the query for explainability
        query_tokens = [
            t.lower() for t in re.findall(r"[a-z0-9\-]+", full_query)
            if len(t) > 2 and t.lower() not in STOPWORDS_EXTRA
        ]
        salient_terms = set(query_tokens)

        # Rank all papers descending by similarity score
        ranked_indices = np.argsort(similarities)[::-1]

        results: List[Dict[str, Any]] = []
        for idx in ranked_indices:
            score = float(similarities[idx])
            # Only include papers with non-zero or positive relevance
            if score <= 0.0001 and len(results) >= 1:
                break

            paper = self._indexed_papers[idx]
            matched_fields = self._detect_matched_fields(paper, salient_terms)

            results.append({
                "paper_id": paper["paper_id"],
                "title": paper["title"],
                "similarity_score": round(score, 4),
                "matched_fields": matched_fields,
                "publication_year": paper["publication_year"],
                "abstract": paper["abstract"],
                "keywords": paper.get("keywords", []),
                "research_problem": paper.get("research_problem", ""),
                "method": paper.get("method", ""),
                "dataset": paper.get("dataset", ""),
                "contribution": paper.get("contribution", ""),
                "limitations": paper.get("limitations", ""),
                "source_url": paper.get("source_url", ""),
            })

            if len(results) >= top_k:
                break

        return results


# Module-level retriever instance
literature_retriever = LiteratureRetrievalService(literature_corpus)
