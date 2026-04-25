# backend/src/cicd/history_collector.py
import subprocess
import git
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict
import json

class CICDRun:
    def __init__(self, commit_sha, changed_files, test_outcome, duration):
        self.commit_sha = commit_sha
        self.changed_files = changed_files
        self.test_outcome = test_outcome  # 'pass' or 'fail'
        self.duration = duration

class HistoryCollector:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.repo = git.Repo(repo_path)

    def fetch_workflow_history(self, days=90) -> List[CICDRun]:
        # For simplicity, simulate by looking at commit history and running a dummy test.
        # In production, you would query GitHub Actions API or read CI logs.
        runs = []
        cutoff = datetime.now() - timedelta(days=days)
        for commit in self.repo.iter_commits(since=cutoff):
            changed_files = self._get_changed_files(commit)
            # Dummy test outcome: random (you would replace with actual CI result)
            import random
            outcome = "pass" if random.random() > 0.3 else "fail"
            duration = random.randint(5, 120)
            runs.append(CICDRun(commit.hexsha, changed_files, outcome, duration))
        return runs

    def _get_changed_files(self, commit):
        if not commit.parents:
            return []
        diff = commit.parents[0].diff(commit)
        return [item.a_path for item in diff if item.a_path]
