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

const GEN_TEXT = 'To jest wygenerowany opis utworu.';

// Mock helpers
function setupApiMocks(page: import('@playwright/test').Page) {
  // Validate audio
  page.route('**/api/validate-audio', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  // Analyze audio -> returns job id
  page.route('**/api/audio/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'job-1', provider: 'stub', data: { tempo: 120, mood: 'uplifting' } }),
    });
  });

  // Poll status -> done
  page.route('**/api/audio/analyze/status**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'job-1', status: 'done', data: { tempo: 120, mood: 'uplifting' } }),
    });
  });

  // Generate description
  page.route('**/api/audio/generate', async (route) => {
    // Add a small delay to simulate network latency and allow UI to enter loading state
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ language: 'pl', text: GEN_TEXT, outline: [], modelName: 'stub', tokensUsed: 1 }),
    });
  });
}

// Happy path including Song Title
// Given I am on the main page
// When I fill all fields including Song Title and upload a valid file
// And I analyze and then generate
// Then the generated description should be visible

test('happy path with song title', async ({ page }) => {
  await setupApiMocks(page);

  await page.goto('/');

  // Labels are in PL as per integration tests
  const name = page.getByLabel(/Nazwa artysty\/zespołu/i);
  const title = page.getByLabel(/Tytuł utworu/i);
  const desc = page.getByLabel(/Opis artysty/i);
  const fileInput = page.getByLabel(/Plik utworu/i);

  await name.fill('Test Artist');
  await title.fill('Cosmic Echoes');
  await desc.fill('A'.repeat(60));

  const filePath = path.resolve(__dirname, 'fixtures/sample.mp3');
  await fileInput.setInputFiles(filePath);

  await page.getByRole('button', { name: /Analizuj utwór/i }).click();

  // Wait for generate button to appear
  await expect(page.getByRole('button', { name: /Generuj opis/i })).toBeVisible();
  await page.getByRole('button', { name: /Generuj opis/i }).click();

  // Button shows generating state and then editor contains text
  await expect(page.getByRole('button', { name: /Generowanie opisu.../i })).toBeDisabled();

  // The textarea/editor has placeholder in PL per integration tests
  const editor = page.getByPlaceholder(/Tutaj pojawi się wygenerowany opis.../i);
  await expect(editor).toHaveValue(GEN_TEXT);
});
