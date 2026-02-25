import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();

  const { generateAudienceSpecificSummary } = await import(
    '../src/ai/flows/generate-audience-specific-summary'
  );
  const { getAiProvider, isGeminiEnabled, shouldUseGeminiPrimary } = await import(
    '../src/ai/provider'
  );

  const provider = getAiProvider();
  const geminiEnabled = isGeminiEnabled();
  const summaryGeminiPrimary = shouldUseGeminiPrimary('summary');

  console.log('provider:', provider);
  console.log('geminiEnabled:', geminiEnabled);
  console.log('summaryGeminiPrimary:', summaryGeminiPrimary);

  const text = `Air pollution is caused by vehicle emissions, industrial activity, biomass burning, and power generation. It increases respiratory and cardiovascular disease risk and also harms ecosystems, crops, and climate. Effective solutions include stricter emission standards, clean energy transition, public transport expansion, pollution monitoring, and local-level enforcement.`;

  const result = await generateAudienceSpecificSummary({
    text,
    audience: 'Student',
    language: 'English',
  });

  console.log('summaryBullets:', result.summary.length);
  for (const line of result.summary.slice(0, 5)) {
    console.log('-', line);
  }
}

main().catch((error) => {
  console.error('verify-gemini-summary failed:', error?.message || error);
  process.exit(1);
});
