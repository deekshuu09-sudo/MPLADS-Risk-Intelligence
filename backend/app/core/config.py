import os

class Settings:
    PROJECT_NAME: str = "NexSolve — Predictive Infrastructure Project Intelligence (MoSPI IPMD / PAIMANA)"
    PROJECT_SLUG: str = "nexsolve-project-intelligence"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/mplads.db'))}"
    )
    
    # Official eSAKSHI MoSPI Endpoints
    ESAKSHI_BASE_URL: str = "https://mplads.mospi.gov.in"
    ESAKSHI_REST_PATH: str = "/rest/PreLoginDashboardData"
    
    # Deployment & Security
    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,https://nexsolve-predictive-infrastructure.vercel.app,https://mplads-risk-intelligence.vercel.app"
        ).split(",")
        if origin.strip()
    ]
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "600"))

    # Anomaly Thresholds
    STATUTORY_STALL_DAYS: int = 365
    TENDER_THRESHOLD_INR: float = 1000000.0  # ₹10 Lakhs threshold-clustering parameter
    TRUST_SOCIETY_CAP_INR: float = 7500000.0  # ₹75 Lakhs cap under MPLADS guidelines
    DUPLICATE_PROXIMITY_METERS: float = 500.0
    DUPLICATE_TEXT_SIMILARITY: float = 0.80
    MODIFIED_Z_SCORE_THRESHOLD: float = 3.0
    ADVANCE_PROGRESS_GAP_THRESHOLD: float = 50.0  # 50% gap between disbursed and progress

settings = Settings()

