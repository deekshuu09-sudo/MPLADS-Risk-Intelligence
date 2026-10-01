"""
Schedule Forecasting Service for SIH26103
Predictive Analytics & Early Warning Infrastructure Project Monitoring

This service computes deterministic, defensible progress-velocity-based schedule forecasts:
1. Precedence for Planned Duration:
   - Level 1: Explicit planned/approved completion date (planned_completion_date) or explicit duration (planned_duration_days).
   - Level 2: Documented domain benchmark (default_planned_days, typically 365 days under MoSPI/MPLADS statutory policy).
   - Level 3: If neither exists, do NOT fabricate a duration. Return INSUFFICIENT_BASELINE_EVIDENCE.
2. Separation of Core Concepts:
   - planned_duration_days: Days allocated under baseline.
   - elapsed_duration_days: Days elapsed from sanction to evaluation anchor (or completion date).
   - current_delay_days / current_delay_months: (elapsed_duration_days - planned_duration_days).
   - monthly_progress_velocity: Physical progress percentage per 30.4375-day month.
   - forecast_remaining_months: Remaining progress divided by monthly velocity.
   - forecast_total_duration_months: Elapsed months + forecast remaining months.
   - forecast_delay_months: Forecast total duration minus planned duration (non-negative).
   - schedule_forecast_status: Categorical status tracking data sufficiency.
"""

from datetime import date
from typing import Optional, Dict, Any

EVALUATION_ANCHOR_DATE = date(2026, 9, 25)
DAYS_PER_MONTH = 30.4375


