import { test, expect } from '@playwright/test';
import path from 'path';

const oversizedFilePath = path.resolve(__dirname, 'fixtures/oversized.mp3');
const validFilePath = path.resolve(__dirname, 'fixtures/sample.mp3');

// Deterministic, codec-independent audio metadata stub used in-browser
async function mockAudioDuration(
  page: import('@playwright/test').Page,
  durationSeconds: number,
) {
  await page.addInitScript(({ duration }) => {
    // Expose a global to control the duration from tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__E2E_AUDIO_DURATION = duration;

    // Patch only once
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proto = HTMLMediaElement.prototype as any;
    if (!proto.__e2ePatched) {
      Object.defineProperty(proto, '__e2ePatched', { value: true });

      // Provide a getter for duration based on the global
      Object.defineProperty(proto, 'duration', {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (window as any).__E2E_AUDIO_DURATION ?? 30;
        },
        configurable: true,
      });

      // When src is assigned, dispatch loadedmetadata soon after
      const srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
      if (srcDesc && srcDesc.set) {
        Object.defineProperty(HTMLMediaElement.prototype, 'src', {
          set(val) {
            // call original setter
            srcDesc.set!.call(this, val);
            // asynchronously notify listeners that metadata is available
            setTimeout(() => {
              this.dispatchEvent(new Event('loadedmetadata'));
            }, 0);
          },
          get: srcDesc.get,
          configurable: true,
          enumerable: srcDesc.enumerable ?? false,
        });
      }
    }
  }, { duration: durationSeconds });
}

test.describe('Client-side Audio Validation', () => {
  test('should allow a valid audio file', async ({ page }) => {
    // Duration under limit so validation passes
    await mockAudioDuration(page, 30);
    await page.goto('/');

    const fileInput = page.getByLabel(/Plik utworu/i);
    await fileInput.setInputFiles(validFilePath);

    await expect(page.getByText('Weryfikacja pliku...')).not.toBeVisible();
    await expect(page.getByTestId('audio-error')).not.toBeVisible();
    await expect(page.getByText('sample.mp3')).toBeVisible();
  });

  test('should show an error for an oversized audio file', async ({ page }) => {
    // Duration irrelevant; size check triggers first
    await mockAudioDuration(page, 30);
    await page.goto('/');

    const fileInput = page.getByLabel(/Plik utworu/i);
    await fileInput.setInputFiles(oversizedFilePath);

    const error = page.getByTestId('audio-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveText('Plik jest zbyt duży. Maksymalny rozmiar to 50MB.');
  });

  test('should show an error for an over-duration audio file', async ({ page }) => {
    // Force duration over 10 minutes
    await mockAudioDuration(page, 601);
    await page.goto('/');

    const fileInput = page.getByLabel(/Plik utworu/i);
    await fileInput.setInputFiles(validFilePath);

    const error = page.getByTestId('audio-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveText('Plik audio jest zbyt długi. Maksymalna długość to 10 minut.');
  });
});
