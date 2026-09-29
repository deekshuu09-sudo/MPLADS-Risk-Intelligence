# NEXSOLVE — PHASE 2 ENTITY RESOLUTION & SEMANTIC SIMILARITY ARCHITECTURE

**Project:** NexSolve MPLADS Risk Intelligence & Investigation Platform (SIH 2026 PS 26102)  
**Phase:** 2 — Entity Resolution + Semantic Similarity Intelligence  
**Document Date:** 2026-09-27  

---

## 1. System Overview & Scope Boundaries

Phase 2 extends the NexSolve Risk Intelligence Platform by adding a **Multi-Channel Relationship Intelligence Layer**. This layer identifies structured record linkage patterns and semantic description similarities between work records while leaving the core composite risk engine, database schema, benchmark scores (`101`=61, `102`=68, `401`=73, `501`=86), investigation lifecycle, and spatial proximity models intact.

### Non-Negotiable Operational Boundaries:
1. **Human-in-the-Loop:** All outputs are classified as decision-support analytical signals (`POSSIBLE_RELATED_WORK`, `LIKELY_RELATED_WORK`, `HIGH_SIMILARITY_REVIEW`). No relationship automatically alters legal status or generates accusations.
2. **Immutable Risk Scores:** Persisted composite risk scores remain untouched.
3. **Database Stability:** Local development continues on SQLite with a pluggable `VectorStore` adapter for production `pgvector` environments.

---

## 2. Phase 2 System Pipeline Architecture

```
                       RAW MPLADS WORKS
                               |
                               v
                     CANONICAL WORK RECORD
                               |
        +----------------------+----------------------+
        |                                             |
        v                                             v
STRUCTURED ENTITY RESOLUTION                     SEMANTIC SEARCH
(Splink Probabilistic Linkage)               (pgvector / TF-IDF VectorStore)
        |                                             |
        +----------------------+----------------------+
                               |
                               v
                      RELATIONSHIP FUSION
                               |
                               v
                     RELATED-WORK ENGINE
                               |
          +--------------------+--------------------+
          |                                         |
          v                                         v
 POTENTIAL RELATIONSHIP                     NO SIGNIFICANT
  DETECTED (Evidence)                        RELATIONSHIP
          |
          v
   EVIDENCE DOSSIER (Section H/I)
          |
          v
  HUMAN OFFICER REVIEW
          |
          v
 OFFICER DECISION + AUDIT LOG
```

---

## 3. Core Engine Components

### 3.1 Splink Probabilistic Record Linkage (`backend/app/services/splink_linker.py`)
* **Engine:** `splink` v4.0.9 (DuckDB Linker backend)
* **Comparisons:**
  - `work_category`: Exact Match
  - `district_name`: Exact Match
  - `implementing_agency`: String distance / Exact Match
  - `sanctioned_amount`: Relative numerical difference ($\le 10\%$)
  - `days_elapsed`: Temporal closeness ($\le 60$ days)
* **Blocking Rules:**
  - `l.district_name = r.district_name AND l.work_category = r.work_category`
  - `l.implementing_agency = r.implementing_agency AND l.district_name = r.district_name`

### 3.2 Semantic Similarity & VectorStore Abstraction (`backend/app/services/semantic_similarity_service.py`)
* **Interface:** `VectorStore` Base Class
* **Implementations:**
  - `PgVectorStore`: Native PostgreSQL `pgvector` extension adapter (`pgvector` v0.3.6).
  - `LocalFallbackVectorStore`: Cosine similarity over normalized character & word n-gram TF-IDF vectors for zero-dependency local SQLite execution.
* **Metadata Tracked:** Embedding model name, vector dimensions, text normalization version, cosine similarity score.

### 3.3 Relationship Fusion Engine (`backend/app/services/relationship_fusion_service.py`)
Combines multi-channel signals into a unified evidence object:
$$\text{Fusion Evidence} = \{ \text{Splink Probability}, \text{Semantic Cosine Sim}, \text{Geospatial Distance}, \text{Attribute Agreement} \}$$

**Classification Rules:**
- `HIGH_SIMILARITY_REVIEW`: Splink Probability $\ge 0.85$ OR (Semantic Sim $\ge 0.80$ AND Distance $\le 500\text{m}$)
- `LIKELY_RELATED_WORK`: Splink Probability $\ge 0.65$ OR (Semantic Sim $\ge 0.70$ AND Same District/Category)
- `POSSIBLE_RELATED_WORK`: Splink Probability $\ge 0.40$ OR Semantic Sim $\ge 0.60$ OR Distance $\le 500\text{m}$
- `NO_SIGNIFICANT_RELATIONSHIP`: Below thresholds

---

## 4. Software Dependencies & Licensing

| Package | Version | License | Primary Function |
|---|---|---|---|
| `splink` | `4.0.9` | MIT | Probabilistic record linkage and entity resolution |
| `pgvector` | `0.3.6` | MIT | PostgreSQL vector extension Python bindings |
| `duckdb` | `1.5.5` | MIT | In-memory SQL execution engine for Splink |
| `scikit-learn` | `1.9.1` | BSD-3-Clause | TF-IDF vectorizer & cosine similarity fallback |

---

## 5. Human Review & Audit Boundary

Every relationship presented in the UI dossier or API output includes:
1. Clear disclaimer: `"ANALYTICAL RELATIONSHIP SIGNAL — REQUIRES ADMINISTRATIVE VERIFICATION"`
2. Specific Verification Checklist items:
   - [ ] Verify separate sanction orders & letters
   - [ ] Verify separate Measurement Book (MB) entries
   - [ ] Verify physical asset non-overlap
   - [ ] Verify contractor payment vouchers
