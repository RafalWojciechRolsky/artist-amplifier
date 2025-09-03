import { AUDIO, UI_TEXT } from '@/lib/constants';
import { buildDescriptionFilename, copyToClipboard, downloadTextFile, sanitizeFilename, validateAudioFile } from '@/lib/utils';

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sanitizeFilename removes diacritics and normalizes', () => {
    expect(sanitizeFilename('Żółć ß Test')).toBe('zolc_ss_test');
    expect(sanitizeFilename('  ___ ')).toBe('plik');
    expect(sanitizeFilename('A/B\\C*?')).toBe('a_b_c');
  });

  test('buildDescriptionFilename builds proper name', () => {
    expect(buildDescriptionFilename('My Artist')).toBe('my_artist_opis.txt');
  });

  test('copyToClipboard uses navigator.clipboard when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).navigator = { ...((global as any).navigator || {}), clipboard: { writeText } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).navigator = (global as any).navigator;
    // Attach to jsdom navigator if present
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).clipboard = { writeText };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).navigator = navigator as any;
    } catch {}

    const ok = await copyToClipboard('hello');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  test('copyToClipboard falls back to execCommand', async () => {
    // Remove clipboard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).navigator = { ...((global as any).navigator || {}), clipboard: undefined };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).navigator = (global as any).navigator;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).clipboard = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).navigator = navigator as any;
    } catch {}

    const exec = jest.fn().mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).execCommand = exec;

    const ok = await copyToClipboard('hello');
    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  test('downloadTextFile triggers anchor click with correct filename', () => {
    const revoke = jest.fn();
    const createUrl = jest.fn().mockReturnValue('blob:mock');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).URL.createObjectURL = createUrl;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).URL.revokeObjectURL = revoke;

    const click = jest.fn();
    const appendChild = jest.spyOn(document.body, 'appendChild');
    const removeChild = jest.spyOn(document.body, 'removeChild');

    const originalCreate = document.createElement;
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        const a = originalCreate.call(document, 'a') as HTMLAnchorElement & { click: jest.Mock };
        a.click = click;
        return a;
      }
      return originalCreate.call(document, tagName);
    });

    downloadTextFile('file.txt', 'content');

    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:mock');
  });
});

describe('validateAudioFile', () => {
  const mockSuccessUrl = 'blob:success';
  const mockErrorUrl = 'blob:error';

  beforeEach(() => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn((obj: Blob | MediaSource) => {
      if (obj instanceof Blob && obj.type.startsWith('audio/')) {
        return mockSuccessUrl;
      }
      return mockErrorUrl;
    });
    global.URL.revokeObjectURL = jest.fn();

    // Mock HTMLAudioElement
    const mockAudioElement = {
      events: {} as Record<string, (() => void)[] | undefined>,
      addEventListener: jest.fn((event, callback) => {
        if (!mockAudioElement.events[event]) {
          mockAudioElement.events[event] = [];
        }
        mockAudioElement.events[event]?.push(callback as () => void);
      }),
      remove: jest.fn(),
      set src(url: string) {
        if (url === mockSuccessUrl) {
          // Simulate async metadata load
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any).duration = 300; // 5 minutes
            mockAudioElement.events['loadedmetadata']?.forEach(cb => cb());
          }, 0);
        } else {
          setTimeout(() => {
            mockAudioElement.events['error']?.forEach(cb => cb());
          }, 0);
        }
      },
    };

    jest.spyOn(document, 'createElement').mockReturnValue(mockAudioElement as unknown as HTMLAudioElement);
  });

  test('returns valid for a correct file', async () => {
    const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: AUDIO.MAX_SIZE_BYTES - 1 });

    const result = await validateAudioFile(file);
    expect(result.isValid).toBe(true);
  });

  test('returns invalid for a file that is too large', async () => {
    const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: AUDIO.MAX_SIZE_BYTES + 1 });

    const result = await validateAudioFile(file);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe(UI_TEXT.VALIDATION_MESSAGES.AUDIO_SIZE_INVALID);
  });

  test('returns invalid for a file that is too long', async () => {
    const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: AUDIO.MAX_SIZE_BYTES - 1 });

    // Adjust mock to return a long duration
    const longDuration = AUDIO.MAX_DURATION_SECONDS + 1;
    jest.spyOn(document, 'createElement').mockImplementation(() => ({
      addEventListener: jest.fn((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => (callback as () => void)(), 0);
        }
      }),
      remove: jest.fn(),
      set src(url: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).duration = longDuration;
      },
      duration: longDuration
    } as unknown as HTMLAudioElement));

    const result = await validateAudioFile(file);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe(UI_TEXT.VALIDATION_MESSAGES.AUDIO_DURATION_INVALID);
  });

  test('returns invalid for a non-audio file that errors', async () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    const result = await validateAudioFile(file);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe(UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID);
  });
});
