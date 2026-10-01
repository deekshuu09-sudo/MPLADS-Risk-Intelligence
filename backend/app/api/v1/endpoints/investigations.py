import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, outerjoin
from app.db.session import get_db
from app.models.entities import Work, RiskAnomaly, Investigation, AuditLog, MemberOfParliament
from app.schemas.investigation_dto import (
    ReviewSubmissionDTO, ReviewResultDTO, InvestigationQueueItemDTO
)
from app.services.audit_service import audit_service

router = APIRouter()

VALID_STATUSES = [
    "OPEN",
    "IN_REVIEW",
    "VERIFICATION_REQUIRED",
    "INSPECTION_SCHEDULED",
    "UNDER_REVIEW",
    "DOCUMENTS_REQUESTED",
    "CLARIFICATION_REQUESTED",
    "MONITORING_CONTINUED",
    "RESOLVED",
    "ESCALATED",
    "DISMISSED"
]

@router.post("/{work_id:path}/review", response_model=ReviewResultDTO)
def submit_investigation_review(
    work_id: str,
    payload: ReviewSubmissionDTO,
    db: Session = Depends(get_db)
):
    w = db.query(Work).filter(Work.work_id == work_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Work record not found")

    anomaly = w.anomaly
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly record not found")

    if payload.new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {VALID_STATUSES}"
        )

    # Require reason/remarks for RESOLVED and DISMISSED
    if payload.new_status in ("RESOLVED", "DISMISSED"):
        has_notes = bool(payload.reviewer_notes and payload.reviewer_notes.strip())
        has_decision = bool(payload.outcome_decision and payload.outcome_decision.strip())
        if not (has_notes or has_decision):
            raise HTTPException(
                status_code=400,
                detail=f"Administrative explanation required: Cannot mark investigation as {payload.new_status} without reviewer notes or outcome decision remarks."
            )

    # Fetch or create investigation record
    inv = db.query(Investigation).filter(Investigation.work_id == work_id).first()
    prev_status = inv.status if inv else anomaly.status

    if not inv:
        inv = Investigation(
            work_id=work_id,
            anomaly_id=anomaly.anomaly_id,
            status=payload.new_status,
            assigned_role=payload.assigned_role or "DISTRICT_OFFICER",
            reviewer_notes=payload.reviewer_notes,
            outcome_decision=payload.outcome_decision
        )
        db.add(inv)
    else:
        inv.status = payload.new_status
        if payload.assigned_role:
            inv.assigned_role = payload.assigned_role
        if payload.reviewer_notes:
            existing = inv.reviewer_notes or ""
            timestamp_str = datetime.datetime.utcnow().strftime("%d-%b-%Y %H:%M")
            inv.reviewer_notes = f"{existing}\n[{timestamp_str} {inv.assigned_role}]: {payload.reviewer_notes}".strip()
        if payload.outcome_decision:
            inv.outcome_decision = payload.outcome_decision

    # Synchronize anomaly status
    anomaly.status = payload.new_status

    # Record persisted audit trail event
    audit_entry = audit_service.log_action(
        db=db,
        entity_type="INVESTIGATION",
        entity_id=work_id,
        action_type="STATUS_CHANGE",
        old_value={"status": prev_status},
        new_value={
            "status": payload.new_status,
            "notes": payload.reviewer_notes,
            "decision": payload.outcome_decision
        },
        actor_role=payload.assigned_role or "DISTRICT_OFFICER"
    )

    db.commit()
    db.refresh(inv)

    return ReviewResultDTO(
        success=True,
        work_id=work_id,
        previous_status=prev_status,
        current_status=inv.status,
        audit_log_id=audit_entry.audit_id,
        updated_at=inv.updated_at
    )


