import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class EsakshiClient:
    def __init__(self, base_url: str = settings.ESAKSHI_BASE_URL, timeout_seconds: float = 12.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds
        self.headers = {
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "MPLADS-Risk-Intelligence-DIID/1.0"
        }

    async def get_state_data(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}{settings.ESAKSHI_REST_PATH}/getStateData"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                res = await client.post(url, headers=self.headers, json={})
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(f"Failed to fetch live state data from eSAKSHI: {e}")
        
        # Fallback offline states
        return [
            {"STATE_NAME": "Andaman And Nicobar Islands", "STATE_ID": 35},
            {"STATE_NAME": "Andhra Pradesh", "STATE_ID": 2},
            {"STATE_NAME": "Assam", "STATE_ID": 5},
            {"STATE_NAME": "Bihar", "STATE_ID": 6},
            {"STATE_NAME": "Karnataka", "STATE_ID": 29},
            {"STATE_NAME": "Maharashtra", "STATE_ID": 27},
            {"STATE_NAME": "Rajasthan", "STATE_ID": 8},
            {"STATE_NAME": "Uttar Pradesh", "STATE_ID": 9},
            {"STATE_NAME": "West Bengal", "STATE_ID": 19}
        ]

    async def get_tiles_data(self, uname: str = "0,0,0,2") -> Dict[str, Any]:
        """
        Fetches macro KPIs for current tenure.
        """
        url = f"{self.base_url}{settings.ESAKSHI_REST_PATH}/getTilesData"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                res = await client.post(url, headers=self.headers, json={"uname": uname})
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(f"Failed to fetch live tiles from eSAKSHI: {e}")
        
        # Fallback realistic snapshot (18th Lok Sabha official snapshot)
        return {
            "Allocated Limit for Hon'ble MPs": ["₹83,47,43,91,109.11", "₹8,347.44 Crore"],
            "Expenditure on Completed and On-going Works as on Date": ["₹28,84,51,63,321.45", "₹2,884.52 Crore"],
            "Works Recommended": ["110075", "₹59,14,67,67,228.91", "₹5,914.68 Crore"],
            "Works Completed": ["35993", "₹17,69,78,15,776.73", "₹1,769.78 Crore"],
            "Works Sanctioned": ["82431", "₹43,52,38,18,986.78", "₹4,352.38 Crore"],
            "Amount consented for Calamity": ["12", "₹4,05,67,400.00", "₹4.06 Crore"],
            "Current Tenure": [{"ID": 7, "CAPTION": "18th Lok Sabha"}]
        }

    async def get_tiles_report_data(self, combo: str, key: str) -> List[Dict[str, Any]]:
        """
        Fetches specific project level report rows.
        combo format: 'stateId,constituencyId,mpId,house' e.g. '35,0,0,2'
        key options: 'Works Sanctioned', 'Works Completed', 'Expenditure on Completed and On-going Works as on Date'
        """
        url = f"{self.base_url}{settings.ESAKSHI_REST_PATH}/getTilesReportData"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                res = await client.post(url, headers=self.headers, json={"combo": combo, "key": key})
                if res.status_code == 200:
                    raw_dict = res.json()
                    for k, val_str in raw_dict.items():
                        if isinstance(val_str, str):
                            try:
                                return json.loads(val_str)
                            except Exception:
                                pass
                        elif isinstance(val_str, list):
                            return val_str
        except Exception as e:
            logger.warning(f"Failed to fetch tiles report data from eSAKSHI for {key}: {e}")
        return []

esakshi_client = EsakshiClient()
