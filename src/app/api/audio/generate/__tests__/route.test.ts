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
});