def compute_schedule_forecast(
    sanction_date: Optional[date],
    actual_end_date: Optional[date] = None,
    planned_completion_date: Optional[date] = None,
    planned_duration_days: Optional[int] = None,
    work_status: Optional[str] = None,
    physical_progress_pct: float = 0.0,
    eval_date: Optional[date] = None,
    default_planned_days: Optional[int] = 365,
) -> Dict[str, Any]:
    """
    Computes a progress-velocity-based schedule forecast for an infrastructure project.

    Parameters:
        - sanction_date: Date work was sanctioned/initiated.
        - actual_end_date: Observed actual completion date (used ONLY for completed projects to verify historical performance).
        - planned_completion_date: Explicit target completion date from project planning baseline.
        - planned_duration_days: Explicit duration in days from approved project schedule.
        - work_status: Administrative execution status (e.g. "Completed", "Ongoing", "Sanctioned").
        - physical_progress_pct: Reported physical milestone progress percentage (0 - 100).
        - eval_date: Evaluation reference anchor date (defaults to 2026-09-25).
        - default_planned_days: Documented domain policy benchmark (365 days). Pass None if testing without default.
    """
    today = eval_date or EVALUATION_ANCHOR_DATE
    status = (work_status or "").strip()

    # 1. Validation of progress values (Negative or >100% bounds checking)
    raw_pct = float(physical_progress_pct if physical_progress_pct is not None else 0.0)
    pct = max(0.0, min(100.0, raw_pct))

    # 2. Missing sanction/start date
    if not sanction_date:
        return {
            "elapsed_duration_days": 0,
            "planned_duration_days": None,
            "current_delay_days": None,
            "current_delay_months": None,
            "physical_progress_pct": pct,
            "remaining_progress_pct": round(100.0 - pct, 1),
            "monthly_progress_velocity": None,
            "forecast_remaining_months": None,
            "forecast_total_duration_months": None,
            "forecast_delay_months": None,
            "schedule_forecast_status": "INSUFFICIENT_BASELINE_EVIDENCE",
            "schedule_overrun_likelihood": "LOW",
            "critical_milestone_delayed": False,
            "planned_duration_source": "NONE",
            "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Missing Sanction Date)",
        }

    # 3. Determine Planned Duration Baseline using strict precedence:
    # Precedence 1: Explicit planned completion date OR explicit planned duration
    resolved_planned_days: Optional[int] = None
    baseline_source = "NONE"

    if planned_completion_date and planned_completion_date > sanction_date:
        resolved_planned_days = (planned_completion_date - sanction_date).days
        baseline_source = "EXPLICIT_PLANNED_COMPLETION_DATE"
    elif planned_duration_days is not None and planned_duration_days > 0:
        resolved_planned_days = planned_duration_days
        baseline_source = "EXPLICIT_PLANNED_DURATION_DAYS"
    elif default_planned_days is not None and default_planned_days > 0:
        resolved_planned_days = default_planned_days
        baseline_source = "DOMAIN_POLICY_BENCHMARK_365D"

    # Precedence 3: If no planned duration exists, return explicit insufficient-baseline status
    if resolved_planned_days is None:
        return {
            "elapsed_duration_days": max(0, (today - sanction_date).days),
            "planned_duration_days": None,
            "current_delay_days": None,
            "current_delay_months": None,
            "physical_progress_pct": pct,
            "remaining_progress_pct": round(100.0 - pct, 1),
            "monthly_progress_velocity": None,
            "forecast_remaining_months": None,
            "forecast_total_duration_months": None,
            "forecast_delay_months": None,
            "schedule_forecast_status": "INSUFFICIENT_BASELINE_EVIDENCE",
            "schedule_overrun_likelihood": "LOW",
            "critical_milestone_delayed": False,
            "planned_duration_source": "NONE",
            "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Insufficient Baseline Evidence)",
        }

    planned_months = resolved_planned_days / DAYS_PER_MONTH

    # 4. Completed Project: Evaluate actual historical completion performance against ORIGINAL planned baseline
    if status == "Completed" or pct >= 100.0:
        # Actual completion date observed
        completion_date = actual_end_date if (actual_end_date and status == "Completed") else today
        elapsed_days = max(0, (completion_date - sanction_date).days)
        elapsed_months = max(0.5, elapsed_days / DAYS_PER_MONTH)
        historical_delay_days = elapsed_days - resolved_planned_days
        historical_delay_months = max(0.0, round(historical_delay_days / DAYS_PER_MONTH, 1))

        return {
            "elapsed_duration_days": elapsed_days,
            "planned_duration_days": resolved_planned_days,
            "current_delay_days": max(0, historical_delay_days),
            "current_delay_months": historical_delay_months,
            "physical_progress_pct": 100.0,
            "remaining_progress_pct": 0.0,
            "monthly_progress_velocity": round(100.0 / elapsed_months, 2),
            "forecast_remaining_months": 0.0,
            "forecast_total_duration_months": round(elapsed_months, 1),
            "forecast_delay_months": historical_delay_months,
            "schedule_forecast_status": "COMPLETED",
            "schedule_overrun_likelihood": "HIGH" if historical_delay_months > 3.0 else ("MEDIUM" if historical_delay_months > 0.0 else "LOW"),
            "critical_milestone_delayed": historical_delay_months > 0.0,
            "planned_duration_source": baseline_source,
            "forecast_methodology": "Historical Milestone Performance Verification (Project Completed)",
        }

    # 5. Active Projects (Ongoing / Sanctioned / Stalled)
    elapsed_days = max(0, (today - sanction_date).days)
    elapsed_months = max(0.5, elapsed_days / DAYS_PER_MONTH)
    remaining_pct = max(0.0, 100.0 - pct)
    current_delay_days = max(0, elapsed_days - resolved_planned_days)
    current_delay_months = round(current_delay_days / DAYS_PER_MONTH, 1)

    # Case A: Early-stage project (<= 14 days elapsed)
    if elapsed_days <= 14:
        return {
            "elapsed_duration_days": elapsed_days,
            "planned_duration_days": resolved_planned_days,
            "current_delay_days": current_delay_days,
            "current_delay_months": current_delay_months,
            "physical_progress_pct": pct,
            "remaining_progress_pct": round(remaining_pct, 1),
            "monthly_progress_velocity": None,
            "forecast_remaining_months": None,
            "forecast_total_duration_months": None,
            "forecast_delay_months": None,
            "schedule_forecast_status": "EARLY_STAGE",
            "schedule_overrun_likelihood": "LOW",
            "critical_milestone_delayed": False,
            "planned_duration_source": baseline_source,
            "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Early Stage <15d)",
        }

    # Case B: Zero progress
    if pct <= 0.0:
        if elapsed_days > 90:
            return {
                "elapsed_duration_days": elapsed_days,
                "planned_duration_days": resolved_planned_days,
                "current_delay_days": current_delay_days,
                "current_delay_months": current_delay_months,
                "physical_progress_pct": 0.0,
                "remaining_progress_pct": 100.0,
                "monthly_progress_velocity": 0.0,
                "forecast_remaining_months": None,
                "forecast_total_duration_months": None,
                "forecast_delay_months": None,
                "schedule_forecast_status": "STALLED_ZERO_PROGRESS",
                "schedule_overrun_likelihood": "HIGH",
                "critical_milestone_delayed": elapsed_days > resolved_planned_days,
                "planned_duration_source": baseline_source,
                "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Zero Velocity / Stalled)",
            }
        else:
            return {
                "elapsed_duration_days": elapsed_days,
                "planned_duration_days": resolved_planned_days,
                "current_delay_days": current_delay_days,
                "current_delay_months": current_delay_months,
                "physical_progress_pct": 0.0,
                "remaining_progress_pct": 100.0,
                "monthly_progress_velocity": 0.0,
                "forecast_remaining_months": None,
                "forecast_total_duration_months": None,
                "forecast_delay_months": None,
                "schedule_forecast_status": "EARLY_STAGE",
                "schedule_overrun_likelihood": "LOW",
                "critical_milestone_delayed": False,
                "planned_duration_source": baseline_source,
                "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Mobilization Phase)",
            }

    # Case C: Active project with measurable physical progress (> 0% and > 14 days elapsed)
    monthly_velocity = pct / elapsed_months  # % physical progress per month
    forecast_remaining_months = remaining_pct / monthly_velocity if monthly_velocity > 0 else 999.0
    forecast_total_months = elapsed_months + forecast_remaining_months

    # Compare forecast completion duration against planned duration
    raw_delay_months = forecast_total_months - planned_months
    forecast_delay_months = max(0.0, round(raw_delay_months, 1))

    # Overrun likelihood determination based on delay & progress
    critical_milestone_delayed = (elapsed_days > resolved_planned_days and pct < 100.0) or (forecast_delay_months >= 3.0)
    if forecast_delay_months >= 6.0 or (elapsed_days > resolved_planned_days and pct < 70.0):
        overrun_likelihood = "HIGH"
    elif forecast_delay_months >= 1.5 or (elapsed_days > 200 and pct < 35.0):
        overrun_likelihood = "MEDIUM"
    else:
        overrun_likelihood = "LOW"

    return {
        "elapsed_duration_days": elapsed_days,
        "planned_duration_days": resolved_planned_days,
        "current_delay_days": current_delay_days,
        "current_delay_months": current_delay_months,
        "physical_progress_pct": pct,
        "remaining_progress_pct": round(remaining_pct, 1),
        "monthly_progress_velocity": round(monthly_velocity, 2),
        "forecast_remaining_months": round(forecast_remaining_months, 1),
        "forecast_total_duration_months": round(forecast_total_months, 1),
        "forecast_delay_months": forecast_delay_months,
        "schedule_forecast_status": "AVAILABLE",
        "schedule_overrun_likelihood": overrun_likelihood,
        "critical_milestone_delayed": critical_milestone_delayed,
        "planned_duration_source": baseline_source,
        "forecast_methodology": "Progress-Velocity-Based Schedule Forecast",
    }
