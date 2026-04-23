# backend/src/enterprise/audit.py
import sqlite3
import json
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import os

logger = logging.getLogger(__name__)

class ComplianceReport(BaseModel):
    period_days: int
    total_events: int
    unique_users: List[str]
    models_used: List[str]
    total_tokens: int
    events_by_type: Dict[str, int]

class IntegrityResult(BaseModel):
    valid: bool
    tampered_rows: List[int]
    verified_count: int

class AuditLogger:
    def __init__(self, db_path: str = "./workspace/.audit/audit.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    prompt_hash TEXT NOT NULL,
                    model TEXT NOT NULL,
                    tokens_in INTEGER,
                    tokens_out INTEGER,
                    files_modified TEXT,
                    duration_ms INTEGER,
                    success INTEGER,
                    row_hash TEXT NOT NULL
                )
            """)
            # Create index on timestamp for faster queries
            conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log(timestamp)")

    def _compute_row_hash(self, row: dict) -> str:
        # Exclude row_hash itself from computation
        row_copy = row.copy()
        row_copy.pop('row_hash', None)
        # Ensure consistent order
        ordered = {k: row_copy[k] for k in sorted(row_copy.keys())}
        return hashlib.sha256(json.dumps(ordered, sort_keys=True).encode()).hexdigest()

    def log_event(self, event_type: str, user_id: str, prompt_hash: str,
                  model: str, tokens_in: int = 0, tokens_out: int = 0,
                  files_modified: List[str] = None, duration_ms: int = 0,
                  success: bool = True) -> None:
        row = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "prompt_hash": prompt_hash,
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "files_modified": json.dumps(files_modified or []),
            "duration_ms": duration_ms,
            "success": 1 if success else 0
        }
        row["row_hash"] = self._compute_row_hash(row)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO audit_log (
                    timestamp, event_type, user_id, prompt_hash, model,
                    tokens_in, tokens_out, files_modified, duration_ms, success, row_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row["timestamp"], row["event_type"], row["user_id"], row["prompt_hash"],
                row["model"], row["tokens_in"], row["tokens_out"], row["files_modified"],
                row["duration_ms"], row["success"], row["row_hash"]
            ))

    def export_report(self, start_date: datetime, end_date: datetime) -> ComplianceReport:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT event_type, user_id, model, tokens_in, tokens_out FROM audit_log
                WHERE timestamp BETWEEN ? AND ?
            """, (start_date.isoformat(), end_date.isoformat()))
            rows = cursor.fetchall()
        total_events = len(rows)
        unique_users = list(set(r[1] for r in rows))
        models_used = list(set(r[2] for r in rows))
        total_tokens = sum(r[3] + r[4] for r in rows)
        events_by_type = {}
        for r in rows:
            events_by_type[r[0]] = events_by_type.get(r[0], 0) + 1
        days = (end_date - start_date).days or 1
        return ComplianceReport(
            period_days=days,
            total_events=total_events,
            unique_users=unique_users,
            models_used=models_used,
            total_tokens=total_tokens,
            events_by_type=events_by_type
        )

    def verify_integrity(self) -> IntegrityResult:
        tampered = []
        verified = 0
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM audit_log ORDER BY id")
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
        for row in rows:
            row_dict = dict(zip(columns, row))
            computed = self._compute_row_hash(row_dict)
            if row_dict['row_hash'] != computed:
                tampered.append(row_dict['id'])
            verified += 1
        return IntegrityResult(valid=len(tampered) == 0, tampered_rows=tampered, verified_count=verified)

# Global singleton
_audit_logger = None

def get_audit_logger() -> AuditLogger:
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger
