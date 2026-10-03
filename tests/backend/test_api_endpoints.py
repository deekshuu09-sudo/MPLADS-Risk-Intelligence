import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base, get_db
from app.main import app
from app.db.seed_demo_data import seed_database
from app.services.risk_engine import risk_engine

from sqlalchemy.pool import StaticPool

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


def test_health_check(client_with_db):
    res = client_with_db.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_dashboard_summary(client_with_db):
    res = client_with_db.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_works" in data
    assert data["total_works"] > 400
    assert "risk_breakdown" in data
    assert data["risk_breakdown"]["critical"] > 0
    # Early warning queue count strictly reconciles with active warnings (composite risk >= 30.0)
    assert data["open_investigations_count"] == 117

    # House filter tests
    lok_res = client_with_db.get("/api/v1/dashboard/summary?house=LOK_SABHA")
    assert lok_res.status_code == 200
    assert lok_res.json()["open_investigations_count"] == 115

    rajya_res = client_with_db.get("/api/v1/dashboard/summary?house=RAJYA_SABHA")
    assert rajya_res.status_code == 200
    assert rajya_res.json()["open_investigations_count"] == 2


def test_works_list(client_with_db):
    res = client_with_db.get("/api/v1/works?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 10
    assert "work_id" in data[0]


def test_anomalies_list_sorted(client_with_db):
    res = client_with_db.get("/api/v1/anomalies?limit=20")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    # Assert strictly descending composite score
    scores = [item["composite_risk_score"] for item in data]
    assert scores == sorted(scores, reverse=True)


def test_explainability_dossier_contract(client_with_db):
    # Fetch seeded splitting work
    res = client_with_db.get("/api/v1/anomalies/WS/DEMO/2025/101/dossier")
    assert res.status_code == 200
    dossier = res.json()

    assert dossier["work_id"] == "WS/DEMO/2025/101"
    assert "risk_evaluation" in dossier
    risk_eval = dossier["risk_evaluation"]
    assert len(risk_eval["trigger_factors"]) > 0
    assert len(risk_eval["verification_checklist"]) > 0
    assert "baseline_comparison" in risk_eval


def test_investigation_review_and_audit_trail(client_with_db):
    work_id = "WS/DEMO/2025/301"
    review_payload = {
        "new_status": "INSPECTION_SCHEDULED",
        "assigned_role": "DISTRICT_OFFICER",
        "reviewer_notes": "Site inspection scheduled with Executive Engineer PWD.",
        "outcome_decision": None
    }
    res = client_with_db.post(f"/api/v1/investigations/{work_id}/review", json=review_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["current_status"] == "INSPECTION_SCHEDULED"
    assert "audit_log_id" in data

    # Check audit log query
    audit_res = client_with_db.get(f"/api/v1/audit/logs?entity_id={work_id}")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    assert logs[0]["action_type"] == "STATUS_CHANGE"


def test_investigation_queue_filtering_and_sorting(client_with_db):
    res = client_with_db.get("/api/v1/investigations/queue?sort_by=risk_desc")
    assert res.status_code == 200
    queue = res.json()
    assert len(queue) > 0

    # Verify descending sort order
    scores = [item["composite_risk_score"] for item in queue]
    assert scores == sorted(scores, reverse=True)

    # Test filtering by status
    status_res = client_with_db.get("/api/v1/investigations/queue?status=VERIFICATION_REQUIRED")
    assert status_res.status_code == 200
    filtered = status_res.json()
    assert all(item["status"] == "VERIFICATION_REQUIRED" for item in filtered)


def test_investigation_dismissal_non_confirmatory_path(client_with_db):
    work_id = "WS/DEMO/2025/801"
    review_payload = {
        "new_status": "DISMISSED",
        "assigned_role": "DISTRICT_PLANNING_OFFICER",
        "reviewer_notes": "Proximity reviewed; distinct asset categories verified (Education vs Water Supply). Signal dismissed.",
        "outcome_decision": "Case dismissed — no duplicate scope found."
    }
    res = client_with_db.post(f"/api/v1/investigations/{work_id}/review", json=review_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["current_status"] == "DISMISSED"

    # Verify status in queue
    q_res = client_with_db.get(f"/api/v1/investigations/queue?status=DISMISSED")
    assert q_res.status_code == 200
    dismissed_items = q_res.json()
    assert any(item["work_id"] == work_id for item in dismissed_items)

    audit_res = client_with_db.get(f"/api/v1/audit/logs?entity_id={work_id}")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    assert logs[0]["new_value"]["status"] == "DISMISSED"


def test_investigation_mandatory_remarks_validation(client_with_db):
    work_id = "WS/DEMO/2025/101"
    
    # Invalid status attempt
    invalid_res = client_with_db.post(f"/api/v1/investigations/{work_id}/review", json={
        "new_status": "INVALID_STATE",
        "assigned_role": "DISTRICT_OFFICER"
    })
    assert invalid_res.status_code == 400

    # Silent RESOLVED attempt without remarks
    silent_res = client_with_db.post(f"/api/v1/investigations/{work_id}/review", json={
        "new_status": "RESOLVED",
        "assigned_role": "DISTRICT_OFFICER",
        "reviewer_notes": "",
        "outcome_decision": ""
    })
    assert silent_res.status_code == 400
    assert "Administrative explanation required" in silent_res.json()["detail"]


def test_benchmark_cases_end_to_end_lifecycle(client_with_db):
    # Benchmark Case A: WS/DEMO/2025/101 -> INSPECTION_SCHEDULED
    case_a_res = client_with_db.post("/api/v1/investigations/WS/DEMO/2025/101/review", json={
        "new_status": "INSPECTION_SCHEDULED",
        "assigned_role": "DISTRICT_PLANNING_OFFICER",
        "reviewer_notes": "High cost outlier variance (+63%). Scheduled site inspection.",
        "outcome_decision": "Depute Assistant Engineer PWD for site inspection."
    })
    assert case_a_res.status_code == 200
    assert case_a_res.json()["current_status"] == "INSPECTION_SCHEDULED"

    # Benchmark Case B: WS/DEMO/2025/102 -> DOCUMENTS_REQUESTED
    case_b_res = client_with_db.post("/api/v1/investigations/WS/DEMO/2025/102/review", json={
        "new_status": "DOCUMENTS_REQUESTED",
        "assigned_role": "DISTRICT_PLANNING_OFFICER",
        "reviewer_notes": "Spatial proximity ~119.5m with work 103. Requested MB abstract.",
        "outcome_decision": "Request site Measurement Book abstract from DRDA Araria."
    })
    assert case_b_res.status_code == 200
    assert case_b_res.json()["current_status"] == "DOCUMENTS_REQUESTED"

    # Benchmark Case C: WS/DEMO/2025/801 -> MONITORING_CONTINUED
    case_c_res = client_with_db.post("/api/v1/investigations/WS/DEMO/2025/801/review", json={
        "new_status": "MONITORING_CONTINUED",
        "assigned_role": "STATE_NODAL_OFFICER",
        "reviewer_notes": "Counterexample verified (Education vs Water Supply). Continued monitoring.",
        "outcome_decision": "Keep under standard quarterly milestone monitoring."
    })
    assert case_c_res.status_code == 200
    assert case_c_res.json()["current_status"] == "MONITORING_CONTINUED"

    # Benchmark Case D: WS/DEMO/2025/501 -> Full Lifecycle UNREVIEWED -> UNDER_REVIEW -> RESOLVED
    res_step1 = client_with_db.post("/api/v1/investigations/WS/DEMO/2025/501/review", json={
        "new_status": "UNDER_REVIEW",
        "assigned_role": "DISTRICT_PLANNING_OFFICER",
        "reviewer_notes": "Opening formal evidence review for milestone lag."
    })
    assert res_step1.status_code == 200

    res_step2 = client_with_db.post("/api/v1/investigations/WS/DEMO/2025/501/review", json={
        "new_status": "RESOLVED",
        "assigned_role": "DISTRICT_COLLECTOR",
        "reviewer_notes": "Site inspection completed; physical progress confirmed at 95% stage.",
        "outcome_decision": "Case closed — work verified compliant with MPLADS guidelines."
    })
    assert res_step2.status_code == 200
    assert res_step2.json()["current_status"] == "RESOLVED"

    # Audit log verification for Case D
    audit_res = client_with_db.get("/api/v1/audit/logs?entity_id=WS/DEMO/2025/501")
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    assert len(audit_events) >= 2


def test_work_provenance_and_reproducibility(client_with_db):
    cases = ["WS/DEMO/2025/101", "WS/DEMO/2025/102", "WS/DEMO/2025/801", "WS/DEMO/2025/501"]
    
    for wid in cases:
        res = client_with_db.get(f"/api/v1/works/{wid}/provenance")
        assert res.status_code == 200
        prov = res.json()
        
        assert prov["work_id"] == wid
        assert prov["dataset_mode"] in ("SYNTHETIC_BENCHMARK", "REAL_TELEMETRY")
        assert "source_metadata" in prov
        assert "lineage_steps" in prov
        assert len(prov["lineage_steps"]) >= 4
        assert "configuration" in prov
        assert "reproducibility" in prov
        assert prov["reproducibility"]["status"] == "REPRODUCIBLE"
        assert prov["integrity_fingerprint"].startswith("SHA256:")

        # Verify dossier attaches provenance details
        dossier_res = client_with_db.get(f"/api/v1/anomalies/{wid}/dossier")
        assert dossier_res.status_code == 200
        dossier = dossier_res.json()
        assert "data_provenance" in dossier
        assert "provenance_details" in dossier
        assert dossier["provenance_details"]["integrity_fingerprint"] == prov["integrity_fingerprint"]


