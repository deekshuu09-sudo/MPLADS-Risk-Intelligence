# PHASE 2 OSS LICENSE AUDIT & COMPLIANCE REPORT

**Project:** NexSolve — MPLADS Risk Intelligence & Investigation Platform  
**Date:** 2026-09-28  
**Audit Scope:** Phase 2 Entity Resolution & Semantic Similarity Dependencies  

---

## 1. COMPONENT DEPENDENCY & LICENSE MATRIX

| Package / Library | Version | License | Category / Purpose | Usage in NexSolve | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **splink** | `4.0.9` | **MIT License** | Structured Probabilistic Record Linkage | Entity resolution, comparison vector calculation, blocking rules | **ACTIVE (Native)** |
| **pgvector** | `0.3.6` | **MIT License** | PostgreSQL Vector Extension Adapter | Pluggable production VectorStore adapter for pgvector embeddings | **ACTIVE (Adapter)** |
| **duckdb** | `1.5.5` | **MIT License** | Embedded Analytical Database Engine | In-memory backend for Splink fast linkage calculations | **ACTIVE (Backend)** |
| **scikit-learn** | `1.9.1` | **BSD 3-Clause** | Machine Learning & Text Normalization | `TF-IDF` Vectorization fallback for local VectorStore | **ACTIVE (Fallback)** |
| **pandas** | `2.2.3` | **BSD 3-Clause** | Data Structures & Manipulation | Dataframe processing for Splink inputs and outputs | **ACTIVE** |
| **numpy** | `2.2.3` | **BSD 3-Clause** | Numerical Computing | Vector math, cosine similarity calculations | **ACTIVE** |

---

## 2. COMPLIANCE & GOVERNANCE VERIFICATION

1. **Permissive Open-Source Licenses Only:**
   - All Phase 2 packages use standard **MIT** or **BSD 3-Clause** licenses.
   - No Copyleft (GPL, AGPL, LGPL) or commercial restrictive licenses were added.

2. **Phase 3 Isolation Audit:**
   - Verified that no Phase 3 libraries (`NetworkX`, `GeoPandas`, `Shapely`, `OPA`, `MLflow`, `Evidently`, `PyTorch Geometric`) were installed or imported into the Phase 2 codebase.

3. **Production vs. Development Isolation:**
   - `pgvector` adapter is clean and decoupled via standard `VectorStore` base class interface.
   - Local fallback (`LocalFallbackVectorStore`) executes deterministically without native C/PostgreSQL extensions.
