import { analyzeAudioRaw } from '@/lib/server/musicai';
import { NextRequest } from 'next/server';

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
  return {
    NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
      url,
      headers: new Map(options?.headers || []),
      formData: jest.fn().mockImplementation(() => Promise.resolve(options?.body || new FormData()))
    })),
    NextResponse: {
      json: jest.fn().mockImplementation((data, options = {}) => ({
        status: options?.status || 200,
        headers: new Map(),
        json: () => Promise.resolve(data)
      }))
    }
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

    // Create mock request
    const mockFormData = new FormData();
    const mockFile = new Blob(['test audio data'], { type: 'audio/mpeg' });
    Object.defineProperty(mockFile, 'name', { value: 'test.mp3' });
    mockFormData.append('file', mockFile as File);
    
    const mockRequest = {
      headers: new Map([['content-type', 'multipart/form-data']]),
      formData: jest.fn().mockResolvedValueOnce(mockFormData)
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
    // Create mock request with no file
    const mockFormData = new FormData();
    const mockRequest = {
      headers: new Map([['content-type', 'multipart/form-data']]),
      formData: jest.fn().mockResolvedValueOnce(mockFormData)
    };

    // Call the API handler
    const response = await POST(mockRequest as unknown as NextRequest);
    const result = await response.json();

    // Verify error response
    expect(response.status).toBe(400);
    expect(result.error.code).toBe('MISSING_FILE');
    expect(typeof result.error.requestId).toBe('string');
  });

  it('should handle music.ai service errors', async () => {
    // Import the error class
    const { MusicAiIntegrationError } = jest.requireMock('@/lib/server/musicai');
    
    // Setup mock for musicai error
    (analyzeAudioRaw as jest.Mock).mockRejectedValueOnce(
      new MusicAiIntegrationError(503, 'MUSIC_AI_SERVICE_UNAVAILABLE', 'Service unavailable')
    );

    // Create mock request
    const mockFormData = new FormData();
    const mockFile = new Blob(['test audio data'], { type: 'audio/mpeg' });
    Object.defineProperty(mockFile, 'name', { value: 'test.mp3' });
    mockFormData.append('file', mockFile as File);
    
    const mockRequest = {
      headers: new Map([['content-type', 'multipart/form-data']]),
      formData: jest.fn().mockResolvedValueOnce(mockFormData)
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
