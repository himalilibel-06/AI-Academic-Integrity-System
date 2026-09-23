import re
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Baseline academic reference corpus
REFERENCE_CORPUS = [
    {
        "id": "ref_1",
        "title": "Artificial Intelligence",
        "text": "Artificial intelligence is a field of computer science that focuses on creating intelligent systems."
    },
    {
        "id": "ref_2",
        "title": "Machine Learning",
        "text": "Machine learning allows computer systems to learn from data and improve their performance."
    },
    {
        "id": "ref_3",
        "title": "Academic Integrity",
        "text": "Academic integrity ensures honesty, originality, and responsible behavior in educational work."
    }
]


def split_into_sentences(text: str) -> list:
    """
    Split text into individual sentences, stripping excess whitespace
    and filtering out trivially short fragments.
    """
    if not text:
        return []
    raw_sentences = re.split(r'(?<=[.!?])\s+|\n+', text)
    sentences = []
    for s in raw_sentences:
        clean = s.strip()
        if len(clean) >= 15 and len(clean.split()) >= 3:
            sentences.append(clean)

    if not sentences and text.strip():
        sentences = [text.strip()]
    return sentences


def extract_matching_segments(target_text: str, reference_text: str, threshold: float = 0.6) -> list:
    """
    Identify meaningful overlapping sentences/passages between target text
    and reference text using fuzzy sequence matching and token overlap.
    Returns structured data with target_snippet, source_snippet, and similarity.
    """
    target_sentences = split_into_sentences(target_text)
    ref_sentences = split_into_sentences(reference_text)

    if not target_sentences or not ref_sentences:
        return []

    matches = []
    seen_targets = set()

    for t_sent in target_sentences:
        t_lower = t_sent.lower()
        t_tokens = set(re.findall(r'\w+', t_lower))
        if not t_tokens:
            continue

        best_score = 0.0
        best_ref = None

        for r_sent in ref_sentences:
            r_lower = r_sent.lower()
            r_tokens = set(re.findall(r'\w+', r_lower))
            if not r_tokens:
                continue

            common_tokens = t_tokens & r_tokens
            if not common_tokens:
                continue

            token_ratio = len(common_tokens) / max(len(t_tokens | r_tokens), 1)
            if token_ratio < (threshold * 0.35):
                continue

            sim_ratio = SequenceMatcher(None, t_lower, r_lower).ratio()
            if sim_ratio > best_score:
                best_score = sim_ratio
                best_ref = r_sent

        if best_score >= threshold and best_ref:
            if t_sent not in seen_targets:
                seen_targets.add(t_sent)
                matches.append({
                    "target_snippet": t_sent,
                    "source_snippet": best_ref,
                    "similarity": round(best_score * 100, 1)
                })

    matches.sort(key=lambda x: x["similarity"], reverse=True)
    return matches[:5]


def calculate_similarity(target_text: str, historical_documents: list = None):
    """
    Compare the uploaded document with reference documents and historical submissions
    using TF-IDF, cosine similarity, and sentence-level evidence extraction.

    The existing similarity fields are preserved for compatibility.
    An additional evidence_summary is returned for the EduGuard system.
    """
    all_corpus = []

    # 1. Reference corpus documents
    for doc in REFERENCE_CORPUS:
        all_corpus.append({
            "id": doc["id"],
            "title": doc["title"],
            "text": doc["text"],
            "type": "Academic Reference Corpus"
        })

    # 2. Relevant previous submissions
    peer_submission_count = 0

    if historical_documents:
        for sub in historical_documents:
            sub_dict = dict(sub) if not isinstance(sub, dict) else sub
            sub_text = (
                sub_dict.get("processed_text")
                or sub_dict.get("original_text")
                or ""
            ).strip()

            if sub_text:
                all_corpus.append({
                    "id": f"sub_{sub_dict['id']}",
                    "title": f"Peer Submission: {sub_dict.get('title', 'Academic Paper')}",
                    "text": sub_text,
                    "type": "Student Submission Archive"
                })
                peer_submission_count += 1

    reference_texts = [d["text"] for d in all_corpus]

    if not reference_texts:
        return {
            "overall_similarity_score": 0.0,
            "risk_level": "safe",
            "matches": [],
            "evidence_summary": {
                "sources_compared": 0,
                "reference_sources_compared": 0,
                "peer_submissions_compared": 0,
                "matched_segments": 0,
                "strongest_match": None,
                "review_note": "No comparison sources were available."
            }
        }

    # 3. TF-IDF similarity calculation
    all_documents = reference_texts + [target_text]

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(all_documents)

    target_vector = tfidf_matrix[-1]
    reference_vectors = tfidf_matrix[:-1]

    similarity_scores = cosine_similarity(
        target_vector,
        reference_vectors
    )[0]

    # 4. Build evidence for every comparison source
    matches = []

    for index, score in enumerate(similarity_scores):
        similarity_percentage = float(score) * 100
        ref_doc = all_corpus[index]

        matched_segments = extract_matching_segments(
            target_text,
            ref_doc["text"],
            threshold=0.5
        )

        matches.append({
            "reference_id": ref_doc["id"],
            "title": ref_doc["title"],
            "type": ref_doc["type"],
            "similarity_percentage": round(similarity_percentage, 2),
            "matched_segments": matched_segments
        })

    # Highest similarity first
    matches.sort(
        key=lambda m: m["similarity_percentage"],
        reverse=True
    )

    # 5. Overall similarity
    highest_similarity = (
        max(similarity_scores) * 100
        if len(similarity_scores) > 0
        else 0.0
    )

    # Keep existing risk levels for compatibility
    if highest_similarity < 15:
        risk_level = "safe"
    elif highest_similarity <= 40:
        risk_level = "review_required"
    else:
        risk_level = "high_risk"

    # 6. Count sentence-level evidence
    total_matched_segments = sum(
        len(match["matched_segments"])
        for match in matches
    )

    # 7. Identify strongest comparison source
    strongest_match = None

    if matches:
        strongest_match = {
            "title": matches[0]["title"],
            "type": matches[0]["type"],
            "similarity_percentage": matches[0]["similarity_percentage"]
        }

    # 8. Generate neutral review note
    if highest_similarity < 15:
        review_note = (
            "Low similarity evidence was observed across the comparison sources."
        )
    elif highest_similarity <= 40:
        review_note = (
            "Similarity evidence was observed and may benefit from teacher review."
        )
    else:
        review_note = (
            "Strong similarity evidence was observed and should be reviewed "
            "by the teacher together with the matched passages."
        )

    # 9. Explainable evidence summary
    evidence_summary = {
        "sources_compared": len(all_corpus),
        "reference_sources_compared": len(REFERENCE_CORPUS),
        "peer_submissions_compared": peer_submission_count,
        "matched_segments": total_matched_segments,
        "strongest_match": strongest_match,
        "review_note": review_note
    }

    # 10. Return existing fields + new EduGuard evidence
    return {
        "overall_similarity_score": round(
            float(highest_similarity),
            2
        ),
        "risk_level": risk_level,
        "matches": matches,
        "evidence_summary": evidence_summary
    }