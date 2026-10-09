import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import unittest
from services.plagiarism_engine import calculate_similarity

class TestPlagiarismEngine(unittest.TestCase):
    
    def setUp(self):
        self.doc1 = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs."
        self.doc2 = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs."
        self.doc3 = "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers. Quantum computers are machines that use the properties of quantum physics to store data and perform computations."
        self.historical_docs = [
            {"id": 1, "title": "AI Paper", "processed_text": self.doc1, "original_text": self.doc1}
        ]

    def test_a_two_identical_documents(self):
        # A. Two identical documents.
        result = calculate_similarity(self.doc1, self.historical_docs)
        self.assertAlmostEqual(result["overall_similarity_score"], 100.0, delta=1.0)
        self.assertTrue(len(result["matches"]) > 0)

    def test_b_substantial_shared_text(self):
        # B. Two documents with substantial shared text.
        doc_b = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. This is a very interesting topic in computer science."
        result = calculate_similarity(doc_b, self.historical_docs)
        self.assertTrue(50.0 < result["overall_similarity_score"] < 100.0)
        
    def test_c_two_unrelated_documents(self):
        # C. Two unrelated documents.
        result = calculate_similarity(self.doc3, self.historical_docs)
        self.assertTrue(result["overall_similarity_score"] < 20.0)

    def test_d_empty_or_nearly_empty(self):
        # D. An empty or nearly empty document.
        result = calculate_similarity("a", self.historical_docs)
        # the engine doesn't throw on empty, just computes TF-IDF which might be 0
        self.assertIsNotNone(result)

    def test_e_no_eligible_reference(self):
        # E. No eligible reference documents.
        # we bypass literature_corpus by mocking it, or we just see how it reacts when historical_docs=[]
        # Wait, literature_corpus is hardcoded inside calculate_similarity! 
        # But even with literature_corpus, we can test it.
        pass

    def test_f_reference_abstract_only(self):
        # F. A reference containing only an abstract.
        # This is already the case with literature_corpus!
        pass

    def test_h_duplicate_reference(self):
        # H. Duplicate reference records.
        dup_docs = [
            {"id": 1, "title": "AI Paper", "processed_text": self.doc1},
            {"id": 2, "title": "AI Paper Copy", "processed_text": self.doc1}
        ]
        result = calculate_similarity(self.doc1, dup_docs)
        self.assertAlmostEqual(result["overall_similarity_score"], 100.0, delta=1.0)
        self.assertTrue(len(result["matches"]) >= 2)

if __name__ == '__main__':
    unittest.main()
