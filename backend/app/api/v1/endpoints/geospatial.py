from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Work, RiskAnomaly, District
from app.services.similarity_engine import haversine_distance_meters

router = APIRouter()

@router.get("/risk-map")
def get_geospatial_risk_features(
    state_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    min_score: Optional[float] = Query(0.0),
    severity: Optional[str] = Query(None),
    work_category: Optional[str] = Query(None),
    is_synthetic: Optional[bool] = Query(None),
    radius_meters: Optional[float] = Query(500.0),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns GeoJSON FeatureCollection containing geocoded works with risk scoring,
    filters, and proximity relationship metadata.
    """
    query = db.query(Work).filter(
        Work.latitude.isnot(None),
        Work.longitude.isnot(None)
    )

    if is_synthetic is not None:
        query = query.filter(Work.is_synthetic == is_synthetic)
    if state_id:
        query = query.join(Work.district).filter(Work.district.has(state_id=state_id))
    if district_id:
        query = query.filter(Work.district_id == district_id)
    if work_category and work_category != "ALL":
        query = query.filter(Work.work_category == work_category)

    works = query.all()
    features = []

    # Map works for proximity calculation
    geocoded_works = [(w, w.latitude, w.longitude) for w in works]

    for w in works:
        score = w.anomaly.composite_risk_score if w.anomaly else 0.0
        sev = w.anomaly.severity_level if w.anomaly else "LOW"

        if score < min_score:
            continue
        if severity and severity != "ALL" and sev.upper() != severity.upper():
            continue

        # Count nearby works within configured radius_meters
        nearby_count = 0
        matched_id = None
        is_cluster = False

        for other, o_lat, o_lon in geocoded_works:
            if other.work_id == w.work_id:
                continue
            dist = haversine_distance_meters(w.latitude, w.longitude, o_lat, o_lon)
            if dist <= radius_meters:
                nearby_count += 1

        if w.anomaly and w.anomaly.rule_triggers:
            for tf in w.anomaly.rule_triggers:
                if tf.get("matched_work_id"):
                    matched_id = tf.get("matched_work_id")
                    is_cluster = True
                    break

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [w.longitude, w.latitude]
            },
            "properties": {
                "work_id": w.work_id,
                "activity_name": w.activity_name,
                "work_category": w.work_category,
                "sanctioned_amount": w.sanctioned_amount,
                "sanction_date": w.sanction_date.isoformat() if w.sanction_date else "",
                "physical_progress_pct": w.physical_progress_pct,
                "composite_risk_score": score,
                "severity_level": sev,
                "state_name": w.district.state.state_name if (w.district and w.district.state) else "",
                "district_name": w.district.district_name if w.district else "",
                "mp_name": w.mp.mp_name if w.mp else "",
                "is_duplicate_cluster": is_cluster or (nearby_count > 0 and score >= 40.0),
                "matched_work_id": matched_id,
                "nearby_works_count": nearby_count,
                "is_synthetic": w.is_synthetic
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/works/{work_id:path}/relationships")
def get_work_spatial_relationships(
    work_id: str,
    radius_meters: Optional[float] = Query(500.0),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns detailed spatial relationships for a selected work ID within radius_meters.
    Calculates exact Haversine distances, identifies related works vs counterexamples.
    """
    target = db.query(Work).filter(Work.work_id == work_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Work record not found")
    if target.latitude is None or target.longitude is None:
        raise HTTPException(status_code=400, detail="Target work does not have valid coordinates")

    # Fetch all geocoded works in same state/district for efficiency
    all_works = db.query(Work).filter(
        Work.latitude.isnot(None),
        Work.longitude.isnot(None),
        Work.work_id != target.work_id
    ).all()

    target_score = target.anomaly.composite_risk_score if target.anomaly else 0.0
    target_sev = target.anomaly.severity_level if target.anomaly else "LOW"

    related_items = []
    has_counterexample = False

    for w in all_works:
        dist = haversine_distance_meters(target.latitude, target.longitude, w.latitude, w.longitude)
        if dist > radius_meters:
            continue

        w_score = w.anomaly.composite_risk_score if w.anomaly else 0.0
        w_sev = w.anomaly.severity_level if w.anomaly else "LOW"

        # Check category match and sanction date difference
        same_category = (w.work_category == target.work_category)
        days_diff = abs((target.sanction_date - w.sanction_date).days) if (target.sanction_date and w.sanction_date) else 999

        why_related = [f"Geographic proximity: {round(dist, 1)} m"]

        if same_category:
            why_related.append(f"Matching work category: {w.work_category}")
        else:
            why_related.append(f"Distinct work category: {w.work_category} vs {target.work_category}")

        if days_diff <= 35:
            why_related.append(f"Sanctioned within short window ({days_diff} days apart)")
        else:
            why_related.append(f"Sanction dates separated by {days_diff} days")

        # Classify relationship
        is_counterexample = False
        if not same_category and (dist < radius_meters):
            is_counterexample = True
            has_counterexample = True
            rel_type = "PROXIMITY_ONLY_COUNTEREXAMPLE"
            why_related.append("Geographic proximity alone does not establish duplication.")
        else:
            rel_type = "POTENTIAL_SPATIAL_RELATIONSHIP"

        related_items.append({
            "work_id": w.work_id,
            "activity_name": w.activity_name,
            "work_category": w.work_category,
            "sanctioned_amount": w.sanctioned_amount,
            "sanction_date": w.sanction_date.isoformat() if w.sanction_date else "",
            "physical_progress_pct": w.physical_progress_pct,
            "composite_risk_score": w_score,
            "severity_level": w_sev,
            "distance_meters": round(dist, 1),
            "latitude": w.latitude,
            "longitude": w.longitude,
            "district_name": w.district.district_name if w.district else "",
            "state_name": w.district.state.state_name if (w.district and w.district.state) else "",
            "relationship_type": rel_type,
            "is_counterexample": is_counterexample,
            "why_related": why_related
        })

    # Sort by distance
    related_items.sort(key=lambda x: x["distance_meters"])

    return {
        "selected_work": {
            "work_id": target.work_id,
            "activity_name": target.activity_name,
            "work_category": target.work_category,
            "sanctioned_amount": target.sanctioned_amount,
            "sanction_date": target.sanction_date.isoformat() if target.sanction_date else "",
            "physical_progress_pct": target.physical_progress_pct,
            "composite_risk_score": target_score,
            "severity_level": target_sev,
            "latitude": target.latitude,
            "longitude": target.longitude,
            "district_name": target.district.district_name if target.district else "",
            "state_name": target.district.state.state_name if (target.district and target.district.state) else "",
            "mp_name": target.mp.mp_name if target.mp else "",
            "implementing_agency": target.agency.ia_name if target.agency else "",
            "primary_signal": target.anomaly.rule_triggers[0].get("summary") if (target.anomaly and target.anomaly.rule_triggers) else "Nominal status"
        },
        "configured_radius_meters": radius_meters,
        "total_nearby_count": len(related_items),
        "has_counterexample": has_counterexample,
        "disclaimer": "Potential spatial relationship — requires verification. Geographic proximity alone does not establish duplication.",
        "related_works": related_items
    }
