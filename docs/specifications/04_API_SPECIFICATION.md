# REST API Specification (OpenAPI 3.1)

## Project Details
- **Problem Statement ID:** 26102
- **Title:** Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation
- **Platform:** MPLADS Risk Intelligence & Investigation Platform (RIIP)
- **Base URL:** `/api/v1`
- **Specification Format:** OpenAPI 3.1 JSON / REST

---

## 1. Overview & Conventions

All endpoints follow strict REST principles:
- **Data Exchange:** UTF-8 encoded JSON (`Content-Type: application/json`).
- **Standard Envelope:** Responses return clean typed DTOs with HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `422 Unprocessable Entity`).
- **Data Mode Indicator:** Every response includes `meta: { "dataset_mode": "REAL" | "SYNTHETIC" | "HYBRID" }` to ensure complete clarity.
- **Audit Interceptor:** Mutating operations (`POST`, `PUT`, `PATCH`) automatically record audit logs capturing actor identity, timestamp, and before/after state diffs.

---

## 2. Endpoint Index

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | Macro KPIs: Allocated funds, expenditure, flagged count, risk index. |
| `GET` | `/dashboard/category-breakdown` | Category-wise expenditure, completion rate, and anomaly frequency. |
| `GET` | `/dashboard/trends` | Monthly recommendation, sanction, and expenditure velocity curves. |
| `GET` | `/works` | Paginated exploration of works with multi-attribute filtering. |
| `GET` | `/works/{work_id}` | Detailed project record with linked expenditures and photos. |
| `GET` | `/anomalies` | Filterable list of flagged works sorted by composite risk score. |
| `GET` | `/anomalies/{work_id}/dossier` | **Core XAI Dossier:** Trigger factors, baseline metrics, verification guide. |
| `POST`| `/investigations/{work_id}/review` | Update investigation status, add notes, and log audit trail. |
| `GET` | `/investigations/queue` | Workflow console queue for District/State investigators. |
| `GET` | `/geospatial/risk-map` | GeoJSON project markers with risk weights and co-location buffers. |
| `GET` | `/peer-benchmarking` | Comparative analytics across districts, constituencies, and agencies. |
| `POST`| `/esakshi/sync` | Trigger proxy synchronization with official MoSPI eSAKSHI endpoints. |
| `POST`| `/demo/reset-seed` | Reset and reload synthetic demo datasets with intentional anomaly seeds. |
| `GET` | `/audit/logs` | Query tamper-evident investigation audit trail. |

---

## 3. Detailed Endpoint Schemas

### 3.1 Macro Executive Summary
`GET /dashboard/summary`

#### Query Parameters:
- `house` (optional, string): `ALL` | `LOK_SABHA` | `RAJYA_SABHA` (default `ALL`).
- `state_id` (optional, integer): Filter by specific State ID.
- `is_synthetic` (optional, boolean): `true` = Demo mode only, `false` = Real eSAKSHI data only, omit = Combined.

#### Response (`200 OK`):
```json
{
  "total_works": 110075,
  "allocated_limit_inr": 83474391109.11,
  "expenditure_inr": 28845163321.45,
  "expenditure_utilization_pct": 34.55,
  "works_sanctioned": 82431,
  "works_completed": 35993,
  "completion_rate_pct": 43.66,
  "flagged_works_count": 2841,
  "flagged_percentage": 2.58,
  "risk_breakdown": {
    "critical": 84,
    "high": 492,
    "medium": 1120,
    "low": 1145
  },
  "open_investigations_count": 312,
  "dataset_mode": "HYBRID",
  "last_synced_at": "2026-09-25T11:45:00Z"
}
```

---

### 3.2 Explainable Anomaly Dossier
`GET /anomalies/{work_id}/dossier`

