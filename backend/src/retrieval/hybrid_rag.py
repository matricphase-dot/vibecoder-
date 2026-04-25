# backend/src/retrieval/hybrid_rag.py
import numpy as np
from typing import List, Dict
from dataclasses import dataclass
from src.retrieval.bm25_index import get_bm25
from src.memory import get_memory  # your ChromaDB memory from earlier
import os
from pathlib import Path

@dataclass
class CodeChunk:
    file_path: str
    content: str
    start_line: int
    end_line: int
    score: float
    source: str  # 'bm25', 'vector', 'gnn'

class HybridRetriever:
    def __init__(self, workspace_path: str = "./workspace"):
        self.workspace_path = Path(workspace_path)
        self.bm25 = get_bm25()
        self.chroma = None  # we'll lazy load
        self.gnn = None
        try:
            from src.gnn.gnn_query import GNNQuery
            self.gnn = GNNQuery()
        except:
            print("GNN not available, skipping structural search")

    def _get_chroma_results(self, query: str, top_k: int = 5) -> List[CodeChunk]:
        # Use existing ChromaDB memory (global_memory)
        try:
            from src.memory import get_memory
            memory = get_memory()
            # Use global_memory to search similar code snippets
            results = memory.global_memory.query(query_texts=[query], n_results=top_k)
            chunks = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    meta = results['metadatas'][0][i] if results['metadatas'] else {}
                    file_path = meta.get('filepath', 'unknown')
                    chunks.append(CodeChunk(
                        file_path=file_path,
                        content=doc[:500],
                        start_line=0,
                        end_line=0,
                        score=float(results['distances'][0][i]) if results['distances'] else 0.5,
                        source="vector"
                    ))
            return chunks
        except:
            return []

    def _get_gnn_results(self, current_file: str = None, top_k: int = 5) -> List[CodeChunk]:
        if self.gnn is None or not current_file:
            return []
        try:
            related = self.gnn.get_related_files(current_file, top_k)
            chunks = []
            for r in related:
                file_path = r["file"]
                # Load content
                full_path = self.workspace_path / file_path
                if full_path.exists():
                    with open(full_path, "r") as f:
                        content = f.read()
                    chunks.append(CodeChunk(
                        file_path=file_path,
                        content=content[:500],
                        start_line=0,
                        end_line=0,
                        score=r["similarity"],
                        source="gnn"
                    ))
            return chunks
        except:
            return []

    def retrieve(self, query: str, current_file: str = None, top_k: int = 8) -> List[CodeChunk]:
        # Get results from all sources
        bm25_results = [CodeChunk(
            file_path=r["file"],
            content=r["snippet"],
            start_line=0,
            end_line=0,
            score=r["score"],
            source="bm25"
        ) for r in self.bm25.search(query, top_k=top_k)]
        vector_results = self._get_chroma_results(query, top_k)
        gnn_results = self._get_gnn_results(current_file, top_k)
        all_results = bm25_results + vector_results + gnn_results
        # Reciprocal Rank Fusion (RRF)
        scores = {}
        for i, r in enumerate(all_results):
            rank = i + 1
            rrf_score = 1 / (60 + rank)
            key = r.file_path
            scores[key] = scores.get(key, 0) + rrf_score
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        # Build final list with best snippet
        final = []
        for file_path, score in ranked:
            # Find the best chunk for this file
            best = max([r for r in all_results if r.file_path == file_path], key=lambda x: x.score, default=None)
            final.append(CodeChunk(
                file_path=file_path,
                content=best.content if best else "",
                start_line=0,
                end_line=0,
                score=score,
                source="fusion"
            ))
        return final

    def build_context_string(self, chunks: List[CodeChunk]) -> str:
        if not chunks:
            return ""
        lines = ["=== RELEVANT CODE CONTEXT (Hybrid Retrieval) ==="]
        for chunk in chunks:
            lines.append(f"File: {chunk.file_path} (relevance: {chunk.score:.3f})")
            lines.append("```")
            lines.append(chunk.content)
            lines.append("```")
            lines.append("")
        return "\n".join(lines)
