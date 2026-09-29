import re
from datetime import datetime, date
from typing import Optional

def parse_inr_amount(val) -> float:
    """
    Parses various currency representations from eSAKSHI data:
    - 448127.00
    - "₹448127.00"
    - "₹83,47,43,91,109.11"
    - "₹8,347.44 Crore"
    - "₹4.06 Crore"
    - "12 Lakh"
    """
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    
    s = str(val).strip()
    if not s:
        return 0.0

    # Clean non-breaking spaces and currency symbols
    s = s.replace("₹", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()
    
    # Check for Crore / Lakh multipliers
    if "Crore" in s or "Cr" in s:
        s_clean = re.sub(r"[^\d.]", "", s)
        try:
            return float(s_clean) * 10000000.0
        except ValueError:
            return 0.0
    if "Lakh" in s or "Lakhs" in s:
        s_clean = re.sub(r"[^\d.]", "", s)
        try:
            return float(s_clean) * 100000.0
        except ValueError:
            return 0.0

    # Direct float conversion
    s_clean = re.sub(r"[^\d.]", "", s)
    try:
        return float(s_clean)
    except ValueError:
        return 0.0


def parse_esakshi_date(val) -> Optional[date]:
    """
    Parses dates in eSAKSHI formats:
    - "05-Sep-2024"
    - "23-Oct-2025"
    - "Jun 4, 2024 12:00:00 AM"
    - "2024-09-05"
    """
    if val is None:
        return None
    if isinstance(val, (date, datetime)):
        return val if isinstance(val, date) else val.date()
    
    s = str(val).strip()
    if not s or s.lower() in ("null", "none", "", "n/a"):
        return None

    date_formats = [
        "%d-%b-%Y",        # 05-Sep-2024
        "%b %d, %Y %I:%M:%S %p", # Jun 4, 2024 12:00:00 AM
        "%Y-%m-%d",        # 2024-09-05
        "%d/%m/%Y",        # 05/09/2024
        "%b %d, %Y",       # Sep 5, 2024
    ]
    for fmt in date_formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def sanitize_text(val: Optional[str]) -> str:
    if val is None:
        return ""
    text = str(val).strip()
    # Replace multiple spaces with single space
    text = re.sub(r"\s+", " ", text)
    return text
