# backend/src/learning/feedback_collector.py
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict

class FeedbackCollector:
    def __init__(self, db_path: str = "./workspace/.learning/feedback.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt TEXT NOT NULL,
                    completion TEXT NOT NULL,
                    accepted INTEGER NOT NULL,
                    model TEXT,
                    project_id TEXT,
                    timestamp TEXT NOT NULL
                )
            """)

    def record(self, prompt: str, completion: str, accepted: bool, model: str = "codellama", project_id: str = "default"):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO feedback (prompt, completion, accepted, model, project_id, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (prompt, completion, 1 if accepted else 0, model, project_id, datetime.utcnow().isoformat()))

    def get_training_data(self, since_hours: int = 24) -> List[Dict]:
        cutoff = (datetime.utcnow() - timedelta(hours=since_hours)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("""
                SELECT prompt, completion FROM feedback
                WHERE accepted = 1 AND timestamp >= ?
            """, (cutoff,))
            rows = cur.fetchall()
        return [{"prompt": r[0], "completion": r[1]} for r in rows]

    def get_stats(self) -> Dict:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("SELECT COUNT(*) FROM feedback")
            total = cur.fetchone()[0]
            cur = conn.execute("SELECT COUNT(*) FROM feedback WHERE accepted = 1")
            accepted = cur.fetchone()[0]
            return {"total": total, "accepted": accepted, "ready_for_training": accepted >= 10}
