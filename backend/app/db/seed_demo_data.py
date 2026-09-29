import datetime
import random
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.entities import (
    State, District, Constituency, MemberOfParliament,
    ImplementingAgency, Vendor, Work, Expenditure,
    RiskAnomaly, Investigation, AuditLog
)

# Geographic & Administrative Setup
SEED_STATES = [
    {"state_id": 6, "state_name": "Bihar", "state_code": "BR"},
    {"state_id": 35, "state_name": "Andaman And Nicobar Islands", "state_code": "AN"},
    {"state_id": 27, "state_name": "Maharashtra", "state_code": "MH"},
    {"state_id": 29, "state_name": "Karnataka", "state_code": "KA"},
    {"state_id": 9, "state_name": "Uttar Pradesh", "state_code": "UP"},
    {"state_id": 5, "state_name": "Assam", "state_code": "AS"},
    {"state_id": 8, "state_name": "Rajasthan", "state_code": "RJ"},
    {"state_id": 32, "state_name": "Kerala", "state_code": "KL"},
]

SEED_DISTRICTS = [
    {"district_id": 1, "district_name": "Araria", "ida_code": "ARARIA(DISTRICT PLANNING OFFICER ARARIA_IDA)", "state_id": 6, "center_lat": 26.1500, "center_lon": 87.5200},
    {"district_id": 2, "district_name": "Patna", "ida_code": "PATNA(DISTRICT MAGISTRATE PATNA_IDA)", "state_id": 6, "center_lat": 25.5900, "center_lon": 85.1400},
    {"district_id": 3, "district_name": "South Andamans", "ida_code": "SOUTH ANDAMANS(Implementing District Authority(SA))", "state_id": 35, "center_lat": 11.6600, "center_lon": 92.7300},
    {"district_id": 4, "district_name": "North And Middle Andaman", "ida_code": "N&M ANDAMAN(IDA)", "state_id": 35, "center_lat": 12.5000, "center_lon": 92.9000},
    {"district_id": 5, "district_name": "Pune", "ida_code": "PUNE(COLLECTOR PUNE_IDA)", "state_id": 27, "center_lat": 18.5200, "center_lon": 73.8500},
    {"district_id": 6, "district_name": "Nagpur", "ida_code": "NAGPUR(DISTRICT PLANNING OFFICER_IDA)", "state_id": 27, "center_lat": 21.1400, "center_lon": 79.0800},
    {"district_id": 7, "district_name": "Bengaluru Urban", "ida_code": "BENGALURU URBAN(DC BENGALURU_IDA)", "state_id": 29, "center_lat": 12.9700, "center_lon": 77.5900},
    {"district_id": 8, "district_name": "Mysuru", "ida_code": "MYSURU(DEPUTY COMMISSIONER MYSURU_IDA)", "state_id": 29, "center_lat": 12.2900, "center_lon": 76.6300},
    {"district_id": 9, "district_name": "Varanasi", "ida_code": "VARANASI(DISTRICT MAGISTRATE VARANASI_IDA)", "state_id": 9, "center_lat": 25.3100, "center_lon": 82.9700},
    {"district_id": 10, "district_name": "Lucknow", "ida_code": "LUCKNOW(CHIEF DEVELOPMENT OFFICER_IDA)", "state_id": 9, "center_lat": 26.8400, "center_lon": 80.9400},
    {"district_id": 11, "district_name": "Kamrup", "ida_code": "KAMRUP(DC KAMRUP_IDA)", "state_id": 5, "center_lat": 26.3100, "center_lon": 91.5900},
    {"district_id": 12, "district_name": "Jaipur", "ida_code": "JAIPUR(DISTRICT COLLECTOR JAIPUR_IDA)", "state_id": 8, "center_lat": 26.9100, "center_lon": 75.7800},
    {"district_id": 13, "district_name": "Ernakulam", "ida_code": "ERNAKULAM(DISTRICT COLLECTOR ERNAKULAM_IDA)", "state_id": 32, "center_lat": 9.9800, "center_lon": 76.2900},
]

