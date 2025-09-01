import { generateDescription } from '../generate';

describe('generateDescription', () => {
  const mockForm = { artistName: 'Test Artist', artistDescription: 'A test artist' };
  const mockAnalysis = {
    id: '123',
    provider: 'stub',
    data: {
      tempo: 120, // kept for outline display
      mood: 'energetic', // legacy hint, safe to keep
      analyzedTrack: {
        lyrics: '',
        chords: [],
        moods: ['energetic'],
        genres: ['pop'],
        subgenres: [],
        instruments: [],
        movements: [],
        energyLevel: 'high',
        emotion: 'joy',
        language: 'pl',
        key: 'C major',
        timeSignature: '4/4',
        voiceGender: 'female',
        voicePresence: 'lead',
        musicalEra: 'modern',
        duration: 210,
        cover: '',
      },
    },
  } as const;
  // No file is needed for the JSON-based endpoint

  it('should generate a description successfully', async () => {
    const description = await generateDescription(mockForm, mockAnalysis);
    expect(description).toContain('Test Artist');
    expect(description).toContain('120');
    expect(description).toContain('energetic');
  });

  it('should abort the request when the signal is aborted', async () => {
    const controller = new AbortController();
    const promise = generateDescription(mockForm, mockAnalysis, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow('Aborted');
  });
});
