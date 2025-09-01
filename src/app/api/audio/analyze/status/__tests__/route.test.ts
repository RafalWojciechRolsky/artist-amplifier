import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

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
    waitForJobRawResult: jest.fn(),
  };
});

jest.mock('@/lib/server/musicaiTransform', () => ({
  transformMusicAiRawToAnalyzedTrack: jest.fn().mockResolvedValue({
    lyrics: '',
    chords: [],
    moods: [],
    genres: [],
    instruments: [],
    movements: [],
    energyLevel: 'high',
    emotion: '',
    language: 'en',
    key: 'C',
    timeSignature: '4/4',
    voiceGender: '',
    voicePresence: '',
    musicalEra: '',
  }),
}));

import { GET } from '../route';
import { MusicAiIntegrationError, waitForJobRawResult } from '@/lib/server/musicai';
import { transformMusicAiRawToAnalyzedTrack } from '@/lib/server/musicaiTransform';

describe('API /api/audio/analyze/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 on missing jobId and includes requestId', async () => {
    const req = { url: 'http://localhost/api/audio/analyze/status' } as unknown as NextRequest;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_JOB_ID');
    expect(typeof body.error.requestId).toBe('string');
  });

  it('returns 202 processing on TIMEOUT', async () => {
    (waitForJobRawResult as jest.Mock).mockResolvedValueOnce('TIMEOUT');
    const req = { url: 'http://localhost/api/audio/analyze/status?jobId=job-1' } as unknown as NextRequest;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body.status).toBe('processing');
    expect(body.jobId).toBe('job-1');
  });

  it('maps success payload to analyzedTrack and mood', async () => {
    (waitForJobRawResult as jest.Mock).mockResolvedValueOnce({ bpm: 128, Energy: 'HIGH' });
    (transformMusicAiRawToAnalyzedTrack as jest.Mock).mockResolvedValueOnce({
      lyrics: '',
      chords: [],
      moods: [],
      genres: [],
      instruments: [],
      movements: [],
      energyLevel: 'high',
      emotion: '',
      language: 'en',
      key: 'C',
      timeSignature: '4/4',
      voiceGender: '',
      voicePresence: '',
      musicalEra: '',
    });
    const req = { url: 'http://localhost/api/audio/analyze/status?jobId=job-2' } as unknown as NextRequest;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.provider).toBe('music.ai');
    expect(body.data.tempo).toBe(128);
    expect(body.data.mood).toBe('energetic');
    expect(body.data.analyzedTrack).toBeTruthy();
  });

  it('propagates MusicAiIntegrationError and includes requestId', async () => {
    (waitForJobRawResult as jest.Mock).mockRejectedValueOnce(
      new MusicAiIntegrationError(503, 'MUSIC_AI_SERVICE_UNAVAILABLE', 'Service unavailable')
    );
    const req = { url: 'http://localhost/api/audio/analyze/status?jobId=job-3' } as unknown as NextRequest;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error.code).toBe('MUSIC_AI_SERVICE_UNAVAILABLE');
    expect(typeof body.error.requestId).toBe('string');
  });
});
