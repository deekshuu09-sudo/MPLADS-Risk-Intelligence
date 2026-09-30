export interface RiskBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DashboardSummary {
  total_works: number;
  allocated_limit_inr: number;
  expenditure_inr: number;
  expenditure_utilization_pct: number;
  works_sanctioned: number;
  works_completed: number;
  completion_rate_pct: number;
  flagged_works_count: number;
  flagged_percentage: number;
  risk_breakdown: RiskBreakdown;
  open_investigations_count: number;
  dataset_mode: "REAL" | "SYNTHETIC" | "HYBRID";
  last_synced_at: string | null;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  total_sanctioned_inr: number;
  total_expenditure_inr: number;
  flagged_count: number;
  risk_rate_pct: number;
}

export interface StateRiskItem {
  state_id: number;
  state_name: string;
  total_works: number;
  flagged_works: number;
  risk_percentage: number;
  total_expenditure_cr: number;
}

export interface TrendDataPoint {
  month_year: string;
  recommended_count: number;
  sanctioned_count: number;
  completed_count: number;
  expenditure_cr: number;
}

export interface AnalyticsScope {
  scope_id: string;
  dataset_mode: string;
  house_filter: string;
  total_records: number;
  flagged_records: number;
  min_flagged_score: number;
  generated_at: string;
}

export interface ExecutiveKpiStrip {
  total_works_analysed: number;
  total_sanctioned_amount_inr: number;
  total_disbursed_amount_inr: number;
  flagged_works_count: number;
  flagged_percentage: number;
  flagged_sanctioned_amount_inr: number;
  flagged_disbursed_amount_inr: number;
  active_unresolved_investigations: number;
  spatial_relationships_detected: number;
}

export interface SignalOverlapMatrix {
  single_signal_count: number;
  dual_signal_count: number;
  multi_signal_count: number;
  avg_score_single_signal: number;
  avg_score_dual_signal: number;
  avg_score_multi_signal: number;
}

export interface SignalEngineDistributionItem {
  engine_key: string;
  engine_name: string;
  triggered_count: number;
  percentage_of_flagged: number;
  severity_breakdown: Record<string, number>;
}

export interface GeographicConcentrationItem {
  state_id: number;
  state_name: string;
  total_works: number;
  flagged_works: number;
  signal_rate_pct: number;
  total_sanctioned_cr: number;
  flagged_sanctioned_cr: number;
}

export interface DistrictConcentrationItem {
  district_id: number;
  district_name: string;
  state_name: string;
  total_works: number;
  flagged_works: number;
  signal_rate_pct: number;
}

export interface CategoryConcentrationItem {
  category: string;
  total_works: number;
  flagged_works: number;
  signal_rate_pct: number;
  total_sanctioned_cr: number;
  flagged_sanctioned_cr: number;
  flagged_disbursed_cr: number;
}

export interface InvestigationPipeline {
  verification_required: number;
  inspection_scheduled: number;
  under_review: number;
  resolved: number;
  dismissed: number;
  total_unresolved: number;
}

export interface ExecutiveInsightCard {
  insight_id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  category: string;
  observed_pattern: string;
  evidence_summary: string;
  recommended_action: string;
  affected_works_count: number;
  affected_amount_cr: number;
  target_filter: Record<string, any>;
}

export interface ExecutiveOverviewAnalytics {
  scope: AnalyticsScope;
  kpis: ExecutiveKpiStrip;
  signal_overlap: SignalOverlapMatrix;
  signal_engines: SignalEngineDistributionItem[];
  state_concentration: GeographicConcentrationItem[];
  top_district_hotspots: DistrictConcentrationItem[];
  category_concentration: CategoryConcentrationItem[];
  investigation_pipeline: InvestigationPipeline;
  executive_insights: ExecutiveInsightCard[];
  dataset_mode: string;
  temporal_note: string;
}

export interface WorkItem {
  work_id: string;
  activity_name: string;
  work_category: string;
  work_description: string;
  state_name: string;
  district_name: string;
  constituency_name: string;
  mp_name: string;
  house: string;
  sanctioned_amount: number;
  estimated_cost: number;
  actual_amount: number;
  physical_progress_pct: number;
  work_status: string;
  recommendation_date?: string;
  sanction_date?: string;
  actual_end_date?: string;
  composite_risk_score?: number;
  severity_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  primary_trigger_factor?: string;
  is_synthetic: boolean;
  project_id?: string;
  project_name?: string;
  sector?: string;
  approved_cost?: number;
  cumulative_expenditure?: number;
  cost_variance_pct?: number;
  forecast_delay_months?: number;
  schedule_risk_score?: number;
  cost_risk_score?: number;
}

export interface ExpenditureItem {
  expenditure_id: number;
  work_id: string;
  vendor_id?: number;
  vendor_name?: string;
  expenditure_date?: string;
  fund_disbursed_amt: number;
  payment_status: string;
  voucher_no?: string;
  is_synthetic: boolean;
}

