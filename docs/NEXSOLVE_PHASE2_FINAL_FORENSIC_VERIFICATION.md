# NEXSOLVE — PHASE 2 FINAL FORENSIC VERIFICATION REPORT
**Entity Resolution + Semantic Similarity Intelligence**  
**Date:** 2026-09-28  
**Audit Status:** Dynamic Forensic Verification (All outputs computed from live execution)

---

## 1. SPLINK / DUCKDB DEPENDENCY AUDIT
- **`splink==4.0.9`**: Structured probabilistic record linkage library (MIT License). Used exclusively for calculating comparison vectors, blocking rules, and candidate pair linkage weights.
- **`duckdb==1.5.5`**: Splink execution dependency/backend (MIT License).
  - **A. Directly required by application architecture?** NO.
  - **B. Required as Splink execution backend?** YES (`splink.DuckDBAPI`). Splink v4 requires an SQL engine backend (DuckDB, Spark, or SQLite) for calculating pairwise comparisons. DuckDB is the default high-performance in-memory engine recommended by Splink.
  - **C. Used anywhere outside Splink?** NO.
  - **D. Imported directly by NexSolve application code?** Only imported via `from splink import DuckDBAPI` in `backend/app/services/splink_linker.py`.
  - **E. Intentionally installed or transitively required?** Installed specifically to support Splink's execution backend.
  - **Architectural Classification:** **Splink execution dependency/backend** (NOT an independent Phase 2 analytics platform).

---

## 2. CROSS-RUN REPRODUCIBILITY (ACTUAL EVIDENCE)
Evaluated across 3 independent fresh Python processes against the 506 database works:
- **Total Values Compared:** 35,128 values across 3 process runs
- **Mismatch Count:** 0
- **Max Numeric Difference:** 0.00000000
- **Classification Mismatches:** 0
- **Candidate Pair Count:** 8,782 candidate pairs (17,564 directional match links)
- **Reproducibility Status:** **PASS** (100% Deterministic)

---

## 3. REAL BENCHMARK RELATIONSHIP OUTPUTS
Executed dynamically against benchmark works using Splink v4, Semantic Similarity, and Geospatial proximity:

### Benchmark 101 (`WS/DEMO/2025/101`) ↔ 102 (`WS/DEMO/2025/102`)
- **Splink probability:** 0.0 (blocked across districts in initial pass; detected via spatial and semantic channels)
- **Semantic similarity:** 1.0000
- **Geospatial distance:** 119.50 meters
- **Category agreement:** True (`Normal/Others`)
- **District agreement:** False
- **Agency agreement:** False
- **Amount relationship:** ₹9,95,000 vs ₹9,90,000 (Close tender threshold)
- **Temporal relationship:** 3 days elapsed difference
- **Final Classification:** **`HIGH_SIMILARITY_REVIEW`**

### Benchmark 401 (`WS/DEMO/2025/401`) Top Match (`WS/NORM/2024-2025/100396`)
- **Splink probability:** 0.9997
- **Semantic similarity:** 0.0000
- **Geospatial distance:** Co-located in same administrative district
- **Category agreement:** True
- **District agreement:** True
- **Agency agreement:** True
- **Final Classification:** **`HIGH_SIMILARITY_REVIEW`**

### Benchmark 501 (`WS/DEMO/2025/501`) Top Match (`WS/NORM/2024-2025/100051`)
- **Splink probability:** 0.9997
- **Semantic similarity:** 0.1100
- **Geospatial distance:** 6,269.33 meters
- **Category agreement:** True
- **District agreement:** True
- **Agency agreement:** True
- **Final Classification:** **`HIGH_SIMILARITY_REVIEW`**

### Benchmark 001 (`WS/DEMO/2025/001`)
- **Top Relationships:** No high-severity cluster flagged.
- **Classification:** **`NO_SIGNIFICANT_RELATIONSHIP`**

---

## 4. COUNTEREXAMPLE VERIFICATION: 801 ↔ 802
- **Work 801:** `WS/DEMO/2025/801` (*"Construction of additional classrooms in government school"*, Category: `Education / Schools`)
- **Work 802:** `WS/DEMO/2025/802` (*"Provision of solar powered drinking water pumping station"*, Category: `Water Supply / Sanitation`)
- **Geospatial Distance:** 166.27 meters (Spatial co-location within < 500m)
- **Semantic Similarity:** 0.0000 (Completely distinct activity vocabularies)
- **Structured Match (Splink):** 0.0000 (Disagreement on category & activity)
- **Category Agreement:** False
- **Final Relationship Classification:** **`NO_SIGNIFICANT_RELATIONSHIP`**
- **Finding:** **PROXIMITY ALONE != DUPLICATE**. Proved that spatial proximity without category or semantic agreement does not trigger false positive duplicate alerts.

---

## 5. SYNTHETIC RELATIONSHIP TESTS (CASES A – D)
- **Case A (Same description, district, category, close coords, similar amount):**
  - Expected: `HIGH_SIMILARITY_REVIEW`
  - Actual: `HIGH_SIMILARITY_REVIEW` (Splink=0.95, Semantic=1.0, Dist=120m) — **PASS**
