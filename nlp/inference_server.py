"""
✨ NLP Model Inference Server - High-Quality Local Inference
Flask-based server using best transformers 5.2.0 models
"""

from flask import Flask, request, jsonify
import os
import json
from io import BytesIO
from pathlib import Path
import torch
import logging
from typing import List, Dict, Optional
import re
from collections import Counter
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import torch.nn.functional as F
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)


def load_env_file(file_path: Path) -> None:
    """Load KEY=VALUE pairs from env files without overriding existing env vars."""
    if not file_path.exists():
        return

    try:
        for raw_line in file_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except Exception as e:
        logger.warning(f"⚠️ Could not load env file {file_path}: {e}")


ROOT_DIR = Path(__file__).resolve().parent.parent
load_env_file(ROOT_DIR / ".env")
load_env_file(ROOT_DIR / ".env.local")
load_env_file(Path(__file__).resolve().parent / ".env")
load_env_file(Path(__file__).resolve().parent / ".env.local")

# Try to load NLTK if available, but don't fail if not
try:
    import nltk
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)
    NLTK_AVAILABLE = True
except:
    NLTK_AVAILABLE = False
    logger.warning("⚠️ NLTK not available, using fallback sentence tokenizer")

try:
    from nltk.corpus import stopwords
    stopwords_set = set(stopwords.words("english"))
except:
    stopwords_set = set()

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    AutoModelForQuestionAnswering,
    AutoModelForSequenceClassification,
    pipeline
)

# Configuration
MODELS_DIR = Path(__file__).parent / "models"
MAX_SUMMARY_CHUNKS = int(os.getenv("MAX_SUMMARY_CHUNKS", "16"))
CHUNK_WORDS = int(os.getenv("CHUNK_WORDS", "800"))
QA_CHUNK_WORDS = int(os.getenv("QA_CHUNK_WORDS", "900"))
TONE_SAMPLE_CHUNKS = int(os.getenv("TONE_SAMPLE_CHUNKS", "4"))

# BEST MODELS FOR QUALITY
MODEL_CONFIGS = {
    "summarization": {
        "best": "facebook/bart-large-cnn",  # Best quality abstractive summarization
        "fallback": "facebook/bart-base",  # Lighter fallback
    },
    "qa": {
        "best": "deepset/roberta-base-squad2",  # Best Q&A accuracy
        "fallback": "distilbert-base-uncased-distilled-squad",  # Lightweight fallback
    },
    "sentiment": {
        "best": "cardiffnlp/twitter-roberta-base-sentiment-latest",  # Sentiment-aware
        "fallback": "distilbert-base-uncased-finetuned-sst-2-english",  # Fallback
    }
}

# Global model cache
models_cache = {}
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"🔧 Using device: {device} {'(GPU)' if device == 'cuda' else '(CPU)'}")
prefer_lightweight_models = os.getenv(
    "PREFER_LIGHTWEIGHT_MODELS",
    "1" if device == "cpu" else "0",
) == "1"
embedding_model = None



def normalize_text(text: str) -> str:
    """Normalize text by removing extra whitespace."""
    return re.sub(r"\s+", " ", text).strip()

def remove_page_numbers(lines: List[str]) -> List[str]:
    """Remove lines that appear to be page numbers or page labels."""
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned.append(line)
            continue
        if re.fullmatch(r"\d+", stripped):
            continue
        if re.fullmatch(r"page\s*\d+", stripped, flags=re.IGNORECASE):
            continue
        cleaned.append(line)
    return cleaned

def remove_repeated_headings(lines: List[str]) -> List[str]:
    """Remove repeated heading lines to reduce noise in summaries."""
    cleaned = []
    seen = set()
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned.append(line)
            continue
        is_heading = stripped.isupper() or stripped.istitle()
        key = stripped.lower()
        if is_heading:
            if key in seen:
                continue
            seen.add(key)
        cleaned.append(line)
    return cleaned

def remove_acronym_list(lines: List[str]) -> List[str]:
    """Remove acronym/abbreviation list blocks."""
    cleaned = []
    in_acronym_block = False

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        if re.search(r"^(acronyms|abbreviations)\b", lower):
            in_acronym_block = True
            continue

        if in_acronym_block:
            if not stripped:
                in_acronym_block = False
                continue
            if re.match(r"^[A-Z0-9]{2,}\s*[-:\u2013]\s*.+", stripped):
                continue
            if stripped.isupper() or stripped.istitle():
                in_acronym_block = False
            else:
                continue

        cleaned.append(line)

    return cleaned

def preprocess_for_summary(text: str) -> str:
    """Clean text for summarization by removing noise."""
    lines = text.splitlines()
    lines = remove_page_numbers(lines)
    lines = remove_acronym_list(lines)
    lines = remove_repeated_headings(lines)
    return "\n".join(lines)

def apply_length_control(summary: str, target_min_words: int, target_max_words: int, target_sentences: int) -> str:
    """Trim summary to target words or sentence count."""
    cleaned = normalize_text(summary)

    if target_sentences and target_sentences > 0:
        sentences = split_into_sentences(cleaned)
        trimmed = " ".join(sentences[:target_sentences])
        return trimmed.strip()

    if target_max_words and target_max_words > 0:
        words = cleaned.split()
        if len(words) > target_max_words:
            trimmed = " ".join(words[:target_max_words]).strip()
            if trimmed and trimmed[-1] not in ".!?":
                trimmed += "."
            return trimmed

    return cleaned

def dedupe_preserving_order(items: List[str]) -> List[str]:
    seen = set()
    output = []
    for item in items:
        key = normalize_text(item).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(item)
    return output

def is_overlong_copy_sentence(sentence: str, max_words: int = 28) -> bool:
    words = sentence.split()
    return len(words) > max_words

def compact_sentence(sentence: str, max_words: int = 24) -> str:
    words = sentence.split()
    if len(words) <= max_words:
        return sentence
    compacted = " ".join(words[:max_words]).strip()
    if compacted and compacted[-1] not in ".!?":
        compacted += "."
    return compacted

