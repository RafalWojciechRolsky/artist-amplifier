import MusicAi from '@music.ai/sdk';
import { assertServerEnv, getServerEnv } from './env';

export type AudioAnalysis = {
	durationSec: number;
	bpm?: number;
	musicalKey?: string;
	energy?: number;
};

// Reasonable server wait window (under common serverless 60s limits)
const DEFAULT_WAIT_TIMEOUT_MS = 55_000;

export class MusicAiIntegrationError extends Error {
	status: number;
	code: string;
	details?: Record<string, unknown>;
	constructor(
		status: number,
		code: string,
		message: string,
		details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'MusicAiIntegrationError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function shouldRetry(e: unknown): { retry: boolean; status?: number } {
	if (e instanceof MusicAiIntegrationError) {
		return { retry: false, status: e.status };
	}
	const err = e as { status?: number; message?: unknown } | undefined;
	const status: number | undefined =
		typeof err?.status === 'number' ? err.status : undefined;
	const message =
		typeof err?.message === 'string' ? err.message.toLowerCase() : '';
	if (status === 429) return { retry: true, status };
	if (status && status >= 500) return { retry: true, status };
	if (message.includes('too many requests'))
		return { retry: true, status: 429 };
	if (message.includes('internal') || message.includes('server'))
		return { retry: true, status: 502 };
	return { retry: false, status };
}

function mapResultToAnalysis(
	result: Record<string, unknown> | null | undefined
): AudioAnalysis {
	// Accept flexible field names from workflow outputs
	const r = (result ?? {}) as Record<string, unknown>;
	const num = (v: unknown): number | undefined => {
		if (typeof v === 'number' && Number.isFinite(v)) return v;
		if (typeof v === 'string' && !isNaN(Number(v))) return Number(v);
		return undefined;
	};
	const str = (v: unknown): string | undefined =>
		typeof v === 'string' ? v : undefined;

	const durationSec =
		num(r['durationSec'] ?? r['duration'] ?? r['lengthSec']) ?? 0;
	const bpm = num(r['bpm'] ?? r['tempo']);
	const musicalKey = str(r['musicalKey'] ?? r['key'] ?? r['tonality']);
	const energy = num(r['energy'] ?? r['intensity']);

	const mapped: AudioAnalysis = { durationSec, bpm, musicalKey, energy };
	return mapped;
}

// Exported pure mapper for external callers (e.g., API route transformers)
export function mapRawToAudioAnalysis(
	raw: Record<string, unknown> | null | undefined
): AudioAnalysis {
	return mapResultToAnalysis(raw);
}

/**
 * Analyze an audio file via Music.ai workflow.
 * @param filePath absolute path to a local file to upload
 */
// Minimal SDK type surface used by our integration
type JobStatus = 'QUEUED' | 'STARTED' | 'SUCCEEDED' | 'FAILED';
type Job = {
	id: string;
	status: JobStatus;
	result: Record<string, unknown> | null;
	error: { code: string; title: string; message: string } | null;
};

interface MusicAiSdk {
	uploadFile(fileLocation: string): Promise<string>;
	addJob(jobData: {
		name: string;
		workflow: string;
		params: Record<string, unknown>;
		copyResultsTo?: Record<string, unknown>;
		metadata?: Record<string, unknown>;
	}): Promise<string>;
	waitForJobCompletion(id: string): Promise<Job>;
}

async function waitWithTimeout(
	musicAi: MusicAiSdk,
	jobId: string,
	waitTimeoutMs: number
): Promise<Job | 'TIMEOUT'> {
	const result = await Promise.race<Job | 'TIMEOUT'>([
		musicAi.waitForJobCompletion(jobId),
		sleep(waitTimeoutMs).then(() => 'TIMEOUT' as const),
	]);
	return result;
}

export async function waitForJobResult(
	jobId: string,
	opts?: { waitTimeoutMs?: number }
): Promise<AudioAnalysis | 'TIMEOUT'> {
	assertServerEnv();
	const Ctor = MusicAi as unknown as MusicAiCtor;
	const env = getServerEnv();
	const musicAi = new Ctor({ apiKey: env.MUSIC_AI_API_KEY });
	const job = await waitWithTimeout(
		musicAi,
		jobId,
		opts?.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
	);
	if (job === 'TIMEOUT') return 'TIMEOUT';
	if (job?.status !== 'SUCCEEDED') {
		throw new MusicAiIntegrationError(
			502,
			'MUSIC_AI_JOB_FAILED',
			'Music.ai job failed',
			{ jobId, error: job?.error }
		);
	}
	return mapResultToAnalysis(
		job.result as Record<string, unknown> | null | undefined
	);
}

/**
 * Fetch the RAW result of a Music.ai job (no mapping). Useful when callers
 * need to transform the provider payload into a richer domain object.
 */
export async function waitForJobRawResult(
	jobId: string,
	opts?: { waitTimeoutMs?: number }
): Promise<Record<string, unknown> | 'TIMEOUT'> {
	assertServerEnv();
	const Ctor = MusicAi as unknown as MusicAiCtor;
	const env = getServerEnv();
	const musicAi = new Ctor({ apiKey: env.MUSIC_AI_API_KEY });
	const job = await waitWithTimeout(
		musicAi,
		jobId,
		opts?.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
	);
	if (job === 'TIMEOUT') return 'TIMEOUT';
	if (job?.status !== 'SUCCEEDED') {
		throw new MusicAiIntegrationError(
			502,
			'MUSIC_AI_JOB_FAILED',
			'Music.ai job failed',
			{ jobId, error: job?.error }
		);
	}
	return (job.result ?? {}) as Record<string, unknown>;
}

type MusicAiCtor = new (opts: { apiKey: string }) => MusicAiSdk;

/**
 * Run the analyze workflow and return the RAW result from Music.ai without mapping.
 * Useful when the upstream payload contains URLs to additional JSON (lyrics, chords)
 * that need to be fetched and transformed by the caller.
 */
export async function analyzeAudioRaw(
	filePath: string,
	opts?: { waitTimeoutMs?: number }
): Promise<Record<string, unknown>> {
	// --- DEV MOCK: Easy to remove when not needed ---
	// To enable, set MOCK_MUSIC_AI=true in your .env.local file
	if (process.env.MOCK_MUSIC_AI === 'true') {
		console.log(
			'--- [DEV] MOCKING music.ai response. To disable, unset MOCK_MUSIC_AI in .env.local ---'
		);
		await sleep(1500); // Simulate analysis delay

		// This mock is compatible with `transformMusicAiRawToAnalyzedTrack`
		return {
			// Basic fields for `mapResultToAnalysis`
			duration: 225.5,
			DUPA: 'DUPA',
			tempo: 125,
			tonality: 'A#m',
			intensity: 0.75,

			// Detailed fields for `transformMusicAiRawToAnalyzedTrack`
			// Values are strings, often stringified JSON, as the transformer expects.
			Mood: '["energetic", "dark", "driving"]' as const,
			Genre: '["Electronic", "Techno"]' as const,
			Subgenre: '["Ambient"]' as const,
			Instruments: '["synthesizer", "drum machine", "bass"]' as const,
			Movement: '[]' as const,
			Energy: 'High',
			Emotion: 'Tense',
			Language: 'Instrumental',
			'Root Key': 'A#m',
			'Time signature': '4/4',
			'Voide gender': 'N/A', // Note: original transformer has a typo here
			'Voice presence': 'No',
			'Musical era': '2020s',
			// URLs are expected for these; return empty strings for the mock
			Lyrics: '',
			'Chords structure': '',
		};
	}
	// --- END DEV MOCK ---

	assertServerEnv();
	const Ctor = MusicAi as unknown as MusicAiCtor;
	const env = getServerEnv();
	const musicAi = new Ctor({ apiKey: env.MUSIC_AI_API_KEY });
	const workflow = env.MUSIC_AI_WORKFLOW_ANALYZE;

	const backoffs = [250, 750]; // ms (2 retries)
	for (let attempt = 0; attempt <= backoffs.length; attempt++) {
		try {
			const inputUrl: string = await musicAi.uploadFile(filePath);
			const jobId: string = await musicAi.addJob({
				name: `analyze-${Date.now()}`,
				workflow,
				params: { inputUrl },
			});
			const job = await waitWithTimeout(
				musicAi,
				jobId,
				opts?.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
			);
			if (job === 'TIMEOUT') {
				throw new MusicAiIntegrationError(
					202,
					'MUSIC_AI_WAIT_TIMEOUT',
					'Result not ready yet',
					{ jobId }
				);
			}
			if (job?.status !== 'SUCCEEDED') {
				throw new MusicAiIntegrationError(
					502,
					'MUSIC_AI_JOB_FAILED',
					'Music.ai job failed',
					{ jobId, error: job?.error }
				);
			}
			const raw = (job.result ?? {}) as Record<string, unknown>;
			return raw;
		} catch (e: unknown) {
			const { retry, status } = shouldRetry(e);
			if (retry && attempt < backoffs.length) {
				await sleep(backoffs[attempt]);
				continue;
			}
			if (status === 429) {
				throw new MusicAiIntegrationError(
					429,
					'MUSIC_AI_RATE_LIMIT',
					'Music.ai rate limited'
				);
			}
			if (e instanceof MusicAiIntegrationError && e.status === 202) {
				throw e;
			}
			let message: string = 'Music.ai integration error';
			const maybe = e as { message?: unknown } | undefined;
			if (typeof maybe?.message === 'string') message = maybe.message;
			throw new MusicAiIntegrationError(502, 'MUSIC_AI_BAD_GATEWAY', message);
		}
	}
	throw new MusicAiIntegrationError(
		502,
		'MUSIC_AI_BAD_GATEWAY',
		'Music.ai integration exhausted retries'
	);
}

export async function analyzeAudio(
	filePath: string,
	opts?: { waitTimeoutMs?: number }
): Promise<AudioAnalysis> {
	// Reuse the raw variant to avoid duplicate jobs, then map locally
	const raw = await analyzeAudioRaw(filePath, opts);
	return mapResultToAnalysis(raw);
}
