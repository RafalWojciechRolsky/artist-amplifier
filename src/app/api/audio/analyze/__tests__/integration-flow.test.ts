import { NextRequest } from 'next/server';

// Mock next/server to provide minimal NextResponse/NextRequest behavior
jest.mock('next/server', () => {
  class NextResponseMock {
    status: number;
    private _body: unknown;
    constructor(status = 200, body?: unknown) {
      this.status = status;
      this._body = body;
    }
    json = async () => this._body;
    static json(body: unknown, init?: { status?: number }) {
      return new NextResponseMock(init?.status ?? 200, body);
    }
  }
  return {
    NextRequest: class {},
    NextResponse: NextResponseMock,
  };
});

// Mock Music.ai server SDK interactions used by routes
jest.mock('@/lib/server/musicai', () => {
  class MusicAiIntegrationError extends Error {
    status: number;
    code: string;
    details?: Record<string, unknown>;
    constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
      super(message);
      this.name = 'MusicAiIntegrationError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
  return {
    MusicAiIntegrationError,
    analyzeAudioRaw: jest.fn(),
    waitForJobRawResult: jest.fn(),
  };
});

// Mock transformer to avoid network fetches
jest.mock('@/lib/server/musicaiTransform', () => ({
  transformMusicAiRawToAnalyzedTrack: jest.fn().mockResolvedValue({
    lyrics: '',
    chords: [],
    moods: ['energetic'],
    genres: ['EDM'],
    subgenres: ['House'],
    instruments: ['Synth'],
    movements: [],
    energyLevel: 'high',
    emotion: 'joy',
    language: 'en',
    key: 'C',
    timeSignature: '4/4',
    voiceGender: 'male',
    voicePresence: 'present',
    musicalEra: 'Modern',
    duration: 180,
    cover: '',
  }),
}));

// Mock filesystem calls (analyze route writes then unlinks temp file outside test env, but guarded; keep harmless)
jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { MusicAiIntegrationError, analyzeAudioRaw, waitForJobRawResult } from '@/lib/server/musicai';

// Import route handlers after mocks
import { POST as POST_ANALYZE } from '@/app/api/audio/analyze/route';
import { GET as GET_STATUS } from '@/app/api/audio/analyze/status/route';

describe('Integration flow: analyze → status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 202 with jobId from /analyze then 200 final result from /status', async () => {
    // Step 1: /analyze responds with 202 processing + jobId
    (analyzeAudioRaw as jest.Mock).mockRejectedValueOnce(
      new MusicAiIntegrationError(202, 'MUSIC_AI_WAIT_TIMEOUT', 'Result not ready yet', { jobId: 'job-1' })
    );

    // Mock download of blob URL inside route (downloadToTemp)
    const size = 8;
    const url = 'https://example.com/audio/demo.mp3';
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new Uint8Array(size).buffer,
    });
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    // Build JSON request expected by the route
    const jsonPayload = {
      url,
      fileName: 'demo.mp3',
      size,
      type: 'audio/mpeg',
    } as const;

    const reqAnalyze = {
      headers: new Map<string, string>([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValueOnce(jsonPayload),
    } as unknown as NextRequest;

    const resAnalyze = await POST_ANALYZE(reqAnalyze);
    expect(resAnalyze.status).toBe(202);
    const bodyAnalyze = (await resAnalyze.json()) as { status: string; jobId: string };
    expect(bodyAnalyze.status).toBe('processing');
    expect(bodyAnalyze.jobId).toBe('job-1');

    // Step 2: /status resolves with final transformed payload
    (waitForJobRawResult as jest.Mock).mockResolvedValueOnce({ bpm: 128, Energy: 'HIGH' });

    const reqStatus = { url: 'http://localhost/api/audio/analyze/status?jobId=job-1' } as unknown as NextRequest;
    const resStatus = await GET_STATUS(reqStatus);
    expect(resStatus.status).toBe(200);
    const bodyStatus = (await resStatus.json()) as { provider: string; data: Record<string, unknown> };
    expect(bodyStatus.provider).toBe('music.ai');
    expect(bodyStatus.data).toHaveProperty('analyzedTrack');
    expect(typeof bodyStatus.data['tempo']).toBe('number');
  });
});
