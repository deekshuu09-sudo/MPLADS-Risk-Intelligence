# NexSolve OSS Phase 1 Integration Map

This document outlines the integration points for Open Source Software (OSS) libraries added in **Phase 1** of the NexSolve MPLADS Risk Intelligence Platform.

## Integration Matrix

| Component | Existing Implementation | Phase 1 Integration | Files Affected |
| :--- | :--- | :--- | :--- |
| **Pandera (Data Validation)** | Raw Pydantic DTO type casting and basic FastAPI endpoint parameters without explicit dataframe schema validation. | Integrated DataFrame Schema validation prior to baseline statistical computation and feature engineering. Returns structured validation errors & injects quality metadata into provenance. | `backend/app/services/data_validator.py`<br>`backend/app/services/risk_engine.py`<br>`backend/app/api/v1/endpoints/works.py` |
| **PyOD (Anomaly Detection)** | Custom `IsolationForest` wrapper in `ml_engine.py` without multi-algorithm ensemble or normalized scoring guarantees. | Integrated ECOD and COPOD parameter-free anomaly detectors alongside Isolation Forest. Exposed as ensemble anomaly signals without mutating composite risk scores. | `backend/app/services/pyod_engine.py`<br>`backend/app/services/risk_engine.py`<br>`backend/app/api/v1/endpoints/anomalies.py` |
| **SHAP (Explainability)** | Custom heuristic rule triggers and z-score metric variance dictionaries in `explainability_service.py`. | Integrated `TreeExplainer` and `KernelExplainer` on fitted ML tree models to compute exact feature attribution (SHAP values) for ML anomaly signals. | `backend/app/services/shap_explainer.py`<br>`backend/app/api/v1/endpoints/anomalies.py`<br>`frontend/src/components/explainability/ExplainabilityDossier.tsx` |
| **Provenance Chain** | SHA-256 evidence integrity fingerprints & step-by-step lineage dictionaries in `works.py` and `risk_dto.py`. | Expanded lineage steps to record Pandera data validation rules, PyOD detector versions/scores, and SHAP feature importances with dataset fingerprints. | `backend/app/schemas/risk_dto.py`<br>`backend/app/api/v1/endpoints/works.py`<br>`backend/app/api/v1/endpoints/anomalies.py` |

---

## Architectural Principles

1. **Non-Destructive Integration:** Existing domain rules (e.g., 365-day statutory completion lag, ₹75L Trust & Society cap, tender threshold splitting) remain the authoritative core of composite risk scores.
2. **Explicit Lineage:** All Pandera validation checks, PyOD anomaly scores, and SHAP contributions are recorded in the work's data provenance chain with exact library versions and dataset SHA-256 hashes.
3. **Graceful Degradation:** If SHAP explanations or PyOD detectors cannot process a record or fallback model, the system explicitly returns `SHAP explanation unavailable` without throwing exceptions or fabricating fake values.
