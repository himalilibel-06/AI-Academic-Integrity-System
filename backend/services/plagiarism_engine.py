import re
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def split_into_sentences(text: str) -> list:
    """
    Split text into individual sentences, stripping excess whitespace
    and filtering out trivially short fragments.
    Preserves original casing, wording, and sentence-ending punctuation.
    """
    if not text:
        return []
    raw_sentences = re.split(r'(?<=[.!?])\s+|\n+', text)
    sentences = []
    for s in raw_sentences:
        clean = " ".join(s.strip().split())
        if len(clean) >= 15 and len(clean.split()) >= 3:
            sentences.append(clean)

    if not sentences and text.strip():
        sentences = [" ".join(text.strip().split())]
    return sentences


def extract_matching_segments(target_text: str, reference_text: str, threshold: float = 0.6) -> list:
    """
    Identify meaningful overlapping sentences/passages between target text
    and reference text using fuzzy sequence matching and token overlap.
    Returns structured data with target_snippet, source_snippet, and similarity.
    Preserves original casing, punctuation, and wording in snippets.
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

        t_norm = " ".join(re.findall(r'\w+', t_lower))

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

            r_norm = " ".join(re.findall(r'\w+', r_lower))
            sim_ratio = SequenceMatcher(None, t_norm, r_norm).ratio()
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


def calculate_similarity(
    target_text: str,
    historical_documents: list = None,
    original_text: str = None,
    exclude_submission_id: any = None,
    custom_references: list = None,
):
    """
    Compare the uploaded document with reference documents, historical submissions,
    and scholar's custom reference resources using TF-IDF, cosine similarity,
    and sentence-level evidence extraction.

    - target_text: Text used for TF-IDF vectorization (typically processed_text).
    - original_text: Original extracted text preserving punctuation and casing,
      used for sentence segmentation and authentic evidence extraction. If None,
      target_text is used as evidence source.
    - exclude_submission_id: Optional submission ID to exclude from historical comparisons
      so a document is never compared against itself.
    - custom_references: Optional list of custom reference papers uploaded by the scholar.
    """
    all_corpus = []

    # 1. Custom scholar reference resources & analysis reference documents
    custom_reference_count = 0
    if custom_references:
        for ref in custom_references:
            ref_dict = dict(ref) if not isinstance(ref, dict) else ref
            ref_id = ref_dict.get("id")

            comp_text = (
                ref_dict.get("processed_text")
                or ref_dict.get("original_text")
                or ""
            ).strip()

            evid_text = (
                ref_dict.get("original_text")
                or ref_dict.get("processed_text")
                or ""
            ).strip()

            if comp_text:
                all_corpus.append({
                    "id": f"custom_ref_{ref_id}",
                    "title": ref_dict.get("title") or ref_dict.get("filename") or "Custom Reference Paper",
                    "filename": ref_dict.get("filename") or "",
                    "text": comp_text,
                    "evidence_text": evid_text or comp_text,
                    "type": "My Reference Resource"
                })
                custom_reference_count += 1

    # 2. Relevant previous submissions
    peer_submission_count = 0

    if historical_documents:
        for sub in historical_documents:
            sub_dict = dict(sub) if not isinstance(sub, dict) else sub

            # Exclude current submission if specified
            sub_id = sub_dict.get("id")
            if exclude_submission_id is not None and sub_id is not None:
                if str(sub_id) == str(exclude_submission_id):
                    continue

            # Text for vectorization: prefer processed_text, fallback to original_text
            comp_text = (
                sub_dict.get("processed_text")
                or sub_dict.get("original_text")
                or ""
            ).strip()

            # Text for sentence evidence extraction: prefer original_text, fallback to processed_text
            evid_text = (
                sub_dict.get("original_text")
                or sub_dict.get("processed_text")
                or ""
            ).strip()

            if comp_text:
                all_corpus.append({
                    "id": f"sub_{sub_id}",
                    "title": f"Peer Submission: {sub_dict.get('title', 'Academic Paper')}",
                    "text": comp_text,
                    "evidence_text": evid_text or comp_text,
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
                "custom_references_compared": 0,
                "matched_segments": 0,
                "strongest_match": None,
                "review_note": "No comparison sources were available."
            }
        }

    # Handle empty or whitespace-only target document
    if not target_text or not target_text.strip():
        matches = [
            {
                "reference_id": ref_doc["id"],
                "title": ref_doc["title"],
                "filename": ref_doc.get("filename", ""),
                "type": ref_doc["type"],
                "similarity_percentage": 0.0,
                "matched_segments": []
            }
            for ref_doc in all_corpus
        ]
        return {
            "overall_similarity_score": 0.0,
            "risk_level": "safe",
            "matches": matches,
            "evidence_summary": {
                "sources_compared": len(all_corpus),
                "reference_sources_compared": custom_reference_count,
                "peer_submissions_compared": peer_submission_count,
                "custom_references_compared": custom_reference_count,
                "matched_segments": 0,
                "strongest_match": None,
                "review_note": "Low similarity evidence was observed across the comparison sources."
            }
        }

    # Determine text for evidence segmentation vs text for TF-IDF
    evidence_target = (
        original_text.strip()
        if (original_text is not None and original_text.strip())
        else target_text.strip()
    )

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

        matched_segments = []
        if score > 0.0 and evidence_target:
            matched_segments = extract_matching_segments(
                evidence_target,
                ref_doc["evidence_text"],
                threshold=0.5
            )

        matches.append({
            "reference_id": ref_doc["id"],
            "title": ref_doc["title"],
            "filename": ref_doc.get("filename", ""),
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
        "reference_sources_compared": custom_reference_count,
        "peer_submissions_compared": peer_submission_count,
        "custom_references_compared": custom_reference_count,
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