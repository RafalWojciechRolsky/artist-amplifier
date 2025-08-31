import { analyzeAudio, MusicAiIntegrationError } from '@/lib/server/musicai';

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

describe('musicai.analyzeAudio', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    process.env = { ...OLD_ENV, MUSIC_AI_API_KEY: 'k', MUSIC_AI_WORKFLOW_ANALYZE: 'wf' };
    mockUpload.mockReset();
    mockAddJob.mockReset();
    mockWait.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  it('returns mapped analysis on success', async () => {
    mockUpload.mockResolvedValueOnce('https://tmp/file');
    mockAddJob.mockResolvedValueOnce('job-1');
    mockWait.mockResolvedValueOnce({ status: 'SUCCEEDED', result: { durationSec: 125.6, bpm: 120, musicalKey: 'Am', energy: 0.75 } });

    const p = analyzeAudio('/tmp/a.mp3');
    const res = await p;
    expect(res).toEqual({ durationSec: 125.6, bpm: 120, musicalKey: 'Am', energy: 0.75 });
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockAddJob).toHaveBeenCalledTimes(1);
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then succeeds', async () => {
    const err = Object.assign(new Error('Too Many Requests'), { status: 429 as number });
    mockUpload.mockRejectedValueOnce(err);
    mockUpload.mockResolvedValueOnce('https://tmp/file');
    mockAddJob.mockResolvedValueOnce('job-2');
    mockWait.mockResolvedValueOnce({ status: 'SUCCEEDED', result: { duration: 90 } });

    const p = analyzeAudio('/tmp/a.mp3');
    await jest.runOnlyPendingTimersAsync(); // advance backoff(250)
    const res = await p;
    expect(res.durationSec).toBe(90);
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('throws MusicAiIntegrationError when job fails', async () => {
    mockUpload.mockResolvedValueOnce('https://tmp/file');
    mockAddJob.mockResolvedValueOnce('job-3');
    mockWait.mockResolvedValueOnce({ status: 'FAILED', error: { code: 'X', title: 't', message: 'm' } });

    await expect(analyzeAudio('/tmp/a.mp3')).rejects.toBeInstanceOf(MusicAiIntegrationError);
  });
});
