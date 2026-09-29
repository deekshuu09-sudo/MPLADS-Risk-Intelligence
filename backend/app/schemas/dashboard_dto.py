from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel

class RiskBreakdown(BaseModel):
    critical: int
    high: int
    medium: int
    low: int


class DashboardSummaryDTO(BaseModel):
    total_works: int
    allocated_limit_inr: float
    expenditure_inr: float
    expenditure_utilization_pct: float
    works_sanctioned: int
    works_completed: int
    completion_rate_pct: float
    flagged_works_count: int
    flagged_percentage: float
    risk_breakdown: RiskBreakdown
    open_investigations_count: int
    dataset_mode: str  # REAL, SYNTHETIC, HYBRID
    last_synced_at: Optional[datetime] = None


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    total_sanctioned_inr: float
    total_expenditure_inr: float
    flagged_count: int
    risk_rate_pct: float


class StateRiskItem(BaseModel):
    state_id: int
    state_name: str
    total_works: int
    flagged_works: int
    risk_percentage: float
    total_expenditure_cr: float


class TrendDataPoint(BaseModel):
    month_year: str
    recommended_count: int
    sanctioned_count: int
    completed_count: int
    expenditure_cr: float
