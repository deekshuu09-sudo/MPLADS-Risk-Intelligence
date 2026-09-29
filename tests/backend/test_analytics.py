import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.session import Base, get_db
from app.main import app
from app.db.seed_demo_data import seed_database
from app.services.risk_engine import risk_engine

@pytest.fixture(scope="module")
def client_with_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    seed_database(db)
    risk_engine.evaluate_all_works(db)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    
    yield client
    
    db.close()
    app.dependency_overrides.clear()


def test_executive_overview_analytics(client_with_db):
    res = client_with_db.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()

    assert "kpis" in data
    assert "signal_overlap" in data
    assert "signal_engines" in data
    assert "state_concentration" in data
    assert "top_district_hotspots" in data
    assert "category_concentration" in data
    assert "investigation_pipeline" in data
    assert "executive_insights" in data

    kpis = data["kpis"]
    assert kpis["total_works_analysed"] > 400
    assert kpis["flagged_works_count"] > 0
    assert kpis["flagged_sanctioned_amount_inr"] > 0

    overlap = data["signal_overlap"]
    total_overlap_count = overlap["single_signal_count"] + overlap["dual_signal_count"] + overlap["multi_signal_count"]
    assert total_overlap_count == kpis["flagged_works_count"]

    pipeline = data["investigation_pipeline"]
    assert pipeline["total_unresolved"] == kpis["active_unresolved_investigations"]

    insights = data["executive_insights"]
    assert len(insights) >= 3
    assert insights[0]["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "INFO"]
