"""
NLP Model Inference Server
Flask-based server for local NLP models
"""

from flask import Flask, request, jsonify
import os
import json
from pathlib import Path
import torch
import math
import re
from typing import List
from collections import Counter
from transformers import pipeline

app = Flask(__name__)

# Load models
MODELS_DIR = Path(__file__).parent / "models"

# Global model cache
models_cache = {}

MAX_SUMMARY_CHUNKS = int(os.getenv("MAX_SUMMARY_CHUNKS", "24"))
SUMMARY_TOP_CHUNKS = int(os.getenv("SUMMARY_TOP_CHUNKS", "10"))
MAX_QA_CHUNKS = int(os.getenv("MAX_QA_CHUNKS", "8"))
CHUNK_WORDS = int(os.getenv("CHUNK_WORDS", "900"))
CHUNK_OVERLAP_WORDS = int(os.getenv("CHUNK_OVERLAP_WORDS", "80"))
QA_CHUNK_WORDS = int(os.getenv("QA_CHUNK_WORDS", "900"))
TONE_SAMPLE_CHUNKS = int(os.getenv("TONE_SAMPLE_CHUNKS", "4"))

SUMMARY_MODEL_NAME = os.getenv("SUMMARY_MODEL", "facebook/bart-large-cnn")
QA_MODEL_NAME = os.getenv("QA_MODEL", "deepset/roberta-base-squad2")
TONE_MODEL_NAME = os.getenv(
    "TONE_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest"
)

def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()

