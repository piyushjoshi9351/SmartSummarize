import requests
import time

print("\n" + "="*60)
print("🧪 NLP ENDPOINTS - MIND MAP & COMPARISON TEST")
print("="*60)

time.sleep(3)

# Test 1: Mind Map Generation
print("\n🗺️  Test 1: Mind Map Generation")
text = """Artificial intelligence encompasses machine learning and deep learning. 
Machine learning involves training models on data. Deep learning uses neural networks with multiple layers. 
Applications include natural language processing, computer vision, and recommendation systems. 
NLP helps with text analysis, sentiment analysis, and translation. 
Computer vision enables image recognition and object detection."""

try:
    response = requests.post(
        'http://localhost:5000/api/mind-map',
        json={'text': text},
        timeout=60
    )
    result = response.json()
    print(f"✅ Status: {response.status_code}")
    print(f"📌 Root: {result['mindMap']['label']}")
    print(f"📊 Topics: {len(result['mindMap'].get('children', []))}")
    if result['mindMap'].get('children'):
        for child in result['mindMap']['children'][:3]:
            subtopics = len(child.get('children', []))
            print(f"   - {child['label']} ({subtopics} subtopics)")
    print(f"✅ Success" if result.get('success') else "⚠️ Failed")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: Document Comparison
print("\n📊 Test 2: Document Comparison")
doc1 = """Machine learning is a subset of artificial intelligence that enables systems to learn from data. 
It involves training algorithms on historical examples to make predictions on new data. 
Common applications include classification, regression, and clustering."""

doc2 = """Deep learning is a specialized approach within machine learning using neural networks. 
It uses multiple layers of non-linear transformations to extract features from raw input. 
Applications include image recognition, natural language processing, and speech recognition."""

try:
    response = requests.post(
        'http://localhost:5000/api/compare-documents',
        json={
            'documentOneText': doc1,
            'documentTwoText': doc2,
            'documentOneName': 'Machine Learning Guide',
            'documentTwoName': 'Deep Learning Guide'
        },
        timeout=60
    )
    result = response.json()
    print(f"✅ Status: {response.status_code}")
    print(f"📈 Similarity Score: {result.get('similarity_score', 0):.1%}")
    print(f"\n🟢 Similarities: {len(result.get('similarities', []))} found")
    for sim in result.get('similarities', [])[:2]:
        print(f"   • {sim}")
    print(f"\n🔴 Differences: {len(result.get('differences', []))} found")
    for diff in result.get('differences', [])[:2]:
        print(f"   • {diff}")
    print(f"\n💡 Conclusion: {result.get('conclusion', 'N/A')}")
    print(f"✅ Success" if result.get('success') else "⚠️ Failed")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*60)
print("🎉 All new endpoint tests completed!")
print("="*60 + "\n")
