import { analyzeAudioRaw, MusicAiIntegrationError } from '@/lib/server/musicai';
import { transformMusicAiRawToAnalyzedTrack } from '@/lib/server/musicaiTransform';
import type { AnalyzedTrack } from '@/lib/types/analysis';

const mockUpload = jest.fn<Promise<string>, [string]>();
const mockAddJob = jest.fn<Promise<string>, [Record<string, unknown>]>();
const mockWait = jest.fn<Promise<{ status: string; result?: Record<string, unknown> | null; error?: unknown }>, [string]>();

jest.mock('@music.ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    uploadFile: mockUpload,
    addJob: mockAddJob,
    waitForJobCompletion: mockWait,
  }));
});

global.fetch = jest.fn();

describe('musicai.analyzeAudioRaw and transformMusicAiRawToAnalyzedTrack', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    process.env = { ...OLD_ENV, MUSIC_AI_API_KEY: 'k', MUSIC_AI_WORKFLOW_ANALYZE: 'wf' };
    mockUpload.mockReset();
    mockAddJob.mockReset();
    mockWait.mockReset();
    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  it('returns mapped analysis on success', async () => {
    const rawMusicAiResult = {
      'Mood': 'energetic',
      'Genre': 'pop',
      'Subgenre': '',
      'Instruments': '',
      'Movement': '',
      'Energy': 'high',
      'Emotion': 'joy',
      'Language': 'pl',
      'Root Key': 'C major',
      'Time signature': '4/4',
      'Voice gender': 'female',
      'Voice presence': 'lead',
      'Musical era': 'modern',
      'Duration': 210,
      'Cover': '',
      'Lyrics': '', // Mocked to return empty array
      'Chords structure': '', // Mocked to return empty array
    };
    mockUpload.mockResolvedValueOnce('https://tmp/file');
    mockAddJob.mockResolvedValueOnce('job-1');
    mockWait.mockResolvedValueOnce({ status: 'SUCCEEDED', result: rawMusicAiResult });

    const rawAnalysis = await analyzeAudioRaw('/tmp/a.mp3');
    const analyzedTrack: AnalyzedTrack = await transformMusicAiRawToAnalyzedTrack(rawAnalysis);

    expect(analyzedTrack).toEqual({
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
    });
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockAddJob).toHaveBeenCalledTimes(1);
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then succeeds', async () => {
    const err = Object.assign(new Error('Too Many Requests'), { status: 429 as number });
    const rawMusicAiResult = {
      'Duration': 90,
      'Mood': 'calm',
      'Genre': 'jazz',
      'Root Key': 'C',
      'Time signature': '4/4',
      'Energy': 'low',
      'Emotion': 'peaceful',
      'Language': 'en',
      'Voice gender': 'male',
      'Voice presence': 'background',
      'Musical era': 'classical',
      'Cover': '',
      'Lyrics': '',
      'Chords structure': '',
    };

    mockUpload.mockRejectedValueOnce(err);
    mockUpload.mockResolvedValueOnce('https://tmp/file');
    mockAddJob.mockResolvedValueOnce('job-2');
    mockWait.mockResolvedValueOnce({ status: 'SUCCEEDED', result: rawMusicAiResult });

    const rawAnalysisPromise = analyzeAudioRaw('/tmp/a.mp3');
    await jest.runOnlyPendingTimersAsync(); // advance backoff(250)
    const rawAnalysis = await rawAnalysisPromise;
    const analyzedTrack: AnalyzedTrack = await transformMusicAiRawToAnalyzedTrack(rawAnalysis);

    expect(analyzedTrack.duration).toBe(90);
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('throws MusicAiIntegrationError when job fails', async () => {
    mockUpload.mockResolvedValueOnce('https://tmp/file');
    mockAddJob.mockResolvedValueOnce('job-3');
    mockWait.mockResolvedValueOnce({ status: 'FAILED', error: { code: 'X', title: 't', message: 'm' } });

    await expect(analyzeAudioRaw('/tmp/a.mp3')).rejects.toBeInstanceOf(MusicAiIntegrationError);
  });
});
