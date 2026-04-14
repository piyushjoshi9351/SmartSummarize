"""
✨ NLP Model Inference Server - High-Quality Local Inference
Flask-based server using best transformers 5.2.0 models
"""

from flask import Flask, request, jsonify
import os
import json
from pathlib import Path
import torch
import logging
from typing import List, Dict, Optional
import re
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

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

        # Ensure model is loaded
        if 'summarization' not in models_cache:
            if not load_model_with_fallback("summarization"):
                return jsonify({"error": "Failed to load summarization model"}), 500

        text = preprocess_for_summary(text)
        text = normalize_text(text)
        word_count = len(text.split())
        
        # For short text, return as-is
        if word_count < 50:
            summary = apply_length_control(text, target_min_words, target_max_words, target_sentences)
            return jsonify({"summary": summary, "success": True})
        
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
                    return jsonify({"summary": text, "success": True})
                
                summary = " ".join(summaries)

        except Exception as model_error:
            logger.warning(f"Model inference failed: {model_error}")
            logger.info("Falling back to extractive summary")
            summary = extractive_summary(text, num_sentences=6)

        summary = improve_summary_quality(summary, target_max_words, target_sentences)
        summary = apply_length_control(summary, target_min_words, target_max_words, target_sentences)
        return jsonify({
            "summary": summary,
            "success": True
        })

    except Exception as e:
        logger.error(f"❌ Summarization error: {e}")
        return jsonify({"error": str(e), "success": False}), 500




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


@app.route('/api/mind-map', methods=['POST'])
def generate_mind_map():
    """Generate a mind map from document text"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        text = normalize_text(text)
        mind_map = generate_mind_map_structure(text)
        
        return jsonify({
            "mindMap": mind_map,
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
        
        # Calculate more accurate similarity ratio
        total_keywords = len(kw1 | kw2)
        similarity_ratio = (len(shared_keywords) + len(related_pairs) * 0.7) / max(total_keywords, 1)
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
            "similarity_score": float(similarity_ratio)
        }
    
    except Exception as e:
        logger.warning(f"Document comparison error: {e}")
        return {
            "similarities": ["Unable to fully analyze similarities."],
            "differences": ["Unable to fully analyze differences."],
            "conclusion": "Comparison could not be completed.",
            "similarity_score": 0.0
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
    logger.info("     - POST /api/mind-map")
    logger.info("     - POST /api/compare-documents")
    logger.info("     - POST /api/load-models")
    logger.info("\n" + "="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

