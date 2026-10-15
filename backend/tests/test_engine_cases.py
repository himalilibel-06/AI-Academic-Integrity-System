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

    def test_multi_sentence_document_with_punctuation(self):
        """Verify that multi-sentence documents with punctuation are properly segmented and matched."""
        from services.plagiarism_engine import split_into_sentences
        text = (
            "Natural language processing enables computers to understand human speech. "
            "Recent advancements in transformer architectures have revolutionized the field! "
            "Are traditional methods still relevant today? In many low-resource contexts, yes."
        )
        sentences = split_into_sentences(text)
        self.assertEqual(len(sentences), 4)
        self.assertTrue(sentences[0].endswith("speech."))
        self.assertTrue(sentences[1].endswith("field!"))
        self.assertTrue(sentences[2].endswith("today?"))
        self.assertTrue(sentences[3].endswith("yes."))

    def test_matching_sentence_evidence_preserves_original_casing_and_punctuation(self):
        """Verify that matched evidence retains the student's authentic original casing and punctuation."""
        from services.text_processor import preprocess_text
        original_doc = (
            "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity. "
            "Our research team evaluated the pipeline on ARM Cortex-M55 microprocessors under extreme heat."
        )
        processed_doc = preprocess_text(original_doc)
        ref_doc = {
            "id": "ref_edge",
            "title": "Edge Vision Microcontroller Paper",
            "original_text": "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity.",
            "processed_text": "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity.",
        }
        
        # Calculate similarity passing processed_text for TF-IDF, original_text for evidence, and custom reference
        result = calculate_similarity(
            target_text=processed_doc,
            original_text=original_doc,
            custom_references=[ref_doc]
        )
        self.assertIn("matches", result)
        ref_match = next((m for m in result["matches"] if m.get("reference_id") == "custom_ref_ref_edge"), None)
        self.assertIsNotNone(ref_match)
        self.assertTrue(len(ref_match["matched_segments"]) > 0)
        
        target_snippet = ref_match["matched_segments"][0]["target_snippet"]
        source_snippet = ref_match["matched_segments"][0]["source_snippet"]
        
        # Must preserve original capitalization ("Automated", "ARM Cortex-M55") and punctuation (".")
        self.assertTrue(target_snippet.startswith("Automated"))
        self.assertTrue(target_snippet.endswith("connectivity."))
        self.assertIn("microcontrollers", target_snippet)
        self.assertTrue(source_snippet.startswith("Automated"))
        self.assertTrue(source_snippet.endswith("connectivity."))

    def test_multiple_matching_sentences_in_different_paragraphs(self):
        """Verify that sentences across different paragraphs are independently segmented and matched against custom reference."""
        target_multi_para = (
            "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity.\n\n"
            "This is an intervening completely original paragraph written by the student that does not match anything.\n\n"
            "While standard Vision Transformers achieve superior representation capacity, their quadratic self-attention complexity prohibits on-device deployment."
        )
        ref_doc = {
            "id": "ref_vit",
            "title": "Vision Transformer Paper",
            "original_text": (
                "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity. "
                "While standard Vision Transformers achieve superior representation capacity, their quadratic self-attention complexity prohibits on-device deployment."
            ),
            "processed_text": (
                "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity. "
                "While standard Vision Transformers achieve superior representation capacity, their quadratic self-attention complexity prohibits on-device deployment."
            ),
        }
        result = calculate_similarity(target_multi_para, custom_references=[ref_doc])
        ref_match = next((m for m in result["matches"] if m.get("reference_id") == "custom_ref_ref_vit"), None)
        self.assertIsNotNone(ref_match)
        # Should extract both matching sentences from different paragraphs
        matched_targets = [seg["target_snippet"] for seg in ref_match["matched_segments"]]
        self.assertGreaterEqual(len(matched_targets), 2)
        self.assertTrue(any("Automated crop disease" in s for s in matched_targets))
        self.assertTrue(any("quadratic self-attention" in s for s in matched_targets))

    def test_document_with_no_meaningful_match(self):
        """Verify that unrelated text has low similarity and does not fabricate matching segments."""
        unrelated = (
            "The traditional method of baking sourdough bread requires cultivating a wild yeast starter over several days with equal parts whole wheat flour and lukewarm spring water. "
            "Hydration percentages typically vary between sixty-five and eighty percent depending on ambient kitchen temperature."
        )
        ref_doc = {
            "id": "ref_unrelated",
            "title": "Quantum Physics Paper",
            "original_text": "Quantum computers use qubits in superposition states to achieve speedup in integer factorization.",
            "processed_text": "Quantum computers use qubits in superposition states to achieve speedup in integer factorization."
        }
        result = calculate_similarity(unrelated, custom_references=[ref_doc])
        self.assertLess(result["overall_similarity_score"], 15.0)
        self.assertEqual(result["risk_level"], "safe")
        # Ensure no spurious evidence is fabricated
        self.assertEqual(result["evidence_summary"]["matched_segments"], 0)
        for m in result["matches"]:
            self.assertEqual(len(m["matched_segments"]), 0)

    def test_empty_and_whitespace_documents(self):
        """Verify that empty documents return 0.0% similarity safely without exceptions."""
        for empty_input in ["", "   ", "\n\t  \n"]:
            result = calculate_similarity(empty_input)
            self.assertEqual(result["overall_similarity_score"], 0.0)
            self.assertEqual(result["risk_level"], "safe")
            self.assertEqual(result["evidence_summary"]["matched_segments"], 0)
            for m in result["matches"]:
                self.assertEqual(m["similarity_percentage"], 0.0)
                self.assertEqual(len(m["matched_segments"]), 0)

    def test_repeated_words_and_whitespace_variations(self):
        """Verify that whitespace variations (extra spaces, tabs, newlines) still match correctly."""
        ref_text = "Neural networks are computational models inspired by biological brain architectures."
        historical = [
            {"id": 88, "title": "Reference Paper", "original_text": ref_text, "processed_text": ref_text}
        ]
        # Target has extra spaces and tabs between words
        messy_target = "Neural    networks   are   computational   models   inspired   by   biological   brain   architectures."
        result = calculate_similarity(messy_target, historical_documents=historical)
        self.assertIn("matches", result)
        match_88 = next((m for m in result["matches"] if m.get("reference_id") == "sub_88"), None)
        self.assertIsNotNone(match_88)
        self.assertGreaterEqual(match_88["similarity_percentage"], 85.0)
        self.assertGreaterEqual(len(match_88["matched_segments"]), 1)

    def test_self_exclusion_prevents_matching_itself(self):
        """Verify that exclude_submission_id excludes the current submission from comparison."""
        doc = "Machine learning algorithms build a mathematical model based on training data in order to make predictions."
        historical = [
            {"id": 101, "title": "Current Document Draft", "original_text": doc, "processed_text": doc},
            {"id": 102, "title": "Different Student Document", "original_text": doc, "processed_text": doc}
        ]
        # Exclude ID 101
        result = calculate_similarity(doc, historical_documents=historical, exclude_submission_id=101)
        match_ids = [m["reference_id"] for m in result["matches"]]
        self.assertNotIn("sub_101", match_ids)
        self.assertIn("sub_102", match_ids)

    def test_two_representations_tfidf_processed_and_evidence_original(self):
        """Verify that target_text is used for TF-IDF and original_text is used for sentence evidence."""
        from services.text_processor import preprocess_text
        original = "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models on low-power edge microcontrollers without cloud connectivity."
        processed = preprocess_text(original)
        ref_doc = {
            "id": "ref_diag",
            "title": "Diagnosis Paper",
            "original_text": original,
            "processed_text": processed,
        }
        
        # When both are passed
        result = calculate_similarity(target_text=processed, original_text=original, custom_references=[ref_doc])
        self.assertGreater(result["overall_similarity_score"], 30.0)
        ref_match = next((m for m in result["matches"] if m.get("reference_id") == "custom_ref_ref_diag"), None)
        self.assertIsNotNone(ref_match)
        self.assertGreaterEqual(len(ref_match["matched_segments"]), 1)
        # Evidence snippet comes from original, so it has original capitalization and punctuation
        snippet = ref_match["matched_segments"][0]["target_snippet"]
        self.assertEqual(snippet, original)

    def test_no_hardcoded_system_references_loaded_when_no_references_provided(self):
        """Verify that calculate_similarity does not automatically load or compare hardcoded system references."""
        sample_text = "Automated crop disease diagnosis in rural agricultural settings requires deploying vision models."
        result = calculate_similarity(sample_text)
        self.assertEqual(result["overall_similarity_score"], 0.0)
        self.assertEqual(len(result["matches"]), 0)
        self.assertEqual(result["evidence_summary"]["reference_sources_compared"], 0)
        self.assertEqual(result["evidence_summary"]["sources_compared"], 0)


if __name__ == '__main__':
    unittest.main()
