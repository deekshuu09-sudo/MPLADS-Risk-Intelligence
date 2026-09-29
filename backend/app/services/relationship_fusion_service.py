"""
Relationship Fusion Service for NexSolve MPLADS Risk Intelligence.
Synthesizes structured match probabilities (Splink), semantic description similarity,
and geospatial proximity into a human-reviewable analytical evidence model.
"""

from typing import List, Dict, Any, Optional

class RelationshipFusionService:
    def __init__(self):
        self.version = "fusion-engine-v2.0"
        self.disclaimer = "ANALYTICAL RELATIONSHIP SIGNAL — REQUIRES ADMINISTRATIVE VERIFICATION"

    def classify_relationship(
        self,
        splink_prob: float,
        semantic_sim: float,
        geo_distance_m: Optional[float],
        same_district: bool,
        same_category: bool,
        same_agency: bool
    ) -> str:
        """
        Classifies relationship state into human-in-the-loop categories:
        HIGH_SIMILARITY_REVIEW, LIKELY_RELATED_WORK, POSSIBLE_RELATED_WORK, NO_SIGNIFICANT_RELATIONSHIP.
        """
        # Rule 1: High Similarity Review
        if splink_prob >= 0.85 or (semantic_sim >= 0.80 and geo_distance_m is not None and geo_distance_m <= 500.0):
            return "HIGH_SIMILARITY_REVIEW"

        # Rule 2: Likely Related Work
        if splink_prob >= 0.65 or (semantic_sim >= 0.70 and same_district and same_category):
            return "LIKELY_RELATED_WORK"

        # Rule 3: Possible Related Work
        if (
            splink_prob >= 0.40
            or (semantic_sim >= 0.60 and (same_district or same_category or (geo_distance_m is not None and geo_distance_m <= 5000.0)))
            or (geo_distance_m is not None and geo_distance_m <= 500.0 and same_category)
        ):
            return "POSSIBLE_RELATED_WORK"

        return "NO_SIGNIFICANT_RELATIONSHIP"

    def fuse_work_relationships(
        self,
        target_work: Dict[str, Any],
        candidate_works: List[Dict[str, Any]],
        splink_matches: List[Dict[str, Any]],
        semantic_matches: List[Dict[str, Any]],
        geo_relationships: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Merges Splink, Semantic, and Geospatial signals into relationship evidence objects.
        """
        target_id = str(target_work["work_id"])
        splink_map = {m["related_work_id"]: m for m in splink_matches}
        semantic_map = {m["related_work_id"]: m for m in semantic_matches}
        geo_map = {}
        for m in geo_relationships:
            gid = str(m.get("matched_work_id") or m.get("work_id") or m.get("related_work_id") or "")
            if gid:
                geo_map[gid] = m

        # Collect candidate IDs from all channels
        all_candidate_ids = set(splink_map.keys()) | set(semantic_map.keys()) | set(geo_map.keys())
        fused_results = []

        cand_lookup = {str(c["work_id"]): c for c in candidate_works}

        for cid in all_candidate_ids:
            if cid == target_id:
                continue

            c_obj = cand_lookup.get(cid, {})
            sp_info = splink_map.get(cid, {})
            sem_info = semantic_map.get(cid, {})
            geo_info = geo_map.get(cid, {})

            splink_prob = float(sp_info.get("match_probability", 0.0))
            sem_sim = float(sem_info.get("similarity", 0.0))
            geo_dist = float(geo_info.get("distance_meters")) if geo_info.get("distance_meters") is not None else None

            same_dist = (str(target_work.get("district_name") or target_work.get("district")) == str(c_obj.get("district_name") or c_obj.get("district")))
            same_cat = (str(target_work.get("work_category")) == str(c_obj.get("work_category")))
            same_agency = (str(target_work.get("implementing_agency")) == str(c_obj.get("implementing_agency")))

            rel_type = self.classify_relationship(
                splink_prob=splink_prob,
                semantic_sim=sem_sim,
                geo_distance_m=geo_dist,
                same_district=same_dist,
                same_category=same_cat,
                same_agency=same_agency
            )

            if rel_type == "NO_SIGNIFICANT_RELATIONSHIP":
                continue

            fused_results.append({
                "work_id": target_id,
                "related_work_id": cid,
                "relationship_type": rel_type,
                "disclaimer": self.disclaimer,
                "structured_match": {
                    "available": bool(sp_info),
                    "probability": splink_prob,
                    "blocking_rule": sp_info.get("blocking_rule", "district_name + work_category"),
                    "splink_version": sp_info.get("splink_version", "splink-v4.0.9")
                },
                "semantic_match": {
                    "available": bool(sem_info),
                    "similarity": sem_sim,
                    "model": sem_info.get("model", "TFIDF-CharWordNgram-Local")
                },
                "geospatial_match": {
                    "available": bool(geo_info),
                    "distance_meters": geo_dist
                },
                "attribute_agreement": {
                    "same_district": same_dist,
                    "same_category": same_cat,
                    "same_agency": same_agency
                },
                "verification_checklist": [
                    {"step": 1, "check": "Verify separate sanction orders & sanction letters", "status": "PENDING"},
                    {"step": 2, "check": "Verify separate Measurement Book (MB) abstract entries", "status": "PENDING"},
                    {"step": 3, "check": "Verify physical site non-overlap via joint field inspection", "status": "PENDING"},
                    {"step": 4, "check": "Verify separate expenditure payment vouchers and vendor ledgers", "status": "PENDING"}
                ]
            })

        fused_results.sort(
            key=lambda x: (x["structured_match"]["probability"] + x["semantic_match"]["similarity"]),
            reverse=True
        )
        return fused_results

relationship_fusion_service = RelationshipFusionService()