#### Response (`200 OK`):
```json
{
  "work_id": "WS/MP18275/2024-2025/175559",
  "activity_name": "Construction of community centers and community halls",
  "work_category": "Normal/Others",
  "work_description": "Extension of Multipurpose Hall at Nayagaon near Juvenile Home, Port Blair",
  "mp_name": "BISHNU PADA RAY",
  "constituency": "ANDAMAN AND NICOBAR ISLANDS",
  "district": "SOUTH ANDAMANS",
  "implementing_agency": "EE CD-III, APWD, PROTHRAPUR",
  "is_synthetic": false,
  "risk_evaluation": {
    "composite_risk_score": 78.4,
    "severity_level": "HIGH",
    "confidence_score": 0.892,
    "evaluation_timestamp": "2026-09-25T10:15:22Z",
    "trigger_factors": [
      {
        "engine": "COST_OUTLIER",
        "factor_name": "Excessive Unit Estimate",
        "severity": "HIGH",
        "weight": 0.35,
        "summary": "Sanctioned amount (₹9,76,436) exceeds category median cost by +84.2% for comparable community hall specifications in this district.",
        "observed_value": "₹9,76,436",
        "baseline_value": "₹5,30,000 (District Median)",
        "variance_pct": "+84.2%"
      },
      {
        "engine": "STATUTORY_TIMELINE",
        "factor_name": "Delayed Milestone Execution",
        "severity": "MEDIUM",
        "weight": 0.25,
        "summary": "Project sanctioned 280 days ago; physical progress reported at 15.0%, lagging expected schedule of 75.0% for 1-year completion mandate.",
        "observed_value": "15.0% progress in 280 days",
        "baseline_value": "Expected: 75.0% at Day 280",
        "variance_pct": "-60.0% progress gap"
      },
      {
        "engine": "SIMILARITY_DETECTION",
        "factor_name": "Co-located Similar Work Detected",
        "severity": "MEDIUM",
        "weight": 0.20,
        "summary": "Detected another sanctioned community hall work (WS/MP18275/2024-2025/183102) located within 350 meters with 88.4% description overlap.",
        "observed_value": "350m proximity / 88.4% lexical match",
        "baseline_value": "Buffer threshold: 500m",
        "matched_work_id": "WS/MP18275/2024-2025/183102"
      }
    ],
    "baseline_comparison": {
      "metric_name": "Sanction Cost per Unit",
      "observed": 976436.0,
      "p25": 420000.0,
      "median": 530000.0,
      "p75": 680000.0,
      "p95": 850000.0,
      "z_score": 2.45
    },
    "verification_checklist": [
      {
        "step_no": 1,
        "action": "Inspect Measurement Book (MB)",
        "details": "Verify physical site measurements against the technical sanction estimate approved by District Planning Officer."
      },
      {
        "step_no": 2,
        "action": "Geo-tagged Site Visit",
        "details": "Confirm that the extension at Nayagaon does not overlap with previously completed community hall works."
      },
      {
        "step_no": 3,
        "action": "Vendor Milestone Audit",
        "details": "Audit vendor payment vouchers to verify expenditure matches actual foundation progress."
      }
    ]
  },
  "expenditures": [
    {
      "expenditure_id": 4821,
      "vendor_name": "GLOBE CONSULTANCIES",
      "expenditure_date": "2026-09-17",
      "fund_disbursed_amt": 23600.0,
      "payment_status": "Payment In-Progress",
      "voucher_no": "PFMS/2026/V-8821"
    }
  ],
  "investigation_status": {
    "status": "UNDER_INVESTIGATION",
    "assigned_role": "DISTRICT_OFFICER",
    "reviewer_notes": "Clarification letter issued to APWD Assistant Engineer regarding technical rate schedule variance.",
    "last_updated": "2026-09-25T11:20:00Z"
  }
}
```

---

### 3.3 Investigation Workflow Update
`POST /investigations/{work_id}/review`

#### Request Body:
```json
{
  "new_status": "INSPECTION_SCHEDULED",
  "assigned_role": "DISTRICT_OFFICER",
  "reviewer_notes": "Site inspection scheduled for 28-Sep-2026 with District Executive Engineer.",
  "outcome_decision": null
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "work_id": "WS/MP18275/2024-2025/175559",
  "previous_status": "UNDER_INVESTIGATION",
  "current_status": "INSPECTION_SCHEDULED",
  "audit_log_id": 941,
  "updated_at": "2026-09-25T12:10:44Z"
}
```

---

### 3.4 Live eSAKSHI Synchronization Proxy
`POST /esakshi/sync`

#### Request Body:
```json
{
  "state_id": 35,
  "house": "LOK_SABHA",
  "sync_expenditures": true,
  "sync_sanctions": true
}
```

#### Response (`202 Accepted`):
```json
{
  "task_id": "sync-esakshi-state-35",
  "status": "PROCESSING",
  "message": "Initiated synchronization with MoSPI eSAKSHI pre-login REST endpoints."
}
```

---

### 3.5 Reset & Seed Synthetic Benchmark Cases
`POST /demo/reset-seed`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Synthetic demo benchmark suite seeded successfully.",
  "seeded_records": {
    "states": 8,
    "districts": 24,
    "constituencies": 32,
    "works": 520,
    "anomalies_seeded": 48
  }
}
```
