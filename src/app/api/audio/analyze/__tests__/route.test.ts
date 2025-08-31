import { analyzeAudio } from '@/lib/server/musicai';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/server/musicai', () => ({
  analyzeAudio: jest.fn(),
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
    // Setup mock response for successful analysis
    (analyzeAudio as jest.Mock).mockResolvedValueOnce({
      durationSec: 180,
      bpm: 128,
      energy: 0.8,
      key: 'C#'
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
    expect(result.data.tempo).toBe(128);
    expect(result.data.mood).toBe('energetic');
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
  });

  it('should handle music.ai service errors', async () => {
    // Import the error class
    const { MusicAiIntegrationError } = jest.requireMock('@/lib/server/musicai');
    
    // Setup mock for musicai error
    (analyzeAudio as jest.Mock).mockRejectedValueOnce(
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
  });
});
