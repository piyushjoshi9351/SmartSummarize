export type AiProviderMode = 'local' | 'gemini' | 'hybrid';
export type AiFeature =
  | 'summary'
  | 'chat'
  | 'tone'
  | 'mindMap'
  | 'suggestedQuestions'
  | 'compare'
  | 'audio';

const rawProvider = (process.env.AI_PROVIDER || 'hybrid').toLowerCase();

const provider: AiProviderMode =
  rawProvider === 'local' || rawProvider === 'gemini' || rawProvider === 'hybrid'
    ? rawProvider
    : 'hybrid';

export const GEMINI_API_KEY =
  process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || '';
export const GEMINI_ENABLED = GEMINI_API_KEY.trim().length > 0;
export const NLP_SERVER_URL = process.env.NLP_SERVER_URL || 'http://localhost:5000';

export function getAiProvider(): AiProviderMode {
  return provider;
}

export function isGeminiEnabled(): boolean {
  return GEMINI_ENABLED;
}

export function preferredProviderFor(feature: AiFeature): 'local' | 'gemini' {
  if (provider === 'gemini') {
    return 'gemini';
  }

  if (provider === 'local') {
    return 'local';
  }

  // Hybrid mode: prefer local for everything except audio generation.
  if (feature === 'audio') {
    return 'gemini';
  }

  return 'local';
}

export function shouldUseGeminiPrimary(feature: AiFeature): boolean {
  return preferredProviderFor(feature) === 'gemini' && GEMINI_ENABLED;
}

export function canUseGeminiFor(feature: AiFeature): boolean {
  if (!GEMINI_ENABLED) {
    return false;
  }

  return provider !== 'local';
}

export function canUseLocalFor(feature: AiFeature): boolean {
  return preferredProviderFor(feature) === 'local';
}
