import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_geospatial_risk_map_endpoint():
    response = client.get("/api/v1/geospatial/risk-map")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 500

    # Verify feature structure
    feat = data["features"][0]
    assert feat["type"] == "Feature"
    assert "geometry" in feat
    assert len(feat["geometry"]["coordinates"]) == 2
    props = feat["properties"]
    assert "work_id" in props
    assert "composite_risk_score" in props
    assert "severity_level" in props

def test_geospatial_spatial_relationships_case_b():
    # Case B: WS/DEMO/2025/102 related to WS/DEMO/2025/103 at ~119.5m
    response = client.get("/api/v1/geospatial/works/WS/DEMO/2025/102/relationships?radius_meters=500")
    assert response.status_code == 200
    data = response.json()
    assert data["selected_work"]["work_id"] == "WS/DEMO/2025/102"
    assert data["total_nearby_count"] >= 1
    
    # Check related item WS/DEMO/2025/103
    rel_ids = [item["work_id"] for item in data["related_works"]]
    assert "WS/DEMO/2025/103" in rel_ids
    
    item_103 = next(item for item in data["related_works"] if item["work_id"] == "WS/DEMO/2025/103")
    assert abs(item_103["distance_meters"] - 119.5) < 30.0
    assert "Geographic proximity" in item_103["why_related"][0]

def test_geospatial_spatial_relationships_case_d_counterexample():
    # Case D: WS/DEMO/2025/801 & WS/DEMO/2025/802 in Lucknow (~175m distance, distinct categories)
    response = client.get("/api/v1/geospatial/works/WS/DEMO/2025/801/relationships?radius_meters=500")
    assert response.status_code == 200
    data = response.json()
    assert data["selected_work"]["work_id"] == "WS/DEMO/2025/801"
    assert data["has_counterexample"] is True

    rel_ids = [item["work_id"] for item in data["related_works"]]
    assert "WS/DEMO/2025/802" in rel_ids

    item_802 = next(item for item in data["related_works"] if item["work_id"] == "WS/DEMO/2025/802")
    assert item_802["is_counterexample"] is True
    assert item_802["relationship_type"] == "PROXIMITY_ONLY_COUNTEREXAMPLE"
