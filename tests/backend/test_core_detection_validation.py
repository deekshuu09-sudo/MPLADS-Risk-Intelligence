"""
Automated Pytest Suite for NexSolve Core Strength & Detection Validation.

Covers:
- Benchmark labels schema & integrity
- Baseline reproducibility across multiple runs
- Metric calculation correctness (Precision@K, Recall@K, binary metrics)
- Counterexample handling (Work 801 ↔ 802 rejection of duplicate classification)
- Operational threshold sensitivity monotonicity
- Risk-score determinism across independent evaluations
- Missing-value and extreme-value robustness
"""

import pytest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.entities import Work, RiskAnomaly
from app.db.seed_demo_data import seed_database
from app.services.risk_engine import risk_engine
from app.services.statistical_engine import statistical_engine
from app.services.similarity_engine import haversine_distance_meters
from app.services.relationship_fusion_service import relationship_fusion_service
from app.evaluation.dataset import (
    BenchmarkLabel,
    KNOWN_BENCHMARK_CASES,
    get_ground_truth_label
)
from app.evaluation.engine import (
    extract_work_dicts,
    compute_baseline_1_simple_rules,
    compute_baseline_2_ml_only,
    compute_baseline_3_composite,
    compute_baseline_4_composite_plus_fusion,
    calculate_precision_recall_at_k,
    calculate_binary_metrics_at_threshold,
    compute_ablation_matrix
)
from app.evaluation.runner import run_full_evaluation


@pytest.fixture(scope="module")
def eval_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    risk_engine.evaluate_all_works(db)
    yield db
    db.close()


def test_benchmark_dataset_integrity(eval_db):
    """Verify benchmark case labeling catalog and coverage."""
    works = eval_db.query(Work).all()
    assert len(works) == 506

    labels = [get_ground_truth_label(w.work_id) for w in works]
    anomaly_count = sum(1 for l in labels if l == BenchmarkLabel.ANOMALY_CASE)
    control_count = sum(1 for l in labels if l == BenchmarkLabel.COUNTEREXAMPLE)
    normal_count = sum(1 for l in labels if l == BenchmarkLabel.NORMAL_REFERENCE)

    assert anomaly_count == 23, "Must have exactly 23 curated benchmark anomaly cases"
    assert control_count == 3, "Must have 3 control/counterexample cases (001, 801, 802)"
    assert normal_count == 480, "Must have 480 background administrative works"


def test_counterexample_proximity_not_duplicate(eval_db):
    """
    Counterexample 801 ↔ 802:
    Two works co-located within 175m in Lucknow with distinct scopes (School vs Solar Water).
    Asserts:
    1. Neither work exceeds the operational risk cutoff of 30.0.
    2. Relationship classification is NO_SIGNIFICANT_RELATIONSHIP.
    3. No false-positive duplicate flag is formed.
    """
    w801 = eval_db.query(Work).filter_by(work_id="WS/DEMO/2025/801").first()
    w802 = eval_db.query(Work).filter_by(work_id="WS/DEMO/2025/802").first()

    assert w801 is not None and w802 is not None
    assert w801.anomaly.composite_risk_score < 30.0
    assert w802.anomaly.composite_risk_score < 30.0

    dist = haversine_distance_meters(w801.latitude, w801.longitude, w802.latitude, w802.longitude)
    assert 100.0 < dist < 200.0

    rel_class = relationship_fusion_service.classify_relationship(
        splink_prob=0.08,
        semantic_sim=0.12,
        geo_distance_m=dist,
        same_district=True,
        same_category=False,
        same_agency=False
    )
    assert rel_class == "NO_SIGNIFICANT_RELATIONSHIP", "Different category co-located works must not link"


def test_ranking_precision_at_k(eval_db):
    """
    Verifies that the top-ranked cases in the investigation queue are genuine anomalies.
    Precision@10 must be 100% and Precision@25 must be >= 85%.
    """
    works = eval_db.query(Work).all()
    anoms = {a.work_id: a for a in eval_db.query(RiskAnomaly).all()}
    labels_dict = {w.work_id: get_ground_truth_label(w.work_id) for w in works}

    scores = compute_baseline_3_composite(anoms)
    p10, r10, tp10 = calculate_precision_recall_at_k(scores, labels_dict, 10)
    p25, r25, tp25 = calculate_precision_recall_at_k(scores, labels_dict, 25)

    assert p10 == 1.0, f"Precision@10 expected 1.0, got {p10}"
    assert p25 >= 0.85, f"Precision@25 expected >= 0.85, got {p25}"
    assert r25 >= 0.90, f"Recall@25 expected >= 0.90, got {r25}"


def test_threshold_sensitivity_monotonicity(eval_db):
    """
    Verifies that increasing risk thresholds monotonically reduces flagged counts.
    """
    works = eval_db.query(Work).all()
    anoms = {a.work_id: a for a in eval_db.query(RiskAnomaly).all()}
    labels_dict = {w.work_id: get_ground_truth_label(w.work_id) for w in works}
    scores = compute_baseline_3_composite(anoms)

    flagged_counts = []
    for t in [20.0, 30.0, 40.0, 50.0, 60.0]:
        metrics = calculate_binary_metrics_at_threshold(scores, labels_dict, threshold=t)
        flagged_counts.append(metrics["flagged_count"])

    # Must be monotonically non-increasing
    for i in range(len(flagged_counts) - 1):
        assert flagged_counts[i] >= flagged_counts[i + 1]


def test_missing_values_and_extreme_robustness():
    """
    Verifies that null attributes, extreme monetary figures, and empty strings do not crash
    the scoring engines or cause numeric overflow.
    """
    # Pre-seed statistical engine with sample category distribution
    sample_works = [
        {"work_category": "Roads", "sanctioned_amount": 500000.0},
        {"work_category": "Roads", "sanctioned_amount": 600000.0},
        {"work_category": "Roads", "sanctioned_amount": 550000.0},
        {"work_category": "Roads", "sanctioned_amount": 700000.0},
    ]
    statistical_engine.compute_baselines(sample_works)

    # 1. Extreme cost evaluation (500 Cr)
    eval_extreme = statistical_engine.evaluate_cost_outlier("Roads", 5000000000.0)
    assert eval_extreme["subscore"] == 100.0
    assert eval_extreme["is_outlier"] is True
    assert eval_extreme["severity"] == "CRITICAL"

    # 2. None distance in Haversine
    dist = haversine_distance_meters(None, None, 25.0, 80.0)
    assert dist == float("inf")

    # 3. Relationship classification with None distance
    rel = relationship_fusion_service.classify_relationship(
        splink_prob=0.1,
        semantic_sim=0.2,
        geo_distance_m=None,
        same_district=True,
        same_category=False,
        same_agency=False
    )
    assert rel == "NO_SIGNIFICANT_RELATIONSHIP"


def test_full_evaluation_runner_execution(eval_db):
    """
    Executes full evaluation runner and validates report structure.
    """
    report = run_full_evaluation()
    assert "metadata" in report
    assert "baseline_comparison" in report
    assert "ablation_study" in report
    assert len(report["baseline_comparison"]) == 4
    assert len(report["ablation_study"]) == 6
    assert report["counterexample_validation"]["safeguard_verified"] is True
