import io

import pdfplumber
from docx import Document


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract text from a TXT file."""
    return file_bytes.decode("utf-8", errors="ignore")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    text = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                text.append(page_text)

    return "\n".join(text)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    document = Document(io.BytesIO(file_bytes))

    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n".join(paragraphs)


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Extract text based on the uploaded file extension.
    """

    filename = filename.lower()

    if filename.endswith(".txt"):
        return extract_text_from_txt(file_bytes)

    elif filename.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)

    elif filename.endswith(".docx"):
        return extract_text_from_docx(file_bytes)

    else:
        raise ValueError(
            "Unsupported file format. Please upload PDF, DOCX, or TXT."
        )