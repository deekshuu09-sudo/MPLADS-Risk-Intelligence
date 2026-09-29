from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class ReviewSubmissionDTO(BaseModel):
    new_status: str  # OPEN, IN_REVIEW, VERIFICATION_REQUIRED, INSPECTION_SCHEDULED, UNDER_REVIEW, RESOLVED, ESCALATED, DISMISSED
    assigned_role: Optional[str] = "DISTRICT_OFFICER"
    reviewer_notes: Optional[str] = None
    outcome_decision: Optional[str] = None


class ReviewResultDTO(BaseModel):
    success: bool
    work_id: str
    previous_status: str
    current_status: str
    audit_log_id: int
    updated_at: datetime


class InvestigationQueueItemDTO(BaseModel):
    investigation_id: int
    anomaly_id: Optional[int] = None
    work_id: str
    activity_name: str
    work_category: str
    sanctioned_amount: float
    physical_progress_pct: float
    days_elapsed: int
    primary_signal: str
    state_name: str
    district_name: str
    mp_name: str
    composite_risk_score: float
    severity_level: str
    status: str
    assigned_role: str
    reviewer_notes: Optional[str] = None
    outcome_decision: Optional[str] = None
    days_in_review: int
    updated_at: datetime
    is_synthetic: bool

    model_config = {"from_attributes": True}


class AuditLogDTO(BaseModel):
    audit_id: int
    entity_type: str
    entity_id: str
    action_type: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    actor_role: str
    ip_address: str
    timestamp: datetime

    model_config = {"from_attributes": True}
