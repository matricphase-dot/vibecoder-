# backend/src/retrieval/bm25_index.py
import os
from pathlib import Path
from rank_bm25 import BM25Okapi
import json
import hashlib
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading

class BM25Index:
    def __init__(self, workspace_path: str = "./workspace", index_path: str = "./backend/.bm25_index.json"):
        self.workspace_path = Path(workspace_path)
        self.index_path = Path(index_path)
        self.index = None
        self.files = []  # list of (file_path, content)
        self._build()

    def _tokenize(self, text: str):
        # Simple tokenizer: split on non-alphanumeric, lowercase
        import re
        tokens = re.findall(r'\b[a-zA-Z0-9_]+\b', text.lower())
        return tokens

    def _build(self):
        if self.index_path.exists():
            try:
                with open(self.index_path, "r") as f:
                    data = json.load(f)
                    self.files = data["files"]
                    tokenized_corpus = [self._tokenize(content) for _, content in self.files]
                    self.index = BM25Okapi(tokenized_corpus)
                return
            except:
                pass
        self.files = []
        for filepath in self.workspace_path.rglob("*"):
            if filepath.is_file() and filepath.suffix in [".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json"]:
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    self.files.append((str(filepath.relative_to(self.workspace_path)), content))
                except:
                    pass
        tokenized_corpus = [self._tokenize(content) for _, content in self.files]
        self.index = BM25Okapi(tokenized_corpus)
        # Save to disk
        with open(self.index_path, "w") as f:
            json.dump({"files": self.files}, f)

    def search(self, query: str, top_k: int = 5):
        tokenized_query = self._tokenize(query)
        scores = self.index.get_scores(tokenized_query)
        # Get top_k indices
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        results = []
        for idx in top_indices:
            file_path, content = self.files[idx]
            # extract a snippet
            lines = content.splitlines()
            snippet = "\n".join(lines[:10]) + ("..." if len(lines) > 10 else "")
            results.append({
                "file": file_path,
                "score": float(scores[idx]),
                "snippet": snippet,
                "source": "bm25"
            })
        return results

    def watch(self):
        # For simplicity, we'll not implement dynamic watching; user can rebuild manually.
        pass

# Singleton instance
_bm25 = None
def get_bm25():
    global _bm25
    if _bm25 is None:
        _bm25 = BM25Index()
    return _bm25
