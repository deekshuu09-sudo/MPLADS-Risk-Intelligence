"""
Phase 1 OSS Integration Tests: Pandera Data Validation, PyOD Anomaly Ensemble, SHAP Feature Attribution, and Provenance Updates.
"""

import pytest
import pandas as pd
from app.services.data_validator import data_validator, DataValidator


# ==========================================
# 1. PANDERA DATA VALIDATION TESTS
# ==========================================

def test_pandera_valid_data():
    sample_records = [{
        "work_id": "WS/TEST/2026/001",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": 50.0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "work_category": "Roads",
        "work_status": "COMPLETED"
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is True
    assert len(errors) == 0


def test_pandera_invalid_negative_amount():
    sample_records = [{
        "work_id": "WS/TEST/2026/002",
        "sanctioned_amount": -100.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": 50.0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "work_category": "Roads",
        "work_status": "COMPLETED"
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is False
    assert len(errors) > 0


def test_pandera_invalid_progress_exceeds_100():
    sample_records = [{
        "work_id": "WS/TEST/2026/003",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": 150.0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "work_category": "Roads",
        "work_status": "COMPLETED"
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is False
    assert len(errors) > 0


def test_pandera_invalid_lat_lon_bounds():
    sample_records = [{
        "work_id": "WS/TEST/2026/004",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": 50.0,
        "latitude": 120.0,  # Invalid latitude (> 90)
        "longitude": 77.2090,
        "work_category": "Roads",
        "work_status": "COMPLETED"
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is False


def test_pandera_invalid_negative_progress():
    sample_records = [{
        "work_id": "WS/TEST/2026/005",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": -10.0, # Invalid negative progress
        "latitude": 28.6139,
        "longitude": 77.2090,
        "work_category": "Roads",
        "work_status": "COMPLETED"
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is False
    assert len(errors) > 0


def test_pandera_invalid_longitude():
    sample_records = [{
        "work_id": "WS/TEST/2026/006",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": 50.0,
        "latitude": 28.6139,
        "longitude": 200.0, # Invalid longitude (> 180)
        "work_category": "Roads",
        "work_status": "COMPLETED"
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is False
    assert len(errors) > 0


def test_pandera_invalid_date_ordering():
    sample_records = [{
        "work_id": "WS/TEST/2026/007",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "physical_progress_pct": 50.0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "work_category": "Roads",
        "work_status": "COMPLETED",
        "sanction_date": pd.Timestamp("2026-05-01"),
        "actual_end_date": pd.Timestamp("2025-01-01") # Invalid: end date before sanction date
    }]
    is_valid, errors = data_validator.validate_works_dataframe(sample_records)
    assert is_valid is False
    assert len(errors) > 0


# ==========================================
# 2. PYOD ANOMALY ENSEMBLE TESTS
# ==========================================

def test_pyod_ensemble_execution():
    from app.services.pyod_engine import pyod_engine
    records = []
    for i in range(20):
        records.append({
            "work_id": f"WS/TEST/2026/{i:03d}",
            "sanctioned_amount": 100000.0 * (i + 1),
            "actual_amount": 50000.0 * (i + 1),
            "days_elapsed": 30 + i,
            "physical_progress_pct": 10.0 * (i % 10),
            "latitude": 28.0 + (i * 0.01),
            "longitude": 77.0 + (i * 0.01)
        })
    res_map = pyod_engine.fit_and_score_ensemble(records)
    assert len(res_map) == 20
    sample_res = res_map["WS/TEST/2026/001"]
    assert 0.0 <= sample_res["ensemble_normalized_score"] <= 1.0
    assert "ECOD" in sample_res["detectors"]
    assert "COPOD" in sample_res["detectors"]
    assert "IForest" in sample_res["detectors"]


def test_pyod_missing_work_id():
    from app.services.pyod_engine import pyod_engine
    records = [{
        "work_id": "WS/TEST/2026/001",
        "sanctioned_amount": 500000.0,
        "actual_amount": 250000.0,
        "days_elapsed": 10,
        "physical_progress_pct": 50.0
    }]
    # Needs < 10 items to trigger empty result
    res_map = pyod_engine.fit_and_score_ensemble(records)
    assert len(res_map) == 0


# ==========================================
# 3. SHAP FEATURE ATTRIBUTION TESTS
# ==========================================

def test_shap_explanation_execution():
    from app.services.shap_explainer import shap_explainer
    records = []
    for i in range(20):
        records.append({
            "work_id": f"WS/TEST/2026/{i:03d}",
            "sanctioned_amount": 100000.0 * (i + 1),
            "actual_amount": 50000.0 * (i + 1),
            "days_elapsed": 30 + i,
            "physical_progress_pct": 10.0 * (i % 10)
        })
    shap_explainer.fit_model_and_explainer(records)
    res = shap_explainer.explain_work(records[0])

    assert res["shap_available"] is True
    assert len(res["feature_contributions"]) > 0
    for attr in res["feature_contributions"]:
        assert "feature" in attr
        assert "observed_value" in attr
        assert "shap_contribution" in attr
        assert attr["direction"] in ["increases model decision score", "decreases model decision score", "increases anomaly score", "decreases anomaly score", "increases risk", "decreases risk", "neutral"]


# ==========================================
# 4. PROVENANCE INTEGRATION TEST
# ==========================================

def test_provenance_oss_versions_integration():
    """
    Verify GET /api/v1/works/{work_id}/provenance includes Pandera, PyOD, and SHAP metadata.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    response = client.get("/api/v1/works/WS/DEMO/2025/501/provenance")
    assert response.status_code == 200
    data = response.json()

    lineage_steps = data.get("lineage_steps", [])
    step_titles = [s.get("step", "") for s in lineage_steps]
    assert any("Data Contract Validation" in t for t in step_titles)
    assert any("Multi-Detector Anomaly Ensemble" in t for t in step_titles)
    assert any("SHAP Attribution" in t for t in step_titles)
