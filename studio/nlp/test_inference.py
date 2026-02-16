"""
Test script to verify the inference server is working correctly.
"""

import requests
import json
import time

# Server endpoint
BASE_URL = "http://localhost:5000"

def test_inference_server():
    """Test all three inference endpoints."""
    
    print("=" * 60)
    print("TESTING NLP INFERENCE SERVER")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n[1/3] Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✓ Health check passed")
            print(f"  Response: {response.json()}")
        else:
            print(f"✗ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Health check error: {e}")
        return False
    
    # Test 2: Summarization
    print("\n[2/3] Testing Summarization Endpoint...")
    test_text = """
    Artificial intelligence (AI) has revolutionized numerous industries in the past decade. 
    Machine learning models, in particular, have become increasingly sophisticated and are now 
    capable of performing complex tasks that were previously thought to require human intelligence. 
    Natural language processing, one of the key subfields of AI, enables computers to understand 
    and generate human language in a meaningful way. Deep learning approaches have significantly 
    improved the performance of NLP systems, allowing for better translation, sentiment analysis, 
    question answering, and text summarization capabilities.
    """
    
    try:
        payload = {"text": test_text}
        response = requests.post(f"{BASE_URL}/api/summarize", json=payload, timeout=30)
        if response.status_code == 200:
            print("✓ Summarization endpoint passed")
            result = response.json()
            print(f"  Summary: {result.get('summary', 'N/A')}")
        else:
            print(f"✗ Summarization failed: {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"✗ Summarization error: {e}")
    
    # Test 3: Question Answering
    print("\n[3/3] Testing Question Answering Endpoint...")
    qa_data = {
        "question": "What field has improved NLP systems?",
        "context": test_text
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/qa", json=qa_data, timeout=30)
        if response.status_code == 200:
            print("✓ QA endpoint passed")
            result = response.json()
            print(f"  Answer: {result.get('answer', 'N/A')}")
            print(f"  Confidence: {result.get('confidence', 'N/A'):.2f}")
        else:
            print(f"✗ QA failed: {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"✗ QA error: {e}")
    
    # Test 4: Tone Analysis
    print("\n[4/4] Testing Tone Analysis Endpoint...")
    tone_data = {"text": "I absolutely love this product! It's amazing!"}
    
    try:
        response = requests.post(f"{BASE_URL}/api/tone", json=tone_data, timeout=30)
        if response.status_code == 200:
            print("✓ Tone analysis endpoint passed")
            result = response.json()
            print(f"  Tone: {result.get('tone', 'N/A')}")
            print(f"  All tones: {result.get('all_tones', {})}")
        else:
            print(f"✗ Tone analysis failed: {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"✗ Tone analysis error: {e}")
    
    print("\n" + "=" * 60)
    print("TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    # Wait for server to be ready
    print("Waiting for server to be ready...")
    for i in range(30):
        try:
            requests.get(f"{BASE_URL}/api/health", timeout=1)
            print("✓ Server is ready!")
            break
        except:
            if i < 29:
                print(f"  Attempting to connect... ({i+1}/30)")
                time.sleep(1)
    
    test_inference_server()
