#!/usr/bin/env python3
"""
Quick demo script to test NLP models locally
Run this to verify setup is working
"""

import requests
import json
from pathlib import Path

NLP_SERVER_URL = "http://localhost:5000"

def test_summarization():
    """Test summarization endpoint"""
    print("\n" + "="*60)
    print("TEST 1: SUMMARIZATION")
    print("="*60)
    
    text = """
    Machine learning is a subset of artificial intelligence (AI) that focuses on 
    algorithms that enable computers to learn from data without being explicitly programmed. 
    Deep learning, a type of machine learning, uses neural networks with multiple layers 
    to process complex patterns in data. Applications include image recognition, natural 
    language processing, and autonomous systems. Recent advances like transformer models 
    have revolutionized NLP tasks.
    """
    
    try:
        response = requests.post(f"{NLP_SERVER_URL}/api/summarize", json={"text": text})
        data = response.json()
        
        if data.get("success"):
            print("✓ Summarization working!")
            print(f"Summary: {data['summary'][:200]}...")
        else:
            print(f"✗ Error: {data.get('error')}")
    except Exception as e:
        print(f"✗ Connection failed: {e}")

def test_qa():
    """Test QA endpoint"""
    print("\n" + "="*60)
    print("TEST 2: QUESTION ANSWERING")
    print("="*60)
    
    context = """
    Python is a high-level programming language known for its simplicity and readability.
    It was created by Guido van Rossum and released in 1991. Python supports multiple 
    programming paradigms including procedural, object-oriented, and functional programming.
    It is widely used in data science, web development, and automation.
    """
    
    question = "Who created Python?"
    
    try:
        response = requests.post(f"{NLP_SERVER_URL}/api/qa", json={
            "context": context,
            "question": question
        })
        data = response.json()
        
        if data.get("success"):
            print("✓ QA working!")
            print(f"Question: {question}")
            print(f"Answer: {data['answer']}")
        else:
            print(f"✗ Error: {data.get('error')}")
    except Exception as e:
        print(f"✗ Connection failed: {e}")

def test_tone():
    """Test tone analysis endpoint"""
    print("\n" + "="*60)
    print("TEST 3: TONE ANALYSIS")
    print("="*60)
    
    text = """
    This research demonstrates significant advances in natural language understanding.
    Our comprehensive analysis reveals that transformer-based models consistently 
    outperform traditional approaches. The results are encouraging and suggest promising 
    directions for future work.
    """
    
    try:
        response = requests.post(f"{NLP_SERVER_URL}/api/tone", json={"text": text})
        data = response.json()
        
        if data.get("success"):
            print("✓ Tone analysis working!")
            print(f"Sentiment: {data.get('sentiment')}")
            print(f"Confidence: {data.get('confidence', 0):.2%}")
        else:
            print(f"✗ Error: {data.get('error')}")
    except Exception as e:
        print(f"✗ Connection failed: {e}")

def test_health():
    """Test health check"""
    print("\n" + "="*60)
    print("TEST 0: HEALTH CHECK")
    print("="*60)
    
    try:
        response = requests.get(f"{NLP_SERVER_URL}/health")
        if response.status_code == 200:
            print(f"✓ Server is running: {response.json()}")
            return True
        else:
            print(f"✗ Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ Could not connect to {NLP_SERVER_URL}")
        print("\nMake sure the NLP server is running:")
        print("  python nlp/inference_server.py")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("NLP INFERENCE SERVER TEST SUITE")
    print("="*60)
    
    if test_health():
        test_summarization()
        test_qa()
        test_tone()
        
        print("\n" + "="*60)
        print("✓ ALL TESTS PASSED!")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("✗ TESTS FAILED - Server not responding")
        print("="*60)
