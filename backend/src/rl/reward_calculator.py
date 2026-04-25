# backend/src/rl/reward_calculator.py
import sqlite3
from pathlib import Path
from datetime import datetime

class RewardCalculator:
    def __init__(self, db_path: str = "./workspace/.rl/rewards.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rewards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt TEXT NOT NULL,
                    completion TEXT NOT NULL,
                    reward REAL NOT NULL,
                    test_result TEXT,
                    timestamp TEXT NOT NULL
                )
            """)

    def calculate_reward(self, test_result: dict) -> float:
        passed = test_result.get("passed", 0)
        failed = test_result.get("failed", 0)
        total = passed + failed
        if total == 0:
            return 0.0
        base = passed / total  # [0,1]
        # Bonus for coverage (if available)
        coverage = test_result.get("coverage", 0.0) / 100.0
        reward = base + 0.2 * coverage
        return min(reward, 1.0)

    def store_reward(self, prompt: str, completion: str, reward: float, test_result: dict):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO rewards (prompt, completion, reward, test_result, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (prompt, completion, reward, str(test_result), datetime.utcnow().isoformat()))
