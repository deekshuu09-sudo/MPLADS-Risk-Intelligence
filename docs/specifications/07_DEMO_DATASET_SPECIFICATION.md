# Demo Dataset Specification & Seeding Strategy

## Project Details
- **Problem Statement ID:** 26102
- **Title:** Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation
- **Platform:** MPLADS Risk Intelligence & Investigation Platform (RIIP)

---

## 1. Schema Fidelity: Official eSAKSHI Mirroring

In compliance with the project guidelines, the synthetic demo dataset **does not invent hypothetical fields**. Instead, it strictly mirrors the exact JSON schema and entity relationships discovered in the official MoSPI **eSAKSHI** portal (`https://mplads.mospi.gov.in`), enriched only with geographic coordinates (`latitude`, `longitude`) and engineering attributes (`estimated_cost`, `physical_progress_pct`) required for algorithmic evaluation.

### Field Mapping Comparison:

| Official eSAKSHI Attribute | Type in Portal | Storage Column in RIIP | Notes |
| :--- | :--- | :--- | :--- |
| `WORK_ID` | String | `works.work_id` | Unique ID e.g. `WS/MP18275/2024-2025/175559` |
| `WORK_RECOMMENDATION_DTL_ID`| Integer | `works.work_recommendation_dtl_id` | Official integer sequence |
| `ACTIVITY_NAME` | String | `works.activity_name` | Activity description string |
| `WORK_CATEGORY` | String | `works.work_category` | Category: `Normal/Others`, `Trust & Society`, etc. |
| `WORK_DESCRIPTION` | Text | `works.work_description` | Detailed site and work description |
| `STATE_NAME` | String | `states.state_name` | Official State name |
| `IDA_NAME` | String | `districts.ida_code` | Implementing District Authority designation |
| `MP_NAME` | String | `members_of_parliament.mp_name` | Name of Hon'ble Member of Parliament |
| `CONSTITUENCY` | String | `constituencies.constituency_name`| Constituency name |
| `HOUSE_OF_PARLIAMENT` | Integer | `constituencies.house_type` | 2 = Lok Sabha, 1 = Rajya Sabha |
| `TENURE` | String | `members_of_parliament.tenure` | `18th Lok Sabha` |
| `LETTER_NO` | String | `works.letter_no` | MP letter reference e.g. `LN/MP18275/...` |
| `RECOMMENDATION_DATE` | Date String | `works.recommendation_date` | Ingested as ISO date |
| `SANCTION_DATE` | Date String | `works.sanction_date` | Date sanction order issued |
| `ACTUAL_END_DATE` | Date String | `works.actual_end_date` | Completion date |
| `SANCTION_AMOUNT` | Float | `works.sanctioned_amount` | Approved amount in INR |
| `ACTUAL_AMOUNT` | Float | `works.actual_amount` | Total disbursed in INR |
| `WORK_STATUS` | String | `works.work_status` | Status: `Recommended`, `Sanctioned`, `Completed` |
| `FILE_STATUS` | String | `works.file_status` | Photo status: `AVAILABLE`, `NOT_AVAILABLE` |
| `VENDOR_NAME` | String | `vendors.vendor_name` | Contractor name |
| `VENDOR_ID` | Integer | `vendors.vendor_id` | Official Vendor ID |
| `FUND_DISBURSED_AMT` | Float | `expenditures.fund_disbursed_amt`| Milestone payment amount |
| `EXPENDITURE_DATE` | Date String | `expenditures.expenditure_date` | Date voucher issued |

---

## 2. Seeded Anomaly Benchmark Scenarios

To demonstrate the precision and explainability of the platform without hardcoding arbitrary numbers into the UI, the demo dataset contains **7 intentionally engineered, realistic systemic anomaly cases**:

### Scenario A: Tender Threshold Splitting (Procurement Evasion)
- **Modus Operandi:** A road project valued at ₹29.5 Lakhs is artificially divided into 3 distinct works recommended within 10 days in the same gram panchayat, all priced just below the ₹10.0 Lakh public e-tender threshold.
- **Seeded Parameters:**
  - Work 1: `WS/DEMO/2025/101` - "Construction of PCC road from Permeshwar house to Main Chowk, Ward 4" - ₹9,85,000.
  - Work 2: `WS/DEMO/2025/102` - "Construction of PCC road from Main Chowk to School, Ward 4" - ₹9,90,000.
  - Work 3: `WS/DEMO/2025/103` - "Construction of PCC road from School to Culvert, Ward 4" - ₹9,95,000.
- **Engine Triggered:** `Engine 1 (Rule 1.2) + Engine 4 (Text Similarity 86.4%)`.
- **Expected Rationale:** *"Multiple contiguous works sanctioned within 10 days in identical village just below ₹10 Lakh tender threshold."*

### Scenario B: Near-Duplicate Asset Creation (Co-Location Risk)
- **Modus Operandi:** An MP recommends a new Community Hall in a village where an identical community hall was already sanctioned 6 months earlier under a slightly modified title.
- **Seeded Parameters:**
  - Work A: `WS/DEMO/2025/201` - "Construction of Community Hall at Rampur Panchayat, Block B" (Sanctioned Sep 2024, Lat: 25.5941, Long: 85.1376).
  - Work B: `WS/DEMO/2025/202` - "Construction of Multipurpose Community Hall near Rampur Village Center" (Sanctioned Feb 2025, Lat: 25.5948, Long: 85.1382).
  - Physical distance: 110 meters. Lexical cosine similarity: 91.2%.
