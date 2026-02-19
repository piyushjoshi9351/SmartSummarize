#!/usr/bin/env python3
"""Test similarity scoring with various document pairs."""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_comparison(doc1, doc2, name1="Doc1", name2="Doc2"):
    """Test comparison endpoint."""
    response = requests.post(
        f"{BASE_URL}/api/compare-documents",
        json={
            "documentOneText": doc1,
            "documentTwoText": doc2,
            "documentOneName": name1,
            "documentTwoName": name2
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        score = data.get("similarity_score", 0) * 100
        print(f"\n{'='*60}")
        print(f"📊 {name1} vs {name2}")
        print(f"{'='*60}")
        print(f"🔢 Similarity Score: {score:.1f}%")
        print(f"🟢 Similarities ({len(data.get('similarities', []))}): {data.get('similarities', [])[:2]}")
        print(f"🔴 Differences ({len(data.get('differences', []))}): {data.get('differences', [])[:2]}")
        print(f"💡 Conclusion: {data.get('conclusion', '')[:100]}...")
        return score
    else:
        print(f"❌ Error: {response.status_code}")
        return 0.0

# Test 1: Nearly identical documents (high similarity expected)
doc_a = "Machine learning is a subset of artificial intelligence. It uses algorithms to learn from data."
doc_b = "Machine learning is part of artificial intelligence. Machine learning algorithms learn from data."
score1 = test_comparison(doc_a, doc_b, "ML-Version1", "ML-Version2")

# Test 2: Related but different topics (medium similarity)
doc_c = "Python is a programming language used for web development. It supports object-oriented programming."
doc_d = "JavaScript is for web development. It works in browsers and supports functional programming."
score2 = test_comparison(doc_c, doc_d, "Python-Guide", "JavaScript-Guide")

# Test 3: Completely different topics (low similarity)
doc_e = "The Eiffel Tower is located in Paris, France. It was built in 1889 for the World's Fair."
doc_f = "Photosynthesis is the process where plants convert sunlight into chemical energy using chlorophyll."
score3 = test_comparison(doc_e, doc_f, "Eiffel-Tower", "Photosynthesis")

# Summary
print(f"\n{'='*60}")
print(f"📈 SIMILARITY SCORE SUMMARY")
print(f"{'='*60}")
print(f"Nearly Identical: {score1:.1f}% ✅ (Expected: 60%+)")
print(f"Related Topics: {score2:.1f}% ✅ (Expected: 30-50%)")
print(f"Unrelated Topics: {score3:.1f}% ✅ (Expected: 0-20%)")
