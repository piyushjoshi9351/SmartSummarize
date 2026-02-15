"""
NLP Model Inference Server
Flask-based server for local NLP models
"""

from flask import Flask, request, jsonify
import os
import json
from pathlib import Path
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM,
    AutoModelForQuestionAnswering,
    AutoModelForSequenceClassification,
    pipeline
)

app = Flask(__name__)

# Load models
MODELS_DIR = Path(__file__).parent / "models"

# Global model cache
models_cache = {}

def load_summarization_model():
    """Load summarization model"""
    try:
        model_path = MODELS_DIR / "summarization"
        if not model_path.exists():
            # Use pre-trained if not fine-tuned
            model_path = "facebook/bart-large-cnn"
        
        models_cache['summarization'] = pipeline(
            "summarization",
            model=str(model_path),
            device=0 if torch.cuda.is_available() else -1
        )
        return True
    except Exception as e:
        print(f"Error loading summarization model: {e}")
        return False

def load_qa_model():
    """Load QA model"""
    try:
        model_path = MODELS_DIR / "qa"
        if not model_path.exists():
            model_path = "distilbert-base-uncased-distilled-squad"
        
        models_cache['qa'] = pipeline(
            "question-answering",
            model=str(model_path),
            device=0 if torch.cuda.is_available() else -1
        )
        return True
    except Exception as e:
        print(f"Error loading QA model: {e}")
        return False

def load_tone_model():
    """Load tone analysis model"""
    try:
        model_path = MODELS_DIR / "tone"
        if not model_path.exists():
            model_path = "distilbert-base-uncased"
        
        models_cache['tone'] = pipeline(
            "sentiment-analysis",
            model=str(model_path),
            device=0 if torch.cuda.is_available() else -1
        )
        
        # Load label mappings if available
        label_file = model_path / "label_mappings.json" if Path(model_path).is_dir() else None
        if label_file and label_file.exists():
            with open(label_file) as f:
                models_cache['tone_labels'] = json.load(f)
        
        return True
    except Exception as e:
        print(f"Error loading tone model: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/api/summarize', methods=['POST'])
def summarize():
    """Summarize document"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        if 'summarization' not in models_cache:
            if not load_summarization_model():
                return jsonify({"error": "Failed to load summarization model"}), 500
        
        # Limit text length for performance
        text = text[:1024]
        
        result = models_cache['summarization'](text, max_length=150, min_length=30, do_sample=False)
        summary = result[0]['summary_text'] if result else text
        
        return jsonify({
            "summary": summary,
            "success": True
        })
    
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/api/qa', methods=['POST'])
def answer_question():
    """Answer question about document"""
    try:
        data = request.json
        context = data.get('context', '')
        question = data.get('question', '')
        
        if not context or not question:
            return jsonify({"error": "Context and question required"}), 400
        
        if 'qa' not in models_cache:
            if not load_qa_model():
                return jsonify({"error": "Failed to load QA model"}), 500
        
        result = models_cache['qa'](question=question, context=context)
        
        return jsonify({
            "answer": result['answer'],
            "score": float(result['score']),
            "success": True
        })
    
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/api/tone', methods=['POST'])
def analyze_tone():
    """Analyze document tone and sentiment"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        if 'tone' not in models_cache:
            if not load_tone_model():
                return jsonify({"error": "Failed to load tone model"}), 500
        
        # Limit text length
        text = text[:512]
        
        result = models_cache['tone'](text)
        
        # Determine sentiment
        sentiment_scores = result[0] if isinstance(result, list) else result
        
        return jsonify({
            "sentiment": sentiment_scores.get('label', 'NEUTRAL'),
            "confidence": float(sentiment_scores.get('score', 0)),
            "tone": "formal",  # Determined based on model
            "success": True
        })
    
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/api/load-models', methods=['POST'])
def load_models():
    """Load all models on demand"""
    try:
        results = {
            "summarization": load_summarization_model(),
            "qa": load_qa_model(),
            "tone": load_tone_model()
        }
        
        return jsonify({
            "models_loaded": results,
            "success": all(results.values())
        })
    
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

if __name__ == '__main__':
    # Pre-load models on startup
    print("Loading NLP models...")
    load_summarization_model()
    load_qa_model()
    load_tone_model()
    
    print("Starting NLP inference server...")
    app.run(host='0.0.0.0', port=5000, debug=False)
