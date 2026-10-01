"""
Schedule Forecasting Service for SIH26103
Predictive Analytics & Early Warning Infrastructure Project Monitoring

This service computes deterministic, defensible progress-velocity-based schedule forecasts:
1. Current Delay Indicator: Progress achieved relative to elapsed duration.
2. Progress Velocity: Observed physical completion rate per calendar month.
3. Forecast Completion: Projected total duration based on remaining work and observed velocity.
4. Forecast Delay: Estimated slippage beyond planned/sanctioned timeframe.
5. Explicit Data Sufficiency: Categorical status distinguishing sufficient data from early stage,
   stalled zero-progress, completed projects, or missing evidence.
"""

from datetime import date
from typing import Optional, Dict, Any

EVALUATION_ANCHOR_DATE = date(2026, 9, 25)
DEFAULT_PLANNED_DAYS = 365
DAYS_PER_MONTH = 30.4375


def compute_schedule_forecast(
    sanction_date: Optional[date],
    actual_end_date: Optional[date] = None,
    work_status: Optional[str] = None,
    physical_progress_pct: float = 0.0,
    eval_date: Optional[date] = None,
    default_planned_days: int = DEFAULT_PLANNED_DAYS,
) -> Dict[str, Any]:
    """
    Computes a progress-velocity-based schedule forecast for an infrastructure project.

    Returns a dictionary containing:
        - elapsed_days: int
        - planned_duration_days: int
        - physical_progress_pct: float
        - remaining_progress_pct: float
        - monthly_progress_velocity: Optional[float] (% / month)
        - forecast_remaining_months: Optional[float]
        - forecast_total_duration_months: Optional[float]
        - forecast_delay_months: Optional[float]
        - schedule_forecast_status: str
            ("AVAILABLE", "COMPLETED", "EARLY_STAGE", "STALLED_ZERO_PROGRESS", "INSUFFICIENT_EVIDENCE")
        - schedule_overrun_likelihood: str ("LOW", "MEDIUM", "HIGH")
        - critical_milestone_delayed: bool
        - forecast_methodology: str
    """
    today = eval_date or EVALUATION_ANCHOR_DATE
    pct = max(0.0, min(100.0, float(physical_progress_pct or 0.0)))
    status = (work_status or "").strip()

    # Case 1: Missing sanction date
    if not sanction_date:
        return {
            "elapsed_days": 0,
            "planned_duration_days": default_planned_days,
            "physical_progress_pct": pct,
            "remaining_progress_pct": round(100.0 - pct, 1),
            "monthly_progress_velocity": None,
            "forecast_remaining_months": None,
            "forecast_total_duration_months": None,
            "forecast_delay_months": None,
            "schedule_forecast_status": "INSUFFICIENT_EVIDENCE",
            "schedule_overrun_likelihood": "LOW",
            "critical_milestone_delayed": False,
            "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Insufficient telemetry)",
        }

    # For completed projects, planned duration is the statutory milestone benchmark (default 365 days).
    # For ongoing projects with a specified future target completion date > sanction_date, planned duration is that target.
    if status != "Completed" and actual_end_date and actual_end_date > sanction_date:
        planned_duration_days = (actual_end_date - sanction_date).days
    else:
        planned_duration_days = default_planned_days

    planned_months = planned_duration_days / DAYS_PER_MONTH

    # Case 2: Project Completed
    if status == "Completed" or pct >= 100.0:
        # If completion date is recorded, evaluate whether it was finished on schedule
        completion_date = actual_end_date if (actual_end_date and status == "Completed") else today
        total_days = max(0, (completion_date - sanction_date).days)
        actual_delay_months = max(0.0, round((total_days - planned_duration_days) / DAYS_PER_MONTH, 1))

        return {
            "elapsed_days": total_days,
            "planned_duration_days": planned_duration_days,
            "physical_progress_pct": 100.0,
            "remaining_progress_pct": 0.0,
            "monthly_progress_velocity": round(100.0 / max(0.5, total_days / DAYS_PER_MONTH), 2),
            "forecast_remaining_months": 0.0,
            "forecast_total_duration_months": round(total_days / DAYS_PER_MONTH, 1),
            "forecast_delay_months": actual_delay_months,
            "schedule_forecast_status": "COMPLETED",
            "schedule_overrun_likelihood": "HIGH" if actual_delay_months > 3.0 else ("MEDIUM" if actual_delay_months > 0.0 else "LOW"),
            "critical_milestone_delayed": actual_delay_months > 0.0,
            "forecast_methodology": "Historical Milestone Verification (Project Completed)",
        }

    # Ongoing / Sanctioned / Stalled projects
    elapsed_days = max(0, (today - sanction_date).days)
    remaining_pct = max(0.0, 100.0 - pct)

    # Case 3: Very early stage (<= 14 days)
    if elapsed_days <= 14:
        return {
            "elapsed_days": elapsed_days,
            "planned_duration_days": planned_duration_days,
            "physical_progress_pct": pct,
            "remaining_progress_pct": round(remaining_pct, 1),
            "monthly_progress_velocity": None,
            "forecast_remaining_months": None,
            "forecast_total_duration_months": None,
            "forecast_delay_months": None,
            "schedule_forecast_status": "EARLY_STAGE",
            "schedule_overrun_likelihood": "LOW",
            "critical_milestone_delayed": False,
            "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Early Stage <15d)",
        }

    # Case 4: Zero progress
    if pct <= 0.0:
        if elapsed_days > 90:
            # Stalled / unstarted project after significant elapsed time
            # Velocity is 0.0, so time to complete is undefined/infinite under current trajectory
            # Project is already lagging planned schedule
            months_past_planned = max(0.0, round((elapsed_days - planned_duration_days) / DAYS_PER_MONTH, 1))
            return {
                "elapsed_days": elapsed_days,
                "planned_duration_days": planned_duration_days,
                "physical_progress_pct": 0.0,
                "remaining_progress_pct": 100.0,
                "monthly_progress_velocity": 0.0,
                "forecast_remaining_months": None,
                "forecast_total_duration_months": None,
                "forecast_delay_months": None,
                "schedule_forecast_status": "STALLED_ZERO_PROGRESS",
                "schedule_overrun_likelihood": "HIGH",
                "critical_milestone_delayed": elapsed_days > planned_duration_days,
                "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Zero Velocity / Stalled)",
            }
        else:
            return {
                "elapsed_days": elapsed_days,
                "planned_duration_days": planned_duration_days,
                "physical_progress_pct": 0.0,
                "remaining_progress_pct": 100.0,
                "monthly_progress_velocity": 0.0,
                "forecast_remaining_months": None,
                "forecast_total_duration_months": None,
                "forecast_delay_months": None,
                "schedule_forecast_status": "EARLY_STAGE",
                "schedule_overrun_likelihood": "LOW",
                "critical_milestone_delayed": False,
                "forecast_methodology": "Progress-Velocity-Based Schedule Forecast (Mobilization Phase)",
            }

    # Case 5: Measurable progress (pct > 0.0 and elapsed_days > 14)
    elapsed_months = max(0.5, elapsed_days / DAYS_PER_MONTH)
    monthly_velocity = pct / elapsed_months  # % progress per month
    forecast_remaining_months = remaining_pct / monthly_velocity if monthly_velocity > 0 else 999.0
    forecast_total_months = elapsed_months + forecast_remaining_months

    # Forecast delay beyond planned timeframe
    raw_delay_months = forecast_total_months - planned_months
    forecast_delay_months = max(0.0, round(raw_delay_months, 1))

    # Overrun likelihood determination based on delay & progress
    critical_milestone_delayed = (elapsed_days > planned_duration_days and pct < 100.0) or (forecast_delay_months >= 3.0)
    if forecast_delay_months >= 6.0 or (elapsed_days > planned_duration_days and pct < 70.0):
        overrun_likelihood = "HIGH"
    elif forecast_delay_months >= 1.5 or (elapsed_days > 200 and pct < 35.0):
        overrun_likelihood = "MEDIUM"
    else:
        overrun_likelihood = "LOW"

    return {
        "elapsed_days": elapsed_days,
        "planned_duration_days": planned_duration_days,
        "physical_progress_pct": pct,
        "remaining_progress_pct": round(remaining_pct, 1),
        "monthly_progress_velocity": round(monthly_velocity, 2),
        "forecast_remaining_months": round(forecast_remaining_months, 1),
        "forecast_total_duration_months": round(forecast_total_months, 1),
        "forecast_delay_months": forecast_delay_months,
        "schedule_forecast_status": "AVAILABLE",
        "schedule_overrun_likelihood": overrun_likelihood,
        "critical_milestone_delayed": critical_milestone_delayed,
        "forecast_methodology": "Progress-Velocity-Based Schedule Forecast",
    }