export interface TriggerFactor {
  engine: string;
  factor_name: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  weight: number;
  summary: string;
  observed_value: string;
  baseline_value: string;
  variance_pct?: string;
  matched_work_id?: string;
}

export interface BaselineComparison {
  metric_name: string;
  observed: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  z_score?: number;
}

export interface VerificationChecklistItem {
  step_no: number;
  action: string;
  details: string;
  evidence_required?: string[];
  status?: string;
}

export interface RelatedWork {
  work_id: string;
  activity_name: string;
  work_category: string;
  sanctioned_amount: number;
  sanction_date?: string;
  distance_meters?: number;
  similarity_reason: string;
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  composite_risk_score: number;
}

export interface DataProvenanceItem {
  field_name: string;
  source_dataset: string;
  source_type: string;
  timestamp: string;
  rule_or_engine?: string;
  derivation_method?: string;
  value_classification?: string;
}

export interface WorkProvenance {
  work_id: string;
  dataset_mode: string;
  dataset_version: string;
  ingestion_timestamp: string;
  source_metadata: {
    source: string;
    source_type: string;
    source_record: string;
    dataset_version: string;
    source_status: string;
    letter_no?: string;
    file_status?: string;
  };
  lineage_steps: Array<{
    step: string;
    method: string;
    classification: string;
    output: string;
  }>;
  configuration: {
    rule_engine_version: string;
    completion_benchmark: string;
    spatial_radius_threshold: string;
    financial_splitting_threshold: string;
    trust_society_ceiling: string;
  };
  reproducibility: {
    original_score: number;
    recalculated_score: number;
    status: string;
    verification_method: string;
  };
  integrity_fingerprint: string;
  data_quality: {
    required_fields_count: number;
    available_fields_count: number;
    completeness_status: string;
    missing_fields: string[];
  };
}

export interface DataGapsAndCounterEvidence {
  missing_evidence: string[];
  potential_mitigating_factors: string[];
  disclaimer: string;
}

export interface ExplainabilityDossier {
  work_id: string;
  activity_name: string;
  work_category: string;
  work_description: string;
  mp_name: string;
  constituency: string;
  district: string;
  state: string;
  implementing_agency: string;
  sanctioned_amount: number;
  estimated_cost: number;
  actual_amount: number;
  physical_progress_pct: number;
  work_status: string;
  days_since_sanction?: number;
  is_synthetic: boolean;
  risk_evaluation: {
    composite_risk_score: number;
    severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence_score: number;
    evaluation_timestamp: string;
    trigger_factors: TriggerFactor[];
    baseline_comparison?: BaselineComparison;
    verification_checklist: VerificationChecklistItem[];
    risk_contributions?: Record<string, number>;
    evidence_statements?: string[];
    recommended_action?: string;
  };
  expenditures: ExpenditureItem[];
  similar_works: any[];
  related_works?: RelatedWork[];
  data_provenance?: DataProvenanceItem[];
  provenance_details?: WorkProvenance;
  data_gaps?: DataGapsAndCounterEvidence;
  audit_trail?: AuditLogItem[];
  investigation_status?: {
    status: string;
    assigned_role: string;
    reviewer_notes?: string;
    outcome_decision?: string;
    last_updated: string;
  };
  recommended_action?: string;
  pandera_validation?: {
    is_valid: boolean;
    schema_version: string;
    errors: Array<{ field: string; value: string; rule: string; severity: string }>;
    timestamp: string;
  };
  pyod_analysis?: {
    ensemble_normalized_score: number;
    detectors: Record<string, { raw_score: number; normalized_score: number }>;
    features: string[];
    config_version: string;
    pyod_version: string;
  };
  shap_explanation?: {
    shap_available: boolean;
    shap_version?: string;
    feature_contributions: Array<{ feature: string; observed_value: any; shap_contribution: number; direction: string }>;
    disclaimer: string;
    reason?: string;
  };
  phase2_relationship_intelligence?: Array<{
    work_id: string;
    related_work_id: string;
    relationship_type: string;
    disclaimer: string;
    structured_match: { available: boolean; probability: number; blocking_rule: string; splink_version: string };
    semantic_match: { available: boolean; similarity: number; model: string };
    geospatial_match: { available: boolean; distance_meters?: number };
    attribute_agreement: { same_district: boolean; same_category: boolean; same_agency: boolean };
    verification_checklist: Array<{ step: number; check: string; status: string }>;
  }>;
  evidence_graph?: {
    focal_work_id: string;
    graph_version: string;
    engine: string;
    disclaimer: string;
    generated_at: string;
    nodes: Array<{
      id: string;
      node_type: string;
      label: string;
      work_id?: string;
      name?: string;
      activity_name?: string;
      work_category?: string;
      risk_score?: number;
      severity_level?: string;
      sanctioned_amount?: number;
      signal_type?: string;
      summary?: string;
      status?: string;
      is_focal?: boolean;
    }>;
    edges: Array<{
      source: string;
      target: string;
      edge_type: string;
      label: string;
      relationship_type?: string;
      disclaimer?: string;
      splink_probability?: number;
      semantic_similarity?: number;
      spatial_distance_meters?: number;
      same_district?: boolean;
      same_category?: boolean;
      same_agency?: boolean;
      verification_required?: boolean;
      verification_checklist?: Array<{ step: number; check: string; status: string }>;
    }>;
    topology_metrics: {
      total_nodes: number;
      total_edges: number;
      density: number;
      connected_works_count: number;
    };
    investigation_intelligence?: {
      why_flagged: { composite_risk_score: number; severity_level: string; summary: string; contributing_signals: string[] };
      connected_works: Array<{ work_id: string; relationship_type: string; splink_probability: number; semantic_similarity: number; spatial_distance_meters?: number; same_district: boolean; same_category: boolean; same_agency: boolean }>;
      why_it_matters: string;
      what_to_verify: Array<{ step: number; check: string; status: string }>;
      timeline: Array<{ stage: string; timestamp: string; actor: string; event: string }>;
    };
    provenance?: Record<string, string>;
  };
  investigation_intelligence?: any;
  project_monitoring_intelligence?: {
    monitoring_ecosystem: string;
    sector: string;
    approved_cost_inr: number;
    cumulative_expenditure_inr: number;
    physical_progress_pct: number;
    financial_expenditure_pct: number;
    overall_project_risk_score: number;
    risk_classification: string;
    schedule_risk_score: number;
    cost_risk_score: number;
    implementation_risk_score: number;
  };
  cost_overrun_forecast?: {
    cost_variance_pct: number;
    peer_median_cost_inr: number;
    unit_cost_status: string;
    disbursement_progress_gap_pct: number;
    cost_overrun_likelihood: string;
  };
  schedule_overrun_forecast?: {
    elapsed_days: number;
    milestone_completion_benchmark_days: number;
    forecast_delay_months: number;
    burn_rate_velocity: number;
    schedule_overrun_likelihood: string;
    critical_milestone_delayed: boolean;
  };
}



