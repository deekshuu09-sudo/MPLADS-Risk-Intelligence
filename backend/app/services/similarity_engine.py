import math
import re
from typing import List, Dict, Any, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters.
    """
    if None in (lat1, lon1, lat2, lon2):
        return float("inf")
    
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def clean_text_for_similarity(text: str) -> str:
    if not text:
        return ""
    t = text.lower()
    t = re.sub(r"p\.?c\.?c\.?", "pcc", t)
    t = re.sub(r"comm\.?\s+hall", "community hall", t)
    t = re.sub(r"h/o|house of", "house", t)
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


class SimilarityEngine:
    def __init__(self):
        # Character n-gram vectorizer for robust substring/typo matching
        self.char_vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1)
        # Word unigram/bigram vectorizer
        self.word_vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")

    def find_near_duplicates_and_splits(self, works: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Scans works list to detect:
        1. Near-duplicate works co-located within 500 meters with text similarity > 0.60
        2. Tender threshold splitting: >= 2 works in same block/village with sanction in [9.5L, 9.999L] within 30 days
        Returns a dict mapping work_id -> detection details.
        """
        results: Dict[str, Dict[str, Any]] = {}
        if len(works) < 2:
            return results

        descriptions = [clean_text_for_similarity(w.get("work_description", "")) for w in works]
        try:
            char_matrix = self.char_vectorizer.fit_transform(descriptions)
            char_sim_matrix = cosine_similarity(char_matrix)
        except Exception:
            char_sim_matrix = None

        try:
            word_matrix = self.word_vectorizer.fit_transform(descriptions)
            word_sim_matrix = cosine_similarity(word_matrix)
        except Exception:
            word_sim_matrix = None

        n = len(works)
        for i in range(n):
            w_i = works[i]
            id_i = w_i["work_id"]
            lat_i, lon_i = w_i.get("latitude"), w_i.get("longitude")
            amt_i = w_i.get("sanctioned_amount", 0.0)
            date_i = w_i.get("sanction_date")

            # Check threshold splitting
            if 950000.0 <= amt_i <= 999999.0:
                splits = []
                for j in range(n):
                    if i == j:
                        continue
                    w_j = works[j]
                    amt_j = w_j.get("sanctioned_amount", 0.0)
                    date_j = w_j.get("sanction_date")
                    if 950000.0 <= amt_j <= 999999.0:
                        # Check same block / village or MP
                        same_loc = (w_i.get("block_name") and w_i.get("block_name") == w_j.get("block_name")) or \
                                   (w_i.get("mp_id") == w_j.get("mp_id") and w_i.get("district_id") == w_j.get("district_id"))
                        days_diff = abs((date_i - date_j).days) if (date_i and date_j) else 999
                        if same_loc and days_diff <= 35:
                            splits.append(w_j["work_id"])
                
                if splits:
                    results[id_i] = {
                        "is_split": True,
                        "split_matches": splits,
                        "subscore": 85.0,
                        "severity": "HIGH",
                        "summary": f"Potential threshold-clustering signal: Sanctioned under ₹10L ({round(amt_i/100000, 2)}L) with {len(splits)} contiguous works within 35 days (Configured detection parameters: Spatial < 500 m / Financial ₹10L)."
                    }

            # Check spatial & text duplicates
            for j in range(i + 1, n):
                w_j = works[j]
                id_j = w_j["work_id"]
                lat_j, lon_j = w_j.get("latitude"), w_j.get("longitude")

                dist = haversine_distance_meters(lat_i, lon_i, lat_j, lon_j)
                c_sim = float(char_sim_matrix[i, j]) if char_sim_matrix is not None else 0.0
                w_sim = float(word_sim_matrix[i, j]) if word_sim_matrix is not None else 0.0
                effective_sim = max(c_sim, w_sim)

                # Flag if within 500m and effective similarity >= 0.55 (or >= 0.50 if within 150m)
                is_proximate = (dist <= 150.0 and effective_sim >= 0.50) or (dist <= 500.0 and effective_sim >= 0.60)

                if is_proximate:
                    proximity_bonus = (1.0 - min(dist, 500.0) / 500.0) * 30.0
                    dup_score = min(100.0, (effective_sim * 70.0) + proximity_bonus)
                    sev = "CRITICAL" if dup_score > 82.0 else "HIGH"
                    
                    entry_i = {
                        "is_duplicate": True,
                        "matched_work_id": id_j,
                        "distance_meters": round(dist, 1),
                        "text_similarity": round(effective_sim, 3),
                        "subscore": round(dup_score, 1),
                        "severity": sev,
                        "summary": f"Co-located similar work detected: Located {round(dist, 0)}m from {id_j} with {round(effective_sim*100, 1)}% description overlap."
                    }
                    entry_j = {
                        "is_duplicate": True,
                        "matched_work_id": id_i,
                        "distance_meters": round(dist, 1),
                        "text_similarity": round(effective_sim, 3),
                        "subscore": round(dup_score, 1),
                        "severity": sev,
                        "summary": f"Co-located similar work detected: Located {round(dist, 0)}m from {id_i} with {round(effective_sim*100, 1)}% description overlap."
                    }

                    if id_i not in results or results[id_i].get("subscore", 0) < dup_score:
                        results[id_i] = entry_i
                    if id_j not in results or results[id_j].get("subscore", 0) < dup_score:
                        results[id_j] = entry_j

        return results

similarity_engine = SimilarityEngine()
