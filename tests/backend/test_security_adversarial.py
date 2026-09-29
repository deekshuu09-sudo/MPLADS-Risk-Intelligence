import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sql_injection_probe_on_endpoints():
    """Verify parameterization and resilience against SQL injection strings."""
    sql_payloads = [
        "' OR 1=1 --",
        "'; DROP TABLE works; --",
        "101' UNION SELECT 1,2,3--",
        "101; SELECT pg_sleep(5);--"
    ]
    for payload in sql_payloads:
        res = client.get(f"/api/v1/works/{payload}")
        assert res.status_code in (404, 422, 200)

        res_prov = client.get(f"/api/v1/works/{payload}/provenance")
        assert res_prov.status_code in (404, 422, 200)

        res_dos = client.get(f"/api/v1/anomalies/{payload}/dossier")
        assert res_dos.status_code in (404, 422, 200)

        res_q = client.get(f"/api/v1/investigations/queue?status={payload}")
        assert res_q.status_code == 200

def test_xss_payload_encoding_and_safe_treatment():
    """Verify XSS payloads are handled safely as plain text."""
    xss_payloads = [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert(1)"
    ]
    for payload in xss_payloads:
        res = client.post(
            "/api/v1/investigations/WS/DEMO/2025/101/review",
            json={
                "new_status": "UNDER_REVIEW",
                "assigned_role": "DISTRICT_OFFICER",
                "reviewer_notes": payload
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True

        dos_res = client.get("/api/v1/anomalies/WS/DEMO/2025/101/dossier")
        assert dos_res.status_code == 200
        dossier = dos_res.json()
        inv = dossier.get("investigation_status", {})
        assert payload in inv.get("reviewer_notes", "")

def test_path_traversal_resistance():
    """Verify path traversal strings are blocked or treated as non-existent work IDs."""
    traversal_paths = [
        "../../../../etc/passwd",
        "..\\..\\..\\Windows\\System32",
        "/etc/passwd",
        "....//....//....//etc/passwd"
    ]
    for path in traversal_paths:
        res = client.get(f"/api/v1/works/{path}/provenance")
        assert res.status_code in (404, 422)

def test_investigation_state_machine_validation():
    """Verify invalid statuses and missing mandatory explanations are rejected."""
    res_inv = client.post(
        "/api/v1/investigations/WS/DEMO/2025/102/review",
        json={"new_status": "INVALID_STATUS_XYZ"}
    )
    assert res_inv.status_code == 400
    assert "Invalid status" in res_inv.json()["detail"]

    res_no_notes = client.post(
        "/api/v1/investigations/WS/DEMO/2025/102/review",
        json={"new_status": "RESOLVED", "reviewer_notes": "", "outcome_decision": ""}
    )
    assert res_no_notes.status_code == 400
    assert "Administrative explanation required" in res_no_notes.json()["detail"]

def test_admin_score_tampering_resistance():
    """Verify client cannot overwrite analytical risk scores or provenance via review endpoint."""
    res = client.post(
        "/api/v1/investigations/WS/DEMO/2025/501/review",
        json={
            "new_status": "INSPECTION_SCHEDULED",
            "reviewer_notes": "Scheduling site verification",
            "risk_score": 0.0,
            "composite_risk_score": 10.0,
            "integrity_fingerprint": "TAMPERED_HASH"
        }
    )
    assert res.status_code == 200

    dos_res = client.get("/api/v1/anomalies/WS/DEMO/2025/501/dossier")
    assert dos_res.status_code == 200
    dossier = dos_res.json()
    assert dossier["risk_evaluation"]["composite_risk_score"] == 86.0
    assert "SHA256:d5be" in dossier["provenance_details"]["integrity_fingerprint"]

def test_http_method_abuse():
    """Verify read-only endpoints reject write methods."""
    res_delete = client.delete("/api/v1/works/WS/DEMO/2025/101")
    assert res_delete.status_code in (405, 404)

    res_post_prov = client.post("/api/v1/works/WS/DEMO/2025/101/provenance", json={})
    assert res_post_prov.status_code == 405

def test_security_response_headers():
    """Verify standard defensive HTTP headers are attached to responses."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "geolocation" in res.headers.get("Permissions-Policy", "")

