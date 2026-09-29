import pytest
from app.services.evidence_graph_service import evidence_graph_service
from app.db.session import SessionLocal
from app.models.entities import Work, RiskAnomaly


def test_evidence_graph_construction_basic():
    focal_work = {
        "work_id": "WS/TEST/GRAPH/01",
        "activity_name": "Construction of village community hall",
        "work_category": "Community",
        "district": "Patna",
        "district_name": "Patna",
        "implementing_agency": "PWD Bihar",
        "sanctioned_amount": 1500000.0,
        "sanction_date": "2024-03-01"
    }
    risk_evaluation = {
        "composite_risk_score": 75.0,
        "severity_level": "HIGH",
        "trigger_factors": [
            {
                "rule_name": "STATUTORY_STALL_01",
                "severity": "HIGH",
                "summary": "Execution delay exceeds 365 days",
                "deviation": "+45 days"
            }
        ]
    }
    relationships = [
        {
            "work_id": "WS/TEST/GRAPH/01",
            "related_work_id": "WS/TEST/GRAPH/02",
            "relationship_type": "HIGH_SIMILARITY_REVIEW",
            "activity_name": "Construction of village community hall phase 2",
            "work_category": "Community",
            "composite_risk_score": 70.0,
            "severity_level": "HIGH",
            "structured_match": {"probability": 0.95},
            "semantic_match": {"similarity": 0.88},
            "geospatial_match": {"distance_meters": 120.0},
            "attribute_agreement": {"same_district": True, "same_category": True, "same_agency": True},
            "verification_checklist": [{"step": 1, "check": "Verify sanction order", "status": "PENDING"}]
        }
    ]

    graph_res = evidence_graph_service.build_evidence_graph(
        focal_work=focal_work,
        risk_evaluation=risk_evaluation,
        relationships=relationships,
        investigation_status={"status": "UNDER_REVIEW", "assigned_role": "DISTRICT_OFFICER"}
    )

    assert graph_res["focal_work_id"] == "WS/TEST/GRAPH/01"
    assert "NetworkX" in graph_res["engine"]
    assert graph_res["topology_metrics"]["total_nodes"] >= 6  # Focal Work, District, Agency, Category, Signal, Investigation, Related Work
    assert graph_res["topology_metrics"]["total_edges"] >= 6

    node_types = set(n["node_type"] for n in graph_res["nodes"])
    assert "WORK" in node_types
    assert "DISTRICT" in node_types
    assert "AGENCY" in node_types
    assert "CATEGORY" in node_types
    assert "RISK_SIGNAL" in node_types
    assert "INVESTIGATION" in node_types

    edge_types = set(e["edge_type"] for e in graph_res["edges"])
    assert "LOCATED_IN" in edge_types
    assert "IMPLEMENTED_BY" in edge_types
    assert "HAS_CATEGORY" in edge_types
    assert "TRIGGERS" in edge_types
    assert "HAS_INVESTIGATION" in edge_types
    assert "RELATED_TO" in edge_types

    # Verify edge evidence preservation
    rel_edges = [e for e in graph_res["edges"] if e["edge_type"] == "RELATED_TO"]
    assert len(rel_edges) == 1
    edge = rel_edges[0]
    assert edge["splink_probability"] == 0.95
    assert edge["semantic_similarity"] == 0.88
    assert edge["spatial_distance_meters"] == 120.0
    assert edge["same_district"] is True
    assert "ANALYTICAL RELATIONSHIP SIGNAL" in edge["disclaimer"]


def test_evidence_graph_counterexample_801_802():
    """801 ↔ 802 counterexample must NOT produce duplicate or related edge."""
    focal_work = {
        "work_id": "WS/DEMO/2025/801",
        "activity_name": "Construction of additional classrooms in government school",
        "work_category": "Education / Schools",
        "district": "Lucknow",
        "district_name": "Lucknow",
        "implementing_agency": "District Inspector of Schools",
        "sanctioned_amount": 850000.0
    }
    risk_evaluation = {
        "composite_risk_score": 25.0,
        "severity_level": "LOW",
        "trigger_factors": []
    }
    # Notice relationship_type is NO_SIGNIFICANT_RELATIONSHIP
    relationships = [
        {
            "work_id": "WS/DEMO/2025/801",
            "related_work_id": "WS/DEMO/2025/802",
            "relationship_type": "NO_SIGNIFICANT_RELATIONSHIP",
            "geospatial_match": {"distance_meters": 166.27}
        }
    ]

    graph_res = evidence_graph_service.build_evidence_graph(
        focal_work=focal_work,
        risk_evaluation=risk_evaluation,
        relationships=relationships
    )

    # 802 must NOT be included as a related work in the graph
    node_ids = [n["id"] for n in graph_res["nodes"]]
    assert "work:WS/DEMO/2025/802" not in node_ids

    rel_edges = [e for e in graph_res["edges"] if e["edge_type"] == "RELATED_TO"]
    assert len(rel_edges) == 0


def test_evidence_graph_reproducibility():
    """Verify that repeated graph construction is 100% deterministic."""
    focal_work = {
        "work_id": "WS/DEMO/2025/101",
        "activity_name": "Construction of road from village A to B",
        "work_category": "Normal/Others",
        "district": "Patna",
        "district_name": "Patna",
        "implementing_agency": "Rural Works Department",
        "sanctioned_amount": 995000.0
    }
    risk_evaluation = {
        "composite_risk_score": 61.0,
        "severity_level": "HIGH",
        "trigger_factors": [{"rule_name": "SPLIT_TENDER", "severity": "HIGH"}]
    }
    relationships = [
        {
            "work_id": "WS/DEMO/2025/101",
            "related_work_id": "WS/DEMO/2025/102",
            "relationship_type": "HIGH_SIMILARITY_REVIEW",
            "composite_risk_score": 68.0,
            "severity_level": "HIGH",
            "structured_match": {"probability": 0.0},
            "semantic_match": {"similarity": 1.0},
            "geospatial_match": {"distance_meters": 119.5},
            "attribute_agreement": {"same_district": False, "same_category": True, "same_agency": False}
        }
    ]

    res1 = evidence_graph_service.build_evidence_graph(focal_work, risk_evaluation, relationships)
    res2 = evidence_graph_service.build_evidence_graph(focal_work, risk_evaluation, relationships)

    assert len(res1["nodes"]) == len(res2["nodes"])
    assert len(res1["edges"]) == len(res2["edges"])
    assert res1["topology_metrics"] == res2["topology_metrics"]
    assert res1["investigation_intelligence"]["why_it_matters"] == res2["investigation_intelligence"]["why_it_matters"]


def test_evidence_graph_human_review_boundary():
    """Verify that forbidden conclusions are absent."""
    focal_work = {"work_id": "WS/TEST/BOUNDARY", "activity_name": "Test", "work_category": "General"}
    risk_eval = {"composite_risk_score": 90.0, "severity_level": "CRITICAL", "trigger_factors": []}
    res = evidence_graph_service.build_evidence_graph(focal_work, risk_eval, [])

    serialized = str(res).upper()
    assert "CONFIRMED_DUPLICATE" not in serialized
    assert "FRAUD_CONFIRMED" not in serialized
    assert "CORRUPTION" not in serialized
    assert "ANALYTICAL RELATIONSHIP SIGNAL" in serialized
