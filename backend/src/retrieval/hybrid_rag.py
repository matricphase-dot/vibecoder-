# backend/src/retrieval/hybrid_rag.py (stub)
from typing import List
from dataclasses import dataclass

@dataclass
class CodeChunk:
    file_path: str
    content: str
    start_line: int
    end_line: int
    score: float
    source: str

class HybridRetriever:
    def retrieve(self, query: str, current_file: str = None, top_k: int = 8) -> List[CodeChunk]:
        return []

    def build_context_string(self, chunks: List[CodeChunk]) -> str:
        return ""
