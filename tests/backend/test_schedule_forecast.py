import pytest
from datetime import date
from app.services.schedule_forecast import compute_schedule_forecast

EVAL_DATE = date(2026, 9, 25)

# 1. Planned completion date available
def test_forecast_explicit_planned_completion_date():
    """Explicit planned completion date takes top precedence over default benchmarks."""
    sanction_date = date(2026, 1, 1)
    planned_end = date(2026, 7, 1)  # ~181 days (~6 months)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        planned_completion_date=planned_end,
        physical_progress_pct=50.0,
        eval_date=date(2026, 4, 1),  # ~90 days (3 months elapsed, velocity = 50/3 = 16.67%/mo)
        default_planned_days=365
    )
    assert res["planned_duration_source"] == "EXPLICIT_PLANNED_COMPLETION_DATE"
    assert res["planned_duration_days"] == 181
    assert res["schedule_forecast_status"] == "AVAILABLE"
    # Velocity: 50% in ~3 months = 16.9% / mo. Remaining 50% takes ~3 months.
    # Total duration = 6 months. Planned was 6 months -> Delay ~ 0.0
    assert res["forecast_delay_months"] == 0.0

# 2. Explicit planned duration available
def test_forecast_explicit_planned_duration_days():
    """Explicit planned duration in days takes precedence when no target date is set."""
    sanction_date = date(2026, 1, 1)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        planned_duration_days=180,
        physical_progress_pct=25.0,
        eval_date=date(2026, 4, 1),  # 90 days elapsed (~3 months)
        default_planned_days=365
    )
    assert res["planned_duration_source"] == "EXPLICIT_PLANNED_DURATION_DAYS"
    assert res["planned_duration_days"] == 180
    assert res["schedule_forecast_status"] == "AVAILABLE"
    # Velocity = 25% / 3 mo = ~8.45% / mo. Remaining 75% takes ~9 months.
    # Total = 12 months. Planned was 6 months -> Delay ~ 6 months.
    assert res["forecast_delay_months"] > 5.0
    assert res["schedule_overrun_likelihood"] in ("MEDIUM", "HIGH")
    assert res["critical_milestone_delayed"] is True

# 3. Missing planned baseline
def test_forecast_missing_planned_baseline():
    """When neither explicit baseline nor policy default exists, return INSUFFICIENT_BASELINE_EVIDENCE."""
    sanction_date = date(2026, 1, 1)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        planned_completion_date=None,
        planned_duration_days=None,
        default_planned_days=None,  # No fallback
        physical_progress_pct=40.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "INSUFFICIENT_BASELINE_EVIDENCE"
    assert res["planned_duration_days"] is None
    assert res["forecast_delay_months"] is None
    assert res["planned_duration_source"] == "NONE"

# 4. Completed project with on-time completion
def test_forecast_completed_project_on_time():
    """Completed projects evaluate historical actual completion against planned baseline."""
    sanction_date = date(2025, 1, 1)
    end_date = date(2025, 10, 1)  # 273 days (within 365d baseline)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        actual_end_date=end_date,
        work_status="Completed",
        physical_progress_pct=100.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "COMPLETED"
    assert res["forecast_delay_months"] == 0.0
    assert res["current_delay_days"] == 0
    assert res["forecast_remaining_months"] == 0.0
    assert res["critical_milestone_delayed"] is False

# 5. Completed project with late completion
def test_forecast_completed_project_with_historical_overrun():
    """Completed projects that took longer than planned record historical delay."""
    sanction_date = date(2024, 1, 1)
    end_date = date(2025, 6, 1)  # 517 days (planned was 365, delay = 152 days ~ 5.0 months)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        actual_end_date=end_date,
        work_status="Completed",
        physical_progress_pct=100.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "COMPLETED"
    assert res["forecast_delay_months"] > 4.5
    assert res["current_delay_days"] == 152
    assert res["critical_milestone_delayed"] is True

# 6. Active project with normal progress
def test_forecast_active_project_normal_progress():
    """An active project progressing on-track shows zero forecast delay."""
    sanction_date = date(2026, 3, 27)  # ~182 days (~6 months)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        work_status="Ongoing",
        physical_progress_pct=60.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "AVAILABLE"
    # Velocity: 60% / 6 mo = 10% / mo. Total duration = 10 months (<= 12 months)
    assert res["monthly_progress_velocity"] == pytest.approx(10.0, rel=0.1)
    assert res["forecast_delay_months"] == 0.0
    assert res["schedule_overrun_likelihood"] == "LOW"
    assert res["critical_milestone_delayed"] is False

# 7. Active project with slow progress
def test_forecast_active_project_slow_progress():
    """An active project with progress lagging elapsed time produces calculated forecast delay."""
    sanction_date = date(2025, 11, 25)  # 304 days (~10 months)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        work_status="Ongoing",
        physical_progress_pct=20.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "AVAILABLE"
    # Velocity: 20% / 10 mo = 2% per month. Total duration = 50 months -> Delay ~ 38 months
    assert res["monthly_progress_velocity"] == pytest.approx(2.0, rel=0.1)
    assert res["forecast_delay_months"] > 30.0
    assert res["schedule_overrun_likelihood"] == "HIGH"
    assert res["critical_milestone_delayed"] is True

# 8. Active project with zero progress
def test_forecast_active_project_stalled_zero_progress():
    """Projects with 0% progress after >90 days are flagged as STALLED_ZERO_PROGRESS."""
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

# 9. Early-stage project
def test_forecast_early_stage_project():
    """Projects within 14 days of sanction lack sufficient duration for stable velocity."""
    sanction_date = date(2026, 9, 20)  # 5 days elapsed
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        physical_progress_pct=5.0,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "EARLY_STAGE"
    assert res["forecast_delay_months"] is None
    assert res["monthly_progress_velocity"] is None

# 10. Missing sanction/start date
def test_forecast_missing_sanction_date():
    """Missing sanction dates return INSUFFICIENT_BASELINE_EVIDENCE."""
    res = compute_schedule_forecast(
        sanction_date=None,
        eval_date=EVAL_DATE
    )
    assert res["schedule_forecast_status"] == "INSUFFICIENT_BASELINE_EVIDENCE"
    assert res["forecast_delay_months"] is None
    assert res["monthly_progress_velocity"] is None

# 11. 100% progress
def test_forecast_100_percent_progress():
    """Projects reporting 100% progress are classified as COMPLETED with 0 remaining months."""
    sanction_date = date(2026, 1, 1)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        physical_progress_pct=100.0,
        eval_date=date(2026, 6, 1)
    )
    assert res["schedule_forecast_status"] == "COMPLETED"
    assert res["forecast_remaining_months"] == 0.0
    assert res["remaining_progress_pct"] == 0.0

# 12. Progress > 100% validation
def test_forecast_progress_over_100_percent_capped():
    """Progress reported above 100% is safely clamped to 100.0%."""
    sanction_date = date(2026, 1, 1)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        physical_progress_pct=125.0,
        eval_date=date(2026, 6, 1)
    )
    assert res["physical_progress_pct"] == 100.0
    assert res["remaining_progress_pct"] == 0.0
    assert res["schedule_forecast_status"] == "COMPLETED"

# 13. Negative progress validation
def test_forecast_negative_progress_clamped():
    """Negative progress reported is safely clamped to 0.0%."""
    sanction_date = date(2026, 8, 1)
    res = compute_schedule_forecast(
        sanction_date=sanction_date,
        physical_progress_pct=-15.0,
        eval_date=EVAL_DATE
    )
    assert res["physical_progress_pct"] == 0.0
    assert res["remaining_progress_pct"] == 100.0
