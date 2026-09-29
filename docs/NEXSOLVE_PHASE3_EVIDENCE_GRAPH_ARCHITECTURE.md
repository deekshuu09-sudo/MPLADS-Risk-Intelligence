# NEXSOLVE — PHASE 3 ARCHITECTURE DOCUMENT
## EVIDENCE GRAPH + INVESTIGATION INTELLIGENCE

**System:** NexSolve — MPLADS Risk Intelligence Platform  
**Phase:** Phase 3 (Evidence Graph + Investigation Intelligence)  
**Date:** 2026-09-28  

---

## 1. ARCHITECTURE OVERVIEW

Phase 3 builds an analytical **Evidence Graph** on top of the relational, anomaly detection, geospatial, Splink entity resolution, and TF-IDF semantic similarity engines established in Phases 1 & 2.

```
RAW MPLADS WORKS & AUDIT TRAILS
              │
              ▼
   RELATIONAL DATA LAYER (SQLite/PostgreSQL)
              │
   ┌──────────┴──────────────┬────────────────────────┐
   ▼                         ▼                        ▼
RULE ENGINE & PyOD    GEOSPATIAL ENGINE    SPLINK & SEMANTIC SIMILARITY
   │                         │                        │
   └──────────┬──────────────┴────────────────────────┘
              ▼
     RELATIONSHIP FUSION SERVICE
              │
              ▼
   EVIDENCE GRAPH SERVICE (NetworkX 3.7)
              │
   ┌──────────┴───────────────────────────────┐
   ▼                                          ▼
GRAPH TOPOLOGY & EDGES              INVESTIGATION INTELLIGENCE
- Work nodes                        - Why Flagged synthesis
- District nodes                    - What is Connected breakdown
- Agency nodes                      - Why it Matters explanation
- Category nodes                    - Administrative Checklist
- Risk Signal nodes                 - Real Audit/Lifecycle Timeline
- Investigation nodes                         │
   │                                          │
   └──────────────────┬───────────────────────┘
                      ▼
            DOSSIER API & FRONTEND
                      │
                      ▼
         HUMAN-IN-THE-LOOP OFFICER REVIEW
```

---

## 2. GRAPH MODEL SCHEMA

### Node Types
1. **`WORK`**:
   - `id`: `work:{work_id}`
   - `work_id`: string
   - `activity_name`: string
   - `work_category`: string
   - `risk_score`: float
   - `severity_level`: string (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
   - `status`: string
   - `sanctioned_amount`: float

2. **`DISTRICT`**:
   - `id`: `district:{district_name}`
   - `name`: string

3. **`AGENCY`**:
   - `id`: `agency:{agency_name}`
   - `name`: string

4. **`CATEGORY`**:
   - `id`: `category:{category_name}`
   - `name`: string

5. **`RISK_SIGNAL`**:
   - `id`: `signal:{work_id}:{rule_id}`
   - `signal_type`: string
   - `severity`: string
   - `description`: string

6. **`INVESTIGATION`**:
   - `id`: `investigation:{work_id}:{status}`
   - `status`: string (`UNREVIEWED`, `UNDER_REVIEW`, `INSPECTION_SCHEDULED`, etc.)
   - `assigned_role`: string

### Edge Types
- `LOCATED_IN`: `WORK` → `DISTRICT`
- `IMPLEMENTED_BY`: `WORK` → `AGENCY`
- `HAS_CATEGORY`: `WORK` → `CATEGORY`
- `TRIGGERS`: `WORK` → `RISK_SIGNAL`
- `HAS_INVESTIGATION`: `WORK` → `INVESTIGATION`
- `RELATED_TO`: `WORK` ↔ `WORK` (Carries all Phase 2 evidence metadata: Splink probability, semantic similarity, distance, attribute agreement, checklist, and disclaimer)

---

## 3. HUMAN-REVIEW BOUNDARY & ETHICAL CONSTRAINTS
- The graph represents **evidence connections**, not accusations or legal conclusions.
- Proximity alone cannot trigger duplicate classification (`801 ↔ 802` counterexample strictly preserved as `NO_SIGNIFICANT_RELATIONSHIP`).
- All relationship links bear: `ANALYTICAL RELATIONSHIP SIGNAL — REQUIRES ADMINISTRATIVE VERIFICATION`.
- Investigation timeline uses exclusively real DB audit logs and investigation records.
