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


def test_benchmark_archetypes_mode_metrics_and_walkthroughs(client_with_db):
    """
    Test that when datasetMode == SYNTHETIC (Benchmark Archetypes):
    - Monitored projects = 26
    - Early warnings (score >= 30) = 23
    - Queue items = 25
    - Walkthrough projects 101 and 801 exist and have valid scores and dossiers
    """
    # 1. Dashboard summary with is_synthetic=true (house=None)
    summary_res = client_with_db.get("/api/v1/dashboard/summary?is_synthetic=true")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_works"] == 26
    assert summary["open_investigations_count"] == 23

    # 2. Executive analytics overview with is_synthetic=true
    overview_res = client_with_db.get("/api/v1/analytics/overview?is_synthetic=true")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    kpis = overview["kpis"]
    assert kpis["total_works_analysed"] == 26
    assert kpis["flagged_works_count"] == 23
    assert round(kpis["total_sanctioned_amount_inr"] / 10000000, 2) == 4.96
    assert round(kpis["total_disbursed_amount_inr"] / 10000000, 2) == 2.54

    # 3. Investigation queue with is_synthetic=true
    queue_res = client_with_db.get("/api/v1/investigations/queue?is_synthetic=true")
    assert queue_res.status_code == 200
    queue_items = queue_res.json()
    assert len(queue_items) == 25
    queue_ids = [item["work_id"] for item in queue_items]
    assert "WS/DEMO/2025/101" in queue_ids
    assert "WS/DEMO/2025/801" in queue_ids

    # 4. Project risk explorer with is_synthetic=true
    works_res = client_with_db.get("/api/v1/works?is_synthetic=true&limit=50")
    assert works_res.status_code == 200
    works_data = works_res.json()
    assert len(works_data) == 26
    works_ids = [w["work_id"] for w in works_data]
    assert "WS/DEMO/2025/101" in works_ids
    assert "WS/DEMO/2025/801" in works_ids

    # 5. Walkthrough dossiers
    dossier_101 = client_with_db.get("/api/v1/anomalies/WS/DEMO/2025/101/dossier")
    assert dossier_101.status_code == 200
    assert dossier_101.json()["work_id"] == "WS/DEMO/2025/101"
    assert dossier_101.json()["risk_evaluation"]["composite_risk_score"] == 61.0

    dossier_801 = client_with_db.get("/api/v1/anomalies/WS/DEMO/2025/801/dossier")
    assert dossier_801.status_code == 200
    assert dossier_801.json()["work_id"] == "WS/DEMO/2025/801"
    assert dossier_801.json()["risk_evaluation"]["composite_risk_score"] == 22.0


def test_all_portfolio_house_combinations(client_with_db):
    """
    Test the matrix of Portfolio dataset combinations:
    - ALL records (Both, Lok Sabha, Rajya Sabha)
    - REAL telemetry (Both, Lok Sabha, Rajya Sabha)
    Ensuring no regression in the core portfolio counts.
    """
    # 1. All records (is_synthetic=None)
    # Both houses
    res = client_with_db.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    assert res.json()["total_works"] == 506
    assert res.json()["open_investigations_count"] == 117

    # Lok Sabha
    res = client_with_db.get("/api/v1/dashboard/summary?house=LOK_SABHA")
    assert res.status_code == 200
    assert res.json()["total_works"] == 470
    assert res.json()["open_investigations_count"] == 115

    # Rajya Sabha
    res = client_with_db.get("/api/v1/dashboard/summary?house=RAJYA_SABHA")
    assert res.status_code == 200
    assert res.json()["total_works"] == 36
    assert res.json()["open_investigations_count"] == 2

    # 2. Portfolio dataset (is_synthetic=false)
    # Both houses
    res = client_with_db.get("/api/v1/dashboard/summary?is_synthetic=false")
    assert res.status_code == 200
    assert res.json()["total_works"] == 480
    assert res.json()["open_investigations_count"] == 94

    # Lok Sabha
    res = client_with_db.get("/api/v1/dashboard/summary?is_synthetic=false&house=LOK_SABHA")
    assert res.status_code == 200
    assert res.json()["total_works"] == 444
    assert res.json()["open_investigations_count"] == 92

    # Rajya Sabha
    res = client_with_db.get("/api/v1/dashboard/summary?is_synthetic=false&house=RAJYA_SABHA")
    assert res.status_code == 200
    assert res.json()["total_works"] == 36
    assert res.json()["open_investigations_count"] == 2
