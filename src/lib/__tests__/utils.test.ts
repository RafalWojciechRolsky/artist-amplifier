import { buildDescriptionFilename, copyToClipboard, downloadTextFile, sanitizeFilename } from '@/lib/utils';

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