- **Engine Triggered:** `Engine 4 (Text & Spatial Duplicate Engine)`.
- **Expected Rationale:** *"Co-located duplicate detected within 110m proximity with 91.2% description similarity."*

### Scenario C: Severe Unit Cost Outlier (PCC Road)
- **Modus Operandi:** A 200-meter concrete road sanctioned with a cost estimate of ₹18,40,000 (₹9,200 per meter), whereas the district median cost for identical PCC specifications is ₹2,100 per meter.
- **Seeded Parameters:**
  - Sanction Amount: ₹18,40,000. District Median: ₹4,20,000 ($P_{75}$: ₹5,50,000, $P_{95}$: ₹7,20,000).
  - Modified Z-Score: $+4.12$ (Extreme Outlier).
- **Engine Triggered:** `Engine 2 (Statistical Outlier Engine)`.
- **Expected Rationale:** *"Sanctioned unit cost exceeds district category median by +338.1% (Modified Z-Score: 4.12)."*

### Scenario D: Front-Loaded Advance Overpayment
- **Modus Operandi:** Vendor receives ₹45 Lakhs out of a ₹50 Lakh sanction (90% financial disbursement), while the physical inspection record indicates only 10% progress after 240 days.
- **Seeded Parameters:**
  - Disbursed Amount: ₹45,00,000 (90.0%).
  - Physical Progress: 10.0%.
  - Discrepancy Gap $\Delta_{\text{incongruity}} = +80.0\%$.
- **Engine Triggered:** `Engine 5 (Payment Velocity & Progress Incongruity Engine)`.
- **Expected Rationale:** *"Severe disbursement-to-progress mismatch: 90% funds released with only 10% physical progress reported."*

### Scenario E: Chronic Execution Stall (Statutory 365-Day Violation)
- **Modus Operandi:** High-value community health sub-center sanctioned 485 days ago. Zero physical progress recorded and zero disbursement released.
- **Seeded Parameters:**
  - Sanction Date: 485 days prior. Statutory Limit: 365 days.
  - Work Status: `Sanctioned (Stalled)`.
- **Engine Triggered:** `Engine 1 (Rule 1.1: Statutory 1-Year Mandate)`.
- **Expected Rationale:** *"Project execution stalled at Day 485 post-sanction, exceeding statutory 365-day completion limit by 120 days."*

### Scenario F: Implementing Agency Vendor Monopolization
- **Modus Operandi:** In a specific district, an Implementing Agency allocates 16 out of 19 sanctioned works (₹7.8 Crore out of ₹9.1 Crore) to a single private contractor (`M/s Apex Infra Projects`).
- **Seeded Parameters:**
  - District HHI: 7,420 (Normal competitive baseline $< 1,500$).
  - Vendor share: 85.7%.
- **Engine Triggered:** `Engine 6 (Vendor & IA Concentration Engine)`.
- **Expected Rationale:** *"High contractor concentration: Single vendor controls 85.7% of district MPLADS works (HHI: 7,420)."*

### Scenario G: Statutory Ceiling Breach (Trust and Society)
- **Modus Operandi:** An MP recommends multiple developmental works for a single private educational trust totaling ₹1.15 Crore, breaching the statutory ₹75 Lakh lifetime cap under MPLADS guidelines.
- **Seeded Parameters:**
  - Category: `Trust and Society`.
  - Cumulative MP Allocation to Trust: ₹1,15,00,000.
- **Engine Triggered:** `Engine 1 (Rule 1.3: Trust and Society Financial Cap)`.
- **Expected Rationale:** *"Statutory cap exceeded: Cumulative allocation of ₹1.15 Crore breaches ₹75 Lakh ceiling for Trust and Society."*

---

## 3. Geographic & Demographic Distribution

The synthetic benchmark dataset covers 8 diverse States/UTs spanning different administrative zones:
1. **Bihar** (Eastern Zone - Plain terrain, high rural road volume).
2. **Andaman & Nicobar Islands** (Island Zone - Maritime logistics, community infrastructure).
3. **Maharashtra** (Western Zone - Mixed urban/rural, high financial turnover).
4. **Karnataka** (Southern Zone - Tech-enabled monitoring, urban municipal wards).
5. **Uttar Pradesh** (Northern Zone - High constituency density, large allocation pool).
6. **Assam** (North-Eastern Zone - Flood protection, culverts, rural electrification).
7. **Rajasthan** (Desert/Arid Zone - Drinking water facilities, tube wells).
8. **Kerala** (Coastal Zone - High completion velocity, educational renovation).

### Dataset Volume Summary:
- **Total Works:** 520 records.
- **Total MPs:** 32 Hon'ble MPs (Lok Sabha & Rajya Sabha).
- **Districts (IDAs):** 24.
- **Implementing Agencies:** 48.
- **Vendors:** 85.
- **Seeded Anomaly Cases:** 48 (9.2% of dataset; realistic administrative ratio).
- **Normal Works (Noise Baseline):** 472 (90.8%).
