from utils.document_extractor import extract_text
from services.text_processor import preprocess_text
from services.plagiarism_engine import calculate_similarity


def analyze_document(file_bytes: bytes, filename: str):
    """
    Complete plagiarism analysis pipeline.

    1. Extract text from the uploaded document
    2. Preprocess the extracted text
    3. Calculate similarity with reference documents
    4. Return the analysis result
    """

    # Step 1: Extract text
    extracted_text = extract_text(file_bytes, filename)

    if not extracted_text.strip():
        raise ValueError("The uploaded document contains no readable text.")

    # Step 2: Preprocess text
    processed_text = preprocess_text(extracted_text)

    if not processed_text.strip():
        raise ValueError("No meaningful text found after preprocessing.")

    # Step 3: Calculate plagiarism similarity
    result = calculate_similarity(processed_text)

    # Step 4: Add basic document information
    result["filename"] = filename
    result["original_text_length"] = len(extracted_text)
    result["processed_text_length"] = len(processed_text)

    return result