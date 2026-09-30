from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.work_dto import WorkDetailDTO, ExpenditureDTO

class TriggerFactor(BaseModel):
    engine: str
    factor_name: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    weight: float
    summary: str
    observed_value: str
    baseline_value: str
    variance_pct: Optional[str] = None
    matched_work_id: Optional[str] = None


class BaselineComparison(BaseModel):
    metric_name: str
    observed: float
    p25: float
    median: float
    p75: float
    p95: float
    z_score: Optional[float] = None


class VerificationChecklistItem(BaseModel):
    step_no: int
    action: str
    details: str
    evidence_required: List[str] = []
    status: Optional[str] = "PENDING"


class RelatedWorkDTO(BaseModel):
    work_id: str
    activity_name: str
    work_category: str
    sanctioned_amount: float
    sanction_date: Optional[str] = None
    distance_meters: Optional[float] = None
    similarity_reason: str
    severity_level: str
    composite_risk_score: float


class DataProvenanceItem(BaseModel):
    field_name: str
    source_dataset: str
    source_type: str
    timestamp: str
    rule_or_engine: Optional[str] = None
    derivation_method: Optional[str] = None
    value_classification: Optional[str] = "DERIVED ANALYTICAL VALUE"


class WorkProvenanceDTO(BaseModel):
    work_id: str
    dataset_mode: str  # SYNTHETIC_BENCHMARK or REAL_TELEMETRY
    dataset_version: str = "BENCHMARK-V1"
    ingestion_timestamp: str
    source_metadata: Dict[str, Any]
    lineage_steps: List[Dict[str, Any]]
    configuration: Dict[str, Any]
    reproducibility: Dict[str, Any]
    integrity_fingerprint: str
    data_quality: Dict[str, Any]


class DataGapsAndCounterEvidence(BaseModel):
    missing_evidence: List[str] = []
    potential_mitigating_factors: List[str] = []
    disclaimer: str = "Risk score indicates priority for verification, not a finding of misconduct."


class RiskEvaluationDTO(BaseModel):
    composite_risk_score: float
    severity_level: str
    confidence_score: float
    evaluation_timestamp: datetime
    trigger_factors: List[TriggerFactor]
    baseline_comparison: Optional[BaselineComparison] = None
    verification_checklist: List[VerificationChecklistItem] = []
    risk_contributions: Optional[Dict[str, int]] = None
    evidence_statements: List[str] = []
    recommended_action: Optional[str] = None


class RiskAnomalyListDTO(BaseModel):
    anomaly_id: int
    work_id: str
    activity_name: str
    work_category: str
    state_name: str
    district_name: str
    mp_name: str
    sanctioned_amount: float
    composite_risk_score: float
    severity_level: str
    confidence_score: float
    status: str
    primary_factor_summary: str
    is_synthetic: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ExplainabilityDossierDTO(BaseModel):
    work_id: str
    activity_name: str
    work_category: str
    work_description: str
    mp_name: str
    constituency: str
    district: str
    state: str
    implementing_agency: str
    sanctioned_amount: float
    estimated_cost: float
    actual_amount: float
    physical_progress_pct: float
    work_status: str
    days_since_sanction: Optional[int] = None
    is_synthetic: bool
    risk_evaluation: RiskEvaluationDTO
    expenditures: List[ExpenditureDTO] = []
    similar_works: List[Dict[str, Any]] = []
    related_works: List[RelatedWorkDTO] = []
    data_provenance: List[DataProvenanceItem] = []
    data_gaps: Optional[DataGapsAndCounterEvidence] = None
    audit_trail: List[Dict[str, Any]] = []
    investigation_status: Optional[Dict[str, Any]] = None
    recommended_action: Optional[str] = None
    provenance_details: Optional[WorkProvenanceDTO] = None
    pandera_validation: Optional[Dict[str, Any]] = None
    pyod_analysis: Optional[Dict[str, Any]] = None
    shap_explanation: Optional[Dict[str, Any]] = None
    phase2_relationship_intelligence: Optional[List[Dict[str, Any]]] = None
    evidence_graph: Optional[Dict[str, Any]] = None
    investigation_intelligence: Optional[Dict[str, Any]] = None

    # SIH26103 Predictive Infrastructure Project Monitoring Extensions
    project_monitoring_intelligence: Optional[Dict[str, Any]] = None
    cost_overrun_forecast: Optional[Dict[str, Any]] = None
    schedule_overrun_forecast: Optional[Dict[str, Any]] = None

