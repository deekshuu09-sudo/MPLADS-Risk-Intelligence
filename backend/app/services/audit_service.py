import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        entity_type: str,
        entity_id: str,
        action_type: str,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        actor_role: str = "DISTRICT_OFFICER",
        ip_address: str = "127.0.0.1"
    ) -> AuditLog:
        """
        Creates a persisted, append-only audit trail entry.
        """
        log_entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action_type=action_type,
            old_value=old_value,
            new_value=new_value,
            actor_role=actor_role,
            ip_address=ip_address,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

audit_service = AuditService()
