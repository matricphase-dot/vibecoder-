import chromadb
import json
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./backend/chroma_data")
success_collection = client.get_collection("successes")

results = success_collection.get()
data = []
for meta, doc in zip(results['metadatas'], results['documents']):
    data.append({
        "instruction": meta['task'],
        "output": meta['plan'],
        "code": doc  # or store actual code separately
    })

with open("training_data.json", "w") as f:
    json.dump(data, f, indent=2)
print(f"Exported {len(data)} examples to training_data.json")
