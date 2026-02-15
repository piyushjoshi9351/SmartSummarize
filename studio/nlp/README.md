# Local NLP Models Setup Guide

This directory contains the local NLP model implementation that replaces API-based services with self-hosted models trained on real datasets.

## Quick Start

### 1. Install & Setup Models (30-60 minutes)

**On Windows:**
```bash
cd nlp
setup.bat
```

**On macOS/Linux:**
```bash
cd nlp
chmod +x setup.sh
./setup.sh
```

**Manual Setup (if scripts don't work):**
```bash
# Install dependencies
pip install -r nlp/requirements.txt
pip install -r nlp/server_requirements.txt

# Fetch data and train models
python nlp/data_pipeline.py
python nlp/train_all_models.py
```

### 2. Start Inference Server

```bash
# Terminal 1: Start NLP inference server
python nlp/inference_server.py
```

The server will start on `http://localhost:5000`

### 3. Run the Application

```bash
# Terminal 2: Set environment variable and start app
export NLP_SERVER_URL=http://localhost:5000  # macOS/Linux
set NLP_SERVER_URL=http://localhost:5000     # Windows

npm run dev
```

Open http://localhost:9002

## Architecture

### Data Pipeline
- **PubMed Fetcher** (`fetchers/pubmed_fetcher.py`): Fetches biomedical research papers
- **arXiv Fetcher** (`fetchers/arxiv_fetcher.py`): Fetches computer science papers
- **Shodhganga Fetcher** (`fetchers/shodhganga_fetcher.py`): Fetches Indian research theses
- **Data Processor** (`data_processor.py`): Cleans and processes data

### Models
1. **Summarization** (BART)
   - Generates document summaries
   - Audience-specific summary adjustment
   - Endpoint: `/api/summarize`

2. **Question Answering** (DistilBERT)
   - Answers questions about documents
   - Extractive QA model
   - Endpoint: `/api/qa`

3. **Tone Analysis** (DistilBERT)
   - Analyzes sentiment and tone
   - Writing style detection
   - Endpoint: `/api/tone`

### Inference Server
- **Framework**: Flask
- **Port**: 5000
- **Pre-loads models** on startup
- **Handles timeouts** and errors gracefully

## Directory Structure

```
nlp/
├── data/                          # Trained datasets
│   ├── summarization_train.csv
│   ├── qa_train.csv
│   └── tone_train.csv
├── models/                        # Fine-tuned models
│   ├── summarization/
│   ├── qa/
│   └── tone/
├── fetchers/                      # Data source fetchers
│   ├── pubmed_fetcher.py
│   ├── arxiv_fetcher.py
│   └── shodhganga_fetcher.py
├── models/                        # Model trainers
│   ├── summarization_trainer.py
│   ├── qa_trainer.py
│   └── tone_trainer.py
├── data_pipeline.py               # Orchestrates data fetching
├── data_processor.py              # Data cleaning & processing
├── train_all_models.py            # Trains all models
├── inference_server.py            # Flask inference server
├── setup.py                       # Automated setup script
├── requirements.txt               # Python dependencies
├── server_requirements.txt        # Server-specific deps
└── Dockerfile.nlp                 # Docker image
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Summarization
```bash
POST /api/summarize
Content-Type: application/json

{
  "text": "Document text to summarize..."
}

Response:
{
  "success": true,
  "summary": "Summary text..."
}
```

### Question Answering
```bash
POST /api/qa
Content-Type: application/json

{
  "context": "Document text...",
  "question": "What is...?"
}

Response:
{
  "success": true,
  "answer": "Answer text...",
  "score": 0.95
}
```

### Tone Analysis
```bash
POST /api/tone
Content-Type: application/json

{
  "text": "Document text..."
}

Response:
{
  "success": true,
  "sentiment": "POSITIVE",
  "confidence": 0.92
}
```

## Docker Deployment

### Build Image
```bash
docker build -f nlp/Dockerfile.nlp -t summarizer-nlp .
```

### Run Container
```bash
docker run -p 5000:5000 summarizer-nlp
```

### Docker Compose
```bash
# Add to docker-compose.yml
services:
  nlp-server:
    build:
      context: .
      dockerfile: nlp/Dockerfile.nlp
    ports:
      - "5000:5000"
    environment:
      - PYTHONUNBUFFERED=1
```

## Troubleshooting

### Port Already in Use
```bash
# macOS/Linux: Find and kill process
lsof -i :5000
kill -9 <PID>

# Windows: Find and kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Out of Memory During Training
- Reduce batch size in trainer files (set `per_device_train_batch_size=2`)
- Use GPU if available (trainer auto-detects)
- Train models individually instead of all at once

### Network Errors Fetching Data
- Check internet connection
- Some APIs have rate limits - script includes delays
- Manual data files can be placed in `/nlp/data/` directory

### NLP Server Connection Failed
- Ensure server is running: `python nlp/inference_server.py`
- Check `NLP_SERVER_URL` environment variable
- Default: `http://localhost:5000`

## Customization

### Use Different Models
Edit trainer files:

```python
# In summarization_trainer.py
model_name = "t5-base"  # or "facebook/bart-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
```

### Add New Data Sources
Create new fetcher in `fetchers/`:

```python
class CustomFetcher:
    def search_papers(self, query, max_results=50):
        # Implement fetching logic
        return papers_list
```

Update `data_pipeline.py` to use it.

### Adjust Inference Timeouts
Edit `src/ai/flows/generate-audience-specific-summary.ts`:

```typescript
signal: AbortSignal.timeout(60000)  // 60 second timeout
```

## Performance Notes

- **Initial Setup**: 30-60 minutes (downloads datasets, trains models)
- **Model Loading**: ~15 seconds (on first request)
- **Inference Speed**:
  - Summarization: 2-5 seconds
  - QA: 1-3 seconds
  - Tone Analysis: 0.5-2 seconds

Models can be made faster by:
- Using quantized versions
- Deploying to GPU
- Using smaller base models (DistilBERT, DistilBART)

## License & Attribution

Data sources:
- **PubMed**: https://pubmed.ncbi.nlm.nih.gov
- **arXiv**: https://arxiv.org
- **Shodhganga**: https://shodhganga.inflibnet.ac.in

Models:
- **BART**: https://huggingface.co/facebook/bart-base
- **DistilBERT**: https://huggingface.co/distilbert-base-uncased

## Support

For issues:
1. Check troubleshooting section above
2. Verify Python 3.11+ is installed
3. Ensure all dependencies are installed: `pip install -r nlp/requirements.txt`
4. Check NLP server is running and accessible
