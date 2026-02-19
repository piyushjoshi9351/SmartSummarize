export interface LocalMindMapNode {
  id: string;
  label: string;
  children?: LocalMindMapNode[];
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'with',
  'that',
  'this',
  'from',
  'into',
  'your',
  'their',
  'they',
  'have',
  'has',
  'had',
  'but',
  'not',
  'you',
  'was',
  'were',
  'will',
  'would',
  'should',
  'could',
  'about',
  'which',
  'these',
  'those',
  'also',
  'such',
  'than',
  'then',
  'what',
  'when',
  'where',
  'why',
  'who',
  'how',
  'can',
  'its',
  'our',
  'one',
  'two',
  'three',
  'four',
  'five',
  'over',
  'under',
  'between',
  'within',
  'without',
  'more',
  'most',
  'less',
  'least',
  'may',
  'might',
  'using',
  'used',
  'use',
  'based',
  'study',
  'data',
  'result',
  'results',
  'analysis',
  'research',
  'paper',
  'document',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

export function naiveSummaryBullets(text: string, limit = 4): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return ['No summary available for this document.'];
  }

  const keywords = extractKeywords(text, 12);
  const scored = sentences.map((sentence) => {
    const score = keywords.reduce(
      (total, keyword) => (sentence.toLowerCase().includes(keyword) ? total + 1 : total),
      0
    );
    return { sentence, score };
  });

  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(limit, scored.length))
    .map((item) => item.sentence);

  return selected.map((sentence) => (sentence.endsWith('.') ? sentence : `${sentence}.`));
}

export function naiveAnswer(documentText: string, question: string): string {
  const sentences = splitSentences(documentText);
  if (sentences.length === 0) {
    return 'I could not find an answer in the document.';
  }

  const questionTokens = new Set(tokenize(question));

  let bestSentence = sentences[0];
  let bestScore = -1;

  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    const score = tokens.reduce(
      (total, token) => (questionTokens.has(token) ? total + 1 : total),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  if (bestScore <= 0) {
    return 'I could not find an answer in the document.';
  }

  return `${bestSentence} (Source: Document content)`;
}

export function buildSuggestedQuestions(text: string): string[] {
  const keywords = extractKeywords(text, 6);
  if (keywords.length === 0) {
    return [
      'What is the main purpose of the document?',
      'Which key points should I focus on?',
      'Are there any conclusions or recommendations?',
    ];
  }

  const templates = [
    (keyword: string) => `What does the document say about ${keyword}?`,
    (keyword: string) => `Why is ${keyword} important in this document?`,
    (keyword: string) => `How does the document define or describe ${keyword}?`,
    (keyword: string) => `What evidence or examples are given for ${keyword}?`,
    (keyword: string) => `What are the implications of ${keyword} discussed here?`,
  ];

  return keywords.slice(0, 5).map((keyword, index) => {
    const template = templates[index % templates.length];
    return template(keyword);
  });
}

export function buildMindMap(text: string): LocalMindMapNode {
  const keywords = extractKeywords(text, 10);
  const rootLabel = keywords[0] ? `Overview: ${keywords[0]}` : 'Document Overview';
  const children = keywords.slice(1, 6).map((keyword, index) => {
    const subKeywords = extractKeywords(text, 12)
      .filter((candidate) => candidate !== keyword)
      .slice(index, index + 2);
    return {
      id: `topic-${index + 1}`,
      label: keyword,
      children: subKeywords.map((subKeyword, subIndex) => ({
        id: `topic-${index + 1}-${subIndex + 1}`,
        label: subKeyword,
      })),
    };
  });

  return {
    id: 'root',
    label: rootLabel,
    children,
  };
}

export function compareDocumentsLocal(
  documentOneText: string,
  documentTwoText: string,
  documentOneName: string,
  documentTwoName: string
): { similarities: string[]; differences: string[]; conclusion: string } {
  const keywordsOne = extractKeywords(documentOneText, 10);
  const keywordsTwo = extractKeywords(documentTwoText, 10);

  const similarities = keywordsOne.filter((keyword) => keywordsTwo.includes(keyword));
  const differencesOne = keywordsOne.filter((keyword) => !keywordsTwo.includes(keyword));
  const differencesTwo = keywordsTwo.filter((keyword) => !keywordsOne.includes(keyword));

  const similarityLines = similarities.length
    ? similarities.slice(0, 5).map((keyword) => `Both documents discuss ${keyword}.`)
    : ['The documents share only limited overlapping topics.'];

  const differenceLines: string[] = [];
  differencesOne.slice(0, 3).forEach((keyword) => {
    differenceLines.push(`${documentOneName} emphasizes ${keyword}.`);
  });
  differencesTwo.slice(0, 3).forEach((keyword) => {
    differenceLines.push(`${documentTwoName} emphasizes ${keyword}.`);
  });

  if (differenceLines.length === 0) {
    differenceLines.push('Both documents emphasize similar themes overall.');
  }

  const conclusion =
    similarities.length > differencesOne.length + differencesTwo.length
      ? 'The documents cover largely similar themes with minor differences.'
      : 'The documents focus on different themes with some overlap.';

  return {
    similarities: similarityLines,
    differences: differenceLines,
    conclusion,
  };
}
