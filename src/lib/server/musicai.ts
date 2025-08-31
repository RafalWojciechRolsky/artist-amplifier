import MusicAi from '@music.ai/sdk';
import { assertServerEnv, getServerEnv } from './env';



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
			// This structure is based on the consumer function in `musicaiTransform.ts`.
			Duration: 225.5,
			Mood: '["energetic", "dark", "driving"]',
			Genre: '["Electronic", "Techno"]',
			Subgenre: '["Ambient"]',
			Instruments: '["synthesizer", "drum machine", "bass"]',
			Movement: '[]',
			Energy: 'High',
			Emotion: 'Tense',
			Language: 'Instrumental',
			'Root Key': 'A#m',
			'Time signature': '4/4',
			'Voice gender': 'N/A',
			'Voice presence': 'No',
			'Musical era': '2020s',
			Cover: '', // URL to cover art

			// URLs are expected for these; return empty strings for the mock
			Lyrics: '', // URL to a JSON file with lyrics
			'Chords structure': '', // URL to a JSON file with chords
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

export async function waitForJobResult(
	jobId: string,
	opts?: { waitTimeoutMs?: number }
): Promise<'TIMEOUT' | never> {
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
	// Legacy mapped variant removed. Prefer waitForJobRawResult + transformer.
	throw new MusicAiIntegrationError(500, 'LEGACY_REMOVED', 'Mapped job result is removed; use waitForJobRawResult');
}
