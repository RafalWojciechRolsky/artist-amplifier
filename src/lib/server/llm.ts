import type { AnalyzedTrack } from '@/lib/types/analysis';
import { getServerEnv } from './env';

export type GeneratedDescription = {
  language: 'pl' | 'en';
  text: string;
  outline?: string[];
  modelName?: string;
  tokensUsed?: number;
};

type LlmServiceError = Error & {
  status: number;
  code: string;
  details?: Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createLlmError(status: number, code: string, message: string, details?: Record<string, unknown>): LlmServiceError {
  const err = new Error(message) as LlmServiceError;
  err.name = 'LlmServiceError';
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function shouldRetry(status: number | undefined, message?: string): boolean {
  if (!status) return false;
  if (status === 429) return true;
  if (status >= 500) return true;
  const m = (message || '').toLowerCase();
  if (m.includes('too many requests')) return true;
  if (m.includes('server') || m.includes('internal')) return true;
  return false;
}

function buildPrompt(params: {
  artistName: string;
  artistDescription: string;
  analysis: AnalyzedTrack;
  language: 'pl' | 'en';
  template?: string;
  systemPrompt?: string;
}): { system: string; user: string } {
  const { artistName, artistDescription, analysis, language, template, systemPrompt } = params;
  const system = systemPrompt ??
    (language === 'pl'
      ? 'Jesteś kreatywnym copywriterem muzycznym. Tworzysz krótką notkę prasową na podstawie kontekstu.'
      : 'You are a creative music copywriter. Write a short press blurb based on the provided context.');

  const analysisSummary = (() => {
    try {
      const moods = Array.isArray(analysis.moods) && analysis.moods.length ? `moods: ${analysis.moods.join(', ')}` : undefined;
      const energy = analysis.energyLevel ? `energy: ${analysis.energyLevel}` : undefined;
      const genre = Array.isArray(analysis.genres) && analysis.genres.length ? `genre: ${analysis.genres[0]}` : undefined;
      const keySig = analysis.key ? `key: ${analysis.key}` : undefined;
      const ts = analysis.timeSignature ? `time signature: ${analysis.timeSignature}` : undefined;
      const dur = Number.isFinite(analysis.duration) && analysis.duration > 0 ? `duration: ${Math.round(analysis.duration)}s` : undefined;
      const parts = [moods, energy, genre, keySig, ts, dur].filter(Boolean) as string[];
      return parts.length ? `Key signals from analysis: ${parts.join(', ')}` : '';
    } catch {
      return '';
    }
  })();

  const t = template ? `Template hint: ${template}\n` : '';
  const user = `Language: ${language}\nArtist: ${artistName}\nAbout: ${artistDescription}\n${analysisSummary}\n${t}Task: Write a concise, engaging description (max ~120 words).`;

  return { system, user };
}

export async function generateDescription(params: {
  artistName: string;
  artistDescription: string;
  analysis: AnalyzedTrack;
  language: 'pl' | 'en';
  template?: string;
}): Promise<GeneratedDescription> {
  const env = getServerEnv();
  const apiKey = env.LLM_API_KEY;
  const model = env.LLM_MODEL;
  const systemPrompt = env.LLM_SYSTEM_PROMPT;

  if (!apiKey || !model) {
    const missing: string[] = [];
    if (!apiKey) missing.push('LLM_API_KEY');
    if (!model) missing.push('LLM_MODEL');
    throw createLlmError(500, 'ENV_MISSING', `Missing required env vars: ${missing.join(', ')}`, { missing });
  }

  const { system, user } = buildPrompt({
    artistName: params.artistName,
    artistDescription: params.artistDescription,
    analysis: params.analysis,
    language: params.language,
    template: params.template,
    systemPrompt,
  });

  const backoffs = [250, 750];
  let lastError: unknown;

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      // Add request timeout (30s) to protect server resources
      const controller = new AbortController();
      const TIMEOUT_MS = 30_000;
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const status = res.status;
          if (shouldRetry(status, errText) && attempt < backoffs.length) {
            await sleep(backoffs[attempt]);
            continue;
          }
          if (status === 429) {
            throw createLlmError(429, 'LLM_RATE_LIMIT', 'LLM provider rate limited');
          }
          throw createLlmError(502, 'LLM_BAD_GATEWAY', errText || 'LLM provider error', { status });
        }

        const json = (await res.json()) as {
          id: string;
          model: string;
          choices: Array<{ message?: { content?: string } | null }>;
          usage?: { total_tokens?: number };
        };

        const content = json?.choices?.[0]?.message?.content?.trim() || '';
        const tokensUsed = json?.usage?.total_tokens ?? undefined;
        const modelName = json?.model ?? model;

        if (!content) {
          throw createLlmError(502, 'LLM_EMPTY_RESPONSE', 'LLM returned empty content');
        }

        return {
          language: params.language,
          text: content,
          modelName,
          tokensUsed,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (e: unknown) {
      lastError = e;
      const maybe = e as { status?: number; code?: string; message?: string };
      if (maybe?.status && shouldRetry(maybe.status, maybe.message) && attempt < backoffs.length) {
        await sleep(backoffs[attempt]);
        continue;
      }
      break;
    }
  }

  if (lastError) {
    const le = lastError as LlmServiceError;
    if (le.status === 429) throw le;
    // If upstream provided a structured LLM error (5xx), rethrow it to preserve status/code
    if (le.code === 'LLM_BAD_GATEWAY' || (typeof le.status === 'number' && le.status >= 500)) {
      throw le;
    }
  }
  const msg = (lastError as { message?: string } | undefined)?.message || 'LLM integration failed';
  throw createLlmError(502, 'LLM_BAD_GATEWAY', msg);
}
