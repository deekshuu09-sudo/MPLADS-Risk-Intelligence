import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

class StatisticalEngine:
    def __init__(self):
        # Cache for category baselines
        self.category_baselines: Dict[str, Dict[str, float]] = {}

    def compute_baselines(self, works_data: List[Dict[str, Any]]):
        """
        Pre-computes median, MAD, IQR, P25, P75, P95 per work_category.
        """
        if not works_data:
            return

        df = pd.DataFrame(works_data)
        if "work_category" not in df.columns or "sanctioned_amount" not in df.columns:
            return

        for category, group in df.groupby("work_category"):
            amounts = group["sanctioned_amount"].dropna().values
            if len(amounts) < 3:
                continue

            med = float(np.median(amounts))
            mad = float(np.median(np.abs(amounts - med)))
            if mad == 0:
                mad = float(np.std(amounts)) or 1.0

            p25 = float(np.percentile(amounts, 25))
            p75 = float(np.percentile(amounts, 75))
            p95 = float(np.percentile(amounts, 95))
            iqr = p75 - p25

            self.category_baselines[category] = {
                "median": med,
                "mad": mad,
                "p25": p25,
                "p75": p75,
                "p95": p95,
                "iqr": iqr,
                "upper_fence": p75 + 1.5 * iqr,
                "upper_extreme": p75 + 3.0 * iqr,
                "count": len(amounts)
            }

    def evaluate_cost_outlier(self, category: str, amount: float) -> Dict[str, Any]:
        """
        Evaluates an individual work against category statistical baselines.
        Returns:
            - subscore: 0.0 to 100.0
            - z_score: modified z-score
            - baseline_stats: dict of baseline metrics
            - is_outlier: boolean
            - severity: LOW, MEDIUM, HIGH, CRITICAL
        """
        base = self.category_baselines.get(category)
        if not base or base["mad"] == 0:
            # Fallback baseline when insufficient categorical distribution
            return {
                "subscore": 0.0,
                "z_score": 0.0,
                "baseline_stats": {"median": amount, "p25": amount * 0.7, "p75": amount * 1.3, "p95": amount * 1.6},
                "is_outlier": False,
                "severity": "LOW",
                "variance_pct": "+0.0%"
            }

        med = base["median"]
        mad = base["mad"]
        mod_z = 0.6745 * (amount - med) / mad
        variance_pct = ((amount - med) / med) * 100.0

        subscore = 0.0
        severity = "LOW"

        if mod_z > 3.5 or amount > base["upper_extreme"]:
            subscore = min(100.0, 75.0 + min(25.0, (mod_z - 3.5) * 10.0))
            severity = "CRITICAL" if mod_z > 4.5 else "HIGH"
        elif mod_z > 2.0 or amount > base["upper_fence"]:
            subscore = 45.0 + (mod_z - 2.0) * 20.0
            severity = "MEDIUM"
        elif mod_z > 1.2:
            subscore = 20.0 + (mod_z - 1.2) * 15.0
            severity = "LOW"

        return {
            "subscore": round(subscore, 1),
            "z_score": round(mod_z, 2),
            "baseline_stats": {
                "metric_name": "Sanctioned Amount",
                "observed": round(amount, 2),
                "p25": round(base["p25"], 2),
                "median": round(med, 2),
                "p75": round(base["p75"], 2),
                "p95": round(base["p95"], 2),
                "z_score": round(mod_z, 2)
            },
            "is_outlier": mod_z > 2.0,
            "severity": severity,
            "variance_pct": f"{'+' if variance_pct >= 0 else ''}{round(variance_pct, 1)}%"
        }

statistical_engine = StatisticalEngine()
