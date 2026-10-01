import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.models.entities import Work, RiskAnomaly, Expenditure, Investigation, AuditLog
from app.schemas.risk_dto import (
    RiskAnomalyListDTO, ExplainabilityDossierDTO, RiskEvaluationDTO,
    TriggerFactor, BaselineComparison, VerificationChecklistItem,
    RelatedWorkDTO, DataProvenanceItem, DataGapsAndCounterEvidence
)
from app.schemas.work_dto import ExpenditureDTO
from app.services.similarity_engine import haversine_distance_meters

router = APIRouter()

@router.get("", response_model=List[RiskAnomalyListDTO])
def get_anomalies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW"),
    engine: Optional[str] = Query(None, description="COST_OUTLIER, STATUTORY_STALL, NEAR_DUPLICATE, etc."),
    state_id: Optional[int] = Query(None),
    is_synthetic: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(RiskAnomaly).join(RiskAnomaly.work)

    if is_synthetic is not None:
        query = query.filter(Work.is_synthetic == is_synthetic)
    if state_id:
        query = query.join(Work.district).filter(Work.district.has(state_id=state_id))
    if severity:
        query = query.filter(RiskAnomaly.severity_level == severity)
    if status:
        query = query.filter(RiskAnomaly.status == status)

    # Sort strictly by composite_risk_score descending
    query = query.order_by(desc(RiskAnomaly.composite_risk_score))

    anomalies = query.offset(skip).limit(limit).all()
    results = []

    for a in anomalies:
        w = a.work
        if not w:
            continue

        # Check engine filter in JSON rule_triggers if specified
        if engine:
            has_eng = any(f.get("engine") == engine for f in (a.rule_triggers or []))
            if not has_eng:
                continue

        primary_summary = "Nominal review"
        if a.rule_triggers and len(a.rule_triggers) > 0:
            primary_summary = a.rule_triggers[0].get("summary", "")

        results.append(RiskAnomalyListDTO(
            anomaly_id=a.anomaly_id,
            work_id=w.work_id,
            activity_name=w.activity_name,
            work_category=w.work_category,
            state_name=w.district.state.state_name if (w.district and w.district.state) else "Unknown",
            district_name=w.district.district_name if w.district else "Unknown",
            mp_name=w.mp.mp_name if w.mp else "Unknown",
            sanctioned_amount=w.sanctioned_amount,
            composite_risk_score=a.composite_risk_score,
            severity_level=a.severity_level,
            confidence_score=a.confidence_score,
            status=a.status,
            primary_factor_summary=primary_summary,
            is_synthetic=w.is_synthetic,
            created_at=a.created_at
        ))

    return results


