"""
Model Training Orchestrator
Trains all models end-to-end
"""

from pathlib import Path
from models.summarization_trainer import SummarizationModelTrainer
from models.qa_trainer import QAModelTrainer
from models.tone_trainer import ToneAnalysisTrainer
import json

class ModelTrainingOrchestrator:
    def __init__(self, data_dir: str = "./data", models_dir: str = "./models"):
        self.data_dir = Path(data_dir)
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
    
    def train_all(self):
        """Train all models"""
        print("=" * 60)
        print("TRAINING ALL NLP MODELS")
        print("=" * 60)
        
        trained_models = {}
        
        # 1. Summarization Model
        if (self.data_dir / "summarization_train.csv").exists():
            print("\n[1/3] Training Summarization Model...")
            print("-" * 40)
            try:
                trainer = SummarizationModelTrainer()
                dataset = trainer.prepare_data(str(self.data_dir / "summarization_train.csv"))
                output_path = str(self.models_dir / "summarization")
                trainer.train(dataset, output_path)
                trained_models["summarization"] = output_path
                print("✓ Summarization model trained successfully")
            except Exception as e:
                print(f"✗ Error training summarization model: {e}")
        
        # 2. QA Model
        if (self.data_dir / "qa_train.csv").exists():
            print("\n[2/3] Training QA Model...")
            print("-" * 40)
            try:
                trainer = QAModelTrainer()
                dataset = trainer.prepare_data(str(self.data_dir / "qa_train.csv"))
                output_path = str(self.models_dir / "qa")
                trainer.train(dataset, output_path)
                trained_models["qa"] = output_path
                print("✓ QA model trained successfully")
            except Exception as e:
                print(f"✗ Error training QA model: {e}")
        
        # 3. Tone Analysis Model
        if (self.data_dir / "tone_train.csv").exists():
            print("\n[3/3] Training Tone Analysis Model...")
            print("-" * 40)
            try:
                trainer = ToneAnalysisTrainer()
                dataset = trainer.prepare_data(str(self.data_dir / "tone_train.csv"))
                output_path = str(self.models_dir / "tone")
                trainer.train(dataset, output_path)
                trained_models["tone"] = output_path
                print("✓ Tone analysis model trained successfully")
            except Exception as e:
                print(f"✗ Error training tone analysis model: {e}")
        
        # Save configuration
        config = {
            "models": trained_models,
            "timestamp": str(Path(__file__).stat().st_mtime)
        }
        with open(self.models_dir / "models_config.json", 'w') as f:
            json.dump(config, f, indent=2)
        
        print("\n" + "=" * 60)
        print("TRAINING COMPLETE")
        print("=" * 60)
        print("\nTrained Models:")
        for model_name, path in trained_models.items():
            print(f"  • {model_name}: {path}")
        
        return trained_models


if __name__ == "__main__":
    orchestrator = ModelTrainingOrchestrator()
    orchestrator.train_all()
