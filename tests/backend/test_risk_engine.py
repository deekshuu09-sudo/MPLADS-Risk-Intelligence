import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.entities import Work, RiskAnomaly
from app.db.seed_demo_data import seed_database
from app.services.risk_engine import risk_engine

@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Seed benchmark data
    seed_database(db)
    # Run risk evaluation
    risk_engine.evaluate_all_works(db)
    
    yield db
    db.close()


def test_scenario_a_tender_threshold_splitting(test_db):
    """
    Scenario A: 2 works in same block within 10 days, all between 9.85L and 9.95L.
    Asserts detection of THRESHOLD_SPLITTING engine trigger with HIGH/CRITICAL severity.
    """
    w1 = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/102").first()
    assert w1 is not None
    assert w1.anomaly is not None
    assert w1.anomaly.severity_level in ("HIGH", "CRITICAL")
    assert w1.anomaly.composite_risk_score >= 60.0

    triggers = w1.anomaly.rule_triggers or []
    assert any(t.get("engine") == "THRESHOLD_SPLITTING" for t in triggers)


def test_scenario_b_near_duplicate_proximity(test_db):
    """
    Scenario B: 2 community halls sanctioned 110m apart with >90% text similarity.
    Asserts NEAR_DUPLICATE trigger with matched work ID.
    """
    w = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/201").first()
    assert w is not None
    assert w.anomaly is not None
    assert w.anomaly.severity_level in ("HIGH", "CRITICAL")

    triggers = w.anomaly.rule_triggers or []
    dup_trigger = next((t for t in triggers if t.get("engine") == "NEAR_DUPLICATE"), None)
    assert dup_trigger is not None
    assert dup_trigger.get("matched_work_id") == "WS/DEMO/2025/202", "Must link to co-located work ID"


def test_scenario_c_severe_cost_outlier(test_db):
    """
    Scenario C: PCC road sanctioned at 18.4L (unit cost > 10k/m vs median 2.1k/m).
    Asserts COST_OUTLIER trigger with Modified Z-score > 3.0.
    """
    w = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/301").first()
    assert w is not None
    assert w.anomaly is not None
    assert w.anomaly.severity_level in ("HIGH", "CRITICAL")

    triggers = w.anomaly.rule_triggers or []
    cost_trigger = next((t for t in triggers if t.get("engine") == "COST_OUTLIER"), None)
    assert cost_trigger is not None
    assert "+" in cost_trigger.get("variance_pct", "")


def test_scenario_d_advance_overpayment(test_db):
    """
    Scenario D: 90% funds disbursed, 10% progress after 240 days.
    Asserts ADVANCE_OVERPAYMENT trigger.
    """
    w = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/401").first()
    assert w is not None
    assert w.anomaly is not None
    assert w.anomaly.composite_risk_score >= 60.0

    triggers = w.anomaly.rule_triggers or []
    adv_trigger = next((t for t in triggers if t.get("engine") == "ADVANCE_OVERPAYMENT"), None)
    assert adv_trigger is not None


def test_scenario_e_chronic_statutory_stall(test_db):
    """
    Scenario E: 485 days elapsed since sanction, 0% progress (violates 365-day rule).
    Asserts STATUTORY_STALL trigger with CRITICAL/HIGH severity.
    """
    w = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/501").first()
    assert w is not None
    assert w.anomaly is not None
    assert w.anomaly.severity_level in ("HIGH", "CRITICAL")

    triggers = w.anomaly.rule_triggers or []
    stall_trigger = next((t for t in triggers if t.get("engine") == "STATUTORY_STALL"), None)
    assert stall_trigger is not None
    assert "365-day" in stall_trigger.get("summary", "")


def test_scenario_f_vendor_monopoly(test_db):
    """
    Scenario F: High contractor concentration (Apex Infra Projects).
    Asserts VENDOR_MONOPOLY trigger in South Andamans district.
    """
    w = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/601").first()
    assert w is not None
    assert w.anomaly is not None

    triggers = w.anomaly.rule_triggers or []
    mono_trigger = next((t for t in triggers if t.get("engine") == "VENDOR_MONOPOLY"), None)
    assert mono_trigger is not None
    assert "HHI" in mono_trigger.get("summary", "")


def test_scenario_g_trust_society_cap_breach(test_db):
    """
    Scenario G: Cumulative MP allocation to Trust and Society > 75 Lakhs.
    Asserts TRUST_SOCIETY_CAP trigger with CRITICAL severity.
    """
    w = test_db.query(Work).filter_by(work_id="WS/DEMO/2025/701").first()
    assert w is not None
    assert w.anomaly is not None
    assert w.anomaly.severity_level == "CRITICAL"

    triggers = w.anomaly.rule_triggers or []
    cap_trigger = next((t for t in triggers if t.get("engine") == "TRUST_SOCIETY_CAP"), None)
    assert cap_trigger is not None
    assert "75 Lakh" in cap_trigger.get("summary", "")


def test_baseline_noise_low_false_discovery(test_db):
    """
    Asserts that normal projects have low false positive rate (< 5% high/critical).
    """
    normal_works = test_db.query(Work).filter(Work.work_id.startswith("WS/NORM/")).all()
    assert len(normal_works) > 300

    high_risk_normal = [w for w in normal_works if w.anomaly and w.anomaly.severity_level in ("HIGH", "CRITICAL")]
    false_positive_rate = len(high_risk_normal) / len(normal_works)
    print(f"Normal work false positive rate: {false_positive_rate * 100:.2f}%")
    assert false_positive_rate < 0.05, f"False positive rate ({false_positive_rate:.3f}) exceeds 5% threshold"
