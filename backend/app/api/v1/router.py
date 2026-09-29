from fastapi import APIRouter
from app.api.v1.endpoints import (
    dashboard, analytics, works, anomalies, investigations, geospatial, esakshi_proxy, audit
)

api_router = APIRouter()

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard & KPIs"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Executive Analytics"])
api_router.include_router(works.router, prefix="/works", tags=["Works & Projects"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Risk & Explainability"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["Investigation Workflow"])
api_router.include_router(geospatial.router, prefix="/geospatial", tags=["Geospatial Analytics"])
api_router.include_router(esakshi_proxy.router, prefix="/esakshi", tags=["eSAKSHI Live Proxy & Demo"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail"])

