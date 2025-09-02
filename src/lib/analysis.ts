'use client';

import type { AnalysisResult } from '@/lib/types/analysis';
import { uploadToBlob, requestAnalyze, getAnalyzeStatus } from '@/lib/api/client';
import { UI_TEXT } from '@/lib/constants';

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

	// 1) Upload file directly to Vercel Blob via client SDK
	// In automated E2E (Playwright sets navigator.webdriver) skip real network upload.
	let blobUrl: string;
	const isAutomated =
		typeof navigator !== 'undefined' && (navigator as unknown as { webdriver?: boolean }).webdriver === true;
	if (isAutomated) {
		blobUrl = 'https://example.com/mock-upload.mp3';
	} else {
		try {
			const { url } = await uploadToBlob(file);
			blobUrl = url;
		} catch (e: unknown) {
			const err = e as { name?: string; code?: string; message?: string };
			if (
				err?.name === 'AbortError' ||
				err?.code === 'ABORT_ERR' ||
				(typeof err?.message === 'string' && err.message.toLowerCase().includes('aborted'))
			) {
				throw new DOMException('Aborted', 'AbortError');
			}
			throw new Error(UI_TEXT.ERROR_MESSAGES.UPLOAD_FAILED);
		}
	}

	// 2) Compute SHA-256 checksum in browser for integrity verification (mandatory)
	let checksumSha256: string;
	try {
		const buf = await file.arrayBuffer();
		const hashBuf = await crypto.subtle.digest('SHA-256', buf);
		const hashArr = Array.from(new Uint8Array(hashBuf));
		checksumSha256 = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
		if (!checksumSha256) throw new Error('EMPTY_HASH');
	} catch {
		throw new Error(UI_TEXT.ERROR_MESSAGES.CHECKSUM_FAILED);
	}

	// 3) Call analyze endpoint with the blob URL + metadata
	let res: Response;
	try {
		res = await requestAnalyze(
			{
				url: blobUrl,
				fileName: file.name,
				size: file.size,
				type: file.type,
				checksumSha256,
			},
			{ signal }
		);
	} catch (e: unknown) {
		const err = e as { name?: string; code?: string; message?: string };
		if (
			err?.name === 'AbortError' ||
			err?.code === 'ABORT_ERR' ||
			(typeof err?.message === 'string' && err.message.toLowerCase().includes('aborted'))
		) {
			throw new DOMException('Aborted', 'AbortError');
		}
		throw new Error(UI_TEXT.ERROR_MESSAGES.NETWORK_ERROR);
	}

	if (res.status === 202) {
		// Background job created; poll status endpoint until ready
		const json = (await res.json().catch(() => null)) as {
			status?: string;
			jobId?: string;
		} | null;
		const jobId = json?.jobId;
		if (!jobId)
			throw new Error(UI_TEXT.ERROR_MESSAGES.JOB_ID_MISSING);

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
		// Use shorter timeout in test environment (detected by navigator.webdriver)
		const isTestEnv = typeof navigator !== 'undefined' && (navigator as unknown as { webdriver?: boolean }).webdriver === true;
		const overallTimeout = isTestEnv ? 5000 : parseInt(process.env.ANALYSIS_TIMEOUT_MS || '180000'); // 5s for tests, 3min for prod
		while (true) {
			if (Date.now() - start > overallTimeout) {
				throw new Error(UI_TEXT.ERROR_MESSAGES.ANALYSIS_TIMEOUT);
			}
			let r: Response;
			try {
				r = await getAnalyzeStatus(jobId, { signal });
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
				throw new Error(UI_TEXT.ERROR_MESSAGES.STATUS_NETWORK_ERROR);
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
					UI_TEXT.ERROR_MESSAGES.SERVER_ERROR(r.status);
				throw new Error(msg);
			}
			throw new Error(UI_TEXT.ERROR_MESSAGES.SERVER_ERROR(r.status));
		}
	}

	if (!res.ok) {
		// Attempt to parse standardized API error
		const contentType = res.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			const json = await res.json().catch(() => null);
			const errorMessage =
				json?.error?.message ||
				UI_TEXT.ERROR_MESSAGES.SERVER_ERROR(res.status);
			throw new Error(errorMessage);
		}
		throw new Error(UI_TEXT.ERROR_MESSAGES.SERVER_ERROR(res.status));
	}

	// Parse the response
	const result = (await res.json()) as AnalysisResult;
	return result;
}
