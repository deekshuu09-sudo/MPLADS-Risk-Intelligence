import numpy as np
import pandas as pd
from typing import List, Dict, Any
import pyod
from pyod.models.ecod import ECOD
from pyod.models.copod import COPOD
from pyod.models.iforest import IForest

class PyODEngine:
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.version = f"pyod-v{pyod.__version__}"
        self.config_version = "pyod-v1.0"
        self.contamination = contamination
        self.random_state = random_state

        # Initialize multi-detector ensemble
        self.ecod = ECOD(contamination=contamination)
        self.copod = COPOD(contamination=contamination)
        self.iforest = IForest(contamination=contamination, random_state=random_state)

    def fit_and_score_ensemble(self, works_data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Executes multi-detector PyOD analysis (ECOD, COPOD, IForest) on normalized work attributes.
        Returns a mapping of work_id -> PyOD detection results without mutating primary risk scores.
        """
        results: Dict[str, Dict[str, Any]] = {}
        if len(works_data) < 10:
            return results

        feature_matrix = []
        valid_ids = []

        feature_names = ["sanctioned_amount", "disbursed_pct", "days_elapsed", "physical_progress_pct"]

        for w in works_data:
            amt = float(w.get("sanctioned_amount", 0.0)) or 10000.0
            disbursed = float(w.get("actual_amount", 0.0)) or 0.0
            days = float(w.get("days_elapsed", 0))
            prog = float(w.get("physical_progress_pct", 0.0))

            disb_pct = (disbursed / amt * 100.0) if amt > 0 else 0.0

            feature_matrix.append([amt, disb_pct, days, prog])
            valid_ids.append(w["work_id"])

        X = np.array(feature_matrix)

        try:
            # 1. ECOD (Empirical Cumulative Distribution Functions)
            self.ecod.fit(X)
            ecod_scores_raw = self.ecod.decision_scores_
            ecod_min, ecod_max = ecod_scores_raw.min(), ecod_scores_raw.max()
            ecod_range = ecod_max - ecod_min if ecod_max != ecod_min else 1.0

            # 2. COPOD (Copula-Based Outlier Detection)
            self.copod.fit(X)
            copod_scores_raw = self.copod.decision_scores_
            copod_min, copod_max = copod_scores_raw.min(), copod_scores_raw.max()
            copod_range = copod_max - copod_min if copod_max != copod_min else 1.0

            # 3. Isolation Forest
            self.iforest.fit(X)
            iforest_scores_raw = self.iforest.decision_scores_
            iforest_min, iforest_max = iforest_scores_raw.min(), iforest_scores_raw.max()
            iforest_range = iforest_max - iforest_min if iforest_max != iforest_min else 1.0

            for idx, wid in enumerate(valid_ids):
                e_norm = float((ecod_scores_raw[idx] - ecod_min) / ecod_range)
                c_norm = float((copod_scores_raw[idx] - copod_min) / copod_range)
                i_norm = float((iforest_scores_raw[idx] - iforest_min) / iforest_range)

                ensemble_norm = round((e_norm + c_norm + i_norm) / 3.0, 3)

                results[wid] = {
                    "work_id": wid,
                    "ensemble_normalized_score": ensemble_norm,
                    "detectors": {
                        "ECOD": {"raw_score": round(float(ecod_scores_raw[idx]), 4), "normalized_score": round(e_norm, 3)},
                        "COPOD": {"raw_score": round(float(copod_scores_raw[idx]), 4), "normalized_score": round(c_norm, 3)},
                        "IForest": {"raw_score": round(float(iforest_scores_raw[idx]), 4), "normalized_score": round(i_norm, 3)}
                    },
                    "features": feature_names,
                    "config_version": self.config_version,
                    "pyod_version": self.version
                }
        except Exception as err:
            for wid in valid_ids:
                results[wid] = {
                    "work_id": wid,
                    "ensemble_normalized_score": 0.20,
                    "detectors": {},
                    "features": feature_names,
                    "error": str(err),
                    "config_version": self.config_version,
                    "pyod_version": self.version
                }

        return results

pyod_engine = PyODEngine()
