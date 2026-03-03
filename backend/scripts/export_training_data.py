# export_training_data.py
import json
import os
import chromadb
from datetime import datetime

def export_training_data(output_dir="finetuning_data"):
    """Export successes and failures from ChromaDB for fine-tuning."""
    client = chromadb.PersistentClient(path="chroma_data")
    collection = client.get_or_create_collection(name="agent_memory")
    results = collection.get(include=["documents", "metadatas"])
    
    data = []
    for doc, meta in zip(results["documents"], results["metadatas"]):
        item = {
            "prompt": meta.get("prompt", ""),
            "plan": doc,
            "success": meta.get("success", False),
            "timestamp": meta.get("timestamp", str(datetime.now()))
        }
        data.append(item)
    
    # Save as JSONL
    output_file = os.path.join(output_dir, f"training_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl")
    with open(output_file, "w") as f:
        for item in data:
            f.write(json.dumps(item) + "\n")
    print(f"Exported {len(data)} records to {output_file}")
    return output_file

if __name__ == "__main__":
    export_training_data()
