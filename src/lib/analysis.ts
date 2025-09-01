'use client';

import type { AnalysisResult } from '@/lib/types/analysis';

// Server validation endpoint helper
export type ValidateAudioResult = { ok: true } | { ok: false; error: string };

export async function validateAudioFile(
	file: File,
	opts?: { signal?: AbortSignal }
): Promise<ValidateAudioResult> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch('/api/validate-audio', {
		method: 'POST',
		body: form,
		signal: opts?.signal,
	});
	// Always try to parse JSON for consistent error surface
	const json = (await res
		.json()
		.catch(() => ({ ok: false, error: 'UNKNOWN' }))) as ValidateAudioResult;
	return json;
}

// Real API-based analysis function with abort support
export async function analyzeAudio(
	file: File,
	opts?: { signal?: AbortSignal }
): Promise<AnalysisResult> {
	const { signal } = opts ?? {};

	// Build multipart form data
	const formData = new FormData();
	formData.append('file', file);

	let res: Response;
	try {
		res = await fetch('/api/audio/analyze', {
			method: 'POST',
			body: formData,
			signal: signal,
		});
	} catch (e: unknown) {
		const err = e as { name?: string; code?: string; message?: string };
		if (
			err?.name === 'AbortError' ||
			err?.code === 'ABORT_ERR' ||
			(typeof err?.message === 'string' &&
				err.message.toLowerCase().includes('aborted'))
		) {
			throw new DOMException('Aborted', 'AbortError');
		}
		throw new Error('Problem z połączeniem sieciowym. Spróbuj ponownie.');
	}

	if (res.status === 202) {
		// Background job created; poll status endpoint until ready
		const json = (await res.json().catch(() => null)) as {
			status?: string;
			jobId?: string;
		} | null;
		const jobId = json?.jobId;
		if (!jobId)
			throw new Error(
				'Serwer przetwarza analizę, ale nie zwrócił identyfikatora zadania.'
			);

		const sleep = (ms: number, s?: AbortSignal) =>
			new Promise<void>((resolve, reject) => {
				const t = setTimeout(resolve, ms);
				if (s) {
					const onAbort = () => {
						clearTimeout(t);
						reject(new DOMException('Aborted', 'AbortError'));
					};
					if (s.aborted) return onAbort();
					s.addEventListener('abort', onAbort, { once: true });
				}
			});

		const start = Date.now();
		let delay = 2000; // 2s
		const maxDelay = 8000; // 8s
		const overallTimeout = 180_000; // 3 min
		while (true) {
			if (Date.now() - start > overallTimeout) {
				throw new Error(
					'Przekroczono czas oczekiwania na wynik analizy. Spróbuj ponownie za chwilę.'
				);
			}
			let r: Response;
			try {
				r = await fetch(
					`/api/audio/analyze/status?jobId=${encodeURIComponent(jobId)}`,
					{ signal }
				);
			} catch (e: unknown) {
				const err = e as { name?: string; code?: string; message?: string };
				if (
					err?.name === 'AbortError' ||
					err?.code === 'ABORT_ERR' ||
					(typeof err?.message === 'string' &&
						err.message.toLowerCase().includes('aborted'))
				) {
					throw new DOMException('Aborted', 'AbortError');
				}
				throw new Error(
					'Problem z połączeniem sieciowym podczas sprawdzania statusu.'
				);
			}
			if (r.ok) {
				const ready = (await r.json()) as AnalysisResult;
				return ready;
			}
			if (r.status === 202) {
				await sleep(delay, signal);
				delay = Math.min(Math.floor(delay * 1.5), maxDelay);
				continue;
			}
			// Propagate API error body when possible
			const ct = r.headers.get('content-type') || '';
			if (ct.includes('application/json')) {
				const j = await r.json().catch(() => null);
				const msg =
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(j as any)?.error?.message ||
					`Błąd serwera (${r.status}). Spróbuj ponownie.`;
				throw new Error(msg);
			}
			throw new Error(`Błąd serwera (${r.status}). Spróbuj ponownie.`);
		}
	}

	if (!res.ok) {
		// Attempt to parse standardized API error
		const contentType = res.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			const json = await res.json().catch(() => null);
			const errorMessage =
				json?.error?.message ||
				`Błąd serwera (${res.status}). Spróbuj ponownie.`;
			throw new Error(errorMessage);
		}
		throw new Error(`Błąd serwera (${res.status}). Spróbuj ponownie.`);
	}

	// Parse the response
	const result = (await res.json()) as AnalysisResult;
	return result;
}
