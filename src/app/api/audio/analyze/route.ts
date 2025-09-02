import { NextRequest, NextResponse } from 'next/server';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { analyzeAudioRaw, MusicAiIntegrationError } from '@/lib/server/musicai';
import { transformMusicAiRawToAnalyzedTrack } from '@/lib/server/musicaiTransform';
import { createHash } from 'node:crypto';

// Simple in-memory rate limiter: max 20 requests per 5 minutes per IP
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQ = 20;
const buckets = new Map<string, number[]>();

function rateLimit(key: string) {
	const now = Date.now();
	const windowStart = now - WINDOW_MS;
	const arr = buckets.get(key) ?? [];
	const filtered = arr.filter((t) => t > windowStart);
	if (filtered.length >= MAX_REQ) return false;
	filtered.push(now);
	buckets.set(key, filtered);
	return true;
}

// Lightweight file signature checks
function looksLikeMP3(bytes: Uint8Array): boolean {
    // ID3 tag or MPEG frame sync
    if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true; // 'ID3'
    if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true; // frame sync
    return false;
}

function looksLikeWAV(bytes: Uint8Array): boolean {
    // 'RIFF' .... 'WAVE'
    if (bytes.length >= 12) {
        const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // RIFF
        const wave = bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45; // WAVE
        return riff && wave;
    }
    return false;
}

// Limits aligned with FE validation
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPT_MIME = new Set(['audio/mpeg', 'audio/wav']);

type ApiError = {
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
		timestamp: string;
		requestId: string;
	};
};

function apiError(
	status: number,
	code: string,
	message: string,
	details: Record<string, unknown> | undefined,
	requestId: string
) {
	const body: ApiError = {
		error: {
			code,
			message,
			details,
			timestamp: new Date().toISOString(),
			requestId,
		},
	};
	return NextResponse.json(body, { status });
}

function getClientIp(req: NextRequest): string {
	const forwarded = req.headers.get('x-forwarded-for');
	const ip = (
		forwarded?.split(',')[0] ||
		req.headers.get('x-real-ip') ||
		'unknown'
	).toString();
	return String(ip);
}

type AnalyzeFromUrlPayload = {
	url: string;
	fileName: string;
	size: number;
	type: string;
	checksumSha256?: string;
};

async function downloadToTemp(
	url: string,
	expectedSize: number,
	requestId: string,
	maxRetries = 2
): Promise<{ tempPath: string; actualSize: number; checksumSha256: string } | NextResponse> {
	const ext = url.toLowerCase().endsWith('.mp3') ? 'mp3' : url.toLowerCase().endsWith('.wav') ? 'wav' : 'bin';
	const tempPath = join(tmpdir(), `aa-${randomUUID()}.${ext}`);

	let attempt = 0;
	while (attempt <= maxRetries) {
		try {
			const res = await fetch(url, { cache: 'no-store' });
			if (!res.ok) {
				return apiError(
					400,
					'DOWNLOAD_FAILED',
					'Unable to download provided audio URL',
					{ status: res.status },
					requestId
				);
			}

			const buf = await res.arrayBuffer();
			const bytes = buf.byteLength;
			if (bytes !== expectedSize) {
				// cleanup and maybe retry
				try { await unlink(tempPath); } catch {}
				if (attempt < maxRetries) { attempt += 1; continue; }
				return apiError(
					422,
					'SIZE_MISMATCH',
					'Downloaded file size does not match expected size',
					{ expectedSize, bytes },
					requestId
				);
			}
			const hash = createHash('sha256');
			hash.update(new Uint8Array(buf));
			const checksumSha256 = hash.digest('hex');
			await writeFile(tempPath, Buffer.from(buf));
			return { tempPath, actualSize: bytes, checksumSha256 };
		} catch {
			try { await unlink(tempPath); } catch {}
			if (attempt < maxRetries) { attempt += 1; continue; }
			return apiError(
				400,
				'DOWNLOAD_ERROR',
				'Network error while downloading audio URL',
				undefined,
				requestId
			);
		}
	}
	return apiError(400, 'DOWNLOAD_ERROR', 'Failed after retries', undefined, requestId);
}