def split_sentences(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [sentence.strip() for sentence in sentences if sentence.strip()]

def extractive_summary(text: str, sentence_limit: int = 4) -> str:
    sentences = split_sentences(text)
    if not sentences:
        return ""
    if len(sentences) <= sentence_limit:
        return " ".join(sentences)

    stopwords = {
        "the", "and", "for", "are", "with", "that", "this", "from", "into", "your",
        "their", "they", "have", "has", "had", "but", "not", "you", "was", "were",
        "will", "would", "should", "could", "about", "which", "these", "those",
        "also", "such", "than", "then", "what", "when", "where", "why", "who",
        "how", "can", "its", "our", "one", "two", "three", "four", "five", "over",
        "under", "between", "within", "without", "more", "most", "less", "least",
    }

    words = re.findall(r"[a-zA-Z]{3,}", text.lower())
    freq = Counter(word for word in words if word not in stopwords)
    if not freq:
        return " ".join(sentences[:sentence_limit])

    max_freq = max(freq.values())
    normalized = {word: count / max_freq for word, count in freq.items()}

    scored = []
    for idx, sentence in enumerate(sentences):
        tokens = re.findall(r"[a-zA-Z]{3,}", sentence.lower())
        if not tokens:
            continue
        score = sum(normalized.get(token, 0.0) for token in tokens) / len(tokens)
        position_bonus = 1.0 - (idx / max(len(sentences) - 1, 1))
        scored.append((score + 0.15 * position_bonus, idx, sentence))

    top = sorted(scored, key=lambda item: item[0], reverse=True)[:sentence_limit]
    top_sorted = sorted(top, key=lambda item: item[1])
    return " ".join(item[2] for item in top_sorted)

def chunk_words(text: str, words_per_chunk: int, overlap_words: int = 0):
    words = text.split()
    if not words:
        return []
    chunks = []
    step = max(1, words_per_chunk - max(0, overlap_words))
    for i in range(0, len(words), step):
        chunks.append(" ".join(words[i:i + words_per_chunk]))
    return chunks

def tokenize_for_scoring(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z]{3,}", text.lower())

def select_top_chunks(chunks: List[str], top_n: int, query: str | None = None) -> List[str]:
    if not chunks:
        return []
    if len(chunks) <= top_n:
        return chunks

    if query:
        query_tokens = tokenize_for_scoring(query)
        query_counts = Counter(query_tokens)
        def score_chunk(chunk: str) -> float:
            tokens = tokenize_for_scoring(chunk)
            counts = Counter(tokens)
            return sum(counts[token] * query_counts[token] for token in query_counts)
    else:
        all_tokens = []
        for chunk in chunks:
            all_tokens.extend(tokenize_for_scoring(chunk))
        global_counts = Counter(all_tokens)
        top_terms = {term for term, _ in global_counts.most_common(50)}

        def score_chunk(chunk: str) -> float:
            tokens = tokenize_for_scoring(chunk)
            counts = Counter(tokens)
            return sum(counts[token] for token in top_terms)

    scores = [score_chunk(chunk) for chunk in chunks]
    ranked = sorted(range(len(chunks)), key=lambda i: scores[i], reverse=True)
    top_indices = sorted(ranked[:top_n])
    return [chunks[i] for i in top_indices]

def summarize_chunks(chunks):
    if not chunks:
        return ""

    summaries = []
    for chunk in chunks[:MAX_SUMMARY_CHUNKS]:
        word_count = len(chunk.split())
        max_length = min(180, max(60, int(word_count * 0.4)))
        min_length = min(80, max(20, int(word_count * 0.15)))
        result = models_cache['summarization'](
            chunk,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,
            truncation=True
        )
        if result:
            summaries.append(extract_summary_text(result[0]))
    return " ".join(summaries)

def extract_summary_text(result_item: dict) -> str:
    if 'summary_text' in result_item:
        return result_item['summary_text']
    if 'generated_text' in result_item:
        return result_item['generated_text']
    return ""

def build_pipeline(task: str, model_name: str):
    try:
        return pipeline(task, model=model_name, device=0 if torch.cuda.is_available() else -1)
    except Exception:
        if task == "summarization":
            return pipeline(
                "text2text-generation",
                model=model_name,
                device=0 if torch.cuda.is_available() else -1
            )
        raise

def load_summarization_model():
    """Load summarization model"""
    try:
        model_path = MODELS_DIR / "summarization"
        if not model_path.exists():
            # Use pre-trained if not fine-tuned
            model_path = SUMMARY_MODEL_NAME
        
        models_cache['summarization'] = build_pipeline("summarization", str(model_path))
        models_cache['summarization_mode'] = "model"
        return True
    except Exception as e:
        print(f"Error loading summarization model: {e}")
        models_cache['summarization'] = None
        models_cache['summarization_mode'] = "extractive"
        return True

def load_qa_model():
    """Load QA model"""
    try:
        model_path = MODELS_DIR / "qa"
        if not model_path.exists():
            model_path = QA_MODEL_NAME
        
        models_cache['qa'] = pipeline(
            "question-answering",
            model=str(model_path),
            device=0 if torch.cuda.is_available() else -1
        )
        return True
    except Exception as e:
        print(f"Error loading summarization model: {e}")
        return False

def load_tone_model():
    """Load tone analysis model"""
    try:
        model_path = MODELS_DIR / "tone"
        if not model_path.exists():
            model_path = TONE_MODEL_NAME
        
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
        
        text = normalize_text(text)
        chunks = chunk_words(text, CHUNK_WORDS, CHUNK_OVERLAP_WORDS)

        if models_cache.get('summarization_mode') == "extractive" or not models_cache.get('summarization'):
            summary = extractive_summary(text, sentence_limit=4)
        else:
            if len(chunks) <= 1:
                result = models_cache['summarization'](
                    text,
                    max_length=160,
                    min_length=30,
                    do_sample=False,
                    truncation=True
                )
                summary = extract_summary_text(result[0]) if result else text
            else:
                selected_chunks = select_top_chunks(
                    chunks,
                    top_n=min(SUMMARY_TOP_CHUNKS, MAX_SUMMARY_CHUNKS)
                )
                summary = summarize_chunks(selected_chunks)
                if len(summary.split()) > 200:
                    final_result = models_cache['summarization'](
                        summary,
                        max_length=180,
                        min_length=40,
                        do_sample=False,
                        truncation=True
                    )
                    summary = extract_summary_text(final_result[0]) if final_result else summary
        
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
        
        context = normalize_text(context)
        chunks = chunk_words(context, QA_CHUNK_WORDS, CHUNK_OVERLAP_WORDS)
        if not chunks:
            return jsonify({"error": "Empty document context", "success": False}), 400

        best_answer = ""
        best_score = -1.0

        candidate_chunks = select_top_chunks(
            chunks,
            top_n=min(MAX_QA_CHUNKS, len(chunks)),
            query=question
        )

        for chunk in candidate_chunks:
            result = models_cache['qa'](
                question=question,
                context=chunk,
                handle_impossible_answer=True
            )
            score = float(result.get('score', 0))
            if score > best_score:
                best_score = score
                best_answer = result.get('answer', '')

        answer_text = best_answer or "No answer found in the document."
        if best_score < 0.05:
            answer_text = "No confident answer found in the document."

        return jsonify({
            "answer": answer_text,
            "score": float(best_score),
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
        
        text = normalize_text(text)
        chunks = chunk_words(text, QA_CHUNK_WORDS, CHUNK_OVERLAP_WORDS)
        if not chunks:
            return jsonify({"error": "No text provided", "success": False}), 400

        sample_chunks = chunks[:TONE_SAMPLE_CHUNKS]
        labels = []
        scores = []
        for chunk in sample_chunks:
            result = models_cache['tone'](chunk)
            sentiment_scores = result[0] if isinstance(result, list) else result
            labels.append(sentiment_scores.get('label', 'NEUTRAL'))
            scores.append(float(sentiment_scores.get('score', 0)))

        label_counts = {label: labels.count(label) for label in set(labels)}
        top_label = max(label_counts, key=label_counts.get)

        return jsonify({
            "sentiment": top_label,
            "confidence": float(sum(scores) / max(len(scores), 1)),
            "tone": "formal",
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