def improve_summary_quality(summary: str, target_max_words: int, target_sentences: int) -> str:
    sentences = split_into_sentences(summary)
    if not sentences:
        return normalize_text(summary)

    unique_sentences = dedupe_preserving_order(sentences)

    cleaned_sentences: List[str] = []
    for sentence in unique_sentences:
        sentence = normalize_text(sentence)
        if not sentence:
            continue
        if is_overlong_copy_sentence(sentence):
            sentence = compact_sentence(sentence)
        cleaned_sentences.append(sentence)

    if not cleaned_sentences:
        cleaned_sentences = unique_sentences[:3]

    max_sentence_count = target_sentences if target_sentences > 0 else 6
    cleaned_sentences = cleaned_sentences[:max_sentence_count]

    result = " ".join(cleaned_sentences)
    return apply_length_control(result, 0, target_max_words, target_sentences)

def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences using NLTK or fallback."""
    if NLTK_AVAILABLE:
        try:
            sentences = nltk.tokenize.sent_tokenize(text)
            return [s.strip() for s in sentences if s.strip()]
        except:
            pass
    
    # Fallback: simple regex-based sentence splitting
    sentences = re.split(r"[.!?]+", text)
    return [s.strip() for s in sentences if s.strip()]

def chunk_words(text: str, words_per_chunk: int) -> List[str]:
    """Split text into word-based chunks with overlap."""
    words = text.split()
    if not words:
        return []
    
    chunks = []
    overlap = 0
    for i in range(0, len(words), words_per_chunk - overlap):
        chunk = " ".join(words[i : i + words_per_chunk])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def get_embedding_model() -> Optional[SentenceTransformer]:
    """Lazy-load sentence-transformer model for semantic document comparison."""
    global embedding_model
    if embedding_model is not None:
        return embedding_model

    model_name = os.getenv("COMPARE_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    try:
        logger.info(f"🔎 Loading embedding model: {model_name}")
        embedding_model = SentenceTransformer(model_name)
        return embedding_model
    except Exception as e:
        logger.warning(f"⚠️ Embedding model unavailable: {e}")
        embedding_model = None
        return None


def compare_with_embeddings(doc1_text: str, doc2_text: str) -> Optional[Dict]:
    """Compare document chunks using sentence embeddings and cosine similarity."""
    model = get_embedding_model()
    if model is None:
        return None

    doc1_chunks = chunk_words(doc1_text, 220)
    doc2_chunks = chunk_words(doc2_text, 220)

    if not doc1_chunks or not doc2_chunks:
        return None

    doc1_chunks = doc1_chunks[:30]
    doc2_chunks = doc2_chunks[:30]

    try:
        emb1 = model.encode(doc1_chunks, convert_to_tensor=True, show_progress_bar=False)
        emb2 = model.encode(doc2_chunks, convert_to_tensor=True, show_progress_bar=False)
        sim_matrix = F.cosine_similarity(emb1.unsqueeze(1), emb2.unsqueeze(0), dim=2)
    except Exception as e:
        logger.warning(f"⚠️ Embedding comparison failed: {e}")
        return None

    max_sim_1, best_idx_1 = torch.max(sim_matrix, dim=1)
    max_sim_2, _ = torch.max(sim_matrix, dim=0)
    similarity_score = float(((max_sim_1.mean() + max_sim_2.mean()) / 2).item())

    similar_sections = []
    different_sections = []

    top_k = min(3, len(doc1_chunks))
    top_vals, top_idxs = torch.topk(max_sim_1, k=top_k)
    for i in range(top_k):
        score = float(top_vals[i].item())
        if score < 0.45:
            continue
        left_idx = int(top_idxs[i].item())
        right_idx = int(best_idx_1[left_idx].item())
        similar_sections.append({
            "score": round(score, 3),
            "doc1": compact_sentence(normalize_text(doc1_chunks[left_idx]), 28),
            "doc2": compact_sentence(normalize_text(doc2_chunks[right_idx]), 28),
        })

    low_vals, low_idxs = torch.topk(-max_sim_1, k=min(2, len(doc1_chunks)))
    for i in range(len(low_idxs)):
        left_idx = int(low_idxs[i].item())
        score = float(max_sim_1[left_idx].item())
        if score > 0.35:
            continue
        different_sections.append({
            "score": round(score, 3),
            "doc1": compact_sentence(normalize_text(doc1_chunks[left_idx]), 28),
        })

    return {
        "similarity_score": max(0.0, min(1.0, similarity_score)),
        "similar_sections": similar_sections,
        "different_sections": different_sections,
    }

def extractive_summary(text: str, num_sentences: int = 4) -> str:
    """Generate extractive summary when BART is unavailable."""
    sentences = split_into_sentences(text)
    
    if len(sentences) <= num_sentences:
        return " ".join(sentences)
    
    # Score sentences by TF-IDF-like frequency
    words = re.findall(r"\b[a-z]{3,}\b", text.lower())
    word_freq = Counter(w for w in words if w not in stopwords_set)
    
    if not word_freq:
        return " ".join(sentences[:num_sentences])
    
    max_freq = max(word_freq.values())
    scores = []
    
    for idx, sent in enumerate(sentences):
        sent_words = re.findall(r"\b[a-z]{3,}\b", sent.lower())
        freq_score = sum(word_freq.get(w, 0) for w in sent_words) / max(len(sent_words), 1)
        position_bonus = 1.0 - (idx / len(sentences)) * 0.3  # First sentences get bonus
        score = (freq_score / max_freq) * position_bonus
        scores.append((score, idx, sent))
    
    top_sents = sorted(scores, reverse=True)[:num_sentences]
    top_sents.sort(key=lambda x: x[1])
    
    return " ".join(sent for _, _, sent in top_sents)

def load_model_with_fallback(model_type: str) -> bool:
    """Load model with fallback methods when pipeline task unavailable."""
    try:
        models_config = MODEL_CONFIGS.get(model_type, {})
        best_model = models_config.get("best")
        fallback_model = models_config.get("fallback")
        model_candidates = [fallback_model, best_model] if prefer_lightweight_models else [best_model, fallback_model]
        model_candidates = [model for model in model_candidates if model]
        
        logger.info(f"\n📦 Loading {model_type} model: {model_candidates[0]}")
        
        if model_type == "summarization":
            # For summarization, we'll use a text generation pipeline approach
            # since 'summarization' task doesn't exist in all versions
            try:
                logger.info("  Using text2text-generation approach for summarization...")
                tokenizer = None
                model = None
                for candidate in model_candidates:
                    try:
                        tokenizer = AutoTokenizer.from_pretrained(candidate)
                        model = AutoModelForSeq2SeqLM.from_pretrained(candidate)
                        logger.info(f"  Loaded summarization candidate: {candidate}")
                        break
                    except Exception as candidate_error:
                        logger.warning(f"  Summarization candidate failed: {candidate_error}")
                        tokenizer = None
                        model = None
                if tokenizer is None or model is None:
                    raise RuntimeError("No summarization model could be loaded")
                
                # Create a custom wrapper for BART
                def summarize_func(text, max_length=160, min_length=30, **kwargs):
                    inputs = tokenizer.encode(text, return_tensors="pt", max_length=1024, truncation=True)
                    summary_ids = model.generate(
                        inputs,
                        max_length=max_length,
                        min_length=min_length,
                        num_beams=4,
                        early_stopping=True
                    )
                    return [{"summary_text": tokenizer.decode(summary_ids[0], skip_special_tokens=True)}]
                
                models_cache[model_type] = summarize_func
                logger.info(f"✅ Loaded BART for summarization (text2text-generation)")
                return True
                
            except Exception as primary_error:
                logger.warning(f"⚠️  Direct model load failed: {primary_error}")
                logger.info("Using extractive summarization fallback - will extract top sentences")
                models_cache[model_type] = "extractive"  # Flag for fallback
                return True
                
        elif model_type == "qa":
            try:
                qa_model = None
                for candidate in model_candidates:
                    try:
                        qa_model = pipeline(
                            "question-answering",
                            model=candidate,
                            device=0 if device == "cuda" else -1,
                        )
                        logger.info(f"✅ Loaded QA model: {candidate}")
                        break
                    except Exception as candidate_error:
                        logger.warning(f"⚠️  QA candidate failed: {candidate_error}")
                        qa_model = None
                if qa_model is None:
                    raise RuntimeError("No QA model could be loaded")
                models_cache[model_type] = qa_model
                return True
            except Exception as primary_error:
                logger.error(f"❌ QA model loading failed: {primary_error}")
                return False
                
        elif model_type == "sentiment":
            try:
                sentiment_model = None
                for candidate in model_candidates:
                    try:
                        sentiment_model = pipeline(
                            "sentiment-analysis",
                            model=candidate,
                            device=0 if device == "cuda" else -1,
                        )
                        logger.info(f"✅ Loaded sentiment model: {candidate}")
                        break
                    except Exception as candidate_error:
                        logger.warning(f"⚠️  Sentiment candidate failed: {candidate_error}")
                        sentiment_model = None
                if sentiment_model is None:
                    raise RuntimeError("No sentiment model could be loaded")
                models_cache[model_type] = sentiment_model
                return True
            except Exception as fallback_error:
                logger.error(f"❌ Sentiment model loading failed: {fallback_error}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Error loading {model_type} model: {e}")
        return False
def load_all_models():
    """Load all models with best-effort approach."""
    logger.info("\n" + "="*60)
    logger.info("🚀 Initializing NLP Models")
    logger.info("="*60)
    
    results = {
        "summarization": load_model_with_fallback("summarization"),
        "qa": load_model_with_fallback("qa"),
        "sentiment": load_model_with_fallback("sentiment"),
    }
    
    logger.info("\n" + "="*60)
    logger.info("📊 Model Loading Summary")
    logger.info("="*60)
    
    for model_type, success in results.items():
        status = "✅" if success else "⚠️ "
        logger.info(f"{status} {model_type.title()}: {'Ready' if success else 'Using fallback'}")
    
    logger.info("="*60 + "\n")
    
    return all(results.values())


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "device": device,
        "models_loaded": len(models_cache)
    })


@app.route('/api/summarize', methods=['POST'])
def summarize():
    """High-quality abstractive summarization using BART"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        target_min_words = int(data.get('target_min_words', 0) or 0)
        target_max_words = int(data.get('target_max_words', 0) or 0)
        target_sentences = int(data.get('target_sentences', 0) or 0)

        if not text:
            return jsonify({"error": "No text provided"}), 400

        summary = summarize_text_core(
            text=text,
            target_min_words=target_min_words,
            target_max_words=target_max_words,
            target_sentences=target_sentences,
        )

        return jsonify({
            "summary": summary,
            "success": True
        })

    except Exception as e:
        logger.error(f"❌ Summarization error: {e}")
        return jsonify({"error": str(e), "success": False}), 500


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract readable text from an uploaded PDF payload."""
    reader = PdfReader(BytesIO(pdf_bytes))
    parts: List[str] = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if page_text:
            parts.append(page_text)

    return "\n".join(parts)


def summarize_text_core(
    text: str,
    target_min_words: int = 0,
    target_max_words: int = 0,
    target_sentences: int = 0,
) -> str:
    """Shared summarization pipeline used by text and PDF upload endpoints."""
    text = (text or "").strip()
    if not text:
        raise ValueError("No text provided")

    text = preprocess_for_summary(text)
    text = normalize_text(text)
    word_count = len(text.split())

    # Prefer Hugging Face API summarization when configured.
    hf_summary = summarize_with_hf_api(
        text=text,
        target_min_words=target_min_words,
        target_max_words=target_max_words,
        target_sentences=target_sentences,
    )
    if hf_summary:
        return hf_summary

    # Ensure local summarization model is loaded if HF summary is unavailable.
    if 'summarization' not in models_cache:
        if not load_model_with_fallback("summarization"):
            raise RuntimeError("Failed to load summarization model")
        
    # For short text, return as-is
    if word_count < 50:
        return apply_length_control(text, target_min_words, target_max_words, target_sentences)
        
    # Chunk long documents
    chunks = chunk_words(text, CHUNK_WORDS)
        
    try:
        if len(chunks) == 1:
            # Single chunk - summarize directly
            max_len = max(50, min(160, int(word_count * 0.4)))
            min_len = max(20, min(50, int(word_count * 0.1)))

            if models_cache['summarization'] == "extractive":
                summary = extractive_summary(text, num_sentences=4)
            else:
                result = models_cache['summarization'](
                    text,
                    max_length=max_len,
                    min_length=min_len,
                    do_sample=False
                )
                summary = result[0]['summary_text'] if result else text
        else:
            # Multiple chunks - summarize each, then combine
            logger.info(f"📚 Processing {len(chunks)} chunks...")
            summaries = []

            for i, chunk in enumerate(chunks[:MAX_SUMMARY_CHUNKS], 1):
                try:
                    chunk_word_count = len(chunk.split())
                    max_len = max(40, min(100, int(chunk_word_count * 0.4)))
                    min_len = max(15, min(30, int(chunk_word_count * 0.1)))

                    if models_cache['summarization'] == "extractive":
                        summaries.append(extractive_summary(chunk, num_sentences=2))
                    else:
                        result = models_cache['summarization'](
                            chunk,
                            max_length=max_len,
                            min_length=min_len,
                            do_sample=False
                        )
                        if result:
                            summaries.append(result[0]['summary_text'])
                except Exception as e:
                    logger.warning(f"Chunk {i} failed: {e}")
                    summaries.append(extractive_summary(chunk, num_sentences=2))

            if not summaries:
                return text

            summary = " ".join(summaries)

    except Exception as model_error:
        logger.warning(f"Model inference failed: {model_error}")
        logger.info("Falling back to extractive summary")
        summary = extractive_summary(text, num_sentences=6)

    summary = improve_summary_quality(summary, target_max_words, target_sentences)
    return apply_length_control(summary, target_min_words, target_max_words, target_sentences)


@app.route('/summarize', methods=['POST'])
def summarize_uploaded_pdf():
    """Summarize a PDF file directly from multipart upload."""
    try:
        uploaded_file = request.files.get('file')
        if uploaded_file is None:
            return jsonify({"success": False, "error": "No file provided"}), 400

        file_bytes = uploaded_file.read()
        if not file_bytes:
            return jsonify({"success": False, "error": "Uploaded file is empty"}), 400

        extracted_text = extract_text_from_pdf_bytes(file_bytes)
        if not extracted_text.strip():
            return jsonify({
                "success": False,
                "error": "PDF contains no extractable text"
            }), 400

        target_min_words = int(request.form.get('target_min_words', 0) or 0)
        target_max_words = int(request.form.get('target_max_words', 0) or 0)
        target_sentences = int(request.form.get('target_sentences', 0) or 0)

        summary = summarize_text_core(
            text=extracted_text,
            target_min_words=target_min_words,
            target_max_words=target_max_words,
            target_sentences=target_sentences,
        )

        return jsonify({
            "success": True,
            "summary": summary,
            "text_length": len(extracted_text),
            "chunks_processed": min(
                len(chunk_words(normalize_text(preprocess_for_summary(extracted_text)), CHUNK_WORDS)),
                MAX_SUMMARY_CHUNKS,
            ),
        })
    except Exception as e:
        logger.error(f"❌ PDF summarize error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500




@app.route('/api/qa', methods=['POST'])
def answer_question():
    """Answer question about document using RoBERTa-QA"""
    try:
        data = request.json
        context = data.get('context', '').strip()
        question = data.get('question', '').strip()

        if not context or not question:
            return jsonify({"error": "Context and question required"}), 400

        # Ensure model is loaded
        if 'qa' not in models_cache:
            if not load_model_with_fallback("qa"):
                return jsonify({"error": "Failed to load QA model"}), 500

        context = normalize_text(context)
        chunks = chunk_words(context, QA_CHUNK_WORDS)
        
        if not chunks:
            return jsonify({"error": "Empty document context", "success": False}), 400

        best_answer = ""
        best_score = -1.0

        # Find best answer across chunks
        for i, chunk in enumerate(chunks[:MAX_SUMMARY_CHUNKS], 1):
            try:
                result = models_cache['qa'](question=question, context=chunk)
                score = float(result.get('score', 0))
                if score > best_score:
                    best_score = score
                    best_answer = result.get('answer', '')
            except Exception as e:
                logger.warning(f"QA chunk {i} failed: {e}")
                continue

        if not best_answer:
            best_answer = "No relevant answer found in the document."

        return jsonify({
            "answer": best_answer,
            "score": max(0.0, best_score),
            "success": True
        })

    except Exception as e:
        logger.error(f"❌ QA error: {e}")
        return jsonify({"error": str(e), "success": False}), 500



@app.route('/api/tone', methods=['POST'])
def analyze_tone():
    """Analyze document tone and sentiment using RoBERTa-Sentiment"""
    try:
        data = request.json
        text = data.get('text', '').strip()

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Ensure model is loaded
        if 'sentiment' not in models_cache:
            if not load_model_with_fallback("sentiment"):
                return jsonify({"error": "Failed to load sentiment model"}), 500

        text = normalize_text(text)
        chunks = chunk_words(text, QA_CHUNK_WORDS)
        
        if not chunks:
            return jsonify({"error": "No text provided", "success": False}), 400

        # Sample chunks for sentiment analysis
        sample_chunks = chunks[:TONE_SAMPLE_CHUNKS]
        labels = []
        scores = []
        
        for i, chunk in enumerate(sample_chunks):
            try:
                result = models_cache['sentiment'](chunk, truncation=True)
                sentiment_data = result[0] if isinstance(result, list) else result
                
                label = sentiment_data.get('label', 'NEUTRAL')
                score = float(sentiment_data.get('score', 0))
                
                labels.append(label)
                scores.append(score)
            except Exception as e:
                logger.warning(f"Tone chunk {i+1} failed: {e}")
                labels.append('NEUTRAL')
                scores.append(0.5)

        # Determine overall sentiment
        label_counts = {label: labels.count(label) for label in set(labels)}
        top_sentiment = max(label_counts, key=label_counts.get) if label_counts else "NEUTRAL"
        avg_confidence = sum(scores) / max(len(scores), 1) if scores else 0.5

        return jsonify({
            "sentiment": top_sentiment,
            "confidence": float(min(1.0, avg_confidence)),
            "tone": "analytical",
            "success": True
        })

    except Exception as e:
        logger.error(f"❌ Tone analysis error: {e}")
        return jsonify({"error": str(e), "success": False}), 500


def map_sentiment_label(raw_label: str) -> str:
    normalized = (raw_label or "").upper()
    if "POS" in normalized:
        return "Positive"
    if "NEG" in normalized:
        return "Negative"
    if "MIX" in normalized:
        return "Mixed"
    return "Neutral"


def detect_tones_from_text(text: str) -> List[str]:
    lower = text.lower()
    tones: List[str] = []

    if any(token in lower for token in ["study", "research", "findings", "analysis"]):
        tones.append("Academic")
    if any(token in lower for token in ["therefore", "furthermore", "moreover", "consequently"]):
        tones.append("Formal")
    if any(token in lower for token in ["risk", "issue", "challenge", "limitation"]):
        tones.append("Critical")
    if any(token in lower for token in ["opportunity", "benefit", "improve", "successful"]):
        tones.append("Optimistic")
    if any(token in lower for token in ["implement", "process", "framework", "system"]):
        tones.append("Technical")

    if not tones:
        tones = ["Informative", "Neutral"]

    return tones[:4]


def detect_writing_style(text: str) -> str:
    lower = text.lower()
    if any(token in lower for token in ["methodology", "study", "dataset", "hypothesis"]):
        return "Academic"
    if any(token in lower for token in ["algorithm", "architecture", "system", "implementation"]):
        return "Technical"
    if any(token in lower for token in ["recommend", "should", "must", "propose"]):
        return "Persuasive"
    if any(token in lower for token in ["story", "character", "journey"]):
        return "Narrative"
    return "Expository"


def sentiment_to_emoji(sentiment: str) -> str:
    mapping = {
        "Positive": "😊",
        "Negative": "😞",
        "Neutral": "😐",
        "Mixed": "🤔",
    }
    return mapping.get(sentiment, "📄")


def safe_list(value, fallback: List[str]) -> List[str]:
    if isinstance(value, list):
        output = [str(item).strip() for item in value if str(item).strip()]
        return output if output else fallback
    return fallback


def call_hf_summarizer(text: str, max_len: int, min_len: int) -> Optional[str]:
    """Use Hugging Face Inference API for abstractive summarization."""
    hf_token = (
        os.getenv("HF_API_TOKEN", "").strip()
        or os.getenv("HUGGINGFACE_API_KEY", "").strip()
    )
    if not hf_token:
        return None

    model_name = os.getenv("HF_SUMMARIZATION_MODEL", "facebook/bart-large-cnn")
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"

    try:
        response = requests.post(
            api_url,
            headers={"Authorization": f"Bearer {hf_token}"},
            json={
                "inputs": text,
                "parameters": {
                    "max_length": max_len,
                    "min_length": min_len,
                    "do_sample": False,
                    "truncation": True,
                },
                "options": {
                    "wait_for_model": True,
                },
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()

        if isinstance(payload, list) and payload:
            first = payload[0]
            if isinstance(first, dict):
                summary = (
                    str(first.get("summary_text", "")).strip()
                    or str(first.get("generated_text", "")).strip()
                )
                return summary or None

        if isinstance(payload, dict):
            summary = (
                str(payload.get("summary_text", "")).strip()
                or str(payload.get("generated_text", "")).strip()
            )
            return summary or None

        return None
    except Exception as e:
        logger.warning(f"⚠️ HF summarization failed: {e}")
        return None


def summarize_with_hf_api(
    text: str,
    target_min_words: int,
    target_max_words: int,
    target_sentences: int,
) -> Optional[str]:
    """Summarize via HF API first, handling long documents in chunks."""
    use_hf_summary = os.getenv("HF_USE_SUMMARIZATION", "1") == "1"
    if not use_hf_summary:
        return None

    hf_token = (
        os.getenv("HF_API_TOKEN", "").strip()
        or os.getenv("HUGGINGFACE_API_KEY", "").strip()
    )
    if not hf_token:
        return None

    chunks = chunk_words(text, CHUNK_WORDS)
    summaries: List[str] = []

    for chunk in chunks[:MAX_SUMMARY_CHUNKS]:
        chunk_word_count = len(chunk.split())
        max_len = max(40, min(220, int(chunk_word_count * 0.45)))
        min_len = max(15, min(80, int(chunk_word_count * 0.12)))

        summary = call_hf_summarizer(chunk, max_len=max_len, min_len=min_len)
        if summary:
            summaries.append(summary)

    if not summaries:
        return None

    combined = " ".join(summaries)
    if len(summaries) > 1 and len(combined.split()) > 280:
        final_max_len = max(80, min(260, int(len(combined.split()) * 0.5)))
        final_min_len = max(30, min(100, int(len(combined.split()) * 0.18)))
        reduced = call_hf_summarizer(combined, max_len=final_max_len, min_len=final_min_len)
        if reduced:
            combined = reduced

    combined = improve_summary_quality(combined, target_max_words, target_sentences)
    return apply_length_control(combined, target_min_words, target_max_words, target_sentences)


def call_hf_analysis_generator(summary_text: str) -> Optional[Dict]:
    """Use HF Inference API to generate structured document analysis JSON."""
    hf_token = os.getenv("HF_API_TOKEN", "").strip()
    if not hf_token:
        return None

    model_name = os.getenv("HF_ANALYSIS_MODEL", "google/flan-t5-base")
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    prompt = (
        "Analyze the summary and return ONLY valid JSON with keys: "
        "keyTopics, importantPoints, insights, conclusions, risksOrRecommendations, "
        "simpleExplanation, interviewQuestions, highlightedLines. "
        "Each list must have 3-6 concise items.\n\n"
        f"Summary:\n{summary_text}"
    )

    try:
        response = requests.post(
            api_url,
            headers={"Authorization": f"Bearer {hf_token}"},
            json={
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 320,
                    "temperature": 0.2,
                    "return_full_text": False,
                },
            },
            timeout=45,
        )
        response.raise_for_status()
        payload = response.json()
        if not (isinstance(payload, list) and payload and "generated_text" in payload[0]):
            return None

        raw_text = str(payload[0]["generated_text"]).strip()
        match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
        json_text = match.group(0) if match else raw_text
        parsed = json.loads(json_text)
        return parsed if isinstance(parsed, dict) else None
    except Exception as e:
        logger.warning(f"⚠️ HF analysis generation failed: {e}")
        return None


def build_heuristic_analysis(summary_text: str, full_text: str) -> Dict:
    """Create structured analysis deterministically from summarized content."""
    summary_sentences = split_into_sentences(summary_text)
    full_sentences = split_into_sentences(full_text)
    key_topics = [topic.title() for topic in extract_keywords(summary_text, 6)]

    important_points = [compact_sentence(sentence, 24) for sentence in summary_sentences[:5]]
    if len(important_points) < 3:
        for sentence in full_sentences[:6]:
            candidate = compact_sentence(sentence, 24)
            if candidate and candidate not in important_points:
                important_points.append(candidate)
            if len(important_points) >= 4:
                break
    insights = [
        f"The document repeatedly emphasizes {topic.lower()} as a core theme."
        for topic in key_topics[:4]
    ]

    conclusions = [
        compact_sentence(sentence, 24) for sentence in summary_sentences[-2:]
    ] if summary_sentences else ["The document highlights practical and strategic implications."]
    if len(conclusions) < 2:
        conclusion_seed = [
            "The document emphasizes practical implementation with governance and monitoring.",
            "A balanced approach is required to capture benefits while reducing operational risk.",
        ]
        for item in conclusion_seed:
            if item not in conclusions:
                conclusions.append(item)
            if len(conclusions) >= 2:
                break

    risk_terms = ["risk", "challenge", "concern", "limitation", "bias", "compliance", "privacy"]
    if any(term in full_text.lower() for term in risk_terms):
        risks_or_recommendations = [
            "Potential risks are identified and should be managed with governance controls.",
            "A monitoring process is recommended to reduce quality and compliance issues.",
            "Stakeholders should validate assumptions before wide rollout.",
        ]
    else:
        risks_or_recommendations = [
            "Define measurable KPIs before implementation.",
            "Start with a pilot and iterate using feedback.",
            "Document decisions and assumptions for auditability.",
        ]

    simple_explanation = (
        "In simple terms, this document explains the main ideas, why they matter, "
        "and what actions should be taken next."
    )

    interview_questions = [
        f"How would you explain the role of {topic.lower()} in this document?"
        for topic in key_topics[:4]
    ]

    highlighted_lines = [compact_sentence(sentence, 26) for sentence in full_sentences[:5]]

    return {
        "keyTopics": key_topics or ["General Overview"],
        "importantPoints": important_points[:6] if important_points else ["No key points extracted."],
        "insights": insights or ["No strong insights extracted."],
        "conclusions": conclusions[:4],
        "risksOrRecommendations": risks_or_recommendations,
        "simpleExplanation": simple_explanation,
        "interviewQuestions": interview_questions or ["What is the main objective of this document?"],
        "highlightedLines": highlighted_lines or ["No highlighted lines extracted."],
    }


@app.route('/api/analyze', methods=['POST'])
def analyze_document_insights():
    """Structured document analysis: topics, points, insights, conclusions, and recommendations."""
    try:
        data = request.json or {}
        text = str(data.get('text', '')).strip()
        if not text:
            return jsonify({"error": "No text provided", "success": False}), 400

        cleaned_text = normalize_text(text)
        summary_text = summarize_text_core(
            text=cleaned_text,
            target_min_words=100,
            target_max_words=260,
            target_sentences=10,
        )

        # Reuse sentiment pipeline for assistant-like output tone metadata.
        sentiment_raw = "NEUTRAL"
        if 'sentiment' not in models_cache:
            load_model_with_fallback("sentiment")

        if 'sentiment' in models_cache:
            try:
                tone_result = models_cache['sentiment'](summary_text[:1200], truncation=True)
                sentiment_raw = (tone_result[0] if isinstance(tone_result, list) else tone_result).get('label', 'NEUTRAL')
            except Exception as e:
                logger.warning(f"⚠️ Sentiment inference failed during analysis: {e}")

        sentiment = map_sentiment_label(sentiment_raw)
        tones = detect_tones_from_text(summary_text)
        writing_style = detect_writing_style(summary_text)
        emoji = sentiment_to_emoji(sentiment)

        hf_analysis = call_hf_analysis_generator(summary_text)
        heuristic_analysis = build_heuristic_analysis(summary_text, cleaned_text)

        combined = {
            "keyTopics": safe_list(hf_analysis.get("keyTopics") if hf_analysis else None, heuristic_analysis["keyTopics"]),
            "importantPoints": safe_list(hf_analysis.get("importantPoints") if hf_analysis else None, heuristic_analysis["importantPoints"]),
            "insights": safe_list(hf_analysis.get("insights") if hf_analysis else None, heuristic_analysis["insights"]),
            "conclusions": safe_list(hf_analysis.get("conclusions") if hf_analysis else None, heuristic_analysis["conclusions"]),
            "risksOrRecommendations": safe_list(
                hf_analysis.get("risksOrRecommendations") if hf_analysis else None,
                heuristic_analysis["risksOrRecommendations"],
            ),
            "simpleExplanation": str(
                hf_analysis.get("simpleExplanation") if hf_analysis and hf_analysis.get("simpleExplanation")
                else heuristic_analysis["simpleExplanation"]
            ),
            "interviewQuestions": safe_list(
                hf_analysis.get("interviewQuestions") if hf_analysis else None,
                heuristic_analysis["interviewQuestions"],
            ),
            "highlightedLines": safe_list(
                hf_analysis.get("highlightedLines") if hf_analysis else None,
                heuristic_analysis["highlightedLines"],
            ),
        }

        return jsonify({
            "success": True,
            "analysis_source": "hf_api" if hf_analysis else "heuristic",
            "summary": summary_text,
            "sentiment": sentiment,
            "tones": tones,
            "writingStyle": writing_style,
            "emoji": emoji,
            **combined,
        })
    except Exception as e:
        logger.error(f"❌ Document analysis error: {e}")
        return jsonify({"error": str(e), "success": False}), 500



@app.route('/api/load-models', methods=['POST'])
def load_models():
    """Load all models on demand"""
    try:
        load_all_models()
        return jsonify({
            "models_loaded": len(models_cache),
            "device": device,
            "success": True
        })
    except Exception as e:
        logger.error(f"❌ Model loading error: {e}")
        return jsonify({"error": str(e), "success": False}), 500


def extract_keywords(text: str, limit: int = 10) -> List[str]:
    """Extract important keywords using TF weighting."""
    words = re.findall(r"\b[a-z]{3,}\b", text.lower())
    word_freq = Counter(w for w in words if w not in stopwords_set)
    
    if not word_freq:
        # Fallback to basic words if stopwords catch everything
        words = re.findall(r"\b[a-z]{2,}\b", text.lower())
        word_freq = Counter(words)
    
    # Return top keywords sorted by frequency
    keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, _ in keywords[:limit]]


def generate_mind_map_structure(text: str) -> Dict:
    """Generate a hierarchical mind map from text."""
    try:
        sentences = split_into_sentences(text)
        keywords = extract_keywords(text, 10)
        
        if not keywords:
            return {
                "id": "root",
                "label": "Document Overview",
                "children": []
            }
        
        # Create root node from strongest keyword
        root_label = f"Overview: {keywords[0].title()}"
        
        # Create main topics (first-level children)
        children = []
        for idx, keyword in enumerate(keywords[1:6]):
            # Find sentences that relate to this keyword
            related_sentences = [
                s for s in sentences
                if keyword.lower() in s.lower()
            ][:2]
            
            # Extract sub-topics from related sentences
            sub_keywords = []
            for sent in related_sentences:
                sub_kw = extract_keywords(sent, 3)
                sub_keywords.extend(sub_kw)
            
            # Remove duplicates and parent keyword
            sub_keywords = list(set(
                [sk for sk in sub_keywords if sk != keyword]
            ))[:3]
            
            # Create child nodes
            sub_children = [
                {
                    "id": f"node-{idx+1}-{sub_idx+1}",
                    "label": sub_kw.title()
                }
                for sub_idx, sub_kw in enumerate(sub_keywords)
            ]
            
            children.append({
                "id": f"node-{idx+1}",
                "label": keyword.title(),
                "children": sub_children if sub_children else []
            })
        
        return {
            "id": "root",
            "label": root_label,
            "children": children
        }
    
    except Exception as e:
        logger.warning(f"Mind map generation error: {e}")
        return {
            "id": "root",
            "label": "Document Overview",
            "children": []
        }


def call_hf_outline_generator(summary_text: str) -> Optional[str]:
    """Generate hierarchical outline text from summary via Hugging Face Inference API."""
    hf_token = os.getenv("HF_API_TOKEN", "").strip()
    if not hf_token:
        return None

    model_name = os.getenv("HF_OUTLINE_MODEL", "google/flan-t5-base")
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    prompt = (
        "Convert the following summary into a hierarchical outline. "
        "Return plain text only with one root title, then indented bullet points. "
        "Use concise topic phrases and sub-points.\n\n"
        f"Summary:\n{summary_text}"
    )

    try:
        response = requests.post(
            api_url,
            headers={"Authorization": f"Bearer {hf_token}"},
            json={
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 220,
                    "temperature": 0.2,
                    "return_full_text": False,
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list) and payload and "generated_text" in payload[0]:
            return str(payload[0]["generated_text"]).strip()
    except Exception as e:
        logger.warning(f"⚠️ HF outline generation failed: {e}")

    return None


def build_outline_heuristic(summary_text: str) -> str:
    """Create a deterministic hierarchical outline when API generation is unavailable."""
    cleaned = normalize_text(summary_text)
    sentences = split_into_sentences(cleaned)
    if not sentences:
        return "Document Overview\n- Key Points\n  - No extractable points"

    root_keywords = extract_keywords(cleaned, 2)
    root_title = " ".join([word.title() for word in root_keywords]) if root_keywords else "Document Overview"

    lines = [root_title]
    for sentence in sentences[:6]:
        sent = compact_sentence(sentence.strip(), 20)
        if not sent:
            continue
        topic_keywords = extract_keywords(sent, 2)
        topic_label = " ".join([word.title() for word in topic_keywords]) if topic_keywords else sent
        lines.append(f"- {topic_label}")
        lines.append(f"  - {sent}")

    return "\n".join(lines)


def parse_outline_to_tree(outline_text: str) -> Optional[Dict]:
    """Parse indented outline text into recursive JSON tree."""
    if not outline_text or not outline_text.strip():
        return None

    raw_lines = [line.rstrip() for line in outline_text.splitlines() if line.strip()]
    if not raw_lines:
        return None

    def clean_label(line: str) -> str:
        label = line.strip()
        label = re.sub(r"^[\-\*\u2022\d\.\)\s]+", "", label).strip()
        return label[:120] if label else "Node"

    root_label = clean_label(raw_lines[0])
    root = {"id": "root", "label": root_label, "children": []}
    stack = [(-1, root)]
    node_counter = 0

    for line in raw_lines[1:]:
        indent = len(line) - len(line.lstrip(" "))
        level = indent // 2
        label = clean_label(line)
        if not label:
            continue

        node_counter += 1
        node = {"id": f"node-{node_counter}", "label": label, "children": []}

        while stack and stack[-1][0] >= level:
            stack.pop()
        parent = stack[-1][1] if stack else root
        parent.setdefault("children", []).append(node)
        stack.append((level, node))

    return root


def generate_mind_map_with_summary_pipeline(document_text: str) -> Dict:
    """Mind-map pipeline: clean -> summarize -> structure -> parse tree."""
    cleaned = normalize_text(document_text)
    summary_text = summarize_text_core(
        text=cleaned,
        target_min_words=80,
        target_max_words=220,
        target_sentences=8,
    )

    outline_text = call_hf_outline_generator(summary_text)
    outline_source = "hf_api" if outline_text else "heuristic"
    if not outline_text:
        outline_text = build_outline_heuristic(summary_text)

    mind_map = parse_outline_to_tree(outline_text)
    if not mind_map:
        mind_map = generate_mind_map_structure(summary_text)

    return {
        "mindMap": mind_map,
        "summary": summary_text,
        "outline": outline_text,
        "outline_source": outline_source,
    }


@app.route('/api/mind-map', methods=['POST'])
def generate_mind_map():
    """Generate a mind map from document text"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        text = normalize_text(text)
        result = generate_mind_map_with_summary_pipeline(text)
        
        return jsonify({
            "mindMap": result["mindMap"],
            "summary": result["summary"],
            "outline": result["outline"],
            "outline_source": result["outline_source"],
            "success": True
        })
    
    except Exception as e:
        logger.error(f"❌ Mind map error: {e}")
        return jsonify({"error": str(e), "success": False}), 500


