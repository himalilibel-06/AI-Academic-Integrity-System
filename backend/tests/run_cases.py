import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import json
from services.plagiarism_engine import calculate_similarity

doc1 = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs."
doc2 = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs."
doc_b = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. This is a very interesting topic in computer science."
doc3 = "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers. Quantum computers are machines that use the properties of quantum physics to store data and perform computations."
historical_docs = [
    {"id": 1, "title": "AI Paper", "processed_text": doc1, "original_text": doc1}
]

print("CASE A: Identical Documents")
print(json.dumps(calculate_similarity(doc1, historical_docs)["overall_similarity_score"]))

print("CASE B: Substantial Shared Text")
print(json.dumps(calculate_similarity(doc_b, historical_docs)["overall_similarity_score"]))

print("CASE C: Unrelated Documents")
print(json.dumps(calculate_similarity(doc3, historical_docs)["overall_similarity_score"]))

print("CASE D: Empty Document")
print(json.dumps(calculate_similarity("a", historical_docs)["overall_similarity_score"]))

print("CASE H: Duplicate References")
dup_docs = [
    {"id": 1, "title": "AI Paper", "processed_text": doc1},
    {"id": 2, "title": "AI Paper Copy", "processed_text": doc1}
]
print(json.dumps(calculate_similarity(doc1, dup_docs)["overall_similarity_score"]))