export interface AnomalyItem {
  anomaly_id: number;
  work_id: string;
  activity_name: string;
  work_category: string;
  state_name: string;
  district_name: string;
  mp_name: string;
  sanctioned_amount: number;
  composite_risk_score: number;
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence_score: number;
  status: string;
  primary_factor_summary: string;
  is_synthetic: boolean;
  created_at: string;
}

export interface InvestigationQueueItem {
  investigation_id: number;
  anomaly_id?: number;
  work_id: string;
  activity_name: string;
  work_category: string;
  sanctioned_amount: number;
  physical_progress_pct: number;
  days_elapsed: number;
  primary_signal: string;
  state_name: string;
  district_name: string;
  mp_name: string;
  composite_risk_score: number;
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  assigned_role: string;
  reviewer_notes?: string;
  outcome_decision?: string;
  days_in_review: number;
  updated_at: string;
  is_synthetic: boolean;
  project_id?: string;
  project_name?: string;
  sector?: string;
  approved_cost?: number;
  forecast_delay_months?: number;
  cost_risk_score?: number;
  schedule_risk_score?: number;
  early_warning_signal?: string;
}

export interface AuditLogItem {
  audit_id: number;
  entity_type: string;
  entity_id: string;
  action_type: string;
  old_value?: any;
  new_value?: any;
  actor_role: string;
  ip_address: string;
  timestamp: string;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    work_id: string;
    activity_name: string;
    work_category: string;
    sanctioned_amount: number;
    sanction_date?: string;
    physical_progress_pct: number;
    composite_risk_score: number;
    severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    state_name: string;
    district_name: string;
    mp_name: string;
    is_duplicate_cluster: boolean;
    matched_work_id?: string;
    nearby_works_count?: number;
    is_synthetic: boolean;
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface SpatialRelationshipItem {
  work_id: string;
  activity_name: string;
  work_category: string;
  sanctioned_amount: number;
  sanction_date: string;
  physical_progress_pct: number;
  composite_risk_score: number;
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  distance_meters: number;
  latitude: number;
  longitude: number;
  district_name: string;
  state_name: string;
  relationship_type: "POTENTIAL_SPATIAL_RELATIONSHIP" | "PROXIMITY_ONLY_COUNTEREXAMPLE";
  is_counterexample: boolean;
  why_related: string[];
}

export interface SelectedWorkSpatialHeader {
  work_id: string;
  activity_name: string;
  work_category: string;
  sanctioned_amount: number;
  sanction_date: string;
  physical_progress_pct: number;
  composite_risk_score: number;
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  latitude: number;
  longitude: number;
  district_name: string;
  state_name: string;
  mp_name: string;
  implementing_agency: string;
  primary_signal: string;
}

export interface SpatialRelationshipsResponse {
  selected_work: SelectedWorkSpatialHeader;
  configured_radius_meters: number;
  total_nearby_count: number;
  has_counterexample: boolean;
  disclaimer: string;
  related_works: SpatialRelationshipItem[];
}
