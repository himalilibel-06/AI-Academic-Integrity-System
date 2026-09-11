from fastapi import FastAPI

from routes.analysis import router as analysis_router


app = FastAPI(
    title="AI Academic Integrity System",
    version="1.0.0"
)


# Register analysis routes
app.include_router(analysis_router)


@app.get("/")
def home():
    return {
        "message": "AI Academic Integrity System Backend is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }