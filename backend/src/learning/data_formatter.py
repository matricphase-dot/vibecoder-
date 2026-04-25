# backend/src/learning/data_formatter.py
import json
from datasets import Dataset
from typing import List, Dict

def format_for_training(records: List[Dict]) -> Dataset:
    """Convert feedback records into HuggingFace Dataset for SFT."""
    instructions = []
    outputs = []
    for rec in records:
        instructions.append(rec["prompt"])
        outputs.append(rec["completion"])
    data_dict = {"instruction": instructions, "output": outputs}
    # Alpaca format: {"instruction": ..., "output": ...}
    dataset = Dataset.from_dict(data_dict)
    return dataset
