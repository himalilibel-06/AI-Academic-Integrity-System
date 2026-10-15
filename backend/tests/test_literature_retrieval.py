"""
Unit and API Integration Tests for GapGuard AI Local Literature Corpus & Baseline Retrieval.

Tests:
1. Corpus loads correctly
2. Corpus records contain all required fields
3. Empty query is handled safely
4. TF-IDF retrieval returns relevant results
5. Results are sorted by similarity descending
6. top_k parameter restricts result set length
7. Invalid top_k (<1 or >20) is rejected with ValueError / 400
8. Research-information query construction works when fields are missing
9. API search endpoint POST /api/literature/search works with 200 OK
10. Paper lookup GET /api/literature/{paper_id} returns single paper and 404 on missing
11. No results are returned as false validation claims (strict retrieval terminology)
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from services.literature_corpus import literature_corpus, REQUIRED_PAPER_FIELDS
from services.literature_retrieval import literature_retriever


class TestLiteratureCorpusAndRetrieval(unittest.TestCase):
    """Unit tests for LiteratureCorpusService and LiteratureRetrievalService."""

    def test_corpus_loads_correctly(self):
        papers = literature_corpus.get_all_papers()
        self.assertGreaterEqual(len(papers), 30)

        metadata = literature_corpus.get_metadata()
        self.assertEqual(metadata["corpus_type"], "development_sample_corpus")
        self.assertIn("total_papers", metadata)
        self.assertEqual(metadata["total_papers"], len(papers))

    def test_corpus_records_contain_required_fields(self):
        papers = literature_corpus.get_all_papers()
        for p in papers:
            for field in REQUIRED_PAPER_FIELDS:
                self.assertIn(field, p, f"Paper {p.get('paper_id')} missing field: {field}")
                self.assertIsNotNone(p[field], f"Paper {p.get('paper_id')} has None in field: {field}")
            self.assertIsInstance(p["keywords"], list)
            self.assertGreaterEqual(len(p["keywords"]), 1)
            self.assertIsInstance(p["publication_year"], int)

    def test_empty_query_handled_safely(self):
        # Empty string
        res1 = literature_retriever.retrieve(query="")
        self.assertEqual(res1, [])

        # Whitespace string
        res2 = literature_retriever.retrieve(query="   \n\t  ")
        self.assertEqual(res2, [])

        # Empty dict
        res3 = literature_retriever.retrieve(research_information={})
        self.assertEqual(res3, [])

    def test_tfidf_retrieval_returns_results(self):
        query = "lightweight vision transformer edge microcontroller plant pathology"
        results = literature_retriever.retrieve(query=query, top_k=5)

        self.assertGreater(len(results), 0)
        top_paper = results[0]
        self.assertIn("paper_id", top_paper)
        self.assertIn("title", top_paper)
        self.assertIn("similarity_score", top_paper)
        self.assertIn("matched_fields", top_paper)
        self.assertGreater(top_paper["similarity_score"], 0.0)

        # Confirm P001 (EdgeCropViT) is ranked at the very top for this query
        self.assertEqual(top_paper["paper_id"], "P001")

    def test_results_sorted_by_similarity_descending(self):
        query = "domain adaptation illumination shifts field foliar disease"
        results = literature_retriever.retrieve(query=query, top_k=8)

        self.assertGreaterEqual(len(results), 2)
        scores = [r["similarity_score"] for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_top_k_parameter_works(self):
        query = "crop disease detection convolutional networks"
        for k in [1, 3, 7, 12]:
            results = literature_retriever.retrieve(query=query, top_k=k)
            self.assertLessEqual(len(results), k)

    def test_invalid_top_k_rejected(self):
        query = "agricultural drone imaging"
        with self.assertRaises(ValueError):
            literature_retriever.retrieve(query=query, top_k=0)

        with self.assertRaises(ValueError):
            literature_retriever.retrieve(query=query, top_k=25)

        with self.assertRaises(ValueError):
            literature_retriever.retrieve(query=query, top_k=-5)

    def test_research_information_query_construction_with_missing_fields(self):
        # Query with only title and problem (gap, method, dataset missing)
        partial_info = {
            "title": {"text": "Autonomous Robotic Pruning of Apple Orchards", "confidence": "high"},
            "research_problem": {"text": "Battery power consumption limits on small orchard rovers", "confidence": "medium"},
            "claimed_research_gap": {"text": None, "confidence": None},
            "proposed_method": {"text": None, "confidence": None},
        }

        query_str = literature_retriever.construct_query_from_research_info(partial_info)
        self.assertIn("Autonomous Robotic Pruning", query_str)
        self.assertIn("Battery power consumption", query_str)

        # Execute retrieval using partial info
        results = literature_retriever.retrieve(research_information=partial_info, top_k=5)
        self.assertGreater(len(results), 0)
        # Should match P015 (Apple Orchard Pruning)
        p_ids = [r["paper_id"] for r in results]
        self.assertIn("P015", p_ids)

    def test_paper_lookup_by_id(self):
        paper = literature_corpus.get_paper_by_id("P002")
        self.assertIsNotNone(paper)
        self.assertEqual(paper["paper_id"], "P002")
        self.assertIn("SolarAdapt", paper["abstract"])

        missing = literature_corpus.get_paper_by_id("P999_NONEXISTENT")
        self.assertIsNone(missing)

    def test_no_false_validation_claims_in_results(self):
        query = "wheat disease few-shot"
        results = literature_retriever.retrieve(query=query, top_k=3)

        for r in results:
            # Must strictly use retrieval metrics
            self.assertIn("similarity_score", r)
            self.assertIn("matched_fields", r)
            # Invariant: Must NOT contain contradiction or validation verdict keys
            self.assertNotIn("is_valid", r)
            self.assertNotIn("is_contradicted", r)
            self.assertNotIn("gap_verdict", r)
            self.assertNotIn("disproves_student", r)


class TestLiteratureAPIEndpoints(unittest.TestCase):
    """Integration tests for Literature API routes."""

    def setUp(self):
        self.client = TestClient(app)

    def test_api_list_corpus_success(self):
        response = self.client.get("/api/literature")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["corpus_type"], "development_sample_corpus")
        self.assertGreaterEqual(data["total_papers"], 30)
        self.assertIsInstance(data["papers"], list)

    def test_api_get_single_paper_success(self):
        response = self.client.get("/api/literature/P007")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["paper"]["paper_id"], "P007")
        self.assertIn("Weed", data["paper"]["title"])

    def test_api_get_single_paper_not_found(self):
        response = self.client.get("/api/literature/UNKNOWN_ID_000")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json().get("detail", "").lower())

    def test_api_search_with_query_success(self):
        payload = {
            "query": "hyperspectral drone UAV maize blight",
            "top_k": 5,
        }
        response = self.client.post("/api/literature/search", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["corpus_type"], "development_sample_corpus")
        self.assertLessEqual(len(data["results"]), 5)
        self.assertGreater(data["total_retrieved"], 0)

        # First result should have similarity score and matched fields
        first = data["results"][0]
        self.assertIn("similarity_score", first)
        self.assertIn("matched_fields", first)
        self.assertIsInstance(first["matched_fields"], list)

    def test_api_search_with_research_info_success(self):
        payload = {
            "research_information": {
                "title": "Deep Learning Based Crop Disease Detection in Edge Environments",
                "claimed_research_gap": "variable field illumination remains insufficiently studied",
                "proposed_method": "quantized vision transformer on microcontrollers",
                "keywords": ["Transformers", "Edge AI", "Crop Pathology"],
            },
            "top_k": 6,
        }
        response = self.client.post("/api/literature/search", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data["success"])
        self.assertLessEqual(len(data["results"]), 6)
        self.assertGreater(data["total_retrieved"], 0)

    def test_api_search_empty_payload_rejected(self):
        payload = {"query": "   ", "top_k": 5}
        response = self.client.post("/api/literature/search", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("either a non-empty 'query' string or 'research_information'", response.json().get("detail", ""))

    def test_api_search_invalid_top_k_rejected(self):
        payload = {"query": "fungal disease", "top_k": 25}
        response = self.client.post("/api/literature/search", json=payload)
        self.assertEqual(response.status_code, 422)  # Pydantic validation error le=20


if __name__ == "__main__":
    unittest.main()
