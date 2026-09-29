import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
import shap
from sklearn.ensemble import IsolationForest

class SHAPExplainerService:
    def __init__(self, random_state: int = 42):
        self.version = f"shap-v{shap.__version__}"
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None
        self.explainer: Optional[shap.TreeExplainer] = None
        self.feature_names = ["log_sanctioned_amount", "progress_disbursement_gap", "execution_days", "physical_progress_pct"]

    def fit_model_and_explainer(self, works_data: List[Dict[str, Any]]):
        """Fits an underlying Isolation Forest model and builds a SHAP TreeExplainer."""
        if len(works_data) < 10:
            return

        feature_matrix = []
        for w in works_data:
            amt = float(w.get("sanctioned_amount", 0.0)) or 10000.0
            disbursed = float(w.get("actual_amount", 0.0)) or 0.0
            days = float(w.get("days_elapsed", 0))
            prog = float(w.get("physical_progress_pct", 0.0))

            disb_pct = (disbursed / amt * 100.0) if amt > 0 else 0.0
            prog_gap = disb_pct - prog
            log_amt = float(np.log10(max(100.0, amt)))

            feature_matrix.append([log_amt, prog_gap, days, prog])

        X = np.array(feature_matrix)
        self.model = IsolationForest(n_estimators=100, contamination=0.08, random_state=self.random_state)
        self.model.fit(X)

        try:
            self.explainer = shap.TreeExplainer(self.model)
        except Exception:
            self.explainer = None

    def explain_work(self, work_data: Dict[str, Any]) -> Dict[str, Any]:
        """Computes SHAP feature attribution for a single work item."""
        if not self.model or not self.explainer:
            return {
                "shap_available": False,
                "reason": "SHAP explanation unavailable for this detector/model.",
                "feature_contributions": [],
                "disclaimer": "DECISION-SUPPORT PROTOTYPE — NOT AN OFFICIAL MoSPI FINDING"
            }

        amt = float(work_data.get("sanctioned_amount", 0.0)) or 10000.0
        disbursed = float(work_data.get("actual_amount", 0.0)) or 0.0
        days = float(work_data.get("days_elapsed", 0))
        prog = float(work_data.get("physical_progress_pct", 0.0))

        disb_pct = (disbursed / amt * 100.0) if amt > 0 else 0.0
        prog_gap = disb_pct - prog
        log_amt = float(np.log10(max(100.0, amt)))

        x_single = np.array([[log_amt, prog_gap, days, prog]])

        try:
            shap_values = self.explainer.shap_values(x_single)

            # Extract 1D array if 2D/3D matrix returned
            if isinstance(shap_values, list):
                vals = shap_values[0][0]
            elif len(shap_values.shape) == 2:
                vals = shap_values[0]
            else:
                vals = shap_values[0][0]

            contributions = []
            for name, val, raw_v in zip(self.feature_names, vals, [round(log_amt, 2), round(prog_gap, 1), int(days), round(prog, 1)]):
                sv = float(val)
                direction = "increases model decision score" if sv > 0 else "decreases model decision score"
                contributions.append({
                    "feature": name,
                    "observed_value": raw_v,
                    "shap_contribution": round(sv, 4),
                    "direction": direction
                })

            # Sort by absolute impact descending
            contributions.sort(key=lambda c: abs(c["shap_contribution"]), reverse=True)

            return {
                "shap_available": True,
                "shap_version": self.version,
                "feature_contributions": contributions,
                "disclaimer": "DECISION-SUPPORT PROTOTYPE — NOT AN OFFICIAL MoSPI FINDING"
            }
        except Exception as e:
            return {
                "shap_available": False,
                "reason": f"SHAP calculation error: {str(e)}",
                "feature_contributions": [],
                "disclaimer": "DECISION-SUPPORT PROTOTYPE — NOT AN OFFICIAL MoSPI FINDING"
            }

shap_explainer = SHAPExplainerService()
