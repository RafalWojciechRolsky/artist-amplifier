import { generateDescription } from '../generate';

describe('generateDescription', () => {
  const mockForm = { artistName: 'Test Artist', artistDescription: 'A test artist' };
  const mockAnalysis = {
    id: '123',
    provider: 'stub',
    data: {
      tempo: 120,
      mood: 'energetic',
    },
  };
  const mockFile = new File([new Blob(['dummy audio'])], 'test.mp3', { type: 'audio/mpeg' });

  it('should generate a description successfully', async () => {
    const description = await generateDescription(mockForm, mockAnalysis, mockFile);
    expect(description).toContain('Test Artist');
    expect(description).toContain('120');
    expect(description).toContain('energetic');
  });

  it('should abort the request when the signal is aborted', async () => {
    const controller = new AbortController();
    const promise = generateDescription(mockForm, mockAnalysis, mockFile, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow('Aborted');
  });
});
