import { analyzeAudioRaw } from '@/lib/server/musicai';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';

// Mock the dependencies
jest.mock('@/lib/server/musicai', () => ({
  analyzeAudioRaw: jest.fn(),
  MusicAiIntegrationError: class MusicAiIntegrationError extends Error {
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
}));

jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

// Mock next/server
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
    NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
      url,
      headers: new Map(options?.headers || []),
      json: jest.fn().mockImplementation(() => Promise.resolve(options?.body || {})),
    })),
    NextResponse: NextResponseMock,
  };
});

// Import after mocks
import { POST } from '../route';

describe('Audio analyze API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should properly analyze audio files', async () => {
    // Setup mock response for successful analysis (raw shape from music.ai)
    (analyzeAudioRaw as jest.Mock).mockResolvedValueOnce({
      Mood: ['energetic'],
      Genre: ['EDM'],
      Subgenre: ['House'],
      Instruments: ['Synth'],
      Movement: [],
      Energy: 'High',
      Emotion: 'Joy',
      Language: 'English',
      'Root Key': 'C#',
      'Time signature': '4/4',
      'Voice gender': 'male',
      'Voice presence': 'present',
      'Musical era': 'Modern',
      Duration: 180,
      Cover: 'http://example.com/cover.jpg'
    });

    // Mock download of blob URL
    const size = 16;
    const url = 'https://example.com/audio/test.mp3';
    (global as unknown as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new Uint8Array(size).buffer,
    }) as unknown as typeof fetch;

    // Create mock JSON request
    const mockRequest = {
      headers: new Map([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValueOnce({
        url,
        fileName: 'test.mp3',
        size,
        type: 'audio/mpeg',
        checksumSha256: createHash('sha256').update(new Uint8Array(size)).digest('hex'),
      }),
    };

    // Call the API handler
    const response = await POST(mockRequest as unknown as NextRequest);
    const result = await response.json();

    // Verify the response
    expect(response.status).toBe(200);
    expect(result.provider).toBe('music.ai');
    expect(result.data.analyzedTrack).toBeDefined();
    expect(result.data.analyzedTrack.moods).toContain('energetic');

    // Ensure temp file cleanup was attempted
    const { unlink } = jest.requireMock('node:fs/promises');
    expect(unlink).toHaveBeenCalledTimes(1);
    expect(typeof (unlink as jest.Mock).mock.calls[0][0]).toBe('string');
  });

  it('should handle missing file error', async () => {
    // Create mock JSON request with missing required fields
    const mockRequest = {
      headers: new Map([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValueOnce({}),
    };

    // Call the API handler
    const response = await POST(mockRequest as unknown as NextRequest);
    const result = await response.json();

    // Verify error response
    expect(response.status).toBe(400);
    expect(result.error.code).toBe('MISSING_FIELDS');
    expect(typeof result.error.requestId).toBe('string');
  });

  it('should handle music.ai service errors', async () => {
    // Import the error class
    const { MusicAiIntegrationError } = jest.requireMock('@/lib/server/musicai');
    
    // Setup mock for musicai error
    (analyzeAudioRaw as jest.Mock).mockRejectedValueOnce(
      new MusicAiIntegrationError(503, 'MUSIC_AI_SERVICE_UNAVAILABLE', 'Service unavailable')
    );

    // Mock download of blob URL
    const size = 24;
    const url = 'https://example.com/audio/test.mp3';
    (global as unknown as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new Uint8Array(size).buffer,
    }) as unknown as typeof fetch;

    // Create mock JSON request
    const mockRequest = {
      headers: new Map([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValueOnce({
        url,
        fileName: 'test.mp3',
        size,
        type: 'audio/mpeg',
        checksumSha256: createHash('sha256').update(new Uint8Array(size)).digest('hex'),
      }),
    };

    // Call the API handler
    const response = await POST(mockRequest as unknown as NextRequest);
    const result = await response.json();

    // Verify error response
    expect(response.status).toBe(503);
    expect(result.error.code).toBe('MUSIC_AI_SERVICE_UNAVAILABLE');
    expect(typeof result.error.requestId).toBe('string');
  });
});
