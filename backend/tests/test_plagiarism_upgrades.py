import os
import sqlite3
import pytest
from pathlib import Path

from models.custom_reference import (
    create_custom_reference,
    get_custom_reference_by_id,
    update_custom_reference_metadata,
    delete_custom_reference,
)
from models.report import (
    create_plagiarism_report,
    get_report_by_id,
    update_report_review,
)
from models.submission import create_submission, get_submission_by_id
from models.user import create_user
from services.plagiarism_engine import calculate_similarity
from routes.reports import build_pdf_report, generate_audit_hash


@pytest.fixture
def test_db():
    """Create an isolated in-memory SQLite test database with required tables."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Schema
    cursor.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            professor_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_id INTEGER,
            title TEXT NOT NULL,
            filename TEXT,
            file_path TEXT,
            file_type TEXT,
            original_text TEXT,
            processed_text TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE plagiarism_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL,
            overall_similarity_score REAL DEFAULT 0.0,
            risk_level TEXT DEFAULT 'safe',
            matches TEXT,
            review_status TEXT DEFAULT 'pending',
            professor_feedback TEXT,
            reviewed_by INTEGER,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            evidence_details TEXT
        );

        CREATE TABLE custom_references (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            author TEXT,
            publication_year TEXT,
            research_field TEXT,
            filename TEXT,
            file_path TEXT,
            original_text TEXT,
            processed_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    yield conn
    conn.close()


def test_custom_reference_metadata_update_and_ownership(test_db):
    """Test editing custom reference metadata and ownership security."""
    user1_id = create_user(test_db, "Scholar One", "scholar1@test.edu", "pass123", "student")
    user2_id = create_user(test_db, "Scholar Two", "scholar2@test.edu", "pass123", "student")

    ref_id = create_custom_reference(
        connection=test_db,
        user_id=user1_id,
        title="Initial Reference Title",
        author="Original Author",
        publication_year="2021",
        research_field="Computer Science",
        filename="ref.pdf",
        original_text="Some reference content for citation testing.",
        processed_text="reference content citation testing",
    )

    # 1. Update with valid owner
    updated = update_custom_reference_metadata(
        connection=test_db,
        reference_id=ref_id,
        user_id=user1_id,
        title="Updated Reference Title",
        author="Lead Author, Co-Author",
        publication_year="2023",
        research_field="Machine Learning",
    )
    assert updated is True

    record = get_custom_reference_by_id(test_db, ref_id)
    assert record["title"] == "Updated Reference Title"
    assert record["author"] == "Lead Author, Co-Author"
    assert record["publication_year"] == "2023"
    assert record["research_field"] == "Machine Learning"

    # 2. Ownership enforcement: Scholar Two cannot update Scholar One's reference
    unauthorized_update = update_custom_reference_metadata(
        connection=test_db,
        reference_id=ref_id,
        user_id=user2_id,
        title="Hacked Title",
    )
    assert unauthorized_update is False

    # Title must remain unchanged
    record_after = get_custom_reference_by_id(test_db, ref_id)
    assert record_after["title"] == "Updated Reference Title"


def test_pdf_report_generation(test_db):
    """Test that build_pdf_report generates a valid PDF with all required sections."""
    report = {
        "id": 42,
        "overall_similarity_score": 34.8,
        "risk_level": "review_required",
        "review_status": "reviewed",
        "professor_feedback": "Academic citation formatting is acceptable.",
        "created_at": "2026-10-12 12:00:00",
    }
    submission = {
        "id": 101,
        "title": "Neural Architectures in Natural Language Processing",
        "student_name": "Antonia Scholar",
        "student_email": "antonia@test.edu",
        "course_code": "CS701",
        "course_name": "Deep Learning Systems",
        "filename": "nlp_manuscript.pdf",
    }
    matches = [
        {
            "reference_id": "ref_1",
            "title": "Attention Is All You Need (Vaswani et al.)",
            "type": "Academic Reference Corpus",
            "similarity_percentage": 34.8,
            "matched_segments": [
                {
                    "target_snippet": "We propose the Transformer, a model architecture eschewing recurrence.",
                    "source_snippet": "The Transformer is the first transduction model relying entirely on self-attention.",
                    "similarity": 78.5,
                }
            ],
        }
    ]
    audit_hash = generate_audit_hash(
        report_id=report["id"],
        submission_id=submission["id"],
        student_email=submission["student_email"],
        score=report["overall_similarity_score"],
        created_at=report["created_at"],
    )

    pdf_bytes = build_pdf_report(report, submission, matches, audit_hash)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_plagiarism_engine_similarity_scenarios(test_db):
    """Test plagiarism detection with identical, partially overlapping, and unrelated documents."""
    base_text = (
        "Convolutional neural networks have revolutionized the field of computer vision. "
        "By utilizing localized receptive fields and shared spatial weights, they drastically "
        "reduce the number of trainable parameters compared to fully connected architectures. "
        "Residual connections further enable the training of substantially deeper models without degradation."
    )

    # 1. Identical document
    identical_res = calculate_similarity(
        target_text=base_text,
        custom_references=[{
            "id": 1,
            "title": "Deep Residual Vision Networks",
            "original_text": base_text,
            "processed_text": base_text,
        }],
    )
    assert identical_res["overall_similarity_score"] > 85.0
    assert identical_res["risk_level"] == "high_risk"
    assert len(identical_res["matches"]) > 0

    # 2. Partially overlapping document
    partial_text = (
        "Convolutional neural networks have revolutionized computer vision applications. "
        "However, our proposed method focuses purely on transformer attention mechanisms in agriculture."
    )
    partial_res = calculate_similarity(
        target_text=partial_text,
        custom_references=[{
            "id": 1,
            "title": "Deep Residual Vision Networks",
            "original_text": base_text,
            "processed_text": base_text,
        }],
    )
    # Cosine score should reflect overlap but not be 100%
    assert 10.0 <= partial_res["overall_similarity_score"] <= 80.0

    # 3. Unrelated document
    unrelated_text = (
        "Ancient Hellenic philosophy and Aristotelian rhetoric explored civic virtue in city-states. "
        "Classical Athenian democracy prioritized public oratory and legislative assembly debates."
    )
    unrelated_res = calculate_similarity(
        target_text=unrelated_text,
        custom_references=[{
            "id": 1,
            "title": "Deep Residual Vision Networks",
            "original_text": base_text,
            "processed_text": base_text,
        }],
    )
    assert unrelated_res["overall_similarity_score"] < 15.0
    assert unrelated_res["risk_level"] == "safe"


def test_professor_review_persistence(test_db):
    """Test that professor review decisions and feedback persist correctly."""
    user_id = create_user(test_db, "Student", "student@test.edu", "pass123", "student")
    prof_id = create_user(test_db, "Professor", "prof@test.edu", "pass123", "professor")

    sub_id = create_submission(
        connection=test_db,
        student_id=user_id,
        course_id=None,
        title="Literature Survey",
        filename="survey.pdf",
        original_text="Survey on generative models.",
        processed_text="survey generative models",
    )

    rep_id = create_plagiarism_report(
        connection=test_db,
        submission_id=sub_id,
        overall_similarity_score=22.5,
        risk_level="review_required",
        matches=[],
        review_status="pending",
    )

    # Professor records decision
    update_report_review(
        connection=test_db,
        report_id=rep_id,
        review_status="reviewed",
        professor_feedback="Appropriate citations; no academic policy breach identified.",
        reviewed_by=prof_id,
    )

    refetched = get_report_by_id(test_db, rep_id)
    assert refetched["review_status"] == "reviewed"
    assert refetched["professor_feedback"] == "Appropriate citations; no academic policy breach identified."
    assert refetched["reviewed_by"] == prof_id
