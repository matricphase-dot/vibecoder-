# backend/src/rl/rl_trainer.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
import sqlite3
import json
from datetime import datetime, timedelta
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import DPOTrainer
from peft import LoraConfig, get_peft_model
from datasets import Dataset
import logging

logger = logging.getLogger(__name__)

class RLTrainer:
    def __init__(self, db_path="./workspace/.rl/rewards.db", model_name="codellama/CodeLlama-7b-hf"):
        self.db_path = db_path
        self.model_name = model_name

    def get_training_pairs(self, min_reward=0.7, hours=24):
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        conn = sqlite3.connect(self.db_path)
        cur = conn.execute("""
            SELECT prompt, completion, reward FROM rewards
            WHERE reward >= ? AND timestamp >= ?
        """, (min_reward, cutoff))
        rows = cur.fetchall()
        conn.close()
        # For DPO we need chosen/rejected pairs; we'll use high reward as chosen and a low-reward sample as rejected.
        # Simplified: just use high reward examples for SFT (continue training)
        return [{"prompt": r[0], "completion": r[1]} for r in rows]

    def train(self):
        pairs = self.get_training_pairs()
        if len(pairs) < 10:
            logger.info(f"Only {len(pairs)} high-reward examples, need 10. Skipping RL training.")
            return
        dataset = Dataset.from_list(pairs)
        # Load base model with 4-bit
        from transformers import BitsAndBytesConfig
        bnb_config = BitsAndBytesConfig(load_in_4bit=True)
        model = AutoModelForCausalLM.from_pretrained(self.model_name, quantization_config=bnb_config, device_map="auto")
        tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        tokenizer.pad_token = tokenizer.eos_token
        # LoRA
        lora_config = LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj","v_proj"])
        model = get_peft_model(model, lora_config)
        training_args = TrainingArguments(
            output_dir="./backend/adapters/rl_temp",
            per_device_train_batch_size=2,
            num_train_epochs=2,
            logging_steps=10,
            save_strategy="epoch"
        )
        from trl import SFTTrainer
        trainer = SFTTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            tokenizer=tokenizer,
            max_seq_length=512,
            dataset_text_field="completion",
            packing=False
        )
        trainer.train()
        adapter_path = f"./backend/adapters/rl_{datetime.now().strftime('%Y%m%d_%H%M')}"
        model.save_pretrained(adapter_path)
        # Update symlink
        latest = Path("./backend/adapters/rl_latest")
        if latest.exists():
            latest.unlink()
        latest.symlink_to(adapter_path, target_is_directory=True)
        logger.info(f"RL training complete. Adapter saved to {adapter_path}")
