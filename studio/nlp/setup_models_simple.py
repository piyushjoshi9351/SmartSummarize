"""
Simplified NLP Model Setup
Uses pre-trained models without fine-tuning for immediate use
"""

import os
from pathlib import Path
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    AutoModelForQuestionAnswering,
    AutoModelForSequenceClassification,
    pipeline
)
import torch

class SimpleModelSetup:
    def __init__(self):
        self.models_dir = Path("models")
        self.models_dir.mkdir(exist_ok=True)
        
    def setup_summarization(self):
        """Setup summarization pipeline"""
        print("\n[1/3] Setting up Summarization Model...")
        try:
            model_name = "facebook/bart-large-cnn"
            print(f"  Loading {model_name}...")
            
            try:
                pipe = pipeline("summarization", model=model_name)
            except Exception:
                pipe = pipeline("text2text-generation", model=model_name)
            
            # Save model locally
            model_path = self.models_dir / "summarization"
            model_path.mkdir(exist_ok=True)
            
            pipe.model.save_pretrained(str(model_path))
            pipe.tokenizer.save_pretrained(str(model_path))
            
            print(f"  ✓ Summarization model saved to {model_path}")
            return True
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return False
    
    def setup_qa(self):
        """Setup QA pipeline"""
        print("\n[2/3] Setting up QA Model...")
        try:
            model_name = "deepset/roberta-base-squad2"
            print(f"  Loading {model_name}...")
            
            pipe = pipeline("question-answering", model=model_name)
            
            # Save model locally
            model_path = self.models_dir / "qa"
            model_path.mkdir(exist_ok=True)
            
            pipe.model.save_pretrained(str(model_path))
            pipe.tokenizer.save_pretrained(str(model_path))
            
            print(f"  ✓ QA model saved to {model_path}")
            return True
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return False
    
    def setup_tone(self):
        """Setup tone analysis pipeline"""
        print("\n[3/3] Setting up Tone Analysis Model...")
        try:
            model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
            print(f"  Loading {model_name}...")
            
            pipe = pipeline("sentiment-analysis", model=model_name)
            
            # Save model locally
            model_path = self.models_dir / "tone"
            model_path.mkdir(exist_ok=True)
            
            pipe.model.save_pretrained(str(model_path))
            pipe.tokenizer.save_pretrained(str(model_path))
            
            print(f"  ✓ Tone analysis model saved to {model_path}")
            return True
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return False
    
    def run(self):
        """Run complete setup"""
        print("\n" + "="*60)
        print("DOWNLOADING & SETTING UP PRE-TRAINED MODELS")
        print("="*60)
        print("This will download and cache the models locally...")
        
        results = {
            "summarization": self.setup_summarization(),
            "qa": self.setup_qa(),
            "tone": self.setup_tone(),
        }
        
        print("\n" + "="*60)
        print("SETUP COMPLETE!")
        print("="*60)
        print("\nModels Ready:")
        for model_name, success in results.items():
            status = "✓" if success else "✗"
            print(f"  {status} {model_name}")
        
        if all(results.values()):
            print("\n✓ All models ready! Start the inference server:")
            print("  python inference_server.py")
            return True
        else:
            print("\n⚠ Some models failed to setup")
            return False


if __name__ == "__main__":
    setup = SimpleModelSetup()
    success = setup.run()
    exit(0 if success else 1)
