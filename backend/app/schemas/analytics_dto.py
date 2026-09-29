from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class AnalyticsScopeDTO(BaseModel):
    scope_id: str
    dataset_mode: str  # REAL, SYNTHETIC, HYBRID
    house_filter: str  # ALL, LOK, RAJYA
    total_records: int
    flagged_records: int
    min_flagged_score: float = 30.0
    generated_at: str

class ExecutiveKpiStripDTO(BaseModel):
    total_works_analysed: int
    total_sanctioned_amount_inr: float
    total_disbursed_amount_inr: float
    flagged_works_count: int
    flagged_percentage: float
    flagged_sanctioned_amount_inr: float
    flagged_disbursed_amount_inr: float
    active_unresolved_investigations: int
    spatial_relationships_detected: int

class SignalOverlapMatrixDTO(BaseModel):
    single_signal_count: int
    dual_signal_count: int
    multi_signal_count: int  # 3 or more signals
    avg_score_single_signal: float
    avg_score_dual_signal: float
    avg_score_multi_signal: float

class SignalEngineDistributionItem(BaseModel):
    engine_key: str
    engine_name: str
    triggered_count: int
    percentage_of_flagged: float
    severity_breakdown: Dict[str, int]

class GeographicConcentrationItem(BaseModel):
    state_id: int
    state_name: str
    total_works: int
    flagged_works: int
    signal_rate_pct: float
    total_sanctioned_cr: float
    flagged_sanctioned_cr: float

class DistrictConcentrationItem(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    total_works: int
    flagged_works: int
    signal_rate_pct: float

class CategoryConcentrationItem(BaseModel):
    category: str
    total_works: int
    flagged_works: int
    signal_rate_pct: float
    total_sanctioned_cr: float
    flagged_sanctioned_cr: float
    flagged_disbursed_cr: float

class InvestigationPipelineDTO(BaseModel):
    verification_required: int
    inspection_scheduled: int
    under_review: int
    resolved: int
    dismissed: int
    total_unresolved: int

class ExecutiveInsightCardDTO(BaseModel):
    insight_id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, INFO
    title: str
    category: str
    observed_pattern: str
    evidence_summary: str
    recommended_action: str
    affected_works_count: int
    affected_amount_cr: float
    target_filter: Dict[str, Any]

class ExecutiveOverviewAnalyticsDTO(BaseModel):
    scope: AnalyticsScopeDTO
    kpis: ExecutiveKpiStripDTO
    signal_overlap: SignalOverlapMatrixDTO
    signal_engines: List[SignalEngineDistributionItem]
    state_concentration: List[GeographicConcentrationItem]
    top_district_hotspots: List[DistrictConcentrationItem]
    category_concentration: List[CategoryConcentrationItem]
    investigation_pipeline: InvestigationPipelineDTO
    executive_insights: List[ExecutiveInsightCardDTO]
    dataset_mode: str
    temporal_note: str = "Temporal trend velocity derived from eSAKSHI voucher milestone timestamps."
