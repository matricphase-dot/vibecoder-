# backend/src/analytics.py
import sqlite3
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class AnalyticsEvent(BaseModel):
    event_type: str  # 'completion', 'agent_run', 'deploy', 'test_run'
    user_id: str = "local"
    tokens_used: int = 0
    accepted: bool = True
    duration_ms: int = 0
    model: str = ""
    agent_name: str = ""
    language: str = ""
    file_path: str = ""

class AnalyticsSummary(BaseModel):
    period_days: int
    total_events: int
    total_tokens: int
    acceptance_rate: float
    hours_saved: float
    tokens_per_day: List[Dict]  # [{date, tokens}]
    top_models: List[Dict]      # [{model, count}]
    events_by_type: Dict[str, int]
    users: List[str]

class AnalyticsLogger:
    def __init__(self, db_path: str = "./workspace/.analytics/events.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    tokens_used INTEGER DEFAULT 0,
                    accepted INTEGER DEFAULT 1,
                    duration_ms INTEGER DEFAULT 0,
                    model TEXT,
                    agent_name TEXT,
                    language TEXT,
                    file_path TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)")

    def log_event(self, event: AnalyticsEvent):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO events (timestamp, event_type, user_id, tokens_used, accepted,
                                    duration_ms, model, agent_name, language, file_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.utcnow().isoformat(),
                event.event_type,
                event.user_id,
                event.tokens_used,
                1 if event.accepted else 0,
                event.duration_ms,
                event.model,
                event.agent_name,
                event.language,
                event.file_path
            ))

    def get_summary(self, days: int = 7) -> AnalyticsSummary:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT event_type, user_id, tokens_used, accepted, duration_ms, model
                FROM events WHERE timestamp >= ?
            """, (start_date,))
            rows = cursor.fetchall()
        total_events = len(rows)
        total_tokens = sum(r[2] for r in rows)
        accepted_count = sum(1 for r in rows if r[3] == 1)
        acceptance_rate = accepted_count / total_events if total_events else 0
        # Hours saved: assume 50 tokens per minute typing speed => (accepted_tokens / 50) / 60
        accepted_tokens = sum(r[2] for r in rows if r[3] == 1)
        hours_saved = (accepted_tokens / 50) / 60 if accepted_tokens else 0

        # Tokens per day
        tokens_by_day = {}
        for r in rows:
            date = datetime.fromisoformat(r[0]).date().isoformat()
            tokens_by_day[date] = tokens_by_day.get(date, 0) + r[2]
        tokens_per_day = [{"date": d, "tokens": v} for d, v in sorted(tokens_by_day.items())]

        # Top models
        model_counts = {}
        for r in rows:
            model = r[5] or "unknown"
            model_counts[model] = model_counts.get(model, 0) + 1
        top_models = [{"model": m, "count": c} for m, c in sorted(model_counts.items(), key=lambda x: -x[1])[:5]]

        # Events by type
        events_by_type = {}
        for r in rows:
            events_by_type[r[0]] = events_by_type.get(r[0], 0) + 1

        users = list(set(r[1] for r in rows))

        return AnalyticsSummary(
            period_days=days,
            total_events=total_events,
            total_tokens=total_tokens,
            acceptance_rate=round(acceptance_rate, 2),
            hours_saved=round(hours_saved, 2),
            tokens_per_day=tokens_per_day,
            top_models=top_models,
            events_by_type=events_by_type,
            users=users
        )

    def export_csv(self, days: int = 30) -> str:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT timestamp, event_type, user_id, tokens_used, accepted, duration_ms, model, agent_name, language, file_path
                FROM events WHERE timestamp >= ?
            """, (start_date,))
            rows = cursor.fetchall()
        import csv
        from io import StringIO
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["timestamp", "event_type", "user_id", "tokens_used", "accepted", "duration_ms", "model", "agent_name", "language", "file_path"])
        writer.writerows(rows)
        return output.getvalue()

# Global singleton
_analytics = None
def get_analytics():
    global _analytics
    if _analytics is None:
        _analytics = AnalyticsLogger()
    return _analytics
