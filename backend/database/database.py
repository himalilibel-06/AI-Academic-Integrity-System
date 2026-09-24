import sqlite3
from pathlib import Path


# Location of the SQLite database
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "academic_integrity.db"


def get_connection():
    """
    Create and return a connection to the SQLite database.
    Enforces foreign key constraint checks.
    """
    connection = sqlite3.connect(DATABASE_PATH)

    # Enable foreign key support in SQLite
    connection.execute("PRAGMA foreign_keys = ON;")

    # Allows column access by name
    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():
    """
    Create the required database tables and indexes safely.
    """

    connection = get_connection()
    cursor = connection.cursor()

    # 1. Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Safe non-destructive migration for extended profile and preferences columns
    cursor.execute("PRAGMA table_info(users)")
    existing_user_columns = {row["name"] for row in cursor.fetchall()}

    columns_to_add = [
        ("department", "TEXT DEFAULT ''"),
        ("institution", "TEXT DEFAULT ''"),
        ("phone", "TEXT DEFAULT ''"),
        ("preferences", "TEXT DEFAULT '{}'"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in existing_user_columns:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")

    # 2. Courses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            description TEXT,
            professor_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 3. Course Enrollments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(course_id, student_id),
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # 4. Submissions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_id INTEGER,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT,
            file_type TEXT,
            original_text TEXT,
            processed_text TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
        )
    """)

    # 5. Plagiarism Reports table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plagiarism_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER UNIQUE NOT NULL,
            overall_similarity_score REAL DEFAULT 0.0,
            risk_level TEXT DEFAULT 'safe',
            matches TEXT,
            review_status TEXT DEFAULT 'pending',
            professor_feedback TEXT,
            reviewed_by INTEGER,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        )
    """)
        # Safe migration for EduGuard explainable evidence
    cursor.execute("PRAGMA table_info(plagiarism_reports)")
    existing_report_columns = {
        row["name"] for row in cursor.fetchall()
    }

    if "evidence_details" not in existing_report_columns:
        cursor.execute(
            "ALTER TABLE plagiarism_reports "
            "ADD COLUMN evidence_details TEXT DEFAULT '{}'"
        )

    # 6. Research Projects table (Prototype research-project registry)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS research_projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            domain TEXT,
            student_id TEXT DEFAULT '',
            research_problem TEXT,
            research_objective TEXT,
            claimed_research_gap TEXT,
            proposed_method TEXT,
            expected_contribution TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("PRAGMA table_info(research_projects)")
    existing_project_columns = {
        row["name"] for row in cursor.fetchall()
    }
    if "student_id" not in existing_project_columns:
        cursor.execute(
            "ALTER TABLE research_projects "
            "ADD COLUMN student_id TEXT DEFAULT ''"
        )

    # 7. Faculty Reviews table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS faculty_reviews (
            review_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            project_title TEXT NOT NULL,
            student_id TEXT,
            reviewer_id TEXT,
            reviewer_name TEXT,
            status TEXT NOT NULL DEFAULT 'Not Reviewed',
            comments TEXT NOT NULL DEFAULT '{}',
            recommendations TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed default research projects if empty
    cursor.execute("SELECT COUNT(*) AS cnt FROM research_projects")
    if cursor.fetchone()["cnt"] == 0:
        default_projects = [
            (
                "proj-01",
                "Explainable Contrastive Learning for Multi-Modal Medical Diagnostics",
                "Healthcare AI & Bioinformatics",
                "Current clinical vision-language models produce opaque attribution maps, preventing radiologists from verifying if diagnoses stem from true pathology or spurious background artifacts.",
                "Develop an explainable cross-modal contrastive framework that aligns localized visual attention tokens directly with structured diagnostic ontology terms.",
                "Existing contrastive pretraining methods align global representation vectors without localized grounding, failing to guarantee token-level clinical interpretability across divergent radiographic modalities.",
                "We introduce a dual-encoder architecture with a localized cross-attention attribution layer that projects patch-level image tokens onto concept-specific medical ontologies (RadLex/UMLS), supervised via a contrastive alignment loss.",
                "A novel ontology-grounded cross-modal contrastive learning formulation providing pixel-level explainable attribution bounds with provable clinical alignment.",
            ),
            (
                "proj-02",
                "Differential Privacy in Federated Knowledge Graph Embeddings",
                "Cybersecurity & Privacy-Preserving ML",
                "Decentralized knowledge graph completion algorithms risk membership inference attacks, exposing sensitive relationship links across participating edge nodes.",
                "Formulate an efficient differential privacy mechanism for asynchronous federated knowledge graph embedding updates.",
                "Prior privacy-preserving federated embedding techniques inject noise uniformly across all gradients, degrading entity ranking precision and destroying topological link semantics.",
                "We propose Topology-Aware Gradient Perturbation (TAGP), which adaptively scales Laplacian noise inversely proportional to entity graph centrality while clipping relational gradient norms.",
                "The first topology-adaptive differential privacy mechanism for federated relational embedding that maintains SOTA Hits@10 while satisfying strict privacy budgets.",
            ),
            (
                "proj-03",
                "Zero-Shot Cross-Lingual Semantic Parsing for Low-Resource Dialects",
                "Natural Language Processing",
                "Semantic parsers perform poorly on low-resource indigenous language varieties where annotated logical form treebanks are nonexistent.",
                "Enable accurate logical form synthesis in low-resource target dialects without requiring target-language training utterances.",
                "State-of-the-art cross-lingual transfer models rely on high-resource pivot languages and exhibit significant syntactic drift when evaluated on dialectal varieties lacking parallel lexicons.",
                "We propose a grammar-constrained variational cross-lingual autoencoder with dialect-invariant latent anchor tokens that decouples intent semantics from surface syntax.",
                "A dialect-invariant anchor representation that improves execution accuracy on zero-shot target dialects by 22.4% over multilingual transformer baselines.",
            ),
            (
                "demo-project-1",
                "Robust Deep Feature Attribution in Agricultural Disease Detection",
                "Computer Vision & Agriculture AI",
                "Field-deployable crop disease models suffer from uninterpretable spatial attributions and high false-positive rates when tested outside laboratory image distributions.",
                "Develop edge-compatible Vision Transformer attribution alignment under severe illumination drift.",
                "Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented sub-Saharan foliar crop diseases under variable lighting.",
                "Cross-attention attribution pooling with contrastive token alignment on edge TPU hardware.",
                "A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45%.",
            ),
        ]
        cursor.executemany(
            """
            INSERT OR IGNORE INTO research_projects (
                id, title, domain, research_problem, research_objective,
                claimed_research_gap, proposed_method, expected_contribution
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            default_projects,
        )

    # Useful Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course_enrollments(student_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_submissions_course ON submissions(course_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_submission ON plagiarism_reports(submission_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_faculty_reviews_project ON faculty_reviews(project_id)")

    connection.commit()
    connection.close()


if __name__ == "__main__":
    initialize_database()
    print("Database initialized successfully!")
