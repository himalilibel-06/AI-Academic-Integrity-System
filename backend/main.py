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


app = FastAPI(
    title="AI Academic Integrity System",
    version="1.0.0"
)


# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
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
app.include_router(submissions_router)
app.include_router(reports_router)
app.include_router(courses_router)
app.include_router(analysis_router)


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