import json
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from datasets import Dataset
import glob

def load_data(data_dir="finetuning_data"):
    """Load all JSONL files and prepare text pairs."""
    texts = []
    files = glob.glob(os.path.join(data_dir, "*.jsonl"))
    for file in files:
        with open(file, "r") as f:
            for line in f:
                item = json.loads(line)
                # Format: "Prompt: {prompt}\nPlan: {plan}"
                text = f"Prompt: {item['prompt']}\nPlan: {item['plan']}"
                texts.append(text)
    return texts

def train_model(data_dir="finetuning_data", model_output_dir="finetuned_model"):
    """Fine-tune a small language model on collected data."""
    texts = load_data(data_dir)
    if len(texts) == 0:
        print("No training data found. Exiting.")
        return

    # Use a small model for demonstration (e.g., distilgpt2)
    model_name = "distilgpt2"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token  # set pad token

    model = AutoModelForCausalLM.from_pretrained(model_name)

    # Tokenize dataset
    def tokenize_function(examples):
        return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=512)

    dataset = Dataset.from_dict({"text": texts})
    tokenized_dataset = dataset.map(tokenize_function, batched=True, remove_columns=["text"])

    # Data collator for language modeling
    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    # Training arguments
    training_args = TrainingArguments(
        output_dir=model_output_dir,
        overwrite_output_dir=True,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        save_steps=500,
        save_total_limit=2,
        logging_dir='./logs',
        logging_steps=100,
        prediction_loss_only=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    trainer.train()
    trainer.save_model(model_output_dir)
    tokenizer.save_pretrained(model_output_dir)
    print(f"Model saved to {model_output_dir}")

if __name__ == "__main__":
    train_model()
