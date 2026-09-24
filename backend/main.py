from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.database import initialize_database, get_connection
from models.course import seed_default_courses_if_empty
from routes.auth import router as auth_router
from routes.analysis import router as analysis_router
from routes.submissions import router as submissions_router
from routes.reports import router as reports_router
from routes.courses import router as courses_router
from routes.student import router as student_router
from routes.professor import router as professor_router
from routes.manuscripts import router as manuscripts_router
from routes.literature import router as literature_router
from routes.gap_analysis import router as gap_analysis_router
from routes.contribution_analysis import router as contribution_analysis_router
from routes.knowledge_graph import router as knowledge_graph_router
from routes.reasoning import router as reasoning_router
from routes.evidence_coverage import router as evidence_coverage_router
from routes.revision_comparison import router as revision_comparison_router
from routes.submission_readiness import router as submission_readiness_router
from routes.faculty_review import router as faculty_review_router


app = FastAPI(
    title="AI Academic Integrity System",
    version="1.0.0"
)


# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables and seed initial course records when backend starts
initialize_database()
db_conn = get_connection()
try:
    seed_default_courses_if_empty(db_conn)
finally:
    db_conn.close()


# Include application routers
app.include_router(auth_router)
app.include_router(student_router)
app.include_router(professor_router)
app.include_router(submissions_router)
app.include_router(reports_router)
app.include_router(courses_router)
app.include_router(analysis_router)
app.include_router(manuscripts_router)
app.include_router(literature_router)
app.include_router(gap_analysis_router)
app.include_router(contribution_analysis_router)
app.include_router(knowledge_graph_router)
app.include_router(reasoning_router)
app.include_router(evidence_coverage_router)
app.include_router(revision_comparison_router)
app.include_router(submission_readiness_router)
app.include_router(faculty_review_router)


@app.get("/")
def home():
    return {
        "message": "AI Academic Integrity System API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }