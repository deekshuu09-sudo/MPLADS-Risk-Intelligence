import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.session import Base, get_db
from app.main import app
from app.db.seed_demo_data import seed_database
from app.services.risk_engine import risk_engine
from app.models.entities import Work, RiskAnomaly, Investigation

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


def test_executive_analytics_mathematical_reconciliation(client_with_db):
    res = client_with_db.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()

    scope = data["scope"]
    kpis = data["kpis"]
    overlap = data["signal_overlap"]
    pipeline = data["investigation_pipeline"]
    states = data["state_concentration"]
    districts = data["top_district_hotspots"]
    categories = data["category_concentration"]
    engines = data["signal_engines"]
    insights = data["executive_insights"]

    # 1. Basic Scope Relationships
    assert kpis["total_works_analysed"] == scope["total_records"]
    assert kpis["flagged_works_count"] == scope["flagged_records"]
    assert kpis["flagged_works_count"] <= kpis["total_works_analysed"]

    # 2. Overlap Matrix Mathematical Equality
    total_overlap_sum = overlap["single_signal_count"] + overlap["dual_signal_count"] + overlap["multi_signal_count"]
    assert total_overlap_sum == kpis["flagged_works_count"]

    # 3. Queue / Unresolved Cases Reconciliation
    assert pipeline["total_unresolved"] == kpis["active_unresolved_investigations"]
    assert pipeline["total_unresolved"] <= kpis["flagged_works_count"]

    # 4. State Aggregation Reconciliation
    sum_state_total = sum(s["total_works"] for s in states)
    sum_state_flagged = sum(s["flagged_works"] for s in states)
    assert sum_state_total == kpis["total_works_analysed"]
    assert sum_state_flagged == kpis["flagged_works_count"]

    # 5. State Math Consistency (Signal Rate %)
    for s in states:
        expected_rate = round((s["flagged_works"] / s["total_works"]) * 100.0, 1)
        assert abs(s["signal_rate_pct"] - expected_rate) <= 0.1

    # 6. Category Aggregation Reconciliation
    sum_cat_total = sum(c["total_works"] for c in categories)
    sum_cat_flagged = sum(c["flagged_works"] for c in categories)
    assert sum_cat_total == kpis["total_works_analysed"]
    assert sum_cat_flagged == kpis["flagged_works_count"]

    # 7. Category Math Consistency
    for c in categories:
        expected_rate = round((c["flagged_works"] / c["total_works"]) * 100.0, 1)
        assert abs(c["signal_rate_pct"] - expected_rate) <= 0.1

    # 8. Detection Engines Non-Zero & Valid Mapping
    assert len(engines) == 7
    total_engine_triggers = sum(e["triggered_count"] for e in engines)
    assert total_engine_triggers > 0

    # 9. Honest Insight Generation (no multi-signal insight if count = 0)
    for ins in insights:
        assert ins["affected_works_count"] >= 0
        if ins["affected_works_count"] == 0:
            assert ins["severity"] == "INFO"
            assert "No " in ins["observed_pattern"] or "No " in ins["evidence_summary"]
