#!/usr/bin/env python3
"""
Complete NLP Setup Script
Fetches data, trains models, and prepares for deployment
"""

import os
import sys
import subprocess
from pathlib import Path

class NLPSetup:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.data_dir = self.project_root / "data"
        self.models_dir = self.project_root / "models"
    
    def run_command(self, command, description):
        """Run shell command"""
        print(f"\n{'='*60}")
        print(f"  {description}")
        print(f"{'='*60}")
        
        try:
            result = subprocess.run(command, shell=True, check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"✗ Error: {e}")
            return False
    
    def install_dependencies(self):
        """Install Python dependencies"""
        print("\n[1/4] Installing Python dependencies...")
        
        # Install base requirements
        if not self.run_command(
            "pip install -r requirements.txt",
            "Installing NLP dependencies"
        ):
            return False
        
        # Install server requirements
        if not self.run_command(
            "pip install -r server_requirements.txt",
            "Installing inference server dependencies"
        ):
            return False
        
        print("✓ Dependencies installed")
        return True
    
    def fetch_data(self):
        """Fetch data from external sources"""
        print("\n[2/4] Fetching data from research sources...")
        
        # Change to nlp directory
        os.chdir(self.project_root)
        
        if not self.run_command(
            f'"{sys.executable}" data_pipeline.py',
            "Fetching data from PubMed, arXiv, and Shodhganga"
        ):
            print("⚠ Warning: Data fetching had some issues, but continuing...")
        
        print("✓ Data fetched")
        return True
    
    def train_models(self):
        """Train NLP models"""
        print("\n[3/4] Training NLP models...")
        
        if not self.run_command(
            f'"{sys.executable}" train_all_models.py',
            "Training summarization, QA, and tone analysis models"
        ):
            print("⚠ Warning: Model training had issues...")
            return False
        
        print("✓ Models trained")
        return True
    
    def create_docker_image(self):
        """Create Docker image for inference server"""
        print("\n[4/4] Preparing deployment...")
        
        # Check if Docker is available
        result = subprocess.run("docker --version", shell=True, capture_output=True)
        if result.returncode != 0:
            print("⚠ Docker not installed, skipping image creation")
            print("  You can run 'docker build -f Dockerfile.nlp -t summarizer-nlp .' manually")
            return True
        
        os.chdir(self.project_root.parent)
        
        if self.run_command(
            "docker build -f nlp/Dockerfile.nlp -t summarizer-nlp .",
            "Building Docker image for NLP inference server"
        ):
            print("✓ Docker image created: summarizer-nlp")
            print("  Run with: docker run -p 5000:5000 summarizer-nlp")
            return True
        
        return False
    
    def run(self):
        """Run complete setup"""
        print("\\n" + "="*60)
        print("  NLP MODEL SETUP")
        print("="*60)
        print("\\nThis script will:")
        print("  1. Install Python dependencies")
        print("  2. Fetch data from PubMed, arXiv, Shodhganga")
        print("  3. Train local NLP models")
        print("  4. Prepare for deployment")
        print("\\nNote: This may take 30+ minutes depending on network speed")
        print("="*60)
        
        input("\\nPress Enter to continue...")
        
        steps = [
            ("Installing Dependencies", self.install_dependencies),
            ("Fetching Data", self.fetch_data),
            ("Training Models", self.train_models),
            ("Preparing Deployment", self.create_docker_image),
        ]
        
        for step_name, step_func in steps:
            if not step_func():
                print(f"\\n✗ Setup failed at {step_name}")
                return False
        
        print("\\n" + "="*60)
        print("✓ SETUP COMPLETE!")
        print("="*60)
        print("\\nNext steps:")
        print("  1. Start the inference server:")
        print("     python nlp/inference_server.py")
        print("\\n  2. Set environment variable (in another terminal):")
        print("     export NLP_SERVER_URL=http://localhost:5000")
        print("\\n  3. Run the app:")
        print("     npm run dev")
        print("\\n  4. Open http://localhost:9002")
        print("="*60)
        
        return True


if __name__ == "__main__":
    setup = NLPSetup()
    success = setup.run()
    sys.exit(0 if success else 1)
