import math
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from sklearn.ensemble import IsolationForest

class MLEngine:
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.model = IsolationForest(
            n_estimators=150,
            contamination=contamination,
            random_state=random_state
        )
        self.is_fitted = False

    def fit_and_score(self, works_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Fits Isolation Forest on multidimensional normalized engineering attributes.
        Returns a mapping of work_id -> anomaly subscore (0.0 to 100.0).
        """
        scores: Dict[str, float] = {}
        if len(works_data) < 10:
            return scores

        feature_matrix = []
        valid_ids = []

        for w in works_data:
            amt = float(w.get("sanctioned_amount", 0.0)) or 10000.0
            est = float(w.get("estimated_cost", 0.0)) or amt
            disbursed = float(w.get("actual_amount", 0.0)) or 0.0
            days = float(w.get("days_elapsed", 0))
            prog = float(w.get("physical_progress_pct", 0.0))

            log_amt = math.log10(max(100.0, amt))
            est_ratio = min(3.0, amt / max(100.0, est))
            disb_ratio = min(2.0, disbursed / max(100.0, amt))
            time_ratio = min(3.0, days / 365.0)
            prog_ratio = min(1.0, prog / 100.0)

            feature_matrix.append([log_amt, est_ratio, disb_ratio, time_ratio, prog_ratio])
            valid_ids.append(w["work_id"])

        X = np.array(feature_matrix)
        try:
            self.model.fit(X)
            self.is_fitted = True
            # decision_function: lower means more anomalous (negative for outliers)
            raw_scores = self.model.decision_function(X)
            # Normalize to 0 to 100 scale where higher = more anomalous
            min_s, max_s = raw_scores.min(), raw_scores.max()
            rng = max_s - min_s if max_s != min_s else 1.0

            for idx, wid in enumerate(valid_ids):
                # Invert: lowest decision score -> 100
                norm_score = (max_s - raw_scores[idx]) / rng * 100.0
                scores[wid] = round(float(norm_score), 1)
        except Exception:
            for wid in valid_ids:
                scores[wid] = 20.0

        return scores

ml_engine = MLEngine()