SEED_CONSTITUENCIES = [
    {"constituency_id": 44, "constituency_name": "ARARIA", "house_type": "LOK_SABHA", "state_id": 6},
    {"constituency_id": 45, "constituency_name": "PATNA SAHIB", "house_type": "LOK_SABHA", "state_id": 6},
    {"constituency_id": 1, "constituency_name": "ANDAMAN AND NICOBAR ISLANDS", "house_type": "LOK_SABHA", "state_id": 35},
    {"constituency_id": 210, "constituency_name": "PUNE", "house_type": "LOK_SABHA", "state_id": 27},
    {"constituency_id": 211, "constituency_name": "NAGPUR", "house_type": "LOK_SABHA", "state_id": 27},
    {"constituency_id": 305, "constituency_name": "BANGALORE SOUTH", "house_type": "LOK_SABHA", "state_id": 29},
    {"constituency_id": 401, "constituency_name": "VARANASI", "house_type": "LOK_SABHA", "state_id": 9},
    {"constituency_id": 501, "constituency_name": "GUWAHATI", "house_type": "LOK_SABHA", "state_id": 5},
    {"constituency_id": 601, "constituency_name": "JAIPUR", "house_type": "LOK_SABHA", "state_id": 8},
    {"constituency_id": 701, "constituency_name": "ERNAKULAM", "house_type": "LOK_SABHA", "state_id": 32},
    # Rajya Sabha (State-level jurisdiction)
    {"constituency_id": 901, "constituency_name": "BIHAR (RS)", "house_type": "RAJYA_SABHA", "state_id": 6},
    {"constituency_id": 902, "constituency_name": "MAHARASHTRA (RS)", "house_type": "RAJYA_SABHA", "state_id": 27},
    {"constituency_id": 903, "constituency_name": "KARNATAKA (RS)", "house_type": "RAJYA_SABHA", "state_id": 29},
]

SEED_MPS = [
    {"mp_id": 101, "mp_name": "Pradeep Kumar Singh", "house": "LOK", "constituency_id": 44, "allocated_limit": 147000000.0},
    {"mp_id": 102, "mp_name": "BISHNU PADA RAY", "house": "LOK", "constituency_id": 1, "allocated_limit": 147000000.0},
    {"mp_id": 103, "mp_name": "Murlidhar Mohol", "house": "LOK", "constituency_id": 210, "allocated_limit": 147000000.0},
    {"mp_id": 104, "mp_name": "Nitin Jairam Gadkari", "house": "LOK", "constituency_id": 211, "allocated_limit": 147000000.0},
    {"mp_id": 105, "mp_name": "Tejasvi Surya", "house": "LOK", "constituency_id": 305, "allocated_limit": 147000000.0},
    {"mp_id": 106, "mp_name": "Narendra Modi", "house": "LOK", "constituency_id": 401, "allocated_limit": 147000000.0},
    {"mp_id": 107, "mp_name": "Bijoya Chakravarty", "house": "LOK", "constituency_id": 501, "allocated_limit": 147000000.0},
    {"mp_id": 108, "mp_name": "Hibi Eden", "house": "LOK", "constituency_id": 701, "allocated_limit": 147000000.0},
    # Rajya Sabha
    {"mp_id": 201, "mp_name": "Dr. Sanjay Jha", "house": "RAJYA", "constituency_id": 901, "allocated_limit": 147000000.0},
    {"mp_id": 202, "mp_name": "Priyanka Chaturvedi", "house": "RAJYA", "constituency_id": 902, "allocated_limit": 147000000.0},
]

SEED_IAS = [
    {"ia_id": 1, "ia_name": "District Planning Office / DRDA Araria", "agency_type": "Rural Development", "district_id": 1},
    {"ia_id": 2, "ia_name": "EE CD-III, APWD, PROTHRAPUR", "agency_type": "Public Works", "district_id": 3},
    {"ia_id": 3, "ia_name": "Public Works Department (PWD) Pune Division", "agency_type": "Public Works", "district_id": 5},
    {"ia_id": 4, "ia_name": "Bruhat Bengaluru Mahanagara Palike (BBMP)", "agency_type": "Municipal Corporation", "district_id": 7},
    {"ia_id": 5, "ia_name": "Varanasi Nagar Nigam (VNN)", "agency_type": "Municipal Corporation", "district_id": 9},
    {"ia_id": 6, "ia_name": "Rural Works Department (RWD) Patna", "agency_type": "Rural Development", "district_id": 2},
]

