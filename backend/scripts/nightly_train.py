# backend/scripts/nightly_train.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
import json
import logging
from datetime import datetime
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import Dataset
from trl import SFTTrainer
from src.learning.feedback_collector import FeedbackCollector
from src.learning.data_formatter import format_for_training

logging.basicConfig(level=logging.INFO, filename="./backend/logs/training.log", filemode="a")
logger = logging.getLogger(__name__)

def train():
    logger.info(f"Starting nightly training at {datetime.now()}")
    collector = FeedbackCollector()
    stats = collector.get_stats()
    if not stats["ready_for_training"]:
        logger.info(f"Not enough accepted examples ({stats['accepted']}/10). Skipping training.")
        return

    # Get last 24h accepted completions
    records = collector.get_training_data(since_hours=24)
    if len(records) < 10:
        logger.info(f"Only {len(records)} new examples, need 10. Skipping.")
        return

    dataset = format_for_training(records)
    # Use a small base model for LoRA (you can change to your model)
    model_name = "codellama/CodeLlama-7b-hf"
    logger.info(f"Loading base model {model_name} with 4-bit quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token

    # Prepare for k-bit training
    model = prepare_model_for_kbit_training(model)
    # LoRA config
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    training_args = TrainingArguments(
        output_dir="./backend/adapters/temp",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        logging_steps=10,
        save_strategy="epoch",
        report_to="none"
    )
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        tokenizer=tokenizer,
        max_seq_length=512,
        dataset_text_field="instruction",  # we'll use instruction as input
        packing=False
    )
    trainer.train()
    # Save adapter
    adapter_path = f"./backend/adapters/{datetime.now().strftime('%Y-%m-%d')}"
    model.save_pretrained(adapter_path)
    # Symlink latest
    latest_link = Path("./backend/adapters/latest")
    if latest_link.exists() or latest_link.is_symlink():
        latest_link.unlink()
    latest_link.symlink_to(adapter_path, target_is_directory=True)
    logger.info(f"Training complete. Adapter saved to {adapter_path}")
    # Optionally merge and create new Ollama model (not implemented here)

if __name__ == "__main__":
    train()
