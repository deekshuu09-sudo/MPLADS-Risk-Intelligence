import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models.entities import Work
from app.db.seed_demo_data import seed_database
from app.services.risk_engine import risk_engine
from app.api.v1.router import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mplads.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Seed if works table is empty
    db = SessionLocal()
    try:
        work_count = db.query(Work).count()
        if work_count == 0:
            logger.info("Empty database detected. Seeding benchmark dataset...")
            seed_database(db)
            logger.info("Running initial composite risk evaluation...")
            eval_count = risk_engine.evaluate_all_works(db)
            logger.info(f"Initial risk evaluation complete: {eval_count} works processed.")
        else:
            logger.info(f"Database already populated with {work_count} works.")
    finally:
        db.close()

    yield
    logger.info("Shutting down MPLADS Risk Intelligence API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
