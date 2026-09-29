import axios from 'axios';
import type {
  DashboardSummary, CategoryBreakdown, StateRiskItem, TrendDataPoint,
  WorkItem, ExplainabilityDossier, AnomalyItem, InvestigationQueueItem,
  AuditLogItem, GeoJSONCollection, SpatialRelationshipsResponse, ExecutiveOverviewAnalytics
} from './types';


const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Dashboard & Analytics
  async getExecutiveOverviewAnalytics(params?: { house?: string; is_synthetic?: boolean }): Promise<ExecutiveOverviewAnalytics> {
    const res = await apiClient.get<ExecutiveOverviewAnalytics>('/analytics/overview', { params });
    return res.data;
  },

  async getDashboardSummary(params?: { house?: string; state_id?: number; is_synthetic?: boolean }): Promise<DashboardSummary> {

    const res = await apiClient.get<DashboardSummary>('/dashboard/summary', { params });
    return res.data;
  },

  async getCategoryBreakdown(params?: { is_synthetic?: boolean }): Promise<CategoryBreakdown[]> {
    const res = await apiClient.get<CategoryBreakdown[]>('/dashboard/category-breakdown', { params });
    return res.data;
  },

  async getStateRisk(params?: { is_synthetic?: boolean }): Promise<StateRiskItem[]> {
    const res = await apiClient.get<StateRiskItem[]>('/dashboard/state-risk', { params });
    return res.data;
  },

  async getTrends(): Promise<TrendDataPoint[]> {
    const res = await apiClient.get<TrendDataPoint[]>('/dashboard/trends');
    return res.data;
  },

  // Works
  async getWorks(params?: {
    skip?: number;
    limit?: number;
    state_id?: number;
    district_id?: number;
    category?: string;
    status?: string;
    severity?: string;
    sort_by?: string;
    is_synthetic?: boolean;
    search?: string;
  }): Promise<{ items: WorkItem[]; total: number }> {
    const res = await apiClient.get<WorkItem[]>('/works', { params });
    const countHeader = res.headers['x-total-count'];
    const total = countHeader ? parseInt(countHeader, 10) : res.data.length;
    return { items: res.data, total };
  },

  async getWorkById(workId: string): Promise<WorkItem> {
    const res = await apiClient.get<WorkItem>(`/works/${encodeURIComponent(workId)}`);
    return res.data;
  },

  // Anomalies & Explainability Dossier
  async getAnomalies(params?: {
    skip?: number;
    limit?: number;
    severity?: string;
    engine?: string;
    state_id?: number;
    is_synthetic?: boolean;
    status?: string;
  }): Promise<AnomalyItem[]> {
    const res = await apiClient.get<AnomalyItem[]>('/anomalies', { params });
    return res.data;
  },

  async getDossier(workId: string): Promise<ExplainabilityDossier> {
    const res = await apiClient.get<ExplainabilityDossier>(`/anomalies/${encodeURIComponent(workId)}/dossier`);
    return res.data;
  },

  async getWorkProvenance(workId: string): Promise<any> {
    const res = await apiClient.get(`/works/${encodeURIComponent(workId)}/provenance`);
    return res.data;
  },

  // Investigations Workflow
  async submitReview(workId: string, payload: {
    new_status: string;
    assigned_role?: string;
    reviewer_notes?: string;
    outcome_decision?: string;
  }) {
    const res = await apiClient.post(`/investigations/${encodeURIComponent(workId)}/review`, payload);
    return res.data;
  },

  async getInvestigationQueue(params?: {
    status?: string;
    severity?: string;
    state_id?: number;
    district_id?: number;
    work_category?: string;
    primary_signal?: string;
    sort_by?: string;
    is_synthetic?: boolean;
  }): Promise<InvestigationQueueItem[]> {
    const res = await apiClient.get<InvestigationQueueItem[]>('/investigations/queue', { params });
    return res.data;
  },

  // Geospatial Map
  async getGeospatialRiskMap(params?: {
    state_id?: number;
    district_id?: number;
    min_score?: number;
    severity?: string;
    work_category?: string;
    radius_meters?: number;
    is_synthetic?: boolean;
  }): Promise<GeoJSONCollection> {
    const res = await apiClient.get<GeoJSONCollection>('/geospatial/risk-map', { params });
    return res.data;
  },

  async getSpatialRelationships(workId: string, radiusMeters: number = 500): Promise<SpatialRelationshipsResponse> {
    const res = await apiClient.get<SpatialRelationshipsResponse>(`/geospatial/works/${encodeURIComponent(workId)}/relationships`, {
      params: { radius_meters: radiusMeters }
    });
    return res.data;
  },

  // Proxy & Demo Utilities
  async getStates(): Promise<{ state_id: number; state_name: string }[]> {
    const res = await apiClient.get('/esakshi/states');
    return res.data;
  },

  async syncEsakshiState(stateId: number = 35) {
    const res = await apiClient.post('/esakshi/sync', null, { params: { state_id: stateId } });
    return res.data;
  },

  async resetDemoSeed() {
    const res = await apiClient.post('/esakshi/demo/reset-seed');
    return res.data;
  },

  // Audit Logs
  async getAuditLogs(entityId?: string): Promise<AuditLogItem[]> {
    const res = await apiClient.get<AuditLogItem[]>('/audit/logs', { params: { entity_id: entityId } });
    return res.data;
  },
};
