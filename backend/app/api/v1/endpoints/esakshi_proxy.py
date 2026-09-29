import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import State, District, MemberOfParliament, Work, Expenditure
from app.services.esakshi_client import esakshi_client
from app.services.data_normalizer import parse_inr_amount, parse_esakshi_date, sanitize_text
from app.services.risk_engine import risk_engine
from app.db.seed_demo_data import seed_database

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/states")
async def get_states(db: Session = Depends(get_db)):
    states = db.query(State).all()
    return [{"state_id": s.state_id, "state_name": s.state_name} for s in states]


@router.post("/demo/reset-seed")
def reset_demo_seed(db: Session = Depends(get_db)):
    """
    Resets and re-seeds the standard synthetic benchmark suite with all 7 anomaly scenarios.
    Runs complete risk analysis and returns seeded stats.
    """
    seed_database(db)
    evaluated_count = risk_engine.evaluate_all_works(db)
    return {
        "success": True,
        "message": "Demo benchmark suite re-seeded and re-evaluated successfully.",
        "works_evaluated": evaluated_count
    }


@router.post("/sync")
async def sync_live_esakshi_state(
    state_id: int = Query(35, description="State ID to sync from eSAKSHI (35 = Andaman & Nicobar)"),
    db: Session = Depends(get_db)
):
    """
    Fetches real public project records from live MoSPI eSAKSHI pre-login REST API.
    Normalizes data, stores with is_synthetic=False, and re-evaluates risk.
    """
    combo = f"{state_id},0,0,2"  # State, all const, all MPs, Lok Sabha
    sanctions_raw = await esakshi_client.get_tiles_report_data(combo, "Works Sanctioned")
    expenditures_raw = await esakshi_client.get_tiles_report_data(combo, "Expenditure on Completed and On-going Works as on Date")

    ingested_works = 0
    ingested_exps = 0

    # Ensure state exists in DB
    state_rec = db.query(State).filter_by(state_id=state_id).first()
    if not state_rec:
        state_rec = State(state_id=state_id, state_name="Andaman And Nicobar Islands", state_code="AN")
        db.add(state_rec)
        db.commit()

    for item in sanctions_raw:
        wid = item.get("WORK_ID") or f"WS/ESAKSHI/{item.get('WORK_RECOMMENDATION_DTL_ID', 0)}"
        if not wid:
            continue

        existing = db.query(Work).filter_by(work_id=wid).first()
        amt = parse_inr_amount(item.get("SANCTION_AMOUNT", 0.0))
        s_date = parse_esakshi_date(item.get("SANCTION_DATE"))
        r_date = parse_esakshi_date(item.get("RECOMMENDATION_DATE"))

        # District resolution
        ida_name = item.get("IDA_NAME", "South Andamans")
        dist = db.query(District).filter(District.ida_code.ilike(f"%{ida_name[:12]}%")).first()
        did = dist.district_id if dist else 3

        # MP resolution
        mp_name = item.get("MP_NAME", "BISHNU PADA RAY")
        mp = db.query(MemberOfParliament).filter(MemberOfParliament.mp_name.ilike(f"%{mp_name[:10]}%")).first()
        mp_id = mp.mp_id if mp else 102

        if not existing:
            new_w = Work(
                work_id=wid,
                work_recommendation_dtl_id=item.get("WORK_RECOMMENDATION_DTL_ID"),
                activity_name=sanitize_text(item.get("ACTIVITY_NAME", "Development Work")),
                work_category=item.get("WORK_CATEGORY", "Normal/Others"),
                work_description=sanitize_text(item.get("WORK_DESCRIPTION", "")),
                mp_id=mp_id,
                constituency_id=item.get("CONSTITUENCY_ID", 1),
                district_id=did,
                ia_id=2,
                location_type="Rural",
                latitude=11.6234,  # Geocoded Andaman
                longitude=92.7265,
                letter_no=item.get("LETTER_NO"),
                recommendation_date=r_date,
                sanction_date=s_date,
                sanctioned_amount=amt,
                estimated_cost=amt,
                physical_progress_pct=25.0,
                work_status="Sanctioned",
                file_status="AVAILABLE",
                is_synthetic=False  # REAL OFFICIAL DATA!
            )
            db.add(new_w)
            ingested_works += 1

    db.commit()

    # Ingest expenditures
    for exp in expenditures_raw:
        wid = exp.get("WORK_ID")
        if not wid:
            continue
        amt = parse_inr_amount(exp.get("FUND_DISBURSED_AMT", 0.0))
        edate = parse_esakshi_date(exp.get("EXPENDITURE_DATE"))

        w_match = db.query(Work).filter_by(work_id=wid).first()
        if w_match:
            new_exp = Expenditure(
                work_id=wid,
                vendor_id=exp.get("VENDOR_ID", 97470),
                expenditure_date=edate,
                fund_disbursed_amt=amt,
                payment_status=exp.get("WORK_STATUS", "Completed"),
                voucher_no=f"ESAKSHI/{exp.get('VENDOR_ID', 0)}",
                is_synthetic=False
            )
            db.add(new_exp)
            ingested_exps += 1

    db.commit()

    # Re-evaluate anomalies
    evaluated = risk_engine.evaluate_all_works(db)

    return {
        "success": True,
        "state_id": state_id,
        "real_works_ingested": ingested_works,
        "real_expenditures_ingested": ingested_exps,
        "total_works_evaluated": evaluated,
        "message": f"Successfully synced real MoSPI eSAKSHI data for state {state_id}."
    }