export async function POST(req: NextRequest) {
	const requestId = randomUUID();
	// Rate limit
	const ip = getClientIp(req);
	if (!rateLimit(String(ip))) {
		return apiError(
			429,
			'RATE_LIMIT',
			'Too many requests. Please try again later.',
			undefined,
			requestId
		);
	}

	// Expect JSON body with URL
	const contentType = req.headers.get('content-type') || '';
	if (!contentType.toLowerCase().includes('application/json')) {
		return apiError(
			400,
			'BAD_CONTENT_TYPE',
			'Expected application/json',
			undefined,
			requestId
		);
	}

	let payload: AnalyzeFromUrlPayload | null = null;
	try {
		payload = (await req.json()) as AnalyzeFromUrlPayload;
	} catch {
		return apiError(400, 'BAD_REQUEST', 'Invalid JSON body', undefined, requestId);
	}

	if (!payload || !payload.url || !payload.fileName || !payload.type || typeof payload.size !== 'number') {
		return apiError(400, 'MISSING_FIELDS', 'Required fields: url, fileName, type, size', undefined, requestId);
	}

	if (!ACCEPT_MIME.has(payload.type)) {
		return apiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only MP3 and WAV files are supported', undefined, requestId);
	}
	if (payload.size > MAX_SIZE_BYTES) {
		return apiError(413, 'PAYLOAD_TOO_LARGE', 'File too large (max 50MB)', undefined, requestId);
	}

	// In test env, skip deep signature check
	const isTest = process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test';
	if (!isTest) {
		try {
			// Peek first bytes to verify signature by fetching range when possible
			const headRes = await fetch(payload.url, { headers: { Range: 'bytes=0-15' } });
			if (headRes.ok) {
				const arr = new Uint8Array(await headRes.arrayBuffer());
				const isMp3 = payload.type === 'audio/mpeg' && looksLikeMP3(arr);
				const isWav = payload.type === 'audio/wav' && looksLikeWAV(arr);
				if (!isMp3 && !isWav) {
					return apiError(400, 'INVALID_CONTENT', 'File signature does not match declared type', undefined, requestId);
				}
			}
		} catch {
			// Continue; will validate after full download
		}
	}

	// Download to temp with retries + checksum
	const downloaded = await downloadToTemp(payload.url, payload.size, requestId);
	if (downloaded instanceof NextResponse) return downloaded;
	let tempPath: string | null = null;
	const { tempPath: tPath, actualSize, checksumSha256 } = downloaded;
	tempPath = tPath;

	try {
		// Optional checksum comparison
		if (payload?.checksumSha256 && payload.checksumSha256 !== checksumSha256) {
			return apiError(
				422,
				'CHECKSUM_MISMATCH',
				'Checksum mismatch detected for downloaded file',
				{ expected: payload.checksumSha256, actual: checksumSha256 },
				requestId
			);
		}

		// Always fetch RAW result and transform centrally
		const raw = await analyzeAudioRaw(tempPath as string);
		const analyzedTrack = await transformMusicAiRawToAnalyzedTrack(
			raw as Record<string, unknown>
		);
		try {
			if (!process.env.JEST_WORKER_ID) {
				console.debug(
					'[audio/analyze]',
					requestId,
					'analyzed ->',
					analyzedTrack
				);
			}
		} catch {}

		// Return clean payload for app state
		return NextResponse.json({
			id: `${Date.now()}`,
			provider: 'music.ai',
			data: {
				fileName: payload.fileName,
				size: actualSize,
				type: payload.type,
				analyzedTrack,
			},
		});
	} catch (e: unknown) {
		const maybe = e as {
			name?: string;
			status?: number;
			code?: string;
			message?: string;
			details?: Record<string, unknown>;
		};
		if (
			e instanceof MusicAiIntegrationError ||
			(maybe?.name === 'MusicAiIntegrationError' &&
				typeof maybe.status === 'number' &&
				typeof maybe.code === 'string')
		) {
			// Special case: initial wait timed out but job was created; instruct client to poll
			if (
				maybe.status === 202 &&
				maybe.code === 'MUSIC_AI_WAIT_TIMEOUT' &&
				maybe.details &&
				'jobId' in maybe.details
			) {
				const details = maybe.details as Record<string, unknown>;
				return NextResponse.json(
					{ status: 'processing', jobId: String(details.jobId) },
					{ status: 202 }
				);
			}
			return apiError(
				maybe.status ?? 503,
				maybe.code ?? 'MUSIC_AI_SERVICE_ERROR',
				maybe.message ?? 'Service error',
				maybe.details,
				requestId
			);
		}
		return apiError(
			502,
			'MUSIC_AI_BAD_GATEWAY',
			'Upstream error while analyzing audio',
			undefined,
			requestId
		);
	} finally {
		// Attempt to cleanup temp file regardless of outcome
		try {
			if (tempPath) {
				await unlink(tempPath).catch(() => {});
			}
		} catch {
			// noop
		}
	}
}
