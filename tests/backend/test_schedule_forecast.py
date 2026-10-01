import pytest
from datetime import date
from app.services.schedule_forecast import compute_schedule_forecast

EVAL_DATE = date(2026, 9, 25)

def test_forecast_missing_sanction_date():
    """Works missing sanction dates cannot compute progress velocity; return INSUFFICIENT_EVIDENCE."""
    res = compute_schedule_forecast(
        sanction_date=None,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "INSUFFICIENT_EVIDENCE"
    assert res["forecast_delay_months"] is None
    assert res["monthly_progress_velocity"] is None
    assert res["critical_milestone_delayed"] is False

def test_forecast_early_stage_project():
    """Works sanctioned within 14 days have insufficient duration for monthly velocity; return EARLY_STAGE."""
    sanction_date = date(2026, 9, 20)  # 5 days elapsed
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        physical_progress_pct=5.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "EARLY_STAGE"
    assert res["forecast_delay_months"] is None
    assert res["monthly_progress_velocity"] is None

def test_forecast_stalled_zero_progress():
    """Works with 0% progress after >90 days are stalled with zero velocity."""
    sanction_date = date(2026, 4, 1)  # >170 days elapsed
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        physical_progress_pct=0.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "STALLED_ZERO_PROGRESS"
    assert res["forecast_delay_months"] is None
    assert res["monthly_progress_velocity"] == 0.0
    assert res["schedule_overrun_likelihood"] == "HIGH"

def test_forecast_completed_project_on_time():
    """Completed projects evaluate historical duration against planned benchmark."""
    sanction_date = date(2025, 1, 1)
    end_date = date(2025, 10, 1)  # ~9 months (within 12 mo benchmark)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        actual_end_date=end_date,
        work_status="Completed",
        physical_progress_pct=100.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "COMPLETED"
    assert res["forecast_delay_months"] == 0.0
    assert res["forecast_remaining_months"] == 0.0
    assert res["critical_milestone_delayed"] is False

def test_forecast_completed_project_with_historical_overrun():
    """Completed projects that took >365 days record actual completed overrun."""
    sanction_date = date(2024, 1, 1)
    end_date = date(2025, 6, 1)  # 517 days (~17 months, +5 months beyond 12 mo)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        actual_end_date=end_date,
        work_status="Completed",
        physical_progress_pct=100.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "COMPLETED"
    assert res["forecast_delay_months"] > 4.5
    assert res["critical_milestone_delayed"] is True

def test_forecast_ongoing_slow_progress_overrun():
    """A project at 20% progress after 10 months (~304 days) has slow velocity and high forecast delay."""
    sanction_date = date(2025, 11, 25)  # 304 days ~ 10 months
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        work_status="Ongoing",
        physical_progress_pct=20.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "AVAILABLE"
    # Velocity: 20% / 10 mo = 2% per month
    # Remaining: 80% / 2% = 40 months
    # Total duration: 10 + 40 = 50 months
    # Delay beyond 12 months: ~38 months
    assert res["monthly_progress_velocity"] == pytest.approx(2.0, rel=0.1)
    assert res["forecast_delay_months"] > 30.0
    assert res["schedule_overrun_likelihood"] == "HIGH"
    assert res["critical_milestone_delayed"] is True

def test_forecast_ongoing_on_track():
    """A project at 60% progress after 6 months (~182 days) has 10%/mo velocity and completes in 10 months (no overrun)."""
    sanction_date = date(2026, 3, 27)  # 182 days ~ 6 months
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        work_status="Ongoing",
        physical_progress_pct=60.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "AVAILABLE"
    # Velocity: 60% / 6 mo = 10% per month
    # Remaining: 40% / 10% = 4 months
    # Total duration: 6 + 4 = 10 months (within 12 mo benchmark)
    assert res["monthly_progress_velocity"] == pytest.approx(10.0, rel=0.1)
    assert res["forecast_delay_months"] == 0.0
    assert res["schedule_overrun_likelihood"] == "LOW"
    assert res["critical_milestone_delayed"] is False

def test_forecast_determinism_and_non_negative():
    """Forecast delay is never negative and completely deterministic."""
    sanction_date = date(2026, 1, 15)
    r1 = compute_schedule_forecast(sanction_date=sanction_date, physical_progress_pct=45.0, eval_date=EVAL_DATE)
    r2 = compute_schedule_forecast(sanction_date=sanction_date, physical_progress_pct=45.0, eval_date=EVAL_DATE)
    assert r1 == r2
    assert r1["forecast_delay_months"] >= 0.0