@router.get("/queue", response_model=List[InvestigationQueueItemDTO])
def get_investigation_queue(
    house: Optional[str] = Query(None, description="LOK, RAJYA, or ALL"),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    state_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    work_category: Optional[str] = Query(None),
    primary_signal: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("risk_desc"),
    is_synthetic: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns an operational queue of all flagged works with risk anomalies.
    Reconciles with DB Investigation records and supports filters and sorting.
    """
    canonical_house = None
    if house and house.upper() != "ALL":
        if "LOK" in house.upper():
            canonical_house = "LOK"
        elif "RAJYA" in house.upper():
            canonical_house = "RAJYA"
        else:
            canonical_house = house.upper()

    from sqlalchemy import or_
    query = db.query(RiskAnomaly, Work, Investigation).join(
        Work, RiskAnomaly.work_id == Work.work_id
    ).outerjoin(
        Investigation, RiskAnomaly.anomaly_id == Investigation.anomaly_id
    ).filter(
        or_(
            RiskAnomaly.composite_risk_score >= 20.0,
            Investigation.investigation_id.isnot(None)
        )
    )

    if is_synthetic is not None:
        query = query.filter(Work.is_synthetic == is_synthetic)
    if canonical_house:
        query = query.join(Work.mp).filter(MemberOfParliament.house == canonical_house)
    if state_id:
        query = query.join(Work.district).filter(Work.district.has(state_id=state_id))
    if district_id:
        query = query.filter(Work.district_id == district_id)
    if work_category and work_category != "ALL":
        query = query.filter(Work.work_category == work_category)
    if severity and severity != "ALL":
        query = query.filter(RiskAnomaly.severity_level == severity.upper())

    records = query.all()
    now = datetime.datetime.utcnow()
    results = []

    for anomaly, work, inv in records:
        # Determine active status
        inv_status = inv.status if inv else anomaly.status
        if inv_status == "UNREVIEWED":
            inv_status = "VERIFICATION_REQUIRED" if anomaly.severity_level in ("HIGH", "CRITICAL") else "OPEN"

        # Apply status filter
        if status and status != "ALL" and inv_status.upper() != status.upper():
            continue

        assigned_role = inv.assigned_role if inv else "DISTRICT_OFFICER"
        reviewer_notes = inv.reviewer_notes if inv else None
        outcome_decision = inv.outcome_decision if inv else None
        inv_id = inv.investigation_id if inv else anomaly.anomaly_id
        updated_at = inv.updated_at if inv else anomaly.created_at

        # Calculate days using canonical benchmark anchor date (2026-09-25)
        days_in_review = (now - inv.created_at).days if (inv and inv.created_at) else (now - anomaly.created_at).days
        s_date = work.sanction_date
        benchmark_anchor = datetime.date(2026, 9, 25)
        days_elapsed = (benchmark_anchor - s_date).days if s_date else 0

        # Extract primary signal
        primary_sig = "Nominal Risk Signal"
        if anomaly.rule_triggers and len(anomaly.rule_triggers) > 0:
            primary_sig = anomaly.rule_triggers[0].get("summary", "Risk signal detected")

        # Primary signal filtering
        if primary_signal and primary_signal != "ALL":
            if primary_signal.upper() not in primary_sig.upper():
                continue

        # SIH26103 Schedule Forecasting
        from app.services.schedule_forecast import compute_schedule_forecast
        sched = compute_schedule_forecast(
            sanction_date=work.sanction_date,
            actual_end_date=work.actual_end_date,
            work_status=work.work_status,
            physical_progress_pct=work.physical_progress_pct,
            eval_date=benchmark_anchor
        )

        results.append(InvestigationQueueItemDTO(
            investigation_id=inv_id,
            anomaly_id=anomaly.anomaly_id,
            work_id=work.work_id,
            activity_name=work.activity_name,
            work_category=work.work_category,
            sanctioned_amount=work.sanctioned_amount,
            physical_progress_pct=work.physical_progress_pct,
            days_elapsed=days_elapsed,
            primary_signal=primary_sig,
            state_name=work.district.state.state_name if (work.district and work.district.state) else "Unknown",
            district_name=work.district.district_name if work.district else "Unknown",
            mp_name=work.mp.mp_name if work.mp else "Unknown",
            composite_risk_score=anomaly.composite_risk_score,
            severity_level=anomaly.severity_level,
            status=inv_status,
            assigned_role=assigned_role,
            reviewer_notes=reviewer_notes,
            outcome_decision=outcome_decision,
            days_in_review=days_in_review,
            updated_at=updated_at,
            is_synthetic=work.is_synthetic,
            project_id=work.work_id,
            project_name=work.activity_name,
            sector=work.work_category,
            approved_cost=work.sanctioned_amount,
            forecast_delay_months=sched["forecast_delay_months"],
            schedule_forecast_status=sched["schedule_forecast_status"],
            monthly_progress_velocity=sched["monthly_progress_velocity"],
            schedule_risk_score=float(anomaly.baseline_metrics.get("risk_contributions", {}).get("Execution Delay", 0) * 2.85) if (anomaly.baseline_metrics and "risk_contributions" in anomaly.baseline_metrics) else None,
            cost_risk_score=float(anomaly.baseline_metrics.get("risk_contributions", {}).get("Financial Deviation", 0) * 3.33) if (anomaly.baseline_metrics and "risk_contributions" in anomaly.baseline_metrics) else None,
            early_warning_signal=primary_sig
        ))

    # Apply Sorting
    if sort_by == "risk_desc":
        results.sort(key=lambda x: x.composite_risk_score, reverse=True)
    elif sort_by == "risk_asc":
        results.sort(key=lambda x: x.composite_risk_score)
    elif sort_by == "oldest_unresolved":
        results.sort(key=lambda x: (x.status in ("RESOLVED", "DISMISSED"), -x.days_elapsed))
    elif sort_by == "recently_updated":
        results.sort(key=lambda x: x.updated_at, reverse=True)
    elif sort_by == "financial_exposure":
        results.sort(key=lambda x: x.sanctioned_amount, reverse=True)
    elif sort_by == "completion_lag":
        results.sort(key=lambda x: x.days_elapsed, reverse=True)

    return results