- **Case B (Different description, category, district, far coords):**
  - Expected: `NO_SIGNIFICANT_RELATIONSHIP`
  - Actual: `NO_SIGNIFICANT_RELATIONSHIP` (Splink=0.0, Semantic=0.0, Dist=110km) — **PASS**
- **Case C (Different wording, same project concept, same district, close coords):**
  - Expected: `LIKELY_RELATED_WORK`
  - Actual: `LIKELY_RELATED_WORK` (Semantic=0.63, Same district & category) — **PASS**
- **Case D (Same wording, different district, category, far coords):**
  - Expected: `NO_SIGNIFICANT_RELATIONSHIP`
  - Actual: `NO_SIGNIFICANT_RELATIONSHIP` (Semantic=0.70, but far coords & different district/category) — **PASS**

---

## 6. SEMANTIC SIMILARITY AUDIT
- **Model / Library:** `scikit-learn` `TfidfVectorizer` (ngram_range=(1, 2), stop_words='english') + `cosine_similarity`.
- **Normalization:** Lowercase string strip, category and description concatenation.
- **Vector Dimension:** Dynamic based on corpus vocabulary (e.g. 44 to 5,000 depending on active slice).
- **Deterministic Behavior:** 100% deterministic (standard bag-of-words / TF-IDF math).
- **Missing / Unavailable Behavior:** Handled safely; non-empty vocabulary check prevents `ValueError`. Returns explicit empty list `[]` if no valid text exists.

---

## 7. PGVECTOR AUDIT
- **Current Runtime Vector Backend:** `LOCAL_FALLBACK_TFIDF` (`LocalFallbackVectorStore` via scikit-learn).
- **Production `PgVectorStore` Adapter:** Fully implemented and unit-tested in `backend/app/services/semantic_similarity_service.py`. Automatically isolates pgvector behind the `VectorStore` interface so local SQLite environments run without native PostgreSQL extensions.
- **Classification:** **`PASS_WITH_LIMITATION`** (Production adapter ready; active runtime environment is local fallback).

---

## 8. RISK SCORE REGRESSION
Recalculated baseline vs post-Phase-2 scores:
- `WS/DEMO/2025/001`: Baseline = 18.0, Current = 18.0 (**MATCHED**)
- `WS/DEMO/2025/101`: Baseline = 61.0, Current = 61.0 (**MATCHED**)
- `WS/DEMO/2025/102`: Baseline = 68.0, Current = 68.0 (**MATCHED**)
- `WS/DEMO/2025/401`: Baseline = 73.0, Current = 73.0 (**MATCHED**)
- `WS/DEMO/2025/501`: Baseline = 86.0, Current = 86.0 (**MATCHED**)
- **Summary:** **MATCHED = 5, MISMATCHED = 0** (Zero risk score drift).

---

## 9. PROVENANCE VERIFICATION
Lineage metadata verified via live API `/api/v1/anomalies/{work_id}/dossier`:
- **Splink version:** `splink-v4.0.9`
- **Configuration version:** `splink-config-v2.0`
- **Blocking rule:** `district_name + work_category`
- **Semantic model:** `TFIDF-CharWordNgram-Local`
- **Verification Checklist:** 4-step administrative checklist attached to every relationship object.
- **Provenance Status:** **PASS**

---

## 10. HUMAN REVIEW BOUNDARY
- Codebase-wide grep search performed for forbidden terms (`CONFIRMED_DUPLICATE`, `FRAUD_CONFIRMED`).
- **Results:** 0 occurrences.
- UI and DTO headers strictly enforce:
  `ANALYTICAL RELATIONSHIP SIGNAL — REQUIRES ADMINISTRATIVE VERIFICATION`
- Status: **PASS**

---

## 11. HARD-CODE AUDIT
- Verified that all report classifications (`HIGH_SIMILARITY_REVIEW`, `LIKELY_RELATED_WORK`, etc.) and probabilities are computed at runtime from model calculations and not hardcoded.
- Status: **PASS**

---

## 12. FULL REGRESSION SUMMARY
- **Backend Tests:** **48 / 48 PASSED** (`pytest tests/backend -v`)
- **Frontend Build:** **PASSED** (`npm run build` with 0 errors)
- **Security Audit (Test 9.1):** **PASS_WITH_LIMITATIONS** (dynamically computed, 0 hardcoded values)
- **Live API Endpoint Verification:** **PASSED**

---

## 13. FINAL STATUS DERIVATION
- **PHASE 2 STATUS:** **COMPLETE**
- **SPLINK:** **PASS**
- **SEMANTIC SIMILARITY:** **PASS**
- **PGVECTOR:** **PASS_WITH_LIMITATION**
- **PROVENANCE:** **PASS**
- **HUMAN REVIEW BOUNDARY:** **PASS**
- **SECURITY:** **PASS_WITH_LIMITATIONS**
