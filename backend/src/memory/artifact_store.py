import json
from datetime import datetime

# We'll import chromadb only when needed, and handle failure gracefully
class ArtifactStore:
    def __init__(self, persist_directory="./chroma_data"):
        self.persist_directory = persist_directory
        self.chroma_available = False
        self.client = None
        self.success_collection = None
        self.failure_collection = None

        # Try to import and initialize chromadb
        try:
            import chromadb
            from chromadb.utils import embedding_functions
            self.client = chromadb.PersistentClient(path=self.persist_directory)
            self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
            self.success_collection = self.client.get_or_create_collection(
                name="successes",
                embedding_function=self.embedding_fn
            )
            self.failure_collection = self.client.get_or_create_collection(
                name="failures",
                embedding_function=self.embedding_fn
            )
            self.chroma_available = True
            print("? ChromaDB initialized.")
        except Exception as e:
            print(f"?? ChromaDB not available: {e}. Using in-memory fallback.")
            self.chroma_available = False
            self.successes = []
            self.failures = []

    def close(self):
        pass

    def store_success(self, task: str, plan: dict, final_url: str = None, user_id: int = None):
        if self.chroma_available:
            import json
            plan_str = json.dumps(plan)
            metadata = {
                "task": task,
                "plan": plan_str,
                "url": final_url or "",
                "timestamp": datetime.now().isoformat(),
                "user_id": str(user_id) if user_id else "anonymous"
            }
            self.success_collection.add(
                documents=[task],
                metadatas=[metadata],
                ids=[f"success_{datetime.now().timestamp()}"]
            )
            print(f"? Stored success in Chroma: {task[:50]}...")
        else:
            self.successes.append({
                "task": task,
                "plan": plan,
                "url": final_url,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            })
            print(f"? Stored success in memory: {task[:50]}...")

    def store_failure(self, task: str, plan: dict, error: str, user_id: int = None):
        if self.chroma_available:
            import json
            plan_str = json.dumps(plan)
            metadata = {
                "task": task,
                "plan": plan_str,
                "error": error,
                "timestamp": datetime.now().isoformat(),
                "user_id": str(user_id) if user_id else "anonymous"
            }
            self.failure_collection.add(
                documents=[task],
                metadatas=[metadata],
                ids=[f"failure_{datetime.now().timestamp()}"]
            )
            print(f"? Stored failure in Chroma: {task[:50]}...")
        else:
            self.failures.append({
                "task": task,
                "plan": plan,
                "error": error,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            })
            print(f"? Stored failure in memory: {task[:50]}...")

    def get_similar_plans(self, task: str, limit=3):
        if self.chroma_available:
            results = self.success_collection.query(query_texts=[task], n_results=limit)
            if results['metadatas'] and results['metadatas'][0]:
                return [m['plan'] for m in results['metadatas'][0]]
            return []
        else:
            keyword = task[:20].lower()
            results = []
            for s in self.successes:
                if keyword in s["task"].lower():
                    results.append(json.dumps(s["plan"]))
            return results[:limit]

    def get_similar_failures(self, task: str, limit=3):
        if self.chroma_available:
            results = self.failure_collection.query(query_texts=[task], n_results=limit)
            if results['metadatas'] and results['metadatas'][0]:
                return [m['error'] for m in results['metadatas'][0]]
            return []
        else:
            keyword = task[:20].lower()
            results = []
            for f in self.failures:
                if keyword in f["task"].lower():
                    results.append(f["error"])
            return results[:limit]

    def list_all_successes(self, limit=50, user_id: int = None):
        if self.chroma_available:
            if user_id is not None:
                results = self.success_collection.get(
                    where={"user_id": str(user_id)},
                    limit=limit
                )
            else:
                results = self.success_collection.get(limit=limit)
            projects = []
            if results['metadatas']:
                for meta in results['metadatas']:
                    projects.append({
                        "task": meta['task'],
                        "url": meta['url'],
                        "timestamp": meta['timestamp'],
                        "user_id": meta.get('user_id', 'anonymous')
                    })
            projects.sort(key=lambda x: x['timestamp'], reverse=True)
            return projects
        else:
            filtered = [s for s in self.successes if user_id is None or s.get('user_id') == user_id]
            filtered.sort(key=lambda x: x['timestamp'], reverse=True)
            return filtered[:limit]

    def store_preference(self, key: str, value: str):
        if self.chroma_available:
            import json
            collection = self.client.get_or_create_collection("preferences")
            collection.upsert(
                documents=[value],
                metadatas=[{"key": key}],
                ids=[f"pref_{key}"]
            )
            print(f"?? Stored preference: {key}={value}")
        else:
            print("Preferences not supported in fallback mode.")

    def get_preference(self, key: str) -> str:
        if self.chroma_available:
            collection = self.client.get_or_create_collection("preferences")
            results = collection.get(ids=[f"pref_{key}"])
            if results['documents']:
                return results['documents'][0]
            return None
        else:
            return None

    def get_all_preferences(self):
        if self.chroma_available:
            collection = self.client.get_or_create_collection("preferences")
            results = collection.get()
            prefs = {}
            if results['metadatas']:
                for meta, doc in zip(results['metadatas'], results['documents']):
                    key = meta.get('key')
                    if key:
                        prefs[key] = doc
            return prefs
        else:
            return {}

    def save_workflow(self, user_id: int, name: str, workflow: dict):
        if self.chroma_available:
            import json
            collection = self.client.get_or_create_collection("workflows")
            metadata = {
                "user_id": str(user_id),
                "name": name,
                "workflow": json.dumps(workflow),
                "timestamp": datetime.now().isoformat()
            }
            collection.upsert(
                documents=[name],
                metadatas=[metadata],
                ids=[f"workflow_{user_id}_{name}"]
            )
            print(f"?? Saved workflow '{name}' for user {user_id}")
        else:
            print("Workflows not supported in fallback mode.")

    def get_workflows(self, user_id: int):
        if self.chroma_available:
            collection = self.client.get_or_create_collection("workflows")
            results = collection.get(where={"user_id": str(user_id)})
            workflows = []
            if results['metadatas']:
                for meta in results['metadatas']:
                    workflows.append({
                        "name": meta['name'],
                        "workflow": json.loads(meta['workflow']),
                        "timestamp": meta['timestamp']
                    })
            return workflows
        else:
            return []

    def get_workflow(self, user_id: int, name: str):
        if self.chroma_available:
            collection = self.client.get_or_create_collection("workflows")
            results = collection.get(ids=[f"workflow_{user_id}_{name}"])
            if results['metadatas']:
                return json.loads(results['metadatas'][0]['workflow'])
            return None
        else:
            return None