@router.get("/{work_id:path}/dossier", response_model=ExplainabilityDossierDTO)
def get_explainability_dossier(work_id: str, db: Session = Depends(get_db)):
    w = db.query(Work).filter(Work.work_id == work_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Work record not found")

    a = w.anomaly
    if not a:
        raise HTTPException(status_code=404, detail="Risk evaluation not found for this work")

    today = datetime.date(2026, 9, 25)
    days_elapsed = (today - w.sanction_date).days if w.sanction_date else None
    disbursed = sum(e.fund_disbursed_amt for e in w.expenditures) if w.expenditures else 0.0

    # Build TriggerFactors
    tf_list = [
        TriggerFactor(
            engine=f.get("engine", "GENERAL"),
            factor_name=f.get("factor_name", "Risk Indicator"),
            severity=f.get("severity", "MEDIUM"),
            weight=f.get("weight", 0.2),
            summary=f.get("summary", ""),
            observed_value=str(f.get("observed_value", "")),
            baseline_value=str(f.get("baseline_value", "")),
            variance_pct=f.get("variance_pct"),
            matched_work_id=f.get("matched_work_id")
        )
        for f in (a.rule_triggers or [])
    ]

    # Baseline comparison metrics
    b_data = a.baseline_metrics or {}
    baseline_comp = None
    if b_data and "median" in b_data:
        baseline_comp = BaselineComparison(
            metric_name=b_data.get("metric_name", "Sanctioned Amount"),
            observed=float(b_data.get("observed", w.sanctioned_amount)),
            p25=float(b_data.get("p25", 0.0)),
            median=float(b_data.get("median", 0.0)),
            p75=float(b_data.get("p75", 0.0)),
            p95=float(b_data.get("p95", 0.0)),
            z_score=b_data.get("z_score")
        )

    # Verification Checklist
    chk_list = [
        VerificationChecklistItem(
            step_no=c.get("step_no", 1),
            action=c.get("action", "Inspect site"),
            details=c.get("details", ""),
            evidence_required=c.get("evidence_required", ["Measurement Book (MB) Entries", "GPS-Tagged Photograph"]),
            status="PENDING"
        )
        for c in (a.recommended_actions or [])
    ]

    # Expenditures
    exp_dtos = [
        ExpenditureDTO(
            expenditure_id=e.expenditure_id,
            work_id=e.work_id,
            vendor_id=e.vendor_id,
            vendor_name=e.vendor.vendor_name if e.vendor else "Unknown Contractor",
            expenditure_date=e.expenditure_date,
            fund_disbursed_amt=e.fund_disbursed_amt,
            payment_status=e.payment_status,
            voucher_no=e.voucher_no,
            is_synthetic=e.is_synthetic
        )
        for e in w.expenditures
    ]

    # Matched duplicate works and RelatedWorkDTOs
    similar_works = []
    related_works = []
    seen_related_ids = set()

    for tf in tf_list:
        if tf.matched_work_id and tf.matched_work_id not in seen_related_ids:
            seen_related_ids.add(tf.matched_work_id)
            m_work = db.query(Work).filter(Work.work_id == tf.matched_work_id).first()
            if m_work:
                dist_m = None
                if w.latitude is not None and w.longitude is not None and m_work.latitude is not None and m_work.longitude is not None:
                    dist_m = round(haversine_distance_meters(w.latitude, w.longitude, m_work.latitude, m_work.longitude), 1)

                m_a = m_work.anomaly
                m_score = m_a.composite_risk_score if m_a else 0.0
                m_sev = m_a.severity_level if m_a else "LOW"

                sim_reason = tf.summary
                if "split" in tf.engine.lower() or "threshold" in tf.engine.lower():
                    sim_reason = "Contiguous works sanctioned within short duration under ₹10L (Configured detection parameters: Spatial < 500 m / Financial ₹10L)"
                elif dist_m is not None:
                    sim_reason = f"Spatial co-location within {dist_m:.0f}m with overlapping scope/description"

                similar_works.append({
                    "work_id": m_work.work_id,
                    "activity_name": m_work.activity_name,
                    "work_description": m_work.work_description,
                    "sanctioned_amount": m_work.sanctioned_amount,
                    "sanction_date": str(m_work.sanction_date),
                    "latitude": m_work.latitude,
                    "longitude": m_work.longitude,
                    "physical_progress_pct": m_work.physical_progress_pct
                })

                related_works.append(RelatedWorkDTO(
                    work_id=m_work.work_id,
                    activity_name=m_work.activity_name,
                    work_category=m_work.work_category,
                    sanctioned_amount=m_work.sanctioned_amount,
                    sanction_date=str(m_work.sanction_date) if m_work.sanction_date else None,
                    distance_meters=dist_m,
                    similarity_reason=sim_reason,
                    severity_level=m_sev,
                    composite_risk_score=m_score
                ))

    # Data Provenance Traceability
    data_provenance = [
        DataProvenanceItem(
            field_name="Work Sanction Date & Letter",
            source_dataset="MPLADS Core Works Registry",
            source_type="Standard Portal Telemetry (Synthetic Demo)",
            timestamp=w.sanction_date.isoformat() if w.sanction_date else "2024-01-01",
            rule_or_engine="Engine STATUTORY_STALL_01 v2.1",
            derivation_method="Date calculation relative to policy benchmark (365 days)",
            value_classification="IMPORTED DATA"
        ),
        DataProvenanceItem(
            field_name="Geo-Coordinates (Lat/Lon)",
            source_dataset="District GIS Asset Mapping Register",
            source_type="Field Geolocation (Simulated)",
            timestamp="2026-09-25",
            rule_or_engine="Engine SPATIAL_PROXIMITY_04",
            derivation_method="Haversine spherical distance calculation (<500m threshold)",
            value_classification="DERIVED ANALYTICAL VALUE"
        ),
        DataProvenanceItem(
            field_name="Payment Vouchers & Disbursed Amount",
            source_dataset="Public Financial Management Ledger (Mock)",
            source_type="Financial Transaction Stream",
            timestamp="2026-09-25",
            rule_or_engine="Engine EXP_AUDIT_02",
            derivation_method="Summation of verified expenditure vouchers",
            value_classification="IMPORTED DATA"
        ),
        DataProvenanceItem(
            field_name="Physical Progress Percentage",
            source_dataset="District Planning Officer Inspection Return",
            source_type="Administrative Status Filing",
            timestamp="2026-09-25",
            rule_or_engine="Engine MILESTONE_LAG_03",
            derivation_method="Reported physical progress vs milestone schedule gap",
            value_classification="DERIVED ANALYTICAL VALUE"
        )
    ]

    # Detailed Work Provenance Object
    from app.api.v1.endpoints.works import get_work_provenance
    prov_obj = get_work_provenance(work_id=w.work_id, db=db)

    # Data Gaps & Mitigating Factors
    missing_evidence = []
    mitigating_factors = []

    if w.file_status != "AVAILABLE" or w.physical_progress_pct < 20.0:
        missing_evidence.append("Geo-tagged completion photos not uploaded to central telemetry archive")
    if not w.actual_end_date and w.work_status != "Completed":
        missing_evidence.append("Stage-wise physical Measurement Book (MB) abstract pending submission")
    if days_elapsed and days_elapsed > 300:
        missing_evidence.append("Independent third-party technical quality inspection report not on record")
    if not missing_evidence:
        missing_evidence.append("Formal asset handover and utilization certificate pending final district clearance")

    if w.location_type == "Rural":
        mitigating_factors.append("Monsoon and agricultural harvesting cycles may explain intermittent seasonal site stall")
    if w.sanctioned_amount > 2000000:
        mitigating_factors.append("Material logistics across non-contiguous terrain may account for unit rate deviation")
    if not mitigating_factors:
        mitigating_factors.append("Project execution timeline remains aligned with revised administrative milestone schedule")

    data_gaps = DataGapsAndCounterEvidence(
        missing_evidence=missing_evidence,
        potential_mitigating_factors=mitigating_factors,
        disclaimer="Risk score indicates priority for verification, not a finding of misconduct."
    )

    # Real database audit trail events for this work
    audit_logs = db.query(AuditLog).filter(AuditLog.entity_id == work_id).order_by(desc(AuditLog.timestamp)).all()
    audit_trail_list = [
        {
            "audit_id": log.audit_id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action_type": log.action_type,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "actor_role": log.actor_role,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat()
        }
        for log in audit_logs
    ]

    # Latest investigation status
    inv = db.query(Investigation).filter(Investigation.work_id == work_id).order_by(desc(Investigation.updated_at)).first()
    inv_dict = None
    if inv:
        inv_dict = {
            "status": inv.status,
            "assigned_role": inv.assigned_role,
            "reviewer_notes": inv.reviewer_notes,
            "outcome_decision": inv.outcome_decision,
            "last_updated": inv.updated_at.isoformat()
        }

    # Phase 1 OSS Analytics Integration (Pandera, PyOD, SHAP)
    from app.services.data_validator import data_validator
    from app.services.pyod_engine import pyod_engine
    from app.services.shap_explainer import shap_explainer

    # 1. Pandera Data Validation Check
    canonical_days = (w.actual_end_date - w.sanction_date).days if (w.actual_end_date and w.sanction_date) else (days_elapsed or 365)
    work_dict_for_val = {
        "work_id": w.work_id,
        "sanctioned_amount": w.sanctioned_amount,
        "actual_amount": disbursed,
        "physical_progress_pct": w.physical_progress_pct,
        "latitude": w.latitude,
        "longitude": w.longitude,
        "work_category": w.work_category,
        "work_status": w.work_status,
        "days_elapsed": canonical_days
    }
    is_valid_schema, schema_errs = data_validator.validate_works_dataframe([work_dict_for_val])
    pandera_res = {
        "is_valid": is_valid_schema,
        "schema_version": data_validator.version,
        "errors": schema_errs,
        "timestamp": "2026-09-27T12:00:00"
    }

    # 2. PyOD Ensemble Anomaly Signal
    all_works_in_db = db.query(Work).all()
    all_works_dicts = [
        {
            "work_id": item.work_id,
            "activity_name": item.activity_name,
            "work_description": item.work_description,
            "work_category": item.work_category,
            "district_name": item.district.district_name if item.district else "Unknown",
            "implementing_agency": item.agency.ia_name if item.agency else "Unknown",
            "latitude": item.latitude,
            "longitude": item.longitude,
            "sanctioned_amount": item.sanctioned_amount,
            "actual_amount": sum(ex.fund_disbursed_amt for ex in item.expenditures) if item.expenditures else 0.0,
            "days_elapsed": (item.actual_end_date - item.sanction_date).days if (item.actual_end_date and item.sanction_date) else ((today - item.sanction_date).days if item.sanction_date else 365),
            "physical_progress_pct": item.physical_progress_pct
        }
        for item in all_works_in_db
    ]
    pyod_ensemble_map = pyod_engine.fit_and_score_ensemble(all_works_dicts)
    pyod_work_res = pyod_ensemble_map.get(w.work_id, {
        "ensemble_normalized_score": 0.15,
        "detectors": {},
        "features": ["sanctioned_amount", "disbursed_pct", "days_elapsed", "physical_progress_pct"],
        "config_version": "pyod-v1.0",
        "pyod_version": pyod_engine.version
    })

    # 3. SHAP Feature Attribution
    shap_explainer.fit_model_and_explainer(all_works_dicts)
    shap_res = shap_explainer.explain_work(work_dict_for_val)

    # 4. Phase 2 Relationship Fusion (Splink + Semantic + Geospatial)
    from app.services.splink_linker import splink_linker
    from app.services.semantic_similarity_service import semantic_similarity_service
    from app.services.relationship_fusion_service import relationship_fusion_service

    semantic_similarity_service.index_all_works(all_works_dicts)
    sp_matches = splink_linker.predict_linkages(all_works_dicts).get(w.work_id, [])
    sem_matches = semantic_similarity_service.get_similar_works(w.work_id, top_k=5)

    phase2_relationships = relationship_fusion_service.fuse_work_relationships(
        target_work={
            "work_id": w.work_id,
            "district_name": w.district.district_name if w.district else "Unknown",
            "work_category": w.work_category,
            "implementing_agency": w.agency.ia_name if w.agency else "Unknown"
        },
        candidate_works=[
            {
                "work_id": item.work_id,
                "district_name": item.district.district_name if item.district else "Unknown",
                "work_category": item.work_category,
                "implementing_agency": item.agency.ia_name if item.agency else "Unknown"
            }
            for item in all_works_in_db
        ],
        splink_matches=sp_matches,
        semantic_matches=sem_matches,
        geo_relationships=[r.model_dump() for r in related_works]
    )

    # 5. Phase 3 Evidence Graph & Investigation Intelligence (NetworkX)
    from app.services.evidence_graph_service import evidence_graph_service
    focal_work_dict = {
        "work_id": w.work_id,
        "activity_name": w.activity_name,
        "work_category": w.work_category,
        "district": w.district.district_name if w.district else "Unknown",
        "district_name": w.district.district_name if w.district else "Unknown",
        "implementing_agency": w.agency.ia_name if w.agency else "District Planning Officer",
        "sanctioned_amount": w.sanctioned_amount,
        "sanction_date": str(w.sanction_date) if w.sanction_date else None
    }
    risk_eval_dict = {
        "composite_risk_score": a.composite_risk_score,
        "severity_level": a.severity_level,
        "trigger_factors": tf_list
    }
    evidence_graph_result = evidence_graph_service.build_evidence_graph(
        focal_work=focal_work_dict,
        risk_evaluation=risk_eval_dict,
        relationships=phase2_relationships,
        investigation_status=inv_dict,
        audit_trail=audit_trail_list
    )

    # 6. SIH26103 Predictive Infrastructure Project Monitoring & Schedule Forecasting
    from app.services.schedule_forecast import compute_schedule_forecast
    sched_forecast = compute_schedule_forecast(
        sanction_date=w.sanction_date,
        actual_end_date=w.actual_end_date,
        work_status=w.work_status,
        physical_progress_pct=w.physical_progress_pct,
        eval_date=datetime.date(2026, 9, 25)
    )

    return ExplainabilityDossierDTO(
        work_id=w.work_id,
        activity_name=w.activity_name,
        work_category=w.work_category,
        work_description=w.work_description,
        mp_name=w.mp.mp_name if w.mp else "Unknown",
        constituency=w.constituency.constituency_name if w.constituency else "Unknown",
        district=w.district.district_name if w.district else "Unknown",
        state=w.district.state.state_name if (w.district and w.district.state) else "Unknown",
        implementing_agency=w.agency.ia_name if w.agency else "District Planning Officer",
        sanctioned_amount=w.sanctioned_amount,
        estimated_cost=w.estimated_cost,
        actual_amount=disbursed,
        physical_progress_pct=w.physical_progress_pct,
        work_status=w.work_status,
        days_since_sanction=days_elapsed,
        is_synthetic=w.is_synthetic,
        risk_evaluation=RiskEvaluationDTO(
            composite_risk_score=a.composite_risk_score,
            severity_level=a.severity_level,
            confidence_score=a.confidence_score,
            evaluation_timestamp=a.created_at,
            trigger_factors=tf_list,
            baseline_comparison=baseline_comp,
            verification_checklist=chk_list,
            risk_contributions=b_data.get("risk_contributions"),
            evidence_statements=b_data.get("evidence_statements", []),
            recommended_action=b_data.get("recommended_action")
        ),
        expenditures=exp_dtos,
        similar_works=similar_works,
        related_works=related_works,
        data_provenance=data_provenance,
        data_gaps=data_gaps,
        audit_trail=audit_trail_list,
        investigation_status=inv_dict,
        recommended_action=b_data.get("recommended_action"),
        provenance_details=prov_obj,
        pandera_validation=pandera_res,
        pyod_analysis=pyod_work_res,
        shap_explanation=shap_res,
        phase2_relationship_intelligence=phase2_relationships,
        evidence_graph=evidence_graph_result,
        investigation_intelligence=evidence_graph_result.get("investigation_intelligence"),
        project_monitoring_intelligence={
            "monitoring_ecosystem": "MoSPI IPMD / PAIMANA Analytical Framework",
            "sector": w.work_category,
            "approved_cost_inr": w.sanctioned_amount,
            "cumulative_expenditure_inr": disbursed,
            "physical_progress_pct": w.physical_progress_pct,
            "financial_expenditure_pct": round((disbursed / w.sanctioned_amount * 100.0), 2) if w.sanctioned_amount > 0 else 0.0,
            "overall_project_risk_score": a.composite_risk_score,
            "risk_classification": a.severity_level,
            "schedule_risk_score": b_data.get("risk_contributions", {}).get("Execution Delay", 0) * 2.85,
            "cost_risk_score": b_data.get("risk_contributions", {}).get("Financial Deviation", 0) * 3.33,
            "implementation_risk_score": (b_data.get("risk_contributions", {}).get("Duplicate Similarity", 0) + b_data.get("risk_contributions", {}).get("Category Pattern", 0)) * 2.0
        },
        cost_overrun_forecast={
            "cost_variance_pct": round(((w.sanctioned_amount - baseline_comp.median) / baseline_comp.median * 100.0), 1) if (baseline_comp and baseline_comp.median > 0) else 0.0,
            "peer_median_cost_inr": baseline_comp.median if baseline_comp else w.sanctioned_amount,
            "unit_cost_status": "Outlier (+MAD Breach)" if (baseline_comp and baseline_comp.z_score and baseline_comp.z_score > 3.0) else "Within Expected Band",
            "disbursement_progress_gap_pct": round(((disbursed / w.sanctioned_amount * 100.0) - w.physical_progress_pct), 1) if w.sanctioned_amount > 0 else 0.0,
            "cost_overrun_likelihood": "HIGH" if (a.composite_risk_score >= 60.0 and b_data.get("risk_contributions", {}).get("Financial Deviation", 0) > 10) else ("MEDIUM" if a.composite_risk_score >= 40.0 else "LOW"),
            "escalation_indicator_title": "Projected Cost Escalation Risk"
        },
        schedule_overrun_forecast=sched_forecast
    )


@router.get("/{work_id:path}/evidence-graph")
def get_work_evidence_graph(
    work_id: str,
    db: Session = Depends(get_db)
):
    """
    Dedicated endpoint returning the dynamic NetworkX Evidence Graph & Investigation Intelligence
    for an individual work.
    """
    dossier = get_explainability_dossier(work_id=work_id, db=db)
    return dossier.evidence_graph


