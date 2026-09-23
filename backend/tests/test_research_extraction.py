"""
Unit and API Integration Tests for GapGuard AI Research Information Extraction.

Tests:
1. Manuscript with standard academic headings
2. Manuscript with alternative academic headings
3. Manuscript with missing sections (verifying no hallucinated/invented fields)
4. Manuscript with no recognizable headings (discourse markers baseline)
5. Empty text handling (service baseline and API 400 rejection)
6. Multiple references extraction and parsing
7. Major-claim extraction accuracy
8. FastAPI endpoint POST /api/manuscripts/extract-research-info
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
from services.research_extractor import (
    extract_research_information,
    _split_into_sentences,
    _extract_keywords,
    _extract_references,
)


STANDARD_MANUSCRIPT = """
Title: Transformer-Based Phenotype Classification in Edge Agriculture

Abstract:
Automated crop health diagnosis is vital for global food security. In this paper, we propose an edge-optimized vision transformer.

Keywords: Computer Vision, Agriculture, Transformers, Edge Inference

1. Problem Statement
Existing deep learning models demand high-performance GPU clusters, making them impractical for low-connectivity rural farms.

2. Research Objectives
The primary objective of this work is to compress attention mechanisms for real-time mobile inference.

3. Research Questions
RQ1: Can dynamic token pruning preserve disease classification accuracy under 15ms latency constraints?

4. Research Gap
Previous studies mainly evaluate crop disease models using controlled laboratory images. However, their performance under variable field illumination remains insufficiently studied.

5. Methodology
We propose a lightweight multi-head self-attention module that prunes background soil patches dynamically.

6. Experimental Setup and Dataset
Experiments are conducted on the PlantVillage and FieldPlant benchmark datasets containing 54,000 leaf images.

7. Contributions
Our contributions are threefold: 1) A token-pruning transformer, 2) A field benchmark, 3) Real-time edge deployment.

8. Evaluation Metrics
We evaluate model performance using accuracy, precision, recall, and f1-score.

9. Major Claims
Our method achieves 96.4% top-1 accuracy on field images and outperforms baseline MobileNetV3 significantly.

10. References
[1] Vaswani, A., Shazeer, N., Parmar, N., et al. (2017). Attention is all you need. NeurIPS, 30.
[2] Howard, A., Sandler, M., Chu, G., et al. (2019). Searching for MobileNetV3. ICCV, 1314-1324.
"""

ALTERNATIVE_MANUSCRIPT = """
Paper Title: Explainable Dialect Translation via Anchor Projections

Summary:
Cross-lingual transfer frequently degrades when evaluating vernacular dialects with irregular morphologies.

Index Terms: NLP, Dialects, Translation, Cross-Lingual Anchors

Problem Definition:
Grammatical divergence between standard idioms and regional variants leads to catastrophic tokenization fragmentation.

Aims:
This study aims to ground regional syntactic variations to semantic anchors without paired bilingual corpora.

Research Questions:
Can cross-lingual anchors bridge zero-shot dialect gaps without requiring full retraining?

Limitations of Existing Work:
Current state-of-the-art multilingual language models ignore phonetic drift across regional communities.

Proposed Approach:
We develop an adaptive anchor projection layer trained with contrastive divergence loss.

Study Area:
Experiments are conducted on the MultiDialect-12 corpus spanning distinct regional dialects.

Novelty:
The primary novelty lies in our non-parametric phonetic clustering mechanism.

Performance Metrics:
We evaluate translation fidelity using BLEU, ROUGE-L, and perplexity.

Bibliography:
1. Conneau, A., et al. (2020). Unsupervised Cross-lingual Representation Learning. ACL.
2. Brown, T., et al. (2020). Language Models are Few-Shot Learners. NeurIPS.
"""

MISSING_SECTIONS_MANUSCRIPT = """
Title: Minimalist Graph Neural Network for Citation Graphs

Abstract:
We present a simplified message passing scheme for node classification in sparse academic citation networks.

