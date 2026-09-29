# MPLADS Risk Intelligence & Investigation Platform (RIIP)
## System Specifications & Architectural Documentation Library
### Sponsored by: Ministry of Statistics & Programme Implementation (MoSPI) — Data Informatics & Innovation Division (DIID)
### SIH 2026 Problem Statement ID: 26102

---

## Documentation Index

### 1. Architecture & Design
- **[02_ARCHITECTURE_SPEC.md](./architecture/02_ARCHITECTURE_SPEC.md)**: Full monorepo architecture, multi-engine analytics pipeline, and Explainable AI (XAI) data flow.
- **[03_DATABASE_SCHEMA.md](./architecture/03_DATABASE_SCHEMA.md)**: Third Normal Form (3NF) relational database schema for 11 entities with SQLite/PostgreSQL cross-portability.
- **[06_UI_INFORMATION_ARCHITECTURE.md](./architecture/06_UI_INFORMATION_ARCHITECTURE.md)**: UI/UX information architecture, GovTech color palette, and Explainable Risk Dossier specifications.

### 2. Functional & Technical Specifications
- **[01_PRD.md](./specifications/01_PRD.md)**: Product Requirements Document outlining stakeholder personas, statutory guidelines, and core functional requirements.
- **[04_API_SPECIFICATION.md](./specifications/04_API_SPECIFICATION.md)**: OpenAPI 3.1 REST API specification covering endpoints, request/response DTO schemas, and status codes.
- **[05_ANALYTICS_METHODOLOGY.md](./specifications/05_ANALYTICS_METHODOLOGY.md)**: Hybrid multi-engine analytics methodology (parametric MAD, TF-IDF n-grams + Haversine, Isolation Forest, and composite weighting).
- **[07_DEMO_DATASET_SPECIFICATION.md](./specifications/07_DEMO_DATASET_SPECIFICATION.md)**: eSAKSHI data schema mirroring and design of the 7 seeded anomaly archetypes (Scenarios A through G).

### 3. Quality Assurance & Testing
- **[08_TEST_STRATEGY.md](./testing/08_TEST_STRATEGY.md)**: 4-tier QA test strategy covering unit, mathematical engine, API contract, and synthetic benchmark validation.

### 4. Implementation Roadmaps
- **[09_2DAY_MVP_PLAN.md](./planning/09_2DAY_MVP_PLAN.md)**: 48-hour sprint execution plan for core deliverables.
- **[10_3DAY_STRETCH_PLAN.md](./planning/10_3DAY_STRETCH_PLAN.md)**: Extended roadmap covering automated PDF dossier generation, graph nexus analysis, and satellite verification.
