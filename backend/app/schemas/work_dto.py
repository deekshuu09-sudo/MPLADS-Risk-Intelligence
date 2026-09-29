from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field

class ExpenditureDTO(BaseModel):
    expenditure_id: int
    work_id: str
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    expenditure_date: Optional[date] = None
    fund_disbursed_amt: float
    payment_status: str
    voucher_no: Optional[str] = None
    is_synthetic: bool = False

    model_config = {"from_attributes": True}


class WorkListDTO(BaseModel):
    work_id: str
    activity_name: str
    work_category: str
    work_description: str
    state_name: Optional[str] = None
    district_name: Optional[str] = None
    constituency_name: Optional[str] = None
    mp_name: Optional[str] = None
    house: Optional[str] = "LOK"
    sanctioned_amount: float
    estimated_cost: float
    actual_amount: float
    physical_progress_pct: float
    work_status: str
    recommendation_date: Optional[date] = None
    sanction_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    composite_risk_score: Optional[float] = None
    severity_level: Optional[str] = None
    primary_trigger_factor: Optional[str] = None
    is_synthetic: bool = False

    model_config = {"from_attributes": True}


class WorkDetailDTO(WorkListDTO):
    block_name: Optional[str] = None
    village_name: Optional[str] = None
    location_type: Optional[str] = "Rural"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    letter_no: Optional[str] = None
    file_status: Optional[str] = "AVAILABLE"
    implementing_agency_name: Optional[str] = None
    expenditures: List[ExpenditureDTO] = []

    model_config = {"from_attributes": True}
