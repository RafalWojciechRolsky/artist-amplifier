jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

// No Music.ai or fs mocks needed; generate route uses prior analysis from payload

describe('API /api/audio/generate', () => {
  let POST: (req: unknown) => Promise<{ status: number; json: () => Promise<unknown> }>;
  beforeAll(async () => {
    const mod = await import('@/app/api/audio/generate/route');
    POST = mod.POST as typeof POST;
  });
  type ApiOk = { text: string; outline: string[] };
  it('accepts valid JSON and returns enriched outline', async () => {
    const headerMap = new Map<string, string>([
      ['content-type', 'application/json'],
      ['x-real-ip', '127.0.0.1'],
      ['x-forwarded-for', '127.0.0.1'],
    ]);
    const payload = {
      artistName: 'Tester',
      artistDescription: 'x'.repeat(60),
      language: 'pl',
      analysis: {
        id: 'job-1',
        provider: 'stub',
        data: {
          tempo: 128,
          analyzedTrack: { energyLevel: 'high' },
        },
      },
    };
    const req = {
      headers: { get: (k: string) => headerMap.get(k.toLowerCase()) ?? null },
      json: async () => payload,
    };

    const res = await POST(req as unknown);
    if (res.status !== 200) {
      const body = await res.json();
      // Throw to surface details in jest output
      throw new Error(`Non-200 body: ${JSON.stringify(body)}`);
    }
    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiOk;
    expect(json.text).toContain('Tester');
    expect(Array.isArray(json.outline)).toBe(true);
    expect(json.outline[1]).toContain('tempo=');
    expect(json.outline[1]).toContain('nastrój=');
  });

  it('returns requestId on validation error (bad content-type)', async () => {
    const headerMap = new Map<string, string>([
      ['content-type', 'text/plain'],
      ['x-real-ip', '127.0.0.1'],
    ]);
    const req = {
      headers: { get: (k: string) => headerMap.get(k.toLowerCase()) ?? null },
      json: async () => ({}),
    };
    const res = await POST(req as unknown);
    const body = (await res.json()) as unknown;
    const err = body as { error: { requestId?: unknown } };
    expect(res.status).toBe(400);
    expect(typeof err.error.requestId).toBe('string');
  });

  it('maps LLM 429 to RATE_LIMIT ApiError', async () => {
    jest.useFakeTimers();
    const headerMap = new Map<string, string>([
      ['content-type', 'application/json'],
      ['x-real-ip', '127.0.0.1'],
    ]);
    // Force the first OpenAI call to respond with 429
    const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
    const make429 = async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      if (url.includes('/v1/chat/completions')) {
        return { ok: false, status: 429, text: async () => 'Too Many Requests' } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    };
    // Exhaust retry attempts (3 attempts total)
    fetchMock.mockImplementationOnce(make429);
    fetchMock.mockImplementationOnce(make429);
    fetchMock.mockImplementationOnce(make429);

    const payload = {
      artistName: 'LLM429',
      artistDescription: 'x'.repeat(60),
      language: 'pl',
      analysis: { id: 'job-2', provider: 'stub', data: {} },
    };
    const req = {
      headers: { get: (k: string) => headerMap.get(k.toLowerCase()) ?? null },
      json: async () => payload,
    };
    const promise = POST(req as unknown);
    await jest.runOnlyPendingTimersAsync();
    await jest.runOnlyPendingTimersAsync();
    const res = await promise;
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMIT');
    jest.useRealTimers();
  });
});
