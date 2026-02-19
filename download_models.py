#!/usr/bin/env python3
"""Download and cache the best NLP models for the summarizer project."""

import os
import sys
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForQuestionAnswering, AutoModelForSequenceClassification
import torch

# Set HuggingFace cache directory
HF_HOME = os.path.join(str(Path.cwd()), "models_cache")
os.environ["HF_HOME"] = HF_HOME
os.environ["TRANSFORMERS_CACHE"] = HF_HOME

print(f"🔍 Using model cache directory: {HF_HOME}")
os.makedirs(HF_HOME, exist_ok=True)

print("\n" + "="*60)
print("📥 Downloading Best NLP Models")
print("="*60)

# Model configurations
models = [
    {
        "name": "BART for Summarization",
        "model_id": "facebook/bart-large-cnn",
        "type": "seq2seq",
        "loader": (AutoTokenizer, AutoModelForSeq2SeqLM),
    },
    {
        "name": "RoBERTa for Q&A",
        "model_id": "deepset/roberta-base-squad2",
        "type": "qa",
        "loader": (AutoTokenizer, AutoModelForQuestionAnswering),
    },
    {
        "name": "RoBERTa for Sentiment/Tone",
        "model_id": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "type": "sentiment",
        "loader": (AutoTokenizer, AutoModelForSequenceClassification),
    },
]

print(f"\n⚙️  PyTorch: {torch.__version__}")
print(f"📦 CUDA available: {torch.cuda.is_available()}\n")

failed_models = []
for i, model_config in enumerate(models, 1):
    print(f"\n[{i}/{len(models)}] Downloading {model_config['name']}...")
    print(f"    Model ID: {model_config['model_id']}")
    
    try:
        tokenizer_class, model_class = model_config["loader"]
        
        # Download tokenizer
        print(f"    ⬇️  Downloading tokenizer...")
        tokenizer = tokenizer_class.from_pretrained(
            model_config["model_id"],
            trust_remote_code=True,
        )
        print(f"    ✅ Tokenizer cached")
        
        # Download model
        print(f"    ⬇️  Downloading model (~500-1500MB)...")
        model = model_class.from_pretrained(
            model_config["model_id"],
            trust_remote_code=True,
        )
        print(f"    ✅ Model cached: {model.config.model_type}")
        
        print(f"    📊 Model params: {sum(p.numel() for p in model.parameters()):,}")
        
    except Exception as e:
        print(f"    ❌ Failed: {e}")
        failed_models.append(model_config["name"])


print("\n" + "="*60)
print("✨ Download Summary")
print("="*60)

successful = len(models) - len(failed_models)
print(f"✅ Successfully cached: {successful}/{len(models)} models")

if failed_models:
    print(f"\n⚠️  Failed models:")
    for model in failed_models:
        print(f"  - {model}")
    print("\nNote: The inference server will use fallback methods for failed models")
else:
    print("\n🎉 All models downloaded and cached successfully!")

print(f"\n📁 Models location: {HF_HOME}")
print(f"📊 Cache size: {calculate_dir_size(HF_HOME)}")
print("\n✅ Ready to start NLP server with venv_nlp environment!")

def calculate_dir_size(path):
    """Calculate directory size in MB."""
    total = 0
    try:
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += calculate_dir_size(entry.path)
    except:
        pass
    return f"{total / (1024*1024):.1f} MB"
