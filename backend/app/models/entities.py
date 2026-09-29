import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, Date, DateTime, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class State(Base):
    __tablename__ = "states"

    state_id = Column(Integer, primary_key=True, index=True)
    state_name = Column(String(100), nullable=False, unique=True)
    state_code = Column(String(10), nullable=True)

    districts = relationship("District", back_populates="state")
    constituencies = relationship("Constituency", back_populates="state")


class District(Base):
    __tablename__ = "districts"

    district_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    district_name = Column(String(150), nullable=False, index=True)
    ida_code = Column(String(200), nullable=False)
    state_id = Column(Integer, ForeignKey("states.state_id"), nullable=False, index=True)

    state = relationship("State", back_populates="districts")
    agencies = relationship("ImplementingAgency", back_populates="district")
    works = relationship("Work", back_populates="district")


class Constituency(Base):
    __tablename__ = "constituencies"

    constituency_id = Column(Integer, primary_key=True, index=True)
    constituency_name = Column(String(150), nullable=False, index=True)
    house_type = Column(String(20), nullable=False, default="LOK_SABHA")  # LOK_SABHA, RAJYA_SABHA
    state_id = Column(Integer, ForeignKey("states.state_id"), nullable=False, index=True)

    state = relationship("State", back_populates="constituencies")
    mps = relationship("MemberOfParliament", back_populates="constituency")
    works = relationship("Work", back_populates="constituency")


class MemberOfParliament(Base):
    __tablename__ = "members_of_parliament"

    mp_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    mp_name = Column(String(150), nullable=False, index=True)
    house = Column(String(20), nullable=False, default="LOK")  # LOK, RAJYA
    constituency_id = Column(Integer, ForeignKey("constituencies.constituency_id"), nullable=True)
    tenure = Column(String(50), nullable=False, default="18th Lok Sabha")
    tenure_start_date = Column(Date, nullable=True)
    tenure_end_date = Column(Date, nullable=True)
    allocated_limit = Column(Float, default=0.0)

    constituency = relationship("Constituency", back_populates="mps")
    works = relationship("Work", back_populates="mp")


class ImplementingAgency(Base):
    __tablename__ = "implementing_agencies"

    ia_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    ia_name = Column(String(250), nullable=False, index=True)
    agency_type = Column(String(100), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.district_id"), nullable=True, index=True)

    district = relationship("District", back_populates="agencies")
    works = relationship("Work", back_populates="agency")


class Vendor(Base):
    __tablename__ = "vendors"

    vendor_id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String(250), nullable=False, index=True)
    registration_no = Column(String(100), nullable=True)
    pan_hash = Column(String(64), nullable=True)

    expenditures = relationship("Expenditure", back_populates="vendor")


class Work(Base):
    __tablename__ = "works"

    work_id = Column(String(100), primary_key=True, index=True)
    work_recommendation_dtl_id = Column(Integer, nullable=True, index=True)
    activity_name = Column(String(300), nullable=False)
    work_category = Column(String(100), nullable=False, index=True)
    work_description = Column(Text, nullable=False)
    
    mp_id = Column(Integer, ForeignKey("members_of_parliament.mp_id"), nullable=True, index=True)
    constituency_id = Column(Integer, ForeignKey("constituencies.constituency_id"), nullable=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.district_id"), nullable=True, index=True)
    ia_id = Column(Integer, ForeignKey("implementing_agencies.ia_id"), nullable=True, index=True)

    location_type = Column(String(20), default="Rural")  # Rural, Urban
    block_name = Column(String(100), nullable=True)
    village_name = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    letter_no = Column(String(100), nullable=True)
    recommendation_date = Column(Date, nullable=True)
    sanction_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)

    sanctioned_amount = Column(Float, default=0.0)
    estimated_cost = Column(Float, default=0.0)
    physical_progress_pct = Column(Float, default=0.0)
    work_status = Column(String(50), nullable=False, default="Sanctioned", index=True)
    file_status = Column(String(30), default="AVAILABLE")  # AVAILABLE, NOT_AVAILABLE
    is_synthetic = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    mp = relationship("MemberOfParliament", back_populates="works")
    constituency = relationship("Constituency", back_populates="works")
    district = relationship("District", back_populates="works")
    agency = relationship("ImplementingAgency", back_populates="works")
    expenditures = relationship("Expenditure", back_populates="work", cascade="all, delete-orphan")
    anomaly = relationship("RiskAnomaly", back_populates="work", uselist=False, cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="work", cascade="all, delete-orphan")


class Expenditure(Base):
    __tablename__ = "expenditures"

    expenditure_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    work_id = Column(String(100), ForeignKey("works.work_id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id"), nullable=True, index=True)
    expenditure_date = Column(Date, nullable=True)
    fund_disbursed_amt = Column(Float, nullable=False, default=0.0)
    payment_status = Column(String(50), nullable=False, default="Completed")
    voucher_no = Column(String(100), nullable=True)
    is_synthetic = Column(Boolean, default=False)

    work = relationship("Work", back_populates="expenditures")
    vendor = relationship("Vendor", back_populates="expenditures")


class RiskAnomaly(Base):
    __tablename__ = "risk_anomalies"

    anomaly_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    work_id = Column(String(100), ForeignKey("works.work_id"), unique=True, nullable=False, index=True)
    composite_risk_score = Column(Float, nullable=False, index=True)  # 0.0 to 100.0
    severity_level = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence_score = Column(Float, nullable=False, default=0.85)    # 0.0 to 1.0
    status = Column(String(50), nullable=False, default="UNREVIEWED", index=True)

    rule_triggers = Column(JSON, nullable=False, default=list)
    baseline_metrics = Column(JSON, nullable=False, default=dict)
    explainability_narrative = Column(Text, nullable=False)
    recommended_actions = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    work = relationship("Work", back_populates="anomaly")
    investigations = relationship("Investigation", back_populates="anomaly")


class Investigation(Base):
    __tablename__ = "investigations"

    investigation_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    anomaly_id = Column(Integer, ForeignKey("risk_anomalies.anomaly_id"), nullable=True)
    work_id = Column(String(100), ForeignKey("works.work_id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="OPEN", index=True)  # OPEN, IN_REVIEW, INSPECTION_SCHEDULED, RESOLVED, ESCALATED
    assigned_role = Column(String(50), nullable=False, default="DISTRICT_OFFICER")
    reviewer_notes = Column(Text, nullable=True)
    outcome_decision = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    anomaly = relationship("RiskAnomaly", back_populates="investigations")
    work = relationship("Work", back_populates="investigations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    actor_role = Column(String(50), nullable=False, default="DISTRICT_OFFICER")
    ip_address = Column(String(45), nullable=False, default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
