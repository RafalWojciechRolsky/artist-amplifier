import { analyzeAudio } from '../analysis'; // Adjust import path

describe('Audio Analysis', () => {
  it('should return a result after a delay', async () => {
    const mockFile = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await analyzeAudio(mockFile);
    expect(result).toHaveProperty('id');
    expect(result.provider).toBe('stub');
    expect(result.data.fileName).toBe('test.mp3');
  });

  it('should be abortable', async () => {
    const mockFile = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const abortController = new AbortController();
    const promise = analyzeAudio(mockFile, { signal: abortController.signal });

    abortController.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  // More tests for error handling, cancellation, etc., will be added here.
});
