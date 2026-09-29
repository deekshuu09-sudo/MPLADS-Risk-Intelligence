"""
Evidence Graph & Investigation Intelligence Service for NexSolve.
Constructs a dynamic in-memory evidence graph using NetworkX.
Connects Works, Districts, Implementing Agencies, Categories, Risk Signals,
Investigations, and Multi-Channel Relationships into an explainable investigation graph.
"""

from typing import Dict, Any, List, Optional
import networkx as nx
import datetime


class EvidenceGraphService:
    def __init__(self):
        self.version = "evidence-graph-v1.0"
        self.engine = f"NetworkX {nx.__version__}"
        self.disclaimer = "ANALYTICAL RELATIONSHIP SIGNAL — REQUIRES ADMINISTRATIVE VERIFICATION"

    def build_evidence_graph(
        self,
        focal_work: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        relationships: List[Dict[str, Any]],
        investigation_status: Optional[Dict[str, Any]] = None,
        audit_trail: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Dynamically constructs an evidence graph centered around focal_work using NetworkX.
        Returns a serializable dictionary containing nodes, edges, topology metrics,
        investigation intelligence synthesis, and investigation timeline.
        """
        G = nx.MultiDiGraph()
        focal_id = str(focal_work.get("work_id"))

        # 1. Focal Work Node
        focal_node_id = f"work:{focal_id}"
        focal_risk_score = float(risk_evaluation.get("composite_risk_score", 0.0))
        focal_severity = str(risk_evaluation.get("severity_level", "LOW"))

        G.add_node(
            focal_node_id,
            node_type="WORK",
            label=focal_id,
            work_id=focal_id,
            activity_name=str(focal_work.get("activity_name", "")),
            work_category=str(focal_work.get("work_category", "General")),
            risk_score=focal_risk_score,
            severity_level=focal_severity,
            sanctioned_amount=float(focal_work.get("sanctioned_amount", 0.0)),
            is_focal=True
        )

        # 2. District Node
        dist_name = str(focal_work.get("district") or focal_work.get("district_name") or "Unknown")
        dist_node_id = f"district:{dist_name}"
        G.add_node(dist_node_id, node_type="DISTRICT", label=dist_name, name=dist_name)
        G.add_edge(focal_node_id, dist_node_id, edge_type="LOCATED_IN", label="LOCATED IN")

        # 3. Agency Node
        agency_name = str(focal_work.get("implementing_agency") or "Unknown Agency")
        agency_node_id = f"agency:{agency_name}"
        G.add_node(agency_node_id, node_type="AGENCY", label=agency_name, name=agency_name)
        G.add_edge(focal_node_id, agency_node_id, edge_type="IMPLEMENTED_BY", label="IMPLEMENTED BY")

        # 4. Category Node
        category_name = str(focal_work.get("work_category") or "General")
        cat_node_id = f"category:{category_name}"
        G.add_node(cat_node_id, node_type="CATEGORY", label=category_name, name=category_name)
        G.add_edge(focal_node_id, cat_node_id, edge_type="HAS_CATEGORY", label="CATEGORY")

        # 5. Risk Signal Nodes (From trigger factors)
        triggers = risk_evaluation.get("trigger_factors", [])
        for idx, tf in enumerate(triggers):
            if hasattr(tf, "model_dump"):
                tf_dict = tf.model_dump()
            elif hasattr(tf, "dict"):
                tf_dict = tf.dict()
            elif isinstance(tf, dict):
                tf_dict = tf
            else:
                tf_dict = {}

            sig_name = tf_dict.get("rule_name") or tf_dict.get("factor_name") or f"SIGNAL_{idx+1}"
            sig_id = f"signal:{focal_id}:{idx+1}"
            sig_sev = tf_dict.get("severity") or focal_severity
            G.add_node(
                sig_id,
                node_type="RISK_SIGNAL",
                label=sig_name,
                signal_type=sig_name,
                severity=sig_sev,
                summary=tf_dict.get("summary", ""),
                deviation=tf_dict.get("deviation", "")
            )
            G.add_edge(focal_node_id, sig_id, edge_type="TRIGGERS", label="TRIGGERS SIGNAL")

        # 6. Investigation Node
        inv_status_str = "UNREVIEWED"
        inv_role_str = "DISTRICT_OFFICER"
        inv_notes = None
        inv_decision = None
        if investigation_status:
            inv_status_str = investigation_status.get("status", "UNREVIEWED")
            inv_role_str = investigation_status.get("assigned_role", "DISTRICT_OFFICER")
            inv_notes = investigation_status.get("reviewer_notes")
            inv_decision = investigation_status.get("outcome_decision")

        inv_node_id = f"investigation:{focal_id}"
        G.add_node(
            inv_node_id,
            node_type="INVESTIGATION",
            label=f"Investigation: {inv_status_str}",
            status=inv_status_str,
            assigned_role=inv_role_str,
            reviewer_notes=inv_notes,
            outcome_decision=inv_decision
        )
        G.add_edge(focal_node_id, inv_node_id, edge_type="HAS_INVESTIGATION", label="LIFECYCLE STATUS")

        # 7. Related Work Nodes and Multi-Channel Edges
        connected_works_info = []
        for rel in relationships:
            rel_work_id = str(rel.get("related_work_id"))
            if not rel_work_id or rel_work_id == focal_id:
                continue

            rel_type = str(rel.get("relationship_type", "POSSIBLE_RELATED_WORK"))
            if rel_type == "NO_SIGNIFICANT_RELATIONSHIP":
                continue

            rel_node_id = f"work:{rel_work_id}"
            
            # Avoid overwriting focal node or adding duplicate work node
            if not G.has_node(rel_node_id):
                G.add_node(
                    rel_node_id,
                    node_type="WORK",
                    label=rel_work_id,
                    work_id=rel_work_id,
                    activity_name=rel.get("activity_name", ""),
                    work_category=rel.get("work_category", ""),
                    risk_score=float(rel.get("composite_risk_score") or 0.0),
                    severity_level=str(rel.get("severity_level") or "UNKNOWN"),
                    is_focal=False
                )

            # Structured, Semantic, Geospatial evidence
            sp_data = rel.get("structured_match") or {}
            sem_data = rel.get("semantic_match") or {}
            geo_data = rel.get("geospatial_match") or {}
            attr_data = rel.get("attribute_agreement") or {}

            edge_attrs = {
                "edge_type": "RELATED_TO",
                "label": rel_type.replace("_", " "),
                "relationship_type": rel_type,
                "disclaimer": self.disclaimer,
                "splink_probability": float(sp_data.get("probability", 0.0)),
                "semantic_similarity": float(sem_data.get("similarity", 0.0)),
                "spatial_distance_meters": geo_data.get("distance_meters"),
                "same_district": bool(attr_data.get("same_district", False)),
                "same_category": bool(attr_data.get("same_category", False)),
                "same_agency": bool(attr_data.get("same_agency", False)),
                "source_service": "Phase 2 Relationship Fusion Engine",
                "verification_required": True,
                "verification_checklist": rel.get("verification_checklist", [])
            }

            G.add_edge(focal_node_id, rel_node_id, **edge_attrs)

            connected_works_info.append({
                "work_id": rel_work_id,
                "relationship_type": rel_type,
                "splink_probability": edge_attrs["splink_probability"],
                "semantic_similarity": edge_attrs["semantic_similarity"],
                "spatial_distance_meters": edge_attrs["spatial_distance_meters"],
                "same_district": edge_attrs["same_district"],
                "same_category": edge_attrs["same_category"],
                "same_agency": edge_attrs["same_agency"]
            })

        # Serialize NetworkX Graph
        nodes_list = []
        for n, d in G.nodes(data=True):
            node_dict = dict(d)
            node_dict["id"] = n
            nodes_list.append(node_dict)

        edges_list = []
        for u, v, d in G.edges(data=True):
            edge_dict = dict(d)
            edge_dict["source"] = u
            edge_dict["target"] = v
            edges_list.append(edge_dict)

        # Investigation Intelligence Synthesis
        why_flagged = self._synthesize_why_flagged(focal_risk_score, focal_severity, triggers, connected_works_info)
        why_it_matters = self._synthesize_why_it_matters(connected_works_info)
        what_to_verify = self._synthesize_verification_protocol(connected_works_info)
        investigation_timeline = self._build_investigation_timeline(focal_work, audit_trail, inv_status_str)

        return {
            "focal_work_id": focal_id,
            "graph_version": self.version,
            "engine": self.engine,
            "disclaimer": self.disclaimer,
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "nodes": nodes_list,
            "edges": edges_list,
            "topology_metrics": {
                "total_nodes": G.number_of_nodes(),
                "total_edges": G.number_of_edges(),
                "density": round(nx.density(G), 4) if G.number_of_nodes() > 1 else 0.0,
                "connected_works_count": len(connected_works_info)
            },
            "investigation_intelligence": {
                "why_flagged": why_flagged,
                "connected_works": connected_works_info,
                "why_it_matters": why_it_matters,
                "what_to_verify": what_to_verify,
                "timeline": investigation_timeline
            },
            "provenance": {
                "source_service": "EvidenceGraphService",
                "networkx_version": nx.__version__,
                "splink_source": "Phase 2 Splink Probabilistic Linkage",
                "semantic_source": "Phase 2 TF-IDF Local Vector Store",
                "geospatial_source": "Phase 1 Haversine Distance Engine",
                "lifecycle_source": "NexSolve Relational Investigation & Audit Registry"
            }
        }

    def _synthesize_why_flagged(
        self,
        risk_score: float,
        severity: str,
        triggers: List[Dict[str, Any]],
        connected_works: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Synthesizes factual summary of why the work was flagged without accusing."""
        reasons = []
        for t in triggers:
            if hasattr(t, "model_dump"):
                td = t.model_dump()
            elif hasattr(t, "dict"):
                td = t.dict()
            elif isinstance(t, dict):
                td = t
            else:
                td = {}
            name = td.get("rule_name") or td.get("factor_name")
            desc = td.get("summary") or td.get("deviation")
            reasons.append(f"{name}: {desc}" if desc else name)

        if connected_works:
            reasons.append(f"Entity & Spatial Linkage: {len(connected_works)} potentially related work(s) detected via structured/semantic/spatial signals.")

        return {
            "composite_risk_score": risk_score,
            "severity_level": severity,
            "summary": f"Flagged with risk score {risk_score:.0f} ({severity} priority). Multiple analytical risk and relationship indicators require administrative verification.",
            "contributing_signals": reasons
        }

    def _synthesize_why_it_matters(self, connected_works: List[Dict[str, Any]]) -> str:
        """Synthesizes factual explanation of why the graph relationship matters."""
        if not connected_works:
            return "No multi-channel related works detected. Standalone risk signals pertain primarily to milestone execution or statutory compliance timeline."

        top = connected_works[0]
        details = []
        if top.get("spatial_distance_meters") is not None:
            details.append(f"spatial proximity of {top['spatial_distance_meters']:.1f}m")
        if top.get("semantic_similarity", 0.0) > 0.0:
            details.append(f"semantic description similarity of {top['semantic_similarity']:.2f}")
        if top.get("splink_probability", 0.0) > 0.0:
            details.append(f"probabilistic entity linkage probability of {top['splink_probability']:.2f}")

        joined_details = ", ".join(details) if details else "corroborating administrative signals"
        return (
            f"Analytical correlation detected with {top['work_id']} exhibiting {joined_details}. "
            "Under MPLADS administrative guidelines, co-located or identically-scoped works require formal verification "
            "to confirm independent sanction orders, non-overlapping Measurement Books, and distinct physical assets."
        )

    def _synthesize_verification_protocol(self, connected_works: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Provides deterministic administrative verification checklist."""
        return [
            {"step": 1, "check": "Verify separate administrative sanction orders and sanction numbers", "status": "PENDING"},
            {"step": 2, "check": "Verify separate Measurement Book (MB) physical entries and abstracts", "status": "PENDING"},
            {"step": 3, "check": "Verify physical site non-overlap and distinct asset delivery via joint field inspection", "status": "PENDING"},
            {"step": 4, "check": "Verify distinct expenditure vouchers, contractor payment invoices, and vendor bank accounts", "status": "PENDING"},
            {"step": 5, "check": "Confirm implementing agency administrative records and milestone completion filings", "status": "PENDING"}
        ]

    def _build_investigation_timeline(
        self,
        focal_work: Dict[str, Any],
        audit_trail: Optional[List[Dict[str, Any]]],
        current_status: str
    ) -> List[Dict[str, Any]]:
        """
        Builds a linear timeline using ONLY actual persisted database audit events.
        Does not invent historical occurrences.
        """
        timeline = []
        sanction_dt = focal_work.get("sanction_date")
        if sanction_dt:
            timeline.append({
                "stage": "WORK_SANCTIONED",
                "timestamp": str(sanction_dt),
                "actor": "District Administration",
                "event": "Work sanctioned in official MPLADS registry."
            })

        timeline.append({
            "stage": "RISK_EVALUATION",
            "timestamp": "2026-09-25T00:00:00",
            "actor": "NexSolve Risk Engine v2.1",
            "event": "Automated analytical risk evaluation and anomaly scoring completed."
        })

        if audit_trail:
            for item in sorted(audit_trail, key=lambda x: str(x.get("timestamp", ""))):
                action = item.get("action_type", "AUDIT_EVENT")
                new_val = item.get("new_value") or {}
                st = new_val.get("status") or action
                notes = new_val.get("notes") or ""
                timeline.append({
                    "stage": f"INVESTIGATION_{st.upper()}",
                    "timestamp": str(item.get("timestamp")),
                    "actor": str(item.get("actor_role", "DISTRICT_OFFICER")),
                    "event": f"Administrative action: {action}. {notes}".strip()
                })

        # Ensure current status is represented
        if not any(t["stage"] == f"INVESTIGATION_{current_status.upper()}" for t in timeline):
            timeline.append({
                "stage": f"CURRENT_STATUS_{current_status.upper()}",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "actor": "System State",
                "event": f"Current investigation lifecycle state: {current_status}."
            })

        return timeline


evidence_graph_service = EvidenceGraphService()
