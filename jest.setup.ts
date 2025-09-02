import '@testing-library/jest-dom';
import { Buffer as NodeBuffer } from 'buffer';

// Ensure baseline env for LLM tests
process.env.LLM_API_KEY = process.env.LLM_API_KEY || 'test-llm-key';
process.env.LLM_MODEL = process.env.LLM_MODEL || 'gpt-5-mini';

// Mock fetch for tests (JSDOM doesn't provide it by default in this setup)
const makeOkResponse = (data: unknown) => ({
	ok: true,
	status: 200,
	json: async () => data,
});

// Provide a minimal Web Crypto API for tests (checksum computation)
// Only define if not already set by a test file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = global as any;
if (!g.crypto || !g.crypto.subtle || typeof g.crypto.subtle.digest !== 'function') {
  const cryptoMock = {
    subtle: {
      // Return a 32-byte ArrayBuffer to simulate SHA-256
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  };
  Object.defineProperty(global, 'crypto', {
    value: cryptoMock,
    configurable: true,
  });
  if (g.window) {
    Object.defineProperty(g.window, 'crypto', {
      value: cryptoMock,
      configurable: true,
    });
  }

// Polyfill Blob/File.arrayBuffer if missing in the jsdom environment
// so that File.prototype.arrayBuffer() exists during tests
try {
  const blobProto = (global as unknown as { Blob?: { prototype?: unknown } }).Blob?.prototype as unknown as {
    arrayBuffer?: () => Promise<ArrayBuffer>;
  } | undefined;
  if (blobProto && typeof blobProto.arrayBuffer !== 'function') {
    Object.defineProperty(blobProto, 'arrayBuffer', {
      value: function arrayBuffer() {
        // Derive a length if possible; default to 1 byte buffer
        const size = (this as { size?: number }).size ?? 1;
        return Promise.resolve(new Uint8Array(Math.max(1, size)).buffer);
      },
      configurable: true,
    });
  }
} catch {
  // ignore
}
}
// (no need for raw response helper; keep mocks minimal)

// Ensure Buffer exists in jsdom environment for server utilities
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(global as any).Buffer) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(global as any).Buffer = NodeBuffer;
}

// Minimal Response polyfill for tests that construct `new Response()`
// Provides: status, ok, headers (Map), json(); implemented without classes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(global as any).Response) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function ResponsePolyfill(this: any, body?: any, init?: { status?: number; headers?: Record<string, string> }) {
		// Allow calling without `new`
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (!(this instanceof (ResponsePolyfill as any))) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return new (ResponsePolyfill as any)(body, init);
		}
		this._body = body ?? null;
		this.status = init?.status ?? 200;
		this.headers = new Map(Object.entries(init?.headers ?? {}));
		this.ok = this.status >= 200 && this.status < 300;
		this.json = async () => {
			if (typeof this._body === 'string') {
				try {
					return JSON.parse(this._body);
				} catch {
					return this._body;
				}
			}
			return this._body;
		};
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(global as any).Response = ResponsePolyfill as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = jest.fn(
	(input: RequestInfo | URL, init?: RequestInit) => {
		return new Promise((resolve, reject) => {
			const signal = init?.signal as AbortSignal | undefined;
			if (signal?.aborted) {
				reject(new Error('Aborted'));
				return;
			}

			const urlStr = typeof input === 'string'
				? input
				: input instanceof URL
				? input.toString()
				: ((input as unknown as { url?: string })?.url || '');

			// Mock OpenAI Chat Completions endpoint
			if (urlStr.includes('/v1/chat/completions')) {
				let artist = 'Artist';
				try {
					const body = typeof init?.body === 'string' ? JSON.parse(init!.body as string) : {};
					const userMsg = Array.isArray(body?.messages)
						? (body.messages.find((m: unknown) => (m as { role?: string }).role === 'user') as { content?: string } | undefined)?.content ?? ''
						: '';
					const m = /Artist:\s*([^\n]+)/.exec(String(userMsg));
					if (m) artist = m[1].trim();
				} catch {
					// ignore parse errors
				}
				const content = `Opis: ${artist} — opis wygenerowany przez mock LLM.`;
				const data = {
					id: 'chatcmpl-test',
					model: process.env.LLM_MODEL || 'gpt-5-mini',
					choices: [{ message: { content } }],
					usage: { total_tokens: 42 },
				};
				// Resolve immediately to avoid interaction with fake timers in some tests
				resolve(makeOkResponse(data));
				return;
			}

			// Default success shape for client helpers expecting final API payload
			const success = {
				language: 'pl',
				text: 'Opis: Test Artist z tempem 120 i nastrojem energetic',
				outline: [],
				modelName: 'stub-llm',
				tokensUsed: 42,
			};
			const tid = setTimeout(() => resolve(makeOkResponse(success)), 0);
			if (signal) {
				const onAbort = () => {
					clearTimeout(tid);
					reject(new Error('Aborted'));
				};
				signal.addEventListener('abort', onAbort, { once: true });
			}
		});
	}
);