Methodology:
Our model uses linear feature propagation without non-linearities between layers, computing closed-form embeddings.

References:
[1] Kipf, T. N., & Welling, M. (2017). Semi-Supervised Classification with Graph Convolutional Networks. ICLR.
"""

UNHEADED_MANUSCRIPT = """
Deep Learning for Urban Air Quality Forecasting

Air quality monitoring in dense metropolitan areas presents critical environmental challenges. In this research, the primary problem addressed is the severe spatial sparsity of ground monitoring stations. Our main objective is to infer fine-grained particulate concentrations from satellite imagery and vehicular telemetry. Our central research question asks whether temporal graph networks can accurately forecast PM2.5 levels across unmonitored intersections.

However, existing prior models fail to model dynamic traffic flow fluctuations, leaving hyper-local microclimates insufficiently studied. In this paper, we propose a spatio-temporal graph attention network with meteorological gating. Experiments are conducted on the Beijing and London Urban Air Quality benchmark dataset. The key contributions of this paper are summarized as follows: we introduce a topological graph topology and demonstrate superior prediction stability. Our method achieves state-of-the-art predictive accuracy and outperforms baseline LSTM models significantly by 14.2% in root mean squared error.
"""


class TestResearchExtractorService(unittest.TestCase):
    """Unit tests for the research information extraction service."""

    def test_standard_headings_extraction(self):
        result = extract_research_information(STANDARD_MANUSCRIPT, "crop_study.txt")

        # 1. Title
        self.assertIsNotNone(result["title"]["text"])
        self.assertIn("Transformer-Based Phenotype Classification", result["title"]["text"])
        self.assertEqual(result["title"]["confidence"], "high")

        # 2. Abstract
        self.assertIsNotNone(result["abstract"]["text"])
        self.assertIn("Automated crop health diagnosis is vital", result["abstract"]["text"])
        self.assertEqual(result["abstract"]["confidence"], "high")

        # 3. Keywords
        self.assertGreaterEqual(len(result["keywords"]["items"]), 3)
        self.assertIn("Computer Vision", result["keywords"]["items"])
        self.assertEqual(result["keywords"]["confidence"], "high")

        # 4. Research Problem
        self.assertIsNotNone(result["research_problem"]["text"])
        self.assertIn("Existing deep learning models demand high-performance GPU clusters", result["research_problem"]["text"])
        self.assertEqual(result["research_problem"]["confidence"], "high")

        # 5. Research Objective
        self.assertIsNotNone(result["research_objective"]["text"])
        self.assertIn("compress attention mechanisms", result["research_objective"]["text"])
        self.assertEqual(result["research_objective"]["confidence"], "high")

        # 6. Research Question
        self.assertIsNotNone(result["research_question"]["text"])
        self.assertIn("Can dynamic token pruning preserve disease classification accuracy", result["research_question"]["text"])
        self.assertEqual(result["research_question"]["confidence"], "high")

        # 7. Claimed Research Gap
        self.assertIsNotNone(result["claimed_research_gap"]["text"])
        self.assertIn("variable field illumination remains insufficiently studied", result["claimed_research_gap"]["text"])
        self.assertEqual(result["claimed_research_gap"]["confidence"], "high")

        # 8. Proposed Method
        self.assertIsNotNone(result["proposed_method"]["text"])
        self.assertIn("lightweight multi-head self-attention module", result["proposed_method"]["text"])
        self.assertEqual(result["proposed_method"]["confidence"], "high")

        # 9. Dataset Context
        self.assertIsNotNone(result["dataset_context"]["text"])
        self.assertIn("PlantVillage and FieldPlant benchmark datasets", result["dataset_context"]["text"])
        self.assertEqual(result["dataset_context"]["confidence"], "high")

        # 10. Expected Contribution
        self.assertIsNotNone(result["expected_contribution"]["text"])
        self.assertIn("Our contributions are threefold", result["expected_contribution"]["text"])
        self.assertEqual(result["expected_contribution"]["confidence"], "high")

        # 11. Evaluation Metrics
        self.assertIn("accuracy", result["evaluation_metrics"]["items"])
        self.assertIn("f1-score", result["evaluation_metrics"]["items"])
        self.assertEqual(result["evaluation_metrics"]["confidence"], "high")

        # 12. References
        self.assertEqual(len(result["references"]["items"]), 2)
        self.assertIn("Attention is all you need", result["references"]["items"][0])

        # Metadata
        self.assertGreaterEqual(result["extraction_metadata"]["fields_found"], 11)
        self.assertEqual(result["extraction_metadata"]["method"], "rule_based_baseline")

    def test_alternative_headings_extraction(self):
        result = extract_research_information(ALTERNATIVE_MANUSCRIPT, "dialect.txt")

        # Paper Title -> title
        self.assertIsNotNone(result["title"]["text"])
        self.assertIn("Explainable Dialect Translation", result["title"]["text"])

        # Summary -> abstract
        self.assertIsNotNone(result["abstract"]["text"])
        self.assertIn("Cross-lingual transfer frequently degrades", result["abstract"]["text"])

        # Index Terms -> keywords
        self.assertIn("NLP", result["keywords"]["items"])

        # Problem Definition -> research_problem
        self.assertIsNotNone(result["research_problem"]["text"])
        self.assertIn("Grammatical divergence", result["research_problem"]["text"])

        # Aims -> research_objective
        self.assertIsNotNone(result["research_objective"]["text"])
        self.assertIn("ground regional syntactic variations", result["research_objective"]["text"])

        # Limitations of Existing Work -> claimed_research_gap
        self.assertIsNotNone(result["claimed_research_gap"]["text"])
        self.assertIn("ignore phonetic drift", result["claimed_research_gap"]["text"])

        # Proposed Approach -> proposed_method
        self.assertIsNotNone(result["proposed_method"]["text"])
        self.assertIn("adaptive anchor projection layer", result["proposed_method"]["text"])

        # Novelty -> expected_contribution
        self.assertIsNotNone(result["expected_contribution"]["text"])
        self.assertIn("non-parametric phonetic clustering", result["expected_contribution"]["text"])

        # Performance Metrics -> evaluation_metrics
        self.assertIn("bleu", result["evaluation_metrics"]["items"])
        self.assertIn("perplexity", result["evaluation_metrics"]["items"])

        # Bibliography -> references
        self.assertEqual(len(result["references"]["items"]), 2)

    def test_missing_sections_no_hallucinations(self):
        """CRITICAL: Missing sections must be returned as None / empty, not invented."""
        result = extract_research_information(MISSING_SECTIONS_MANUSCRIPT, "minimal.txt")

        # Found fields
        self.assertIsNotNone(result["title"]["text"])
        self.assertIsNotNone(result["abstract"]["text"])
        self.assertIsNotNone(result["proposed_method"]["text"])
        self.assertEqual(len(result["references"]["items"]), 1)

        # Missing fields MUST be None / empty
        self.assertIsNone(result["research_problem"]["text"])
        self.assertIsNone(result["research_problem"]["confidence"])

        self.assertIsNone(result["research_question"]["text"])
        self.assertIsNone(result["research_question"]["confidence"])

        self.assertIsNone(result["claimed_research_gap"]["text"])
        self.assertIsNone(result["claimed_research_gap"]["confidence"])

        self.assertIsNone(result["dataset_context"]["text"])
        self.assertIsNone(result["dataset_context"]["confidence"])

        self.assertIsNone(result["expected_contribution"]["text"])
        self.assertIsNone(result["expected_contribution"]["confidence"])

        self.assertEqual(result["keywords"]["items"], [])
        self.assertIsNone(result["keywords"]["confidence"])

        # Verified metadata accurately reports missing fields count
        self.assertGreaterEqual(result["extraction_metadata"]["fields_missing"], 5)

    def test_unheaded_manuscript_discourse_markers(self):
        """Unheaded paper extracts fields via academic discourse markers."""
        result = extract_research_information(UNHEADED_MANUSCRIPT, "urban_air.txt")

        # Inferred title from top line
        self.assertIsNotNone(result["title"]["text"])
        self.assertIn("Urban Air Quality Forecasting", result["title"]["text"])

        # Discourse-matched research problem
        self.assertIsNotNone(result["research_problem"]["text"])
        self.assertIn("severe spatial sparsity of ground monitoring stations", result["research_problem"]["text"])
        self.assertEqual(result["research_problem"]["confidence"], "medium")

        # Discourse-matched objective
        self.assertIsNotNone(result["research_objective"]["text"])
        self.assertIn("infer fine-grained particulate concentrations", result["research_objective"]["text"])

        # Discourse-matched claimed research gap
        self.assertIsNotNone(result["claimed_research_gap"]["text"])
        self.assertIn("insufficiently studied", result["claimed_research_gap"]["text"])

        # Discourse-matched proposed method
        self.assertIsNotNone(result["proposed_method"]["text"])
        self.assertIn("spatio-temporal graph attention network", result["proposed_method"]["text"])

        # Metrics and claims detected
        self.assertIn("root mean squared error", result["evaluation_metrics"]["items"])
        self.assertGreater(len(result["major_claims"]["items"]), 0)

    def test_empty_text_safe_handling(self):
        result = extract_research_information("", "empty.txt")
        self.assertEqual(result["extraction_metadata"]["fields_found"], 0)
        self.assertEqual(result["extraction_metadata"]["fields_missing"], 13)
        self.assertIsNone(result["title"]["text"])
        self.assertEqual(result["keywords"]["items"], [])

    def test_multiple_references_parsing(self):
        raw_refs = (
            "[1] Vaswani, A., et al. (2017). Attention is all you need. NeurIPS, 30.\n"
            "[2] Devlin, J., et al. (2018). BERT: Pre-training of deep bidirectional transformers. NAACL.\n"
            "[3] Radford, A., et al. (2019). Language models are unsupervised multitask learners. OpenAI."
        )
        refs, conf = _extract_references(raw_refs)
        self.assertEqual(len(refs), 3)
        self.assertEqual(conf, "high")
        self.assertIn("Attention is all you need", refs[0])
        self.assertIn("BERT", refs[1])
        self.assertIn("Radford", refs[2])

    def test_major_claims_extraction(self):
        text = (
            "We propose a novel contrastive architecture for dense retrieval. "
            "Our method achieves an NDCG@10 of 74.2% on MS MARCO. "
            "It outperforms BM25 and previous dense models significantly. "
            "Tomorrow is a cloudy day with low probability of rain."
        )
        claims = extract_research_information(text)["major_claims"]["items"]
        self.assertGreaterEqual(len(claims), 2)
        # Verify weather filler sentence was NOT extracted as an academic claim
        for claim in claims:
            self.assertNotIn("cloudy day", claim)


class TestResearchExtractorAPI(unittest.TestCase):
    """API integration tests for POST /api/manuscripts/extract-research-info."""

    def setUp(self):
        self.client = TestClient(app)

    def test_api_extract_research_info_success(self):
        payload = {
            "text": STANDARD_MANUSCRIPT,
            "file_name": "crop_paper.txt",
        }
        response = self.client.post("/api/manuscripts/extract-research-info", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn("title", data)
        self.assertIn("abstract", data)
        self.assertIn("claimed_research_gap", data)
        self.assertIn("proposed_method", data)
        self.assertIn("evaluation_metrics", data)
        self.assertIn("extraction_metadata", data)

        self.assertEqual(data["title"]["confidence"], "high")
        self.assertIn("insufficiently studied", data["claimed_research_gap"]["text"])
        self.assertGreaterEqual(data["extraction_metadata"]["fields_found"], 10)

    def test_api_empty_text_rejected(self):
        payload = {"text": "   \n\t   ", "file_name": "blank.txt"}
        response = self.client.post("/api/manuscripts/extract-research-info", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json().get("detail", "").lower())


if __name__ == "__main__":
    unittest.main()
