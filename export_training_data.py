import chromadb
import json
import os

def try_path(path):
    full_path = os.path.join(os.getcwd(), path)
    print(f"Trying path: {full_path}")
    if not os.path.exists(full_path):
        print(f"Path does not exist.")
        return None
    try:
        client = chromadb.PersistentClient(path=full_path)
        collections = [col.name for col in client.list_collections()]
        print(f"Found collections: {collections}")
        return client
    except Exception as e:
        print(f"Error opening ChromaDB at {full_path}: {e}")
        return None

# Try both possible locations
paths = ["./chroma_data", "./backend/chroma_data"]
client = None
for path in paths:
    client = try_path(path)
    if client:
        break

if client is None:
    print("No ChromaDB found. Please ensure the backend has run and stored data.")
    exit(1)

training_data = []
collections = [col.name for col in client.list_collections()]

if "successes" in collections:
    success_collection = client.get_collection("successes")
    success_results = success_collection.get()
    if success_results['metadatas']:
        for meta, doc in zip(success_results['metadatas'], success_results['documents']):
            entry = {
                "instruction": meta['task'],
                "output": meta['plan'],
                "code": doc,
                "type": "success"
            }
            training_data.append(entry)
    print(f"Found {len(success_results['metadatas'])} successes")
else:
    print("No 'successes' collection found. Please generate at least one app first.")

if "failures" in collections:
    failure_collection = client.get_collection("failures")
    failure_results = failure_collection.get()
    if failure_results['metadatas']:
        for meta, doc in zip(failure_results['metadatas'], failure_results['documents']):
            entry = {
                "instruction": meta['task'],
                "error": meta['error'],
                "output": meta['plan'],
                "code": doc,
                "type": "failure"
            }
            training_data.append(entry)
    print(f"Found {len(failure_results['metadatas'])} failures")
else:
    print("No 'failures' collection found.")

output_file = "training_data.jsonl"
with open(output_file, "w", encoding="utf-8") as f:
    for entry in training_data:
        f.write(json.dumps(entry) + "\n")

print(f"Exported {len(training_data)} total examples to {output_file}")
