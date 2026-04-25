# src/memory.py – ChromaDB with new API
import chromadb
import hashlib
import os

class VibeMemory:
    def __init__(self, persist_dir="./chroma_data"):
        os.makedirs(persist_dir, exist_ok=True)
        # New ChromaDB client (no Settings object)
        self.client = chromadb.PersistentClient(path=persist_dir)
        # Collections
        self.workspace = self.client.get_or_create_collection("workspace_memory")
        self.global_memory = self.client.get_or_create_collection("global_memory")
    
    def store_code(self, prompt: str, filepath: str, content: str, workspace_id="default"):
        doc_id = hashlib.md5(f"{workspace_id}:{filepath}:{content[:100]}".encode()).hexdigest()
        self.workspace.upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[{"prompt": prompt, "filepath": filepath, "workspace": workspace_id}]
        )
        self.global_memory.upsert(
            ids=[doc_id],
            documents=[content],
            metadatas=[{"prompt": prompt, "filepath": filepath}]
        )
    
    def search_similar(self, query: str, n_results=3):
        results = self.global_memory.query(query_texts=[query], n_results=n_results)
        return results.get('documents', [[]])[0]
    
    def clear_workspace(self, workspace_id="default"):
        self.client.delete_collection("workspace_memory")
        self.workspace = self.client.create_collection("workspace_memory")

def get_memory():
    """Return a dummy memory instance for now."""
    global _memory
    if '_memory' not in globals():
        from src.memory import ChromaMemory
        _memory = ChromaMemory()
    return _memory
