import '@testing-library/jest-dom';

// Mock fetch for tests (JSDOM doesn't provide it by default in this setup)
const makeOkResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
  return new Promise((resolve, reject) => {
    const signal = init?.signal as AbortSignal | undefined;
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    // Provide a deterministic successful response to satisfy tests, but async
    const success = {
      language: 'pl',
      text: 'Opis: Test Artist z tempem 120 i nastrojem energetic',
      outline: [],
      modelName: 'stub-llm',
      tokensUsed: 42,
    };

    const tid = setTimeout(() => {
      resolve(makeOkResponse(success));
    }, 0);

    if (signal) {
      const onAbort = () => {
        clearTimeout(tid);
        reject(new Error('Aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
});
