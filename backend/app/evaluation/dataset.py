"""
Evaluation Benchmark Dataset Definitions for NexSolve.

Explicitly categorizes all works into:
- ANOMALY_CASE: Curated benchmark scenarios engineered with specific risk patterns
  (e.g., threshold splitting, near duplicate, extreme cost outlier, advance overpayment,
   statutory stall, contractor monopolization, trust cap violation).
- COUNTEREXAMPLE: Curated control scenarios engineered to test false-positive safeguards
  (e.g. proximity without common identity, legitimate school vs water projects).
- NORMAL_REFERENCE: Unlabeled baseline administrative records from realistic procedural distributions.

IMPORTANT DISCLAIMER:
Benchmark labels are synthetic and calibrated strictly for scientific verification and
reproducibility. They DO NOT represent official government audit findings, fraud determinations,
or administrative adjudications.
"""

from enum import Enum
from typing import Dict, Any, List, Optional


class BenchmarkLabel(str, Enum):
    ANOMALY_CASE = "ANOMALY_CASE"
    COUNTEREXAMPLE = "COUNTEREXAMPLE"
    NORMAL_REFERENCE = "NORMAL_REFERENCE"


# Ground-truth scenario catalog for synthetic demo cases
KNOWN_BENCHMARK_CASES: Dict[str, Dict[str, Any]] = {
    # Reference Normal
    "WS/DEMO/2025/001": {
        "label": BenchmarkLabel.COUNTEREXAMPLE,
        "scenario": "NORMAL_REFERENCE_CONTROL",
        "description": "Normal ongoing community center; on-schedule progress (65%), proportionate disbursement (60%), verified photos.",
        "expected_risk_band": "LOW",
        "expected_score_approx": 18.0
    },
    # Case 2: Milestone Stall Benchmark
    "WS/DEMO/2025/101": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "STATUTORY_STALL",
        "description": "Varanasi link road; 420 days elapsed since sanction, only 15% physical progress (violates 365-day guideline).",
        "expected_risk_band": "HIGH",
        "expected_score_approx": 61.0
    },
    # Case 3: Potential Threshold Clustering Signal (Splitting under 10L)
    "WS/DEMO/2025/102": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "THRESHOLD_SPLITTING",
        "description": "Forbesganj road sanctioned at ₹9.90L within 3 days of contiguous road segment 103 (potential tender-splitting).",
        "expected_risk_band": "HIGH",
        "expected_score_approx": 68.0
    },
    "WS/DEMO/2025/103": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "THRESHOLD_SPLITTING",
        "description": "Forbesganj road sanctioned at ₹9.95L in same village within 3 days of 102.",
        "expected_risk_band": "HIGH",
        "expected_score_approx": 84.0
    },
    # Scenario B: Co-located Near-Duplicate Asset
    "WS/DEMO/2025/201": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "NEAR_DUPLICATE",
        "description": "Community hall sanctioned at Rampur ground; co-located with 202 at ~70m with 91% description overlap.",
        "expected_risk_band": "HIGH",
        "expected_score_approx": 75.0
    },
    "WS/DEMO/2025/202": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "NEAR_DUPLICATE",
        "description": "Multipurpose hall sanctioned at same ground within 6 months of 201.",
        "expected_risk_band": "CRITICAL",
        "expected_score_approx": 95.0
    },
    # Scenario C: Severe Unit Cost Outlier
    "WS/DEMO/2025/301": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "COST_OUTLIER",
        "description": "PCC road in South Andamans sanctioned at ₹18.4L for 180m (unit cost > ₹10k/m vs median ₹2.1k/m).",
        "expected_risk_band": "HIGH",
        "expected_score_approx": 68.0
    },
    # Scenario D: Front-Loaded Advance Overpayment
    "WS/DEMO/2025/401": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "ADVANCE_OVERPAYMENT",
        "description": "RO water treatment plant in Pune; 90% funds disbursed, 10% progress after 240 days.",
        "expected_risk_band": "HIGH",
        "expected_score_approx": 73.0
    },
    # Scenario E: Multi-Signal Compound Risk
    "WS/DEMO/2025/501": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "MULTI_SIGNAL_HIGH_RISK",
        "description": "Health center in Varanasi; 495 days elapsed, 5% progress, 90.5% disbursed, missing completion photo.",
        "expected_risk_band": "CRITICAL",
        "expected_score_approx": 86.0
    },
    # Scenario G: Statutory Trust and Society Cap Exceeded
    "WS/DEMO/2025/701": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "TRUST_SOCIETY_CAP",
        "description": "MP allocates ₹1.15 Cr across charitable trust works, breaching the ₹75 Lakh statutory policy ceiling.",
        "expected_risk_band": "CRITICAL",
        "expected_score_approx": 95.0
    },
    "WS/DEMO/2025/702": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "TRUST_SOCIETY_CAP",
        "description": "Second phase trust allocation contributing to ₹1.15 Cr aggregate.",
        "expected_risk_band": "CRITICAL",
        "expected_score_approx": 95.0
    },
    "WS/DEMO/2025/703": {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "TRUST_SOCIETY_CAP",
        "description": "Third phase trust allocation contributing to ₹1.15 Cr aggregate.",
        "expected_risk_band": "CRITICAL",
        "expected_score_approx": 95.0
    },
    # Counterexamples: Proximity != Duplicate
    "WS/DEMO/2025/801": {
        "label": BenchmarkLabel.COUNTEREXAMPLE,
        "scenario": "COUNTEREXAMPLE_PROXIMITY_CONTROL",
        "description": "Primary school classrooms in Lucknow, 175m from 802. Distinct category, vendor, and purpose.",
        "expected_risk_band": "LOW",
        "expected_score_approx": 22.0
    },
    "WS/DEMO/2025/802": {
        "label": BenchmarkLabel.COUNTEREXAMPLE,
        "scenario": "COUNTEREXAMPLE_PROXIMITY_CONTROL",
        "description": "Solar drinking water system in Lucknow, 175m from 801. Distinct category, vendor, and purpose.",
        "expected_risk_band": "LOW",
        "expected_score_approx": 28.0
    },
}

# Populate Vendor Monopoly Cluster (WS/DEMO/2025/600 .. 611)
for _k in range(12):
    _wid = f"WS/DEMO/2025/6{_k:02d}"
    KNOWN_BENCHMARK_CASES[_wid] = {
        "label": BenchmarkLabel.ANOMALY_CASE,
        "scenario": "VENDOR_MONOPOLY",
        "description": f"Cluster of 12 works in South Andamans monopolized by M/s Apex Infra Projects (HHI > 1800).",
        "expected_risk_band": "CRITICAL",
        "expected_score_approx": 93.0
    }


def get_ground_truth_label(work_id: str) -> BenchmarkLabel:
    """
    Returns explicit ground truth label for benchmark evaluation.
    """
    if work_id in KNOWN_BENCHMARK_CASES:
        return KNOWN_BENCHMARK_CASES[work_id]["label"]
    return BenchmarkLabel.NORMAL_REFERENCE
