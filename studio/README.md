# Document Summarizer - AI-Powered Document Analysis

A modern web application for uploading documents (PDF/DOCX) and using **local, self-hosted NLP models** to analyze content through summarization, Q&A, tone analysis, and more.

## Features

✨ **AI-Powered Analysis**
- 📝 Audience-specific summaries (Student, Lawyer, Researcher, General Public)
- 💬 Conversational chat with documents (Q&A)
- 🗺️ Mind map generation
- 😊 Tone & sentiment analysis
- 🎧 Audio summary generation
- ❓ Suggested questions
- 📊 Document comparison

✅ **No API Costs**
- 💾 Local NLP models (BART, DistilBERT)
- 🔒 Privacy-first - documents never leave your server
- ⚡ Fast inference - sub-second responses
- 🚀 Scalable - unlimited requests

🛠️ **Tech Stack**
- Frontend: Next.js 15, React 19, TypeScript
- Backend: Node.js Server Actions, Python inference
- Database: Firebase Firestore
- Auth: Firebase Authentication
- UI: Radix UI + Tailwind CSS
- Models: Hugging Face Transformers

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Local NLP Models (Required for AI features)

Go to the [nlp/README.md](nlp/README.md) for detailed instructions.

**Quick setup:**
```bash
cd nlp

# Windows
setup.bat

# macOS/Linux  
chmod +x setup.sh
./setup.sh
```

### 3. Start Inference Server

```bash
python nlp/inference_server.py
```

The NLP server will run on `http://localhost:5000`

### 4. Start the Application

```bash
export NLP_SERVER_URL=http://localhost:5000  # macOS/Linux
npm run dev
```

Open http://localhost:9002

## Project Structure

```
studio/
├── src/
│   ├── app/              # Next.js pages
│   ├── ai/
│   │   ├── flows/        # Local NLP flows (replaces Genkit)
│   │   └── genkit.ts
│   ├── components/       # React components
│   ├── firebase/         # Firebase config
│   └── hooks/            # Custom React hooks
├── nlp/                  # Python NLP pipeline
│   ├── fetchers/         # Data source fetchers
│   ├── models/           # Model trainers
│   ├── data/             # Generated datasets
│   └── inference_server.py
├── docs/                 # Documentation
├── Dockerfile            # Docker image
└── docker-compose.yml    # Docker Compose config
```

## Local NLP Models

This app uses **local, self-hosted NLP models** instead of external APIs:

### Models Used
1. **BART** - Summarization (facebook/bart-large-cnn or facebook/bart-base)
2. **DistilBERT** - Question Answering (distilbert-base-uncased-distilled-squad)
3. **DistilBERT** - Sentiment Analysis (distilbert-base-uncased)

### Data Sources
- 📚 PubMed (biomedical research)
- 🔬 arXiv (computer science papers)
- 🇮🇳 Shodhganga (Indian research theses)

For detailed NLP setup and customization, see [NLP_IMPLEMENTATION.md](NLP_IMPLEMENTATION.md)

## Running with Docker

### Option 1: Docker Compose (Recommended)

```bash
docker compose up --build
# Opens http://localhost:9002

# In another terminal
docker compose exec app python nlp/inference_server.py
```

### Option 2: Docker CLI

```bash
# Build and run web app
docker build -t summarizer .
docker run -p 9002:9002 summarizer

# Build and run NLP server
docker build -f nlp/Dockerfile.nlp -t summarizer-nlp .
docker run -p 5000:5000 summarizer-nlp
```

## Environment Variables

Create `.env.local`:
```bash
# Firebase (optional - embedded in config)
# NEXT_PUBLIC_FIREBASE_API_KEY=your_key

# NLP Server
NLP_SERVER_URL=http://localhost:5000

# (No longer needed - removed API keys!)
# GOOGLE_GENAI_API_KEY not required
```

## API Reference

### Local NLP Endpoints

**Summarization**
```
POST /api/summarize
{ "text": "..." }
→ { "summary": "..." }
```

**Question Answering**
```
POST /api/qa
{ "context": "...", "question": "..." }
→ { "answer": "...", "score": 0.95 }
```

**Tone Analysis**
```
POST /api/tone
{ "text": "..." }
→ { "sentiment": "POSITIVE", "confidence": 0.92 }
```

See [nlp/README.md](nlp/README.md#api-endpoints) for full API docs.

## Development Scripts

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Performance

### Model Loading
- First request: ~15 seconds
- Subsequent requests: Instant (cached)

### Inference Speed
- Summarization: 2-5 seconds
- QA: 1-3 seconds  
- Tone Analysis: 0.5-2 seconds

### Resource Requirements
- Disk: 2-3 GB (models + data)
- RAM: 8 GB minimum (16 GB recommended)
- CPU: 4+ cores ideal
- GPU: Optional (CUDA 11.8+ recommended)

## Troubleshooting

### NLP Server Not Found
```bash
# 1. Make sure server is running
python nlp/inference_server.py

# 2. Test connectivity
python nlp/test_models.py

# 3. Check environment variable
echo $NLP_SERVER_URL  # Should be http://localhost:5000
```

### Models Not Downloaded
```bash
cd nlp
python setup.py  # Re-run setup to fetch data and train models
```

### Out of Memory
```bash
# Reduce batch size in nlp/models/*_trainer.py
per_device_train_batch_size=2  # reduce from 4
```

See [nlp/README.md#troubleshooting](nlp/README.md#troubleshooting) for more issues.

## Deployment

### Vercel (Frontend)
```bash
vercel deploy
# Set NLP_SERVER_URL environment variable
```

### AWS/Google Cloud (Backend + NLP Server)
Deploy as microservices:
- Next.js app on Vercel or AWS
- Python NLP server on separate instance
- Update NLP_SERVER_URL to point to deployed server

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## Security

✅ All documents are processed locally  
✅ No data sent to external APIs  
✅ Privacy-first architecture  
✅ Firestore rules enforce user isolation  
✅ No API keys in code

## License

MIT License - See LICENSE file

## Credits

- Models: Hugging Face
- Data: PubMed, arXiv, Shodhganga
- UI: Shadcn/ui, Radix UI
- AI: Local transformers.js

## Support

For issues:
1. Check [nlp/README.md](nlp/README.md)
2. Read [NLP_IMPLEMENTATION.md](NLP_IMPLEMENTATION.md)
3. Run `python nlp/test_models.py`
4. Check logs in `nlp/logs/`

## Architecture

```
Next.js App (9002)
    ↓
Server Actions
    ↓
Local NLP Flows
    ↓
Python Inference (5000)
    ↓
Hugging Face Models
```

---

**Status**: ✅ Production Ready  
**Last Updated**: February 2026  
**NLP Version**: 1.0.0
