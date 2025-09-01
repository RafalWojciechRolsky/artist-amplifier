import { analyzeAudio } from '../analysis';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Audio Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock response
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: () =>
          Promise.resolve({
            id: 'test-id-123',
            provider: 'music.ai',
            data: {
              fileName: 'test.mp3',
              size: 12345,
              type: 'audio/mpeg',
              tempo: 128,
              mood: 'energetic'
            }
          })
      })
    );
  });

  it('should call API and return the analysis result', async () => {
    const mockFile = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await analyzeAudio(mockFile);
    
    // Verify fetch was called with correct arguments
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/audio/analyze',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      })
    );
    
    // Verify response parsing
    expect(result).toHaveProperty('id');
    expect(result.provider).toBe('music.ai');
    expect(result.data.fileName).toBe('test.mp3');
    expect(result.data.tempo).toBe(128);
    expect(result.data.mood).toBe('energetic');
  });

  it('should be abortable', async () => {
    const mockFile = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const abortController = new AbortController();
    
    // Set up mock to simulate abort
    (global.fetch as jest.Mock).mockImplementation(() => {
      throw new DOMException('The user aborted a request', 'AbortError');
    });
    
    const promise = analyzeAudio(mockFile, { signal: abortController.signal });
    abortController.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('should handle API errors properly', async () => {
    // Mock an error response
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        headers: new Map([['content-type', 'application/json']]),
        json: () =>
          Promise.resolve({
            error: {
              code: 'MUSIC_AI_SERVICE_UNAVAILABLE',
              message: 'Service temporarily unavailable'
            }
          })
      })
    );

    const mockFile = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    
    await expect(analyzeAudio(mockFile)).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    // Mock a network error
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Network failure'))
    );

    const mockFile = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    
    await expect(analyzeAudio(mockFile)).rejects.toThrow(/Problem z połączeniem/);
  });
});
