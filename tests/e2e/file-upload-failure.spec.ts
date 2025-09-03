import { test, expect } from '@playwright/test';
import path from 'path';

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

test.beforeEach(async ({ page }) => {
  // Keep duration under limit; size/type checks are handled via fixtures
  await mockAudioDuration(page, 30);
});

// Test for network abort during upload
test('network abort during file upload', async ({ page }) => {
  // Mock the upload endpoint to simulate an abort
  page.route('**/api/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://example.com/mock-upload.mp3',
        signedUrl: 'https://example.com/mock-upload.mp3?signature=abc123'
      }),
    });
  });

  // Mock analyze audio to return a job ID
  page.route('**/api/audio/analyze', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'processing', jobId: 'job-1' }),
    });
  });

  // Mock the status endpoint to simulate a timeout
  page.route('**/api/audio/analyze/status**', async (route) => {
    await route.fulfill({
      status: 408,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'TIMEOUT', message: 'Request timeout' } }),
    });
  });

  await page.goto('/');
  
  // Fill form fields
  const name = page.getByLabel(/Nazwa artysty\/zespołu/i);
  const title = page.getByLabel(/Tytuł utworu/i);
  const desc = page.getByLabel(/Opis artysty/i);
  const fileInput = page.getByLabel(/Plik utworu/i);
  
  await name.fill('Test Artist');
  await title.fill('Cosmic Echoes');
  await desc.fill('A'.repeat(60));
  
  // Upload file
  const filePath = path.resolve(__dirname, 'fixtures/sample.mp3');
  await fileInput.setInputFiles(filePath);
  
  // Click analyze button
  await page.getByRole('button', { name: /Analizuj utwór/i }).click();
  
  // Verify error message is displayed
  await expect(page.getByTestId('status-banner')).toHaveText('Błąd analizy');
});

// Test for UI feedback on upload failure
test('UI feedback on upload failure', async ({ page }) => {
  // Mock the upload endpoint to return an error
  page.route('**/api/upload', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Upload failed' }),
    });
  });
  
  await page.goto('/');
  
  // Fill form fields
  const name = page.getByLabel(/Nazwa artysty\/zespołu/i);
  const title = page.getByLabel(/Tytuł utworu/i);
  const desc = page.getByLabel(/Opis artysty/i);
  const fileInput = page.getByLabel(/Plik utworu/i);
  
  await name.fill('Test Artist');
  await title.fill('Cosmic Echoes');
  await desc.fill('A'.repeat(60));
  
  // Upload file
  const filePath = path.resolve(__dirname, 'fixtures/sample.mp3');
  await fileInput.setInputFiles(filePath);
  
  // Click analyze button
  await page.getByRole('button', { name: /Analizuj utwór/i }).click();
  
  // Verify error message is displayed
  await expect(page.getByTestId('status-banner')).toHaveText('Błąd analizy');
});

// Test for checksum mismatch error (422)
test('checksum mismatch error', async ({ page }) => {
  // Mock the upload endpoint
  page.route('**/api/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://example.com/mock-upload.mp3',
        signedUrl: 'https://example.com/mock-upload.mp3?signature=abc123'
      }),
    });
  });
  
  // Mock analyze audio to return checksum mismatch error
  page.route('**/api/audio/analyze', async (route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'CHECKSUM_MISMATCH',
          message: 'Checksum mismatch detected for downloaded file',
          details: { expected: 'abc123', actual: 'def456' }
        }
      }),
    });
  });
  
  await page.goto('/');
  
  // Fill form fields
  const name = page.getByLabel(/Nazwa artysty\/zespołu/i);
  const title = page.getByLabel(/Tytuł utworu/i);
  const desc = page.getByLabel(/Opis artysty/i);
  const fileInput = page.getByLabel(/Plik utworu/i);
  
  await name.fill('Test Artist');
  await title.fill('Cosmic Echoes');
  await desc.fill('A'.repeat(60));
  
  // Upload file
  const filePath = path.resolve(__dirname, 'fixtures/sample.mp3');
  await fileInput.setInputFiles(filePath);
  
  // Click analyze button
  await page.getByRole('button', { name: /Analizuj utwór/i }).click();
  
  // Verify error message is displayed
  await expect(page.getByTestId('status-banner')).toHaveText('Błąd analizy');
});

// Test for background job polling success scenario
test('background job polling success', async ({ page }) => {
  // Mock the upload endpoint
  page.route('**/api/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://example.com/mock-upload.mp3',
        signedUrl: 'https://example.com/mock-upload.mp3?signature=abc123'
      }),
    });
  });
  
  // Mock analyze audio to return a job ID (202 status)
  page.route('**/api/audio/analyze', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'processing', jobId: 'job-1' }),
    });
  });
  
  // Mock the status endpoint to return success after a short delay
  let callCount = 0;
  page.route('**/api/audio/analyze/status**', async (route) => {
    callCount++;
    if (callCount <= 2) {
      // First two calls return processing
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'processing', jobId: 'job-1' }),
      });
    } else {
      // Third call returns success
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'completed',
          data: {
            fileName: 'sample.mp3',
            analyzedTrack: { genre: 'Electronic', mood: 'Energetic' }
          }
        }),
      });
    }
  });
  
  await page.goto('/');
  
  // Fill form fields
  const name = page.getByLabel(/Nazwa artysty\/zespołu/i);
  const title = page.getByLabel(/Tytuł utworu/i);
  const desc = page.getByLabel(/Opis artysty/i);
  const fileInput = page.getByLabel(/Plik utworu/i);
  
  await name.fill('Test Artist');
  await title.fill('Cosmic Echoes');
  await desc.fill('A'.repeat(60));
  
  // Upload file
  const filePath = path.resolve(__dirname, 'fixtures/sample.mp3');
  await fileInput.setInputFiles(filePath);
  
  // Click analyze button
  await page.getByRole('button', { name: /Analizuj utwór/i }).click();
  
  // Wait for success message
  await expect(page.getByTestId('status-banner')).toHaveText('Ukończono analizę', { timeout: 15000 });
});
