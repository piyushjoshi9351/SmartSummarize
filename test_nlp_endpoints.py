import requests
import json

# Test summarization
text = """Artificial intelligence and machine learning are transforming every industry. 
Businesses now leverage AI for automation, predictive analytics, and customer insights. 
Deep learning models power natural language processing, computer vision, and recommendation systems. 
The future of technology is increasingly driven by AI capabilities and intelligent systems."""

print("=" * 60)
print("🧪 NLP ENDPOINT TESTING")
print("=" * 60)

# Test 1: Summarization
print("\n📝 Test 1: Summarization (BART)")
try:
    response = requests.post(
        'http://localhost:5000/api/summarize',
        json={'text': text},
        timeout=60
    )
    result = response.json()
    print(f"✅ Status: {response.status_code}")
    print(f"📊 Input: {len(text.split())} words")
    print(f"📄 Summary: {result['summary']}")
    print(f"📊 Output: {len(result['summary'].split())} words")
    print(f"✅ Success" if result.get('success') else "⚠️ Failed")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: Q&A
print("\n❓ Test 2: Question Answering (RoBERTa)")
context = "Machine learning is a subset of artificial intelligence. Deep learning uses neural networks with multiple layers."
question = "What is machine learning?"
try:
    response = requests.post(
        'http://localhost:5000/api/qa',
        json={'context': context, 'question': question},
        timeout=30
    )
    result = response.json()
    print(f"✅ Status: {response.status_code}")
    print(f"❓ Question: {question}")
    print(f"💬 Answer: {result['answer']}")
    print(f"🎯 Confidence: {result['score']:.2%}")
    print(f"✅ Success" if result.get('success') else "⚠️ Failed")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 3: Sentiment/Tone
print("\n😊 Test 3: Sentiment Analysis (RoBERTa)")
tone_text = "This product is amazing! I absolutely love it and would recommend it to everyone."
try:
    response = requests.post(
        'http://localhost:5000/api/tone',
        json={'text': tone_text},
        timeout=30
    )
    result = response.json()
    print(f"✅ Status: {response.status_code}")
    print(f"📝 Text: {tone_text}")
    print(f"💭 Sentiment: {result['sentiment']}")
    print(f"📊 Confidence: {result['confidence']:.2%}")
    print(f"✅ Success" if result.get('success') else "⚠️ Failed")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 60)
print("🎉 All tests completed!")
print("=" * 60)
