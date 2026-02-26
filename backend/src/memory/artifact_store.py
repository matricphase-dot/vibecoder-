import chromadb
from chromadb.utils import embedding_functions
import os
import json
from datetime import datetime

class ArtifactStore:
    def __init__(self, persist_directory="./chroma_data"):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        
        self.success_collection = self.client.get_or_create_collection(
            name="successes",
            embedding_function=self.embedding_fn
        )
        self.failure_collection = self.client.get_or_create_collection(
            name="failures",
            embedding_function=self.embedding_fn
        )

    def close(self):
        pass

    def store_success(self, task: str, plan: dict, final_url: str = None):
        plan_str = json.dumps(plan)
        metadata = {
            "task": task,
            "plan": plan_str,
            "url": final_url or "",
            "timestamp": datetime.now().isoformat()
        }
        self.success_collection.add(
            documents=[task],
            metadatas=[metadata],
            ids=[f"success_{datetime.now().timestamp()}"]
        )
        print(f"? Stored success in Chroma: {task[:50]}...")

    def store_failure(self, task: str, plan: dict, error: str):
        plan_str = json.dumps(plan)
        metadata = {
            "task": task,
            "plan": plan_str,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.failure_collection.add(
            documents=[task],
            metadatas=[metadata],
            ids=[f"failure_{datetime.now().timestamp()}"]
        )
        print(f"? Stored failure in Chroma: {task[:50]}...")

    def get_similar_plans(self, task: str, limit=3):
        results = self.success_collection.query(query_texts=[task], n_results=limit)
        if results['metadatas'] and results['metadatas'][0]:
            return [m['plan'] for m in results['metadatas'][0]]
        return []

    def get_similar_failures(self, task: str, limit=3):
        results = self.failure_collection.query(query_texts=[task], n_results=limit)
        if results['metadatas'] and results['metadatas'][0]:
            return [m['error'] for m in results['metadatas'][0]]
        return []

    def list_all_successes(self, limit=50):
        results = self.success_collection.get(limit=limit)
        projects = []
        if results['metadatas']:
            for meta in results['metadatas']:
                projects.append({
                    "task": meta['task'],
                    "url": meta['url'],
                    "timestamp": meta['timestamp'],
                })
        projects.sort(key=lambda x: x['timestamp'], reverse=True)
        return projects