def compare_documents_advanced(doc1_text: str, doc2_text: str, doc1_name: str, doc2_name: str) -> Dict:
    """Compare two documents with detailed analysis."""
    try:
        doc1_text = normalize_text(doc1_text)
        doc2_text = normalize_text(doc2_text)
        
        # Extract keywords and sentences
        kw1 = set(extract_keywords(doc1_text, 15))
        kw2 = set(extract_keywords(doc2_text, 15))
        
        sent1 = split_into_sentences(doc1_text)
        sent2 = split_into_sentences(doc2_text)
        
        # Calculate semantic similarity by topic overlap
        # Find shared concepts (even if not exact keyword match)
        doc1_words = set(re.findall(r"\b[a-z]{3,}\b", doc1_text.lower()))
        doc2_words = set(re.findall(r"\b[a-z]{3,}\b", doc2_text.lower()))
        
        # Find keyword overlaps
        shared_keywords = kw1 & kw2
        unique_to_doc1 = kw1 - kw2
        unique_to_doc2 = kw2 - kw1
        
        # Find related keywords (semantic similarity)
        related_pairs = []
        for kw1_item in kw1:
            for kw2_item in kw2:
                # Check for textual overlap (e.g., "machine" and "machines")
                if (kw1_item in kw2_item or kw2_item in kw1_item or
                    kw1_item.startswith(kw2_item[:-1]) or kw2_item.startswith(kw1_item[:-1])):
                    related_pairs.append((kw1_item, kw2_item))
        
        # Build similarities list with both exact and related matches
        similarities = []
        
        # Add exact keyword matches
        for kw in sorted(shared_keywords)[:4]:
            similarities.append(f"Both documents discuss {kw.title()}.")
        
        # Add related concept matches
        for kw1_item, kw2_item in related_pairs[:3]:
            if kw1_item != kw2_item:
                similarities.append(
                    f"Both documents reference related concepts: {kw1_item.title()} and {kw2_item.title()}."
                )
        
        if not similarities:
            # Fallback: check if documents discuss same general topics
            overlapping_words = doc1_words & doc2_words
            if len(overlapping_words) > 5:
                similarities.append(
                    f"The documents share significant conceptual overlap with {len(overlapping_words)} common terms."
                )
            else:
                similarities = [
                    f"The documents share some conceptual overlap, primarily around {list(kw1)[0].title() if kw1 else 'related topics'}."
                ]
        
        # Build differences list
        differences = []
        
        for kw in sorted(unique_to_doc1)[:3]:
            differences.append(
                f"{doc1_name} emphasizes {kw.title()} which {doc2_name} does not specifically address."
            )
        
        for kw in sorted(unique_to_doc2)[:3]:
            differences.append(
                f"{doc2_name} focuses on {kw.title()} which is not central to {doc1_name}."
            )
        
        if not differences:
            differences = [
                "Both documents emphasize similar themes with minimal differentiation."
            ]
        
        embedding_comparison = compare_with_embeddings(doc1_text, doc2_text)

        # Calculate more accurate similarity ratio
        total_keywords = len(kw1 | kw2)
        lexical_similarity = (len(shared_keywords) + len(related_pairs) * 0.7) / max(total_keywords, 1)
        semantic_similarity = (
            embedding_comparison["similarity_score"]
            if embedding_comparison is not None
            else lexical_similarity
        )
        similarity_ratio = (lexical_similarity * 0.35) + (semantic_similarity * 0.65)
        similarity_ratio = min(1.0, similarity_ratio)  # Cap at 1.0
        
        # Generate conclusion based on similarity
        if similarity_ratio > 0.6:
            conclusion = (
                f"{doc1_name} and {doc2_name} are highly related documents "
                f"discussing very similar topics and themes with complementary insights."
            )
        elif similarity_ratio > 0.4:
            conclusion = (
                f"{doc1_name} and {doc2_name} cover overlapping topics with "
                f"some differences in scope, depth, and specific focus areas."
            )
        elif similarity_ratio > 0.2:
            conclusion = (
                f"{doc1_name} and {doc2_name} share some common themes but "
                f"diverge significantly in their primary focus and discussion approaches."
            )
        else:
            conclusion = (
                f"{doc1_name} and {doc2_name} are largely distinct documents with "
                f"minimal topic overlap, addressing different domains or perspectives."
            )
        
        return {
            "similarities": similarities,
            "differences": differences,
            "conclusion": conclusion,
            "similarity_score": float(similarity_ratio),
            "similar_sections": embedding_comparison["similar_sections"] if embedding_comparison else [],
            "different_sections": embedding_comparison["different_sections"] if embedding_comparison else [],
        }
    
    except Exception as e:
        logger.warning(f"Document comparison error: {e}")
        return {
            "similarities": ["Unable to fully analyze similarities."],
            "differences": ["Unable to fully analyze differences."],
            "conclusion": "Comparison could not be completed.",
            "similarity_score": 0.0,
            "similar_sections": [],
            "different_sections": [],
        }


