"""
Phase 2 Unit Tests: Splink Entity Resolution, Semantic Similarity VectorStore,
Relationship Fusion, and Provenance Lineage Extensions.
"""

import pytest
import pandas as pd
from app.services.splink_linker import splink_linker, SplinkLinkerService
from app.services.semantic_similarity_service import (
    semantic_similarity_service,
    LocalFallbackVectorStore,
    PgVectorStore
)
from app.services.relationship_fusion_service import relationship_fusion_service


# ==========================================
# 1. SPLINK ENTITY RESOLUTION TESTS
# ==========================================

def test_splink_predict_linkages_execution():
    works_data = [
        {
            "work_id": "WS/TEST/2026/101",
            "activity_name": "Construction of rural concrete road",
            "work_category": "Roads",
            "district_name": "Patna",
            "implementing_agency": "PWD Bihar",
            "sanctioned_amount": 500000.0,
            "days_elapsed": 120
        },
        {
            "work_id": "WS/TEST/2026/102",
            "activity_name": "Construction of rural concrete road segment",
            "work_category": "Roads",
            "district_name": "Patna",
            "implementing_agency": "PWD Bihar",
            "sanctioned_amount": 505000.0,
            "days_elapsed": 125
        },
        {
            "work_id": "WS/TEST/2026/103",
            "activity_name": "Installation of solar street lights",
            "work_category": "Energy",
            "district_name": "Gaya",
            "implementing_agency": "BREDA",
            "sanctioned_amount": 1000000.0,
            "days_elapsed": 300
        }
    ]

    matches_map = splink_linker.predict_linkages(works_data, threshold_match_probability=0.20)
    assert len(matches_map) > 0
    assert "WS/TEST/2026/101" in matches_map
    match_item = matches_map["WS/TEST/2026/101"][0]
    assert match_item["related_work_id"] == "WS/TEST/2026/102"
    assert 0.0 <= match_item["match_probability"] <= 1.0
    assert "splink_version" in match_item
    assert "blocking_rule" in match_item


# ==========================================
# 2. SEMANTIC SIMILARITY VECTORSTORE TESTS
# ==========================================

def test_semantic_similarity_local_fallback():
    works_data = [
        {"work_id": "WS/SIM/001", "activity_name": "Construction of community drinking water tank", "work_category": "Water"},
        {"work_id": "WS/SIM/002", "activity_name": "Construction of overhead drinking water storage tank", "work_category": "Water"},
        {"work_id": "WS/SIM/003", "activity_name": "Installation of high-mast LED floodlights at sports complex", "work_category": "Sports"}
    ]

    store = LocalFallbackVectorStore()
    store.index_works(works_data)
    results = store.search_similar("WS/SIM/001", top_k=5)

    assert len(results) > 0
    top_match = results[0]
    assert top_match["related_work_id"] == "WS/SIM/002"
    assert top_match["similarity"] > 0.50
    assert top_match["model"] == "TFIDF-CharWordNgram-Local"


def test_pgvector_store_adapter_metadata():
    pg_store = PgVectorStore()
    meta = pg_store.get_metadata()
    assert meta["store_type"] == "PGVECTOR_PRODUCTION_ADAPTER"
    assert "pgvector_version" in meta
    assert meta["fallback_status"] == "ACTIVE_DETERMINISTIC_FALLBACK"


# ==========================================
# 3. RELATIONSHIP FUSION TESTS
# ==========================================

def test_relationship_fusion_classification():
    # Case A: High Similarity Review
    rel_type_a = relationship_fusion_service.classify_relationship(
        splink_prob=0.92,
        semantic_sim=0.85,
        geo_distance_m=120.0,
        same_district=True,
        same_category=True,
        same_agency=True
    )
    assert rel_type_a == "HIGH_SIMILARITY_REVIEW"

    # Case B: Likely Related Work
    rel_type_b = relationship_fusion_service.classify_relationship(
        splink_prob=0.70,
        semantic_sim=0.65,
        geo_distance_m=1200.0,
        same_district=True,
        same_category=True,
        same_agency=False
    )
    assert rel_type_b == "LIKELY_RELATED_WORK"

    # Counterexample (Spatial Proximity Only, Different Category): 801 <-> 802
    rel_type_counter = relationship_fusion_service.classify_relationship(
        splink_prob=0.10,
        semantic_sim=0.15,
        geo_distance_m=150.0,
        same_district=True,
        same_category=False,
        same_agency=False
    )
    assert rel_type_counter == "NO_SIGNIFICANT_RELATIONSHIP"


def test_relationship_fusion_full_object():
    target = {"work_id": "WS/101", "district_name": "Patna", "work_category": "Roads", "implementing_agency": "PWD"}
    candidates = [{"work_id": "WS/102", "district_name": "Patna", "work_category": "Roads", "implementing_agency": "PWD"}]
    splink_m = [{"related_work_id": "WS/102", "match_probability": 0.88, "blocking_rule": "district+category", "splink_version": "v4.0.9"}]
    sem_m = [{"related_work_id": "WS/102", "similarity": 0.82, "model": "TFIDF-Local"}]
    geo_m = [{"matched_work_id": "WS/102", "distance_meters": 119.5}]

    fused = relationship_fusion_service.fuse_work_relationships(
        target_work=target,
        candidate_works=candidates,
        splink_matches=splink_m,
        semantic_matches=sem_m,
        geo_relationships=geo_m
    )

    assert len(fused) == 1
    f_item = fused[0]
    assert f_item["related_work_id"] == "WS/102"
    assert f_item["relationship_type"] == "HIGH_SIMILARITY_REVIEW"
    assert "ANALYTICAL RELATIONSHIP SIGNAL" in f_item["disclaimer"]
    assert len(f_item["verification_checklist"]) == 4


# ==========================================
# 4. ADVERSARIAL & EDGE CASE TESTS
# ==========================================

def test_semantic_similarity_empty_descriptions():
    works_data = [
        {"work_id": "WS/EMP/001", "activity_name": "", "work_category": ""},
        {"work_id": "WS/EMP/002", "activity_name": None, "work_category": None}
    ]
    store = LocalFallbackVectorStore()
    store.index_works(works_data)
    res = store.search_similar("WS/EMP/001")
    assert len(res) == 0


def test_splink_missing_fields_safe_handling():
    works_data = [
        {"work_id": "WS/MISS/001"},
        {"work_id": "WS/MISS/002"}
    ]
    matches = splink_linker.predict_linkages(works_data)
    assert isinstance(matches, dict)
