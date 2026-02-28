/**
 * Mock NLP Server - Node.js based
 * Provides compatible API with the Python inference server
 * Used as fallback when local NLP models unavailable
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

const PORT = 5000;
const MAX_LENGTH = 500; // Max characters for response

// Simple text summarization (heuristic)
function summarizeText(text, maxChunks = 24) {
  const chunks = text.match(/[^.!?]+[.!?]/g) || [text];
  const targetLength = Math.ceil(chunks.length * 0.3); // 30% of original
  
  if (chunks.length <= targetLength) {
    return text;
  }
  
  // Simple scoring based on sentence position (important sentences often at start/end)
  const scored = chunks.map((chunk, i) => ({
    chunk: chunk.trim(),
    score: (i === 0 ? 2 : 1) + (i === chunks.length - 1 ? 2 : 1) + (chunk.length > 50 ? 1 : 0)
  }));
  
  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, targetLength)
    .sort((a, b) => chunks.indexOf(a.chunk) - chunks.indexOf(b.chunk))
    .map(s => s.chunk)
    .join('');
  
  return selected || text;
}

function extractKeywords(text, limit = 6) {
  const words = (text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const stop = new Set(['that','with','from','this','have','were','their','about','which','these','those','there']);
  const counts = new Map();
  words.forEach((word) => {
    if (stop.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function buildMindMap(text) {
  const keywords = extractKeywords(text, 6);
  const root = keywords[0] || 'document';
  return {
    id: 'root',
    label: `Overview: ${root}`,
    children: keywords.slice(1).map((word, idx) => ({
      id: `topic-${idx + 1}`,
      label: word,
      children: [],
    })),
  };
}

function compareDocs(documentOneText, documentTwoText, documentOneName, documentTwoName) {
  const k1 = extractKeywords(documentOneText, 10);
  const k2 = extractKeywords(documentTwoText, 10);

  const shared = k1.filter((word) => k2.includes(word));
  const only1 = k1.filter((word) => !k2.includes(word));
  const only2 = k2.filter((word) => !k1.includes(word));

  const similarities = shared.length
    ? shared.slice(0, 4).map((word) => `Both documents discuss ${word}.`)
    : ['The documents have limited thematic overlap.'];

  const differences = [
    ...only1.slice(0, 2).map((word) => `${documentOneName} emphasizes ${word}.`),
    ...only2.slice(0, 2).map((word) => `${documentTwoName} emphasizes ${word}.`),
  ];

  if (!differences.length) {
    differences.push('Both documents focus on similar themes.');
  }

  const similarityScore = shared.length / Math.max(new Set([...k1, ...k2]).size, 1);

  return {
    similarities,
    differences,
    conclusion:
      similarityScore > 0.4
        ? 'The documents are related with moderate overlap.'
        : 'The documents focus on different aspects with limited overlap.',
    similarity_score: Number(similarityScore.toFixed(3)),
  };
}

// Simple Q&A (find relevant sentences)
function answerQuestion(context, question) {
  const questionWords = question.toLowerCase().split(/\s+/);
  const sentences = context.match(/[^.!?]+[.!?]/g) || [context];
  
  let bestSentence = sentences[0] || context;
  let bestScore = 0;
  
  sentences.forEach(sent => {
    const sentLower = sent.toLowerCase();
    let score = 0;
    questionWords.forEach(qword => {
      if (qword.length > 3 && sentLower.includes(qword)) {
        score += 1;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sent;
    }
  });
  
  return bestSentence.trim() || "Unable to find answer in provided context.";
}

// Simple tone/sentiment analysis
function analyzeTone(text) {
  const posWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'positive', 'wonderful', 'fantastic', 'best'];
  const negWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'negative', 'worst', 'horrible', 'poor', 'disappointing'];
  
  const lower = text.toLowerCase();
  let posCount = 0, negCount = 0;
  
  posWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    posCount += (lower.match(regex) || []).length;
  });
  
  negWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    negCount += (lower.match(regex) || []).length;
  });
  
  let label = 'neutral';
  if (posCount > negCount) label = 'positive';
  else if (negCount > posCount) label = 'negative';
  
  return {
    label,
    positive_score: (posCount / (posCount + negCount + 1)) * 100,
    negative_score: (negCount / (posCount + negCount + 1)) * 100
  };
}

// Parse request body
function getRequestData(req, callback) {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
    if (data.length > 1e6) {
      req.connection.destroy();
    }
  });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      callback(null, parsed);
    } catch (e) {
      callback(new Error('Invalid JSON'));
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Summarize endpoint
  if (pathname === '/api/summarize' && req.method === 'POST') {
    getRequestData(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
        return;
      }
      
      const text = data.text || '';
      const summary = summarizeText(text, data.max_chunks || 24);
      
      res.writeHead(200);
      res.end(JSON.stringify({ summary, success: true }));
    });
    return;
  }
  
  // QA endpoint
  if (pathname === '/api/qa' && req.method === 'POST') {
    getRequestData(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
        return;
      }
      
      const context = data.context || '';
      const question = data.question || '';
      const answer = answerQuestion(context, question);
      
      res.writeHead(200);
      res.end(JSON.stringify({ answer, score: 0.82, success: true }));
    });
    return;
  }
  
  // Tone analysis endpoint
  if (pathname === '/api/tone' && req.method === 'POST') {
    getRequestData(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
        return;
      }
      
      const text = data.text || '';
      const tone = analyzeTone(text);
      
      res.writeHead(200);
      const sentimentLabel = tone.label === 'positive' ? 'Positive' : tone.label === 'negative' ? 'Negative' : 'Neutral';
      res.end(
        JSON.stringify({
          sentiment: sentimentLabel,
          confidence: 0.78,
          tone: 'informative',
          success: true,
        })
      );
    });
    return;
  }

  if (pathname === '/api/mind-map' && req.method === 'POST') {
    getRequestData(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
        return;
      }

      const text = data.text || '';
      const mindMap = buildMindMap(text);
      res.writeHead(200);
      res.end(JSON.stringify({ mindMap, success: true }));
    });
    return;
  }

  if (pathname === '/api/compare-documents' && req.method === 'POST') {
    getRequestData(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
        return;
      }

      const result = compareDocs(
        data.documentOneText || '',
        data.documentTwoText || '',
        data.documentOneName || 'Document 1',
        data.documentTwoName || 'Document 2'
      );

      res.writeHead(200);
      res.end(JSON.stringify({ ...result, success: true }));
    });
    return;
  }
  
  // Health check
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'Mock NLP Server' }));
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`🤖 Mock NLP Server running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
