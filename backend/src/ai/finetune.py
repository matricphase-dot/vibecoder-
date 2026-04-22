import os
import json
from typing import List, Dict
from datasets import Dataset
from transformers import TrainingArguments
from unsloth import FastLanguageModel, is_bfloat16_supported
from peft import LoraConfig, get_peft_model
import torch

class FineTuner:
    def __init__(self, base_model_name="unsloth/llama-3-8b-bnb-4bit"):
        self.base_model_name = base_model_name
        self.model = None
        self.tokenizer = None
        self.lora_model = None

    def load_model(self):
        if self.model is None:
            self.model, self.tokenizer = FastLanguageModel.from_pretrained(
                model_name=self.base_model_name,
                max_seq_length=4096,
                dtype=None,
                load_in_4bit=True,
            )
        return self.model, self.tokenizer

    def prepare_dataset(self, code_snippets: List[Dict[str, str]]):
        """Convert code snippets to training format: instruction = "Write code for: {prompt}", output = code"""
        data = []
        for item in code_snippets:
            prompt = item.get("prompt", "Generate code")
            code = item.get("code", "")
            text = f"### Instruction:\n{prompt}\n\n### Response:\n{code}"
            data.append({"text": text})
        return Dataset.from_list(data)

    def train(self, dataset, output_dir="./lora_adapter", steps=50):
        model, tokenizer = self.load_model()
        model = FastLanguageModel.get_peft_model(
            model,
            r=16,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                            "gate_proj", "up_proj", "down_proj"],
            lora_alpha=16,
            lora_dropout=0,
            bias="none",
            use_gradient_checkpointing="unsloth",
            random_state=3407,
            use_rslora=False,
            loftq_config=None,
        )
        training_args = TrainingArguments(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            num_train_epochs=1,
            max_steps=steps,
            learning_rate=2e-4,
            fp16=not is_bfloat16_supported(),
            bf16=is_bfloat16_supported(),
            logging_steps=10,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
            output_dir=output_dir,
            report_to="none",
        )
        trainer = Trainer(
            model=model,
            tokenizer=tokenizer,
            args=training_args,
            train_dataset=dataset,
        )
        trainer.train()
        model.save_pretrained(output_dir)
        tokenizer.save_pretrained(output_dir)
        return output_dir