@app.route('/api/compare-documents', methods=['POST'])
def compare_documents():
    """Compare two documents and extract similarities/differences"""
    try:
        data = request.json
        doc1_text = data.get('documentOneText', '').strip()
        doc2_text = data.get('documentTwoText', '').strip()
        doc1_name = data.get('documentOneName', 'Document 1')
        doc2_name = data.get('documentTwoName', 'Document 2')
        
        if not doc1_text or not doc2_text:
            return jsonify({"error": "Both documents required"}), 400
        
        comparison = compare_documents_advanced(doc1_text, doc2_text, doc1_name, doc2_name)
        
        return jsonify({
            **comparison,
            "success": True
        })
    
    except Exception as e:
        logger.error(f"❌ Document comparison error: {e}")
        return jsonify({"error": str(e), "success": False}), 500


if __name__ == '__main__':
    logger.info("\n🚀 NLP Inference Server Starting...")
    logger.info(f"📌 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"🔧 Device: {device}")
    
    # Load models on startup
    load_all_models()
    
    logger.info("\n🌐 Flask Server Configuration:")
    logger.info("   Host: 0.0.0.0")
    logger.info("   Port: 5000")
    logger.info("   Endpoints:")
    logger.info("     - GET  /health")
    logger.info("     - POST /api/summarize")
    logger.info("     - POST /api/qa")
    logger.info("     - POST /api/tone")
    logger.info("     - POST /api/analyze")
    logger.info("     - POST /api/mind-map")
    logger.info("     - POST /api/compare-documents")
    logger.info("     - POST /api/load-models")
    logger.info("\n" + "="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