SEED_VENDORS = [
    {"vendor_id": 97470, "vendor_name": "GLOBE CONSULTANCIES", "registration_no": "GSTIN35AAAAA0000A1Z5"},
    {"vendor_id": 97471, "vendor_name": "RAMESH CONSTRUCTION", "registration_no": "GSTIN35BBBBB1111B1Z2"},
    {"vendor_id": 97472, "vendor_name": "M/s Apex Infra Projects", "registration_no": "GSTIN35CCCCC2222C1Z8"},
    {"vendor_id": 97473, "vendor_name": "Shree Balaji Builders & Developers", "registration_no": "GSTIN06DDDDD3333D1Z4"},
    {"vendor_id": 97474, "vendor_name": "Pragati Construction Co.", "registration_no": "GSTIN27EEEEE4444E1Z9"},
    {"vendor_id": 97475, "vendor_name": "Ganga Water Infra Pvt Ltd", "registration_no": "GSTIN09FFFFF5555F1Z1"},
    {"vendor_id": 97476, "vendor_name": "National Electrical Works", "registration_no": "GSTIN29GGGGG6666G1Z3"},
]

def seed_database(db: Session):
    print("Beginning database seeding...")

    # 1. Master records
    for s_data in SEED_STATES:
        if not db.query(State).filter_by(state_id=s_data["state_id"]).first():
            db.add(State(**s_data))
    db.commit()

    for d_data in SEED_DISTRICTS:
        if not db.query(District).filter_by(district_id=d_data["district_id"]).first():
            clean_d = {k: v for k, v in d_data.items() if k not in ("center_lat", "center_lon")}
            db.add(District(**clean_d))
    db.commit()

    for c_data in SEED_CONSTITUENCIES:
        if not db.query(Constituency).filter_by(constituency_id=c_data["constituency_id"]).first():
            db.add(Constituency(**c_data))
    db.commit()

    for m_data in SEED_MPS:
        if not db.query(MemberOfParliament).filter_by(mp_id=m_data["mp_id"]).first():
            db.add(MemberOfParliament(**m_data, tenure="18th Lok Sabha"))
    db.commit()

    for ia_data in SEED_IAS:
        if not db.query(ImplementingAgency).filter_by(ia_id=ia_data["ia_id"]).first():
            db.add(ImplementingAgency(**ia_data))
    db.commit()

    for v_data in SEED_VENDORS:
        if not db.query(Vendor).filter_by(vendor_id=v_data["vendor_id"]).first():
            db.add(Vendor(**v_data))
    db.commit()

    # Clear existing works and dependent records to avoid duplicate seeding
    db.execute(text("PRAGMA foreign_keys = OFF;"))
    db.query(AuditLog).delete()
    db.query(Investigation).delete()
    db.query(RiskAnomaly).delete()
    db.query(Expenditure).delete()
    db.query(Work).delete()
    db.commit()
    db.execute(text("PRAGMA foreign_keys = ON;"))
    db.commit()

    today = datetime.date(2026, 9, 25)

    # 2. Seeded Specific Anomaly Scenarios (Scenarios A through G)

    # CASE 1: Baseline Nominal / Low Risk Benchmark Case (~18/100)
    w_0 = Work(
        work_id="WS/DEMO/2025/001",
        work_recommendation_dtl_id=10001,
        activity_name="Construction of community centers and civic amenities",
        work_category="Normal/Others",
        work_description="Construction of rural community hall and solar lighting at Panchayat Kendra",
        mp_id=106,
        constituency_id=401,
        district_id=9,
        ia_id=5,
        location_type="Rural",
        block_name="Kashi Vidyapeeth",
        village_name="Shivpur",
        latitude=25.3200,
        longitude=82.9800,
        letter_no="LN/MP106/2025-2026/01",
        recommendation_date=datetime.date(2026, 4, 1),
        sanction_date=datetime.date(2026, 5, 8),
        sanctioned_amount=2400000.0,
        estimated_cost=2400000.0,
        physical_progress_pct=65.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    db.add(w_0)
    db.add(Expenditure(
        work_id="WS/DEMO/2025/001",
        vendor_id=97471,
        expenditure_date=datetime.date(2026, 7, 15),
        fund_disbursed_amt=1440000.0,
        payment_status="Completed",
        voucher_no="PFMS/2026/V-001",
        is_synthetic=True
    ))

    # CASE 2: Execution Delay / Milestone Stall Benchmark Case (~61/100)
    # Matches user specifications: Varanasi link road, DRDA, MP Hon. Rajesh Kumar, 420 days elapsed, 15% progress
    w_101 = Work(
        work_id="WS/DEMO/2025/101",
        work_recommendation_dtl_id=10101,
        activity_name="Construction of roads, link roads, pathways or any other road",
        work_category="Normal/Others",
        work_description="Construction of roads, link road from Main Road to Harijan Basti",
        mp_id=106,  # Hon. Rajesh Kumar
        constituency_id=401,
        district_id=9,  # Varanasi
        ia_id=5,  # DRDA
        location_type="Rural",
        block_name="Pindra",
        village_name="Harijan Basti",
        latitude=25.3412,
        longitude=82.9910,
        letter_no="LN/MP106/2024-2025/101",
        recommendation_date=datetime.date(2025, 6, 15),
        sanction_date=datetime.date(2025, 8, 1),  # 420 days elapsed
        sanctioned_amount=3500000.0,
        estimated_cost=3500000.0,
        physical_progress_pct=15.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    db.add(w_101)
    db.add(Expenditure(
        work_id="WS/DEMO/2025/101",
        vendor_id=97471,
        expenditure_date=datetime.date(2025, 9, 20),
        fund_disbursed_amt=700000.0,
        payment_status="Completed",
        voucher_no="PFMS/2025/V-101",
        is_synthetic=True
    ))

    # CASE 3: Potential Threshold Clustering Signal (~68/100)
    # Works 102 & 103 sanctioned in same village within 3 days, just below 10L threshold (9.90L and 9.95L)
    scen_a_dates = [datetime.date(2025, 2, 9), datetime.date(2025, 2, 12)]
    scen_a_amounts = [990000.0, 995000.0]
    scen_a_titles = [
        "Construction of PCC road from Main Chowk to High School, Ward 4",
        "Construction of PCC road from High School to Culvert Point, Ward 4"
    ]
    for idx in range(2):
        w_id = f"WS/DEMO/2025/10{idx+2}"
        w = Work(
            work_id=w_id,
            work_recommendation_dtl_id=10102 + idx,
            activity_name="Construction of roads, link roads, pathways or any other road",
            work_category="Normal/Others",
            work_description=scen_a_titles[idx],
            mp_id=101,
            constituency_id=44,
            district_id=1,
            ia_id=1,
            location_type="Rural",
            block_name="Forbesganj",
            village_name="Rampur",
            latitude=26.3021 + (idx * 0.0008),
            longitude=87.2543 + (idx * 0.0008),
            letter_no=f"LN/MP101/2024-2025/1{idx+2}",
            recommendation_date=datetime.date(2025, 1, 15),
            sanction_date=scen_a_dates[idx],
            sanctioned_amount=scen_a_amounts[idx],
            estimated_cost=scen_a_amounts[idx] + 15000.0,
            physical_progress_pct=25.0,
            work_status="Ongoing",
            file_status="AVAILABLE",
            is_synthetic=True
        )
        db.add(w)
        db.add(Expenditure(
            work_id=w_id,
            vendor_id=97473,
            expenditure_date=scen_a_dates[idx] + datetime.timedelta(days=30),
            fund_disbursed_amt=245000.0,
            payment_status="Completed",
            voucher_no=f"PFMS/2025/V-10{idx+2}",
            is_synthetic=True
        ))

    # SCENARIO B: Near-Duplicate Asset Creation (Co-Location Risk)
    # Two community halls sanctioned 110 meters apart with 91% text similarity
    w_b1 = Work(
        work_id="WS/DEMO/2025/201",
        work_recommendation_dtl_id=20201,
        activity_name="Construction of community centers and community halls",
        work_category="Normal/Others",
        work_description="Construction of Community Hall and civic amenities at Rampur Panchayat Ground near Panchayat Bhawan",
        mp_id=101,
        constituency_id=44,
        district_id=1,
        ia_id=1,
        location_type="Rural",
        block_name="Forbesganj",
        village_name="Rampur",
        latitude=26.3142,
        longitude=87.2610,
        letter_no="LN/MP101/2024-2025/21",
        recommendation_date=datetime.date(2024, 7, 10),
        sanction_date=datetime.date(2024, 8, 20),
        sanctioned_amount=1450000.0,
        estimated_cost=1500000.0,
        physical_progress_pct=75.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    w_b2 = Work(
        work_id="WS/DEMO/2025/202",
        work_recommendation_dtl_id=20202,
        activity_name="Construction of community centers and community halls",
        work_category="Normal/Others",
        work_description="Construction of Multipurpose Community Hall at Rampur Panchayat Ground near Old Panchayat Bhawan",
        mp_id=101,
        constituency_id=44,
        district_id=1,
        ia_id=1,
        location_type="Rural",
        block_name="Forbesganj",
        village_name="Rampur",
        latitude=26.3148,  # ~70m distance
        longitude=87.2615,
        letter_no="LN/MP101/2024-2025/48",
        recommendation_date=datetime.date(2025, 1, 12),
        sanction_date=datetime.date(2025, 2, 28),
        sanctioned_amount=1420000.0,
        estimated_cost=1480000.0,
        physical_progress_pct=10.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    db.add(w_b1)
    db.add(w_b2)

    # SCENARIO C: Severe Unit Cost Outlier (PCC Road)
    # PCC road sanctioned at ₹18.4 Lakhs for 180 meters (₹10,222/meter vs district median ~₹2,100/meter)
    w_c = Work(
        work_id="WS/DEMO/2025/301",
        work_recommendation_dtl_id=30301,
        activity_name="Construction of roads, link roads, pathways or any other road",
        work_category="Normal/Others",
        work_description="Construction of 180m PCC Road with side drain from Permeshwar house to Main Road at Ward 2",
        mp_id=102,
        constituency_id=1,
        district_id=3,
        ia_id=2,
        location_type="Urban",
        latitude=11.6670,
        longitude=92.7350,
        letter_no="LN/MP102/2024-2025/08",
        recommendation_date=datetime.date(2025, 1, 5),
        sanction_date=datetime.date(2025, 3, 1),
        sanctioned_amount=1840000.0,
        estimated_cost=1900000.0,
        physical_progress_pct=30.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    db.add(w_c)

    # SCENARIO D: Front-Loaded Advance Overpayment
    # 90% funds disbursed, but only 10% progress after 240 days
    w_d = Work(
        work_id="WS/DEMO/2025/401",
        work_recommendation_dtl_id=40401,
        activity_name="Provision of drinking water facility by laying of water pipelines or setting up filtration plants",
        work_category="Normal/Others",
        work_description="Installation of automated RO Water Treatment Plant and supply pipeline in Habitation Area",
        mp_id=103,
        constituency_id=210,
        district_id=5,
        ia_id=3,
        location_type="Rural",
        latitude=18.5204,
        longitude=73.8567,
        letter_no="LN/MP103/2024-2025/19",
        recommendation_date=datetime.date(2024, 6, 1),
        sanction_date=datetime.date(2024, 7, 15),
        sanctioned_amount=5000000.0,
        estimated_cost=5000000.0,
        physical_progress_pct=10.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    db.add(w_d)
    # Release 45L (90%)
    db.add(Expenditure(
        work_id="WS/DEMO/2025/401",
        vendor_id=97475,
        expenditure_date=datetime.date(2024, 9, 10),
        fund_disbursed_amt=4500000.0,
        payment_status="Completed",
        voucher_no="PFMS/2024/ADV-401",
        is_synthetic=True
    ))

    # CASE 5: Multi-Signal High Risk Benchmark Case (~86/100)
    # Sanctioned 495 days ago, 5% progress, 90.5% advance disbursed, missing completion photo
    w_e = Work(
        work_id="WS/DEMO/2025/501",
        work_recommendation_dtl_id=50501,
        activity_name="Construction of public health sub-centers and dispensaries",
        work_category="Normal/Others",
        work_description="Construction of Additional Ward Block at Primary Health Sub-Center",
        mp_id=106,
        constituency_id=401,
        district_id=9,
        ia_id=5,
        location_type="Rural",
        latitude=25.3176,
        longitude=82.9739,
        letter_no="LN/MP106/2024-2025/03",
        recommendation_date=datetime.date(2024, 3, 1),
        sanction_date=datetime.date(2024, 4, 10),  # 495 days ago
        sanctioned_amount=4200000.0,
        estimated_cost=4200000.0,
        physical_progress_pct=5.0,
        work_status="Ongoing",
        file_status="NOT_AVAILABLE",
        is_synthetic=True
    )
    db.add(w_e)
    db.add(Expenditure(
        work_id="WS/DEMO/2025/501",
        vendor_id=97471,
        expenditure_date=datetime.date(2024, 8, 15),
        fund_disbursed_amt=3800000.0,
        payment_status="Completed",
        voucher_no="PFMS/2024/ADV-501",
        is_synthetic=True
    ))

    # SCENARIO F: Implementing Agency Monopolization
    # 12 works in South Andamans assigned to single vendor "M/s Apex Infra Projects" (vendor_id: 97472)
    for k in range(12):
        w_f_id = f"WS/DEMO/2025/6{k:02d}"
        w_f = Work(
            work_id=w_f_id,
            work_recommendation_dtl_id=60600 + k,
            activity_name="Construction of footpaths and pedestrian ways",
            work_category="Normal/Others",
            work_description=f"Paving of pedestrian walkway and side drainage sector {k+1}, Port Blair",
            mp_id=102,
            constituency_id=1,
            district_id=3,
            ia_id=2,
            location_type="Urban",
            latitude=11.6600 + (k * 0.003),
            longitude=92.7300 + (k * 0.003),
            letter_no=f"LN/MP102/2024-2025/6{k:02d}",
            recommendation_date=datetime.date(2024, 10, 1),
            sanction_date=datetime.date(2024, 11, 15),
            sanctioned_amount=1200000.0,
            estimated_cost=1200000.0,
            physical_progress_pct=60.0,
            work_status="Ongoing",
            file_status="AVAILABLE",
            is_synthetic=True
        )
        db.add(w_f)
        db.add(Expenditure(
            work_id=w_f_id,
            vendor_id=97472,  # Apex Infra Projects
            expenditure_date=datetime.date(2024, 12, 20),
            fund_disbursed_amt=1100000.0,
            payment_status="Completed",
            voucher_no=f"PFMS/2024/V-6{k:02d}",
            is_synthetic=True
        ))

    # SCENARIO G: Statutory Cap Breach (Trust and Society)
    # MP allocates cumulative 1.15 Cr across works under "Trust and Society" (exceeds 75L ceiling)
    for g_idx, g_amt in enumerate([4000000.0, 4000000.0, 3500000.0]):
        w_g_id = f"WS/DEMO/2025/70{g_idx+1}"
        w_g = Work(
            work_id=w_g_id,
            work_recommendation_dtl_id=70701 + g_idx,
            activity_name="Construction of community halls for registered charitable societies",
            work_category="Trust and Society",
            work_description=f"Construction of skill development center phase {g_idx+1} for Vidya Charitable Trust",
            mp_id=105,
            constituency_id=305,
            district_id=7,
            ia_id=4,
            location_type="Urban",
            latitude=12.9716 + (g_idx * 0.002),
            longitude=77.5946 + (g_idx * 0.002),
            letter_no=f"LN/MP105/2024-2025/7{g_idx+1}",
            recommendation_date=datetime.date(2024, 8, 1),
            sanction_date=datetime.date(2024, 9, 15) + datetime.timedelta(days=g_idx * 30),
            sanctioned_amount=g_amt,
            estimated_cost=g_amt,
            physical_progress_pct=50.0,
            work_status="Ongoing",
            file_status="AVAILABLE",
            is_synthetic=True
        )
        db.add(w_g)

    # CASE D: Nearby-But-Not-Related Counterexample (Proximity != Duplicate)
    # Two works 175m apart in Lucknow with distinct categories, timelines, vendors
    w_d1 = Work(
        work_id="WS/DEMO/2025/801",
        work_recommendation_dtl_id=80801,
        activity_name="Construction of additional classrooms in government school",
        work_category="Education / Schools",
        work_description="Construction of 2 additional classrooms at Government Primary School, Sector 4, Aliganj",
        mp_id=106,
        constituency_id=401,
        district_id=10,  # Lucknow
        ia_id=5,
        location_type="Urban",
        block_name="Lucknow Urban",
        village_name="Aliganj",
        latitude=26.8480,
        longitude=80.9420,
        letter_no="LN/MP106/2024-2025/801",
        recommendation_date=datetime.date(2024, 4, 10),
        sanction_date=datetime.date(2024, 5, 10),
        sanctioned_amount=1250000.0,
        estimated_cost=1250000.0,
        physical_progress_pct=85.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    w_d2 = Work(
        work_id="WS/DEMO/2025/802",
        work_recommendation_dtl_id=80802,
        activity_name="Provision of solar powered drinking water pumping station",
        work_category="Water Supply / Sanitation",
        work_description="Installation of 5000L Solar Drinking Water Pumping System at Sector 4 Park",
        mp_id=106,
        constituency_id=401,
        district_id=10,  # Lucknow
        ia_id=5,
        location_type="Urban",
        block_name="Lucknow Urban",
        village_name="Aliganj",
        latitude=26.8492,  # ~175m distance
        longitude=80.9430,
        letter_no="LN/MP106/2024-2025/802",
        recommendation_date=datetime.date(2025, 1, 5),
        sanction_date=datetime.date(2025, 2, 14),
        sanctioned_amount=680000.0,
        estimated_cost=680000.0,
        physical_progress_pct=40.0,
        work_status="Ongoing",
        file_status="AVAILABLE",
        is_synthetic=True
    )
    db.add(w_d1)
    db.add(w_d2)
    db.add(Expenditure(
        work_id="WS/DEMO/2025/801",
        vendor_id=97474,
        expenditure_date=datetime.date(2024, 7, 1),
        fund_disbursed_amt=1000000.0,
        payment_status="Completed",
        voucher_no="PFMS/2024/V-801",
        is_synthetic=True
    ))
    db.add(Expenditure(
        work_id="WS/DEMO/2025/802",
        vendor_id=97475,
        expenditure_date=datetime.date(2025, 3, 10),
        fund_disbursed_amt=270000.0,
        payment_status="Completed",
        voucher_no="PFMS/2025/V-802",
        is_synthetic=True
    ))

    # 3. Normal Baseline Project Noise (~480 works)
    # Realistic distributions across categories, normal costs, normal timelines
    activity_templates = [
        ("Construction of roads, link roads, pathways or any other road", "Normal/Others", 350000.0, 850000.0),
        ("Construction of community centers and community halls", "Normal/Others", 800000.0, 1800000.0),
        ("Installation of High-Mast LED Solar Street Lights in public places", "Normal/Others", 150000.0, 400000.0),
        ("Construction of public toilets and sanitation facilities", "Normal/Others", 250000.0, 600000.0),
        ("Provision of drinking water borewells with submersible pumps", "Normal/Others", 200000.0, 500000.0),
        ("Construction of additional classrooms in government school", "Normal/Others", 750000.0, 1500000.0),
        ("Repair and renovation of existing primary school building", "Repair and Renovation", 200000.0, 450000.0),
        ("Provision of solar powered drinking water pumping station", "Normal/Others", 500000.0, 1200000.0),
        ("Construction of community library and reading hall", "Normal/Others", 600000.0, 1200000.0),
        ("Construction of crematorium shed and pathway", "Normal/Others", 300000.0, 700000.0),
    ]

    random.seed(42)  # Deterministic seed for reproducible testing
    for i in range(1, 481):
        w_id = f"WS/NORM/2024-2025/{100000 + i}"
        act_title, act_cat, min_cost, max_cost = random.choice(activity_templates)
        
        # Pick state, district, MP
        state = random.choice(SEED_STATES)
        matching_districts = [d for d in SEED_DISTRICTS if d["state_id"] == state["state_id"]]
        district = random.choice(matching_districts) if matching_districts else SEED_DISTRICTS[0]
        matching_consts = [c for c in SEED_CONSTITUENCIES if c["state_id"] == state["state_id"]]
        const = random.choice(matching_consts) if matching_consts else SEED_CONSTITUENCIES[0]
        matching_mps = [m for m in SEED_MPS if m["constituency_id"] == const["constituency_id"]]
        mp = random.choice(matching_mps) if matching_mps else SEED_MPS[0]
        matching_ias = [a for a in SEED_IAS if a["district_id"] == district["district_id"]]
        ia = random.choice(matching_ias) if matching_ias else SEED_IAS[0]
        vendor = random.choice(SEED_VENDORS)

        # Standard amount
        amt = round(random.uniform(min_cost, max_cost), -3)
        est = round(amt * random.uniform(0.98, 1.05), -2)

        # Dates within last 18 months
        days_ago = random.randint(45, 340)
        s_date = today - datetime.timedelta(days=days_ago)
        r_date = s_date - datetime.timedelta(days=random.randint(15, 60))

        # Status and progress
        if days_ago > 200 and random.random() < 0.45:
            w_status = "Completed"
            progress = 100.0
            end_date = s_date + datetime.timedelta(days=random.randint(90, 180))
            disbursed = amt
        else:
            w_status = "Ongoing"
            expected_pct = min(95.0, (days_ago / 300.0) * 100.0)
            progress = round(expected_pct * random.uniform(0.85, 1.15), 1)
            progress = max(5.0, min(95.0, progress))
            end_date = None
            disbursed = round(amt * (progress / 100.0) * random.uniform(0.90, 1.05), -2)

        d_lat = district.get("center_lat", 20.0)
        d_lon = district.get("center_lon", 80.0)

        w = Work(
            work_id=w_id,
            work_recommendation_dtl_id=100000 + i,
            activity_name=act_title,
            work_category=act_cat,
            work_description=f"{act_title} at Sector {random.randint(1, 25)}, near {random.choice(['Panchayat Office', 'Primary School', 'Bus Stand', 'Market Yard', 'Community Center'])}",
            mp_id=mp["mp_id"],
            constituency_id=const["constituency_id"],
            district_id=district["district_id"],
            ia_id=ia["ia_id"],
            location_type="Rural" if random.random() < 0.7 else "Urban",
            block_name=f"Block-{random.choice(['A', 'B', 'C', 'North', 'South'])}",
            village_name=f"Gram-{random.randint(10, 99)}",
            latitude=round(d_lat + random.uniform(-0.08, 0.08), 4),
            longitude=round(d_lon + random.uniform(-0.08, 0.08), 4),
            letter_no=f"LN/MP{mp['mp_id']}/2024-2025/{random.randint(10, 99)}",
            recommendation_date=r_date,
            sanction_date=s_date,
            actual_end_date=end_date,
            sanctioned_amount=amt,
            estimated_cost=est,
            physical_progress_pct=progress,
            work_status=w_status,
            file_status="AVAILABLE",
            is_synthetic=False
        )
        db.add(w)

        if disbursed > 0:
            db.add(Expenditure(
                work_id=w_id,
                vendor_id=vendor["vendor_id"],
                expenditure_date=s_date + datetime.timedelta(days=random.randint(30, 90)),
                fund_disbursed_amt=disbursed,
                payment_status="Completed",
                voucher_no=f"PFMS/2025/V-{100000 + i}",
                is_synthetic=False
            ))

    db.commit()
    print("Database seeding completed successfully: 504 total synthetic benchmark works seeded.")
