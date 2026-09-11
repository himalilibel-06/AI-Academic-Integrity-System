from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.database import initialize_database
from routes.auth import router as auth_router


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


# Create database tables when the backend starts
initialize_database()


# Authentication routes
app.include_router(auth_router)


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