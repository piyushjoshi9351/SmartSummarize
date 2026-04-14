# SummarAIze - Hybrid AI Document Summarizer

SummarAIze is a Next.js app for summarizing, chatting with, and analyzing documents using a **hybrid AI stack**:

- **Local NLP server** for summaries, Q&A, and tone analysis
- **Gemini API** for mind maps, comparisons, audio summaries, and suggested questions

## Quick Start

1) Install dependencies
```bash
npm install
```

2) Configure environment
```bash
cp .env.example .env.local
```

3) Install the free NLP stack
```bash
pip install transformers torch sentence-transformers
```

4) Start local NLP server (required for local or hybrid)
```bash
python nlp/inference_server.py
```

5) Start the app
```bash
npm run dev
```

Open http://localhost:9002

## Hybrid AI Modes

Set these in `.env.local`:

```bash
AI_PROVIDER=hybrid
NLP_SERVER_URL=http://localhost:5000
GOOGLE_GENAI_API_KEY=your_key_here
```

Modes:
- `local`: only the local NLP server is used
- `gemini`: only Gemini API is used
- `hybrid`: local for summary/chat/tone; Gemini for mind map/compare/audio/suggestions

## Free Hugging Face Inference

The project already uses a free local Hugging Face Transformers backend for summarization and document Q&A. If your machine is slow, you can swap the local server for the Hugging Face Inference API later without changing the frontend flow shape.
