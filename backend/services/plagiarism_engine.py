from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# Temporary reference documents
# Later these will come from our database.
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


def calculate_similarity(target_text: str):
    """
    Compare the uploaded document with reference documents
    using TF-IDF and cosine similarity.
    """

    reference_texts = [
        document["text"]
        for document in REFERENCE_CORPUS
    ]

    # Combine reference documents and target document
    all_documents = reference_texts + [target_text]

    # Convert documents into TF-IDF vectors
    vectorizer = TfidfVectorizer()

    tfidf_matrix = vectorizer.fit_transform(all_documents)

    # Last vector belongs to the uploaded document
    target_vector = tfidf_matrix[-1]

    # All previous vectors are reference documents
    reference_vectors = tfidf_matrix[:-1]

    # Calculate cosine similarity
    similarity_scores = cosine_similarity(
        target_vector,
        reference_vectors
    )[0]

    matches = []

    for index, score in enumerate(similarity_scores):

        similarity_percentage = float(score) * 100

        matches.append({
            "reference_id": REFERENCE_CORPUS[index]["id"],
            "title": REFERENCE_CORPUS[index]["title"],
            "similarity_percentage": round(
                similarity_percentage,
                2
            )
        })

    # Highest similarity found
    highest_similarity = max(similarity_scores) * 100

    # Determine risk level
    if highest_similarity < 15:
        risk_level = "safe"

    elif highest_similarity <= 40:
        risk_level = "review_required"

    else:
        risk_level = "high_risk"

    return {
        "overall_similarity_score": round(
            float(highest_similarity),
            2
        ),
        "risk_level": risk_level,
        "matches": matches
    }