"""
Splink Probabilistic Entity Resolution Service for NexSolve MPLADS Risk Intelligence.
Uses DuckDB linker backend with structured comparison vectors and blocking rules.
"""

import os
import pandas as pd
from typing import List, Dict, Any, Optional
import splink.comparison_library as cl
from splink import Linker, SettingsCreator, block_on, DuckDBAPI

class SplinkLinkerService:
    def __init__(self):
        self.version = "splink-v4.0.9"
        self.config_version = "splink-config-v2.0"
        self.is_trained = False
        self.linker: Optional[Linker] = None

    def _build_settings(self) -> SettingsCreator:
        """Constructs Splink settings with comparisons and blocking rules."""
        return SettingsCreator(
            link_type="dedupe_only",
            comparisons=[
                cl.ExactMatch("work_category"),
                cl.ExactMatch("district_name"),
                cl.LevenshteinAtThresholds("agency_clean", distance_threshold_or_thresholds=2),
                cl.LevenshteinAtThresholds("activity_clean", distance_threshold_or_thresholds=[3, 8]),
            ],
            blocking_rules_to_generate_predictions=[
                block_on("district_name", "work_category"),
                block_on("agency_clean", "district_name"),
            ],
            retain_intermediate_calculation_columns=True
        )

    def prepare_dataframe(self, works_data: List[Dict[str, Any]]) -> pd.DataFrame:
        """Normalizes and prepares works dataframe for Splink execution."""
        records = []
        for w in works_data:
            act = str(w.get("activity_name") or w.get("work_description") or "").lower().strip()
            agency = str(w.get("implementing_agency") or w.get("agency_name") or "unknown").lower().strip()
            records.append({
                "unique_id": str(w["work_id"]),
                "work_id": str(w["work_id"]),
                "activity_name": str(w.get("activity_name") or ""),
                "activity_clean": act if act else "unspecified work",
                "work_category": str(w.get("work_category") or "General"),
                "district_name": str(w.get("district_name") or w.get("district") or "Unknown"),
                "agency_clean": agency if agency else "unknown agency",
                "sanctioned_amount": float(w.get("sanctioned_amount") or 0.0),
                "days_elapsed": float(w.get("days_elapsed") or 365.0),
                "latitude": float(w.get("latitude") or 0.0),
                "longitude": float(w.get("longitude") or 0.0),
            })
        return pd.DataFrame(records)

    def predict_linkages(self, works_data: List[Dict[str, Any]], threshold_match_probability: float = 0.30) -> Dict[str, List[Dict[str, Any]]]:
        """
        Executes Splink record linkage across candidate pairs.
        Returns a mapping of work_id -> list of probabilistic matches with match_probability and comparison details.
        """
        results: Dict[str, List[Dict[str, Any]]] = {}
        if len(works_data) < 2:
            return results

        df = self.prepare_dataframe(works_data)
        settings = self._build_settings()

        try:
            db_api = DuckDBAPI()
            linker = Linker(df, settings, db_api=db_api)
            # Deterministic probability assignments based on comparisons
            predictions_df = linker.inference.predict(threshold_match_probability=threshold_match_probability).as_pandas_dataframe()

            for _, row in predictions_df.iterrows():
                id1 = str(row["unique_id_l"])
                id2 = str(row["unique_id_r"])
                prob = round(float(row.get("match_probability", 0.5)), 4)

                match_info_1 = {
                    "related_work_id": id2,
                    "match_probability": prob,
                    "match_weight": round(float(row.get("match_weight", 0.0)), 2),
                    "blocking_rule": "district_name + work_category",
                    "splink_version": self.version,
                    "config_version": self.config_version,
                    "comparison_details": {
                        "category_match": bool(row.get("gamma_work_category", 0) > 0),
                        "district_match": bool(row.get("gamma_district_name", 0) > 0),
                        "agency_match": bool(row.get("gamma_agency_clean", 0) > 0),
                    }
                }
                match_info_2 = dict(match_info_1)
                match_info_2["related_work_id"] = id1

                results.setdefault(id1, []).append(match_info_1)
                results.setdefault(id2, []).append(match_info_2)

        except Exception as err:
            # Safe fallback if DuckDB/Splink encounters memory or schema constraints
            print(f"[SplinkLinkerService] Warning during predict_linkages: {err}")

        return results

splink_linker = SplinkLinkerService()
