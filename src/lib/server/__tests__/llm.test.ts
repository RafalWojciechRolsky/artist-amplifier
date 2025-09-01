import { generateDescription } from '@/lib/server/llm';
import type { AnalyzedTrack } from '@/lib/types/analysis';

describe('llm.generateDescription', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.useFakeTimers();
    process.env = { ...OLD_ENV, LLM_API_KEY: 'k', LLM_MODEL: 'gpt-5-mini' };
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  const analyzed: AnalyzedTrack = {
    lyrics: '',
    chords: [],
    moods: ['energetic'],
    genres: ['pop'],
    subgenres: [],
    instruments: [],
    movements: [],
    energyLevel: 'high',
    emotion: 'joy',
    language: 'pl',
    key: 'C major',
    timeSignature: '4/4',
    voiceGender: 'female',
    voicePresence: 'lead',
    musicalEra: 'modern',
    duration: 210,
    cover: '',
  };

  const baseParams = {
    artistName: 'Mock Artist',
    artistDescription: 'Some long enough description that passes validation and helps generation.'.padEnd(60, 'x'),
    analysis: analyzed,
    language: 'pl' as const,
  };

  it('returns content, modelName and tokensUsed on success', async () => {
    const res = await generateDescription(baseParams);
    expect(typeof res.text).toBe('string');
    expect(res.text).toContain('Mock Artist');
    expect(res.modelName).toBeTruthy();
    expect(typeof res.tokensUsed === 'number' || res.tokensUsed === undefined).toBe(true);
  });

  it('retries on 429 once then succeeds', async () => {
    const spy = (global as unknown as { fetch: jest.Mock }).fetch;
    spy.mockImplementationOnce(async () => ({ ok: false, status: 429, text: async () => 'rate limit' }));

    const p = generateDescription(baseParams);
    await jest.runAllTimersAsync();
    const out = await p;
    expect(out.text).toContain('Mock Artist');
  });

  it('fails with LLM_BAD_GATEWAY after retries on 5xx', async () => {
    const spy = (global as unknown as { fetch: jest.Mock }).fetch;
    spy.mockImplementationOnce(async () => ({ ok: false, status: 500, text: async () => 'server err 1' }));
    spy.mockImplementationOnce(async () => ({ ok: false, status: 502, text: async () => 'server err 2' }));
    spy.mockImplementationOnce(async () => ({ ok: false, status: 503, text: async () => 'server err 3' }));

    const p = generateDescription(baseParams).catch((e) => e);
    await jest.runAllTimersAsync();
    const err = (await p) as { status?: number; code?: string };
    expect(err.status).toBe(502);
    expect(err.code).toBe('LLM_BAD_GATEWAY');
  });

  it('aborts request after 30s timeout and maps to LLM_BAD_GATEWAY', async () => {
    const spy = (global as unknown as { fetch: jest.Mock }).fetch;
    spy.mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
        // never resolve to simulate a hung upstream
      });
    });

    const p = generateDescription(baseParams).catch((e) => e);
    await jest.advanceTimersByTimeAsync(30_000);
    const err = (await p) as { status?: number; code?: string };
    expect(err.status).toBe(502);
    expect(err.code).toBe('LLM_BAD_GATEWAY');
  });

  it('throws ENV_MISSING when required LLM env vars are absent', async () => {
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    const err = (await generateDescription(baseParams).catch((e) => e)) as { code?: string; message?: string };
    expect(err.code).toBe('ENV_MISSING');
    expect(err.message || '').toContain('LLM_API_KEY');
    expect(err.message || '').toContain('LLM_MODEL');
  });
});
