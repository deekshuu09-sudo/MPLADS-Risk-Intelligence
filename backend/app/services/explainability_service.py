from typing import List, Dict, Any, Optional

class ExplainabilityService:
    @staticmethod
    def generate_narrative(
        work_id: str,
        category: str,
        composite_score: float,
        severity: str,
        trigger_factors: List[Dict[str, Any]],
        baseline_metrics: Dict[str, Any]
    ) -> str:
        """
        Generates an objective, non-accusatory administrative explanation.
        """
        if not trigger_factors or composite_score < 40.0:
            return "Nominal project telemetry. Telemetry corresponds to normal administrative baseline thresholds."

        primary = trigger_factors[0]
        factor_desc = primary.get("summary", "")

        narrative_parts = [
            f"This project has been flagged with a {severity} Risk Indicator (Composite Score: {composite_score}/100)."
        ]

        if len(trigger_factors) == 1:
            narrative_parts.append(f"Primary risk indicator: {factor_desc}")
        else:
            narrative_parts.append(f"Primary risk indicator: {factor_desc}")
            other_factors = [f.get("factor_name", "") for f in trigger_factors[1:] if f.get("factor_name")]
            if other_factors:
                narrative_parts.append(f"Corroborating indicators identified: {', '.join(other_factors)}.")

        narrative_parts.append("Verification recommended to inspect physical measurement records and validate on-ground progress.")
        return " ".join(narrative_parts)

    @staticmethod
    def generate_evidence_statements(
        trigger_factors: List[Dict[str, Any]],
        work_data: Dict[str, Any],
        contributions: Dict[str, int]
    ) -> List[str]:
        """
        Generates 2 to 4 concise, objective evidence statements explaining
        WHY this project was flagged, using strictly neutral administrative terminology.
        """
        statements = []

        # 1. Execution delay evidence
        days = work_data.get("days_elapsed", 0)
        progress = work_data.get("physical_progress_pct", 0.0)
        status = work_data.get("work_status", "")

        if days > 365 and status != "Completed":
            statements.append(f"Work execution age ({days} days) exceeds guideline-derived completion benchmark (365 days) with {progress}% progress.")
        elif days > 200 and progress < 25.0 and status != "Completed":
            statements.append(f"Physical progress ({progress}%) is low relative to elapsed execution time ({days} days).")
        elif contributions.get("Execution Delay", 0) > 10:
            statements.append(f"Milestone execution schedule indicates lag relative to sanctioned timeframe ({days} days elapsed).")

        # 2. Financial / Unit Cost evidence
        amt = work_data.get("sanctioned_amount", 0.0)
        cost_trigger = next((f for f in trigger_factors if f.get("engine") == "COST_OUTLIER"), None)
        if cost_trigger:
            var_pct = cost_trigger.get("variance_pct", "")
            base_val = cost_trigger.get("baseline_value", "")
            statements.append(f"Sanctioned unit cost (₹{round(amt/100000, 2)}L) exhibits variance of {var_pct} relative to district category median.")
        elif contributions.get("Financial Deviation", 0) > 12:
            statements.append(f"Sanctioned amount falls in upper percentile band for {work_data.get('work_category', 'this category')}.")

        # 3. Progress vs Disbursement gap
        disbursed = work_data.get("actual_amount", 0.0)
        disbursed_pct = (disbursed / amt * 100.0) if amt > 0 else 0.0
        gap = round(disbursed_pct - progress, 1)
        if gap > 25.0:
            statements.append(f"Disbursed expenditure ({round(disbursed_pct, 1)}%) exceeds reported physical progress ({progress}%) by +{gap}% gap.")

        # 4. Duplicate / Spatial proximity evidence
        dup_trigger = next((f for f in trigger_factors if f.get("engine") in ("NEAR_DUPLICATE", "THRESHOLD_SPLITTING")), None)
        if dup_trigger:
            if dup_trigger.get("engine") == "THRESHOLD_SPLITTING":
                statements.append("Multiple contiguous works sanctioned within short window just below ₹10L (Configured detection parameters: Spatial < 500 m / Financial ₹10L).")
            else:
                statements.append("Similar sanctioned works exist within the same geographic radius (< 500m).")

        # 5. Vendor / Category pattern evidence
        if any(f.get("engine") == "VENDOR_MONOPOLY" for f in trigger_factors):
            statements.append("Contractor allocation exceeds competitive market concentration thresholds in the district.")
        if any(f.get("engine") == "TRUST_SOCIETY_CAP" for f in trigger_factors):
            statements.append("Cumulative MP allocation to registered society exceeds the configured ₹75 Lakh policy ceiling.")
        if any(f.get("engine") == "PHOTO_COMPLIANCE" for f in trigger_factors):
            statements.append("Geo-tagged completion photograph missing prior to final disbursement voucher release.")

        # If baseline or few statements, ensure 2-3 credible statements
        if not statements:
            if status == "Completed":
                statements.append("Asset physically completed; financial reconciliation and asset tagging nominal.")
                statements.append("Unit expenditure is consistent with standard schedule of rates.")
            else:
                statements.append("Work progress is progressing within configured milestone schedule.")
                statements.append("Fund disbursement corresponds to reported physical stage completion.")

        return statements[:4]

    @staticmethod
    def generate_recommended_action(trigger_factors: List[Dict[str, Any]], composite_score: float) -> str:
        """
        Recommends appropriate administrative next steps without claiming misconduct.
        """
        engines = {f.get("engine") for f in trigger_factors}

        if "NEAR_DUPLICATE" in engines or "THRESHOLD_SPLITTING" in engines:
            return "Field verification recommended: Compare against geographically similar works on site."
        elif "COST_OUTLIER" in engines:
            return "Review supporting expenditure documents: Examine Measurement Book (MB) and Schedule of Rates."
        elif "ADVANCE_OVERPAYMENT" in engines:
            return "Stage-wise payment audit recommended: Reconcile disbursement vouchers with physical site status."
        elif "STATUTORY_STALL" in engines:
            return "Execution milestone notice: Request progress status report from Implementing Agency."
        elif composite_score >= 65.0:
            return "Administrative review recommended: Schedule routine district engineer inspection."
        else:
            return "Routine monitoring: Proceed with standard periodic milestone tracking."

    @staticmethod
    def generate_verification_checklist(trigger_factors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Constructs tailored prescriptive field verification actions based on active triggers.
        """
        steps = []
        step_no = 1
        engines_triggered = {f.get("engine") for f in trigger_factors}

        if "COST_OUTLIER" in engines_triggered:
            steps.append({
                "step_no": step_no,
                "action": "Measurement Book (MB) & Schedule of Rates (SOR) Audit",
                "details": "Examine technical estimate and Measurement Book entries to verify whether applied rates match current PWD Schedule of Rates or if quantities were inflated.",
                "evidence_required": ["Measurement Book (MB) Entries", "PWD Schedule of Rates Comparative Sheet", "Detailed Technical Estimate"],
                "status": "PENDING"
            })
            step_no += 1

        if "NEAR_DUPLICATE" in engines_triggered or "THRESHOLD_SPLITTING" in engines_triggered:
            steps.append({
                "step_no": step_no,
                "action": "Co-location Geo-spatial Survey",
                "details": "Dispatch a field verification team with GPS cameras to cross-reference physical coordinates and confirm that no duplicate asset was sanctioned on the same parcel.",
                "evidence_required": ["GPS-Tagged Site Photographs", "Asset Geo-Coordinates Register", "Cadastral Land Parcel Records"],
                "status": "PENDING"
            })
            step_no += 1

        if "STATUTORY_STALL" in engines_triggered:
            steps.append({
                "step_no": step_no,
                "action": "Execution Delay Inquiry with Implementing Agency",
                "details": "Issue formal compliance notice to the assigned Executive Engineer requesting reason for exceeding 365-day benchmark and milestone non-achievement.",
                "evidence_required": ["Implementing Agency Execution Status Report", "Executive Engineer Delay Justification", "Revised Milestone Schedule"],
                "status": "PENDING"
            })
            step_no += 1

        if "ADVANCE_OVERPAYMENT" in engines_triggered:
            steps.append({
                "step_no": step_no,
                "action": "Stage-wise Payment Voucher & Site Verification",
                "details": "Verify physical foundation status before permitting further fund releases; ensure advance payments comply with stage-completion certificate requirements.",
                "evidence_required": ["Stage-Completion Certificate", "Disbursement Vouchers", "Physical Foundation Inspection Report"],
                "status": "PENDING"
            })
            step_no += 1

        if "VENDOR_MONOPOLY" in engines_triggered:
            steps.append({
                "step_no": step_no,
                "action": "Procurement & Tendering Process Scrutiny",
                "details": "Review tender participation records and quotation comparative statements to confirm competitive bidding rules were strictly enforced.",
                "evidence_required": ["Tender / Quotation Comparative Statement", "Bidder Technical Evaluation Matrix", "Contract Award Notification"],
                "status": "PENDING"
            })
            step_no += 1

        if "TRUST_SOCIETY_CAP" in engines_triggered:
            steps.append({
                "step_no": step_no,
                "action": "Trust Policy Limit Ledger Reconciliation",
                "details": "Reconcile district MPLADS allocation ledger to ensure cumulative sanctions to the trust do not violate the configured ₹75 Lakh ceiling.",
                "evidence_required": ["District MPLADS Society Sanction Ledger", "Society Registration & KYC Records", "Audit Utilization Certificate"],
                "status": "PENDING"
            })
            step_no += 1

        # Default fallback step if generic
        if not steps:
            steps.append({
                "step_no": 1,
                "action": "Routine Milestone Check",
                "details": "Verify physical progress entry against quarterly inspection reports submitted by District Planning Officer.",
                "evidence_required": ["Quarterly Progress Inspection Report", "District Engineer Field Verification Note"],
                "status": "PENDING"
            })

        return steps

explainability_service = ExplainabilityService()
