import datetime
from typing import List, Dict, Any, Tuple
import pandas as pd
import pandera as pa
from pandera import Column, Check, DataFrameSchema
from pandera.errors import SchemaError

# Define Pandera DataFrame Schema for Canonical Work Records
work_dataframe_schema = DataFrameSchema(
    columns={
        "work_id": Column(str, nullable=False),
        "sanctioned_amount": Column(float, Check.ge(0.0), nullable=False),
        "actual_amount": Column(float, Check.ge(0.0), nullable=False),
        "physical_progress_pct": Column(float, Check(lambda s: s.between(0.0, 100.0)), nullable=False),
        "latitude": Column(float, Check(lambda s: s.between(-90.0, 90.0)), nullable=True),
        "longitude": Column(float, Check(lambda s: s.between(-180.0, 180.0)), nullable=True),
        "work_category": Column(str, nullable=False),
        "work_status": Column(str, nullable=False),
        "sanction_date": Column(pd.Timestamp, nullable=True, required=False),
        "actual_end_date": Column(pd.Timestamp, nullable=True, required=False)
    },
    checks=[
        Check(
            lambda df: ("actual_end_date" not in df.columns) or ("sanction_date" not in df.columns) or (df["actual_end_date"].isnull()) | (df["sanction_date"].isnull()) | (df["actual_end_date"] >= df["sanction_date"]),
            name="valid_date_ordering",
            ignore_na=True
        )
    ],
    coerce=True
)

class DataValidator:
    def __init__(self):
        self.schema = work_dataframe_schema
        self.version = f"pandera-v{pa.__version__}"

    def validate_works_dataframe(self, works_data: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Validates canonical work records against the Pandera schema.
        Returns (is_valid, list_of_error_dicts). Does NOT mutate original data.
        """
        if not works_data:
            return True, []

        df = pd.DataFrame(works_data)
        errors = []

        try:
            self.schema.validate(df, lazy=True)
            return True, []
        except pa.errors.SchemaErrors as err:
            for failure in err.failure_cases.to_dict(orient="records"):
                errors.append({
                    "field": str(failure.get("column", "")),
                    "value": str(failure.get("failure_case", "")),
                    "rule": str(failure.get("check", "")),
                    "index": failure.get("index"),
                    "severity": "ERROR"
                })
            return False, errors
        except Exception as e:
            return False, [{"field": "global", "value": str(e), "rule": "schema_validation", "severity": "CRITICAL"}]

data_validator = DataValidator()
