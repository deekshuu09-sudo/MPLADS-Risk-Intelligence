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

import time
from collections import defaultdict
from fastapi import Request, Response
from fastapi.responses import JSONResponse

# CORS Middleware with configurable origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

# Lightweight in-memory rate limiter (sliding window by IP)
_request_counts = defaultdict(list)

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Rate Limiting Check (prototype-grade, non-overengineered)
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    window = 60.0  # 60 seconds
    limit = settings.RATE_LIMIT_PER_MINUTE

    # Filter timestamps within current window
    _request_counts[client_ip] = [ts for ts in _request_counts[client_ip] if now - ts < window]

    if len(_request_counts[client_ip]) >= limit:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests: Rate limit exceeded. Please wait a minute."}
        )

    _request_counts[client_ip].append(now)

    # 2. Process request
    response: Response = await call_next(request)

    # 3. Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    return response

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
