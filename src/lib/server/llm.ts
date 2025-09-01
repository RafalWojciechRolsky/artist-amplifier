import type { AnalyzedTrack } from '@/lib/types/analysis';
import { getServerEnv } from './env';
import * as fs from 'node:fs';

export type GeneratedDescription = {
	language: 'pl' | 'en';
	text: string;
	outline?: string[];
	modelName?: string;
	tokensUsed?: number;
};

type LlmServiceError = Error & {
	status: number;
	code: string;
	details?: Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createLlmError(
	status: number,
	code: string,
	message: string,
	details?: Record<string, unknown>
): LlmServiceError {
	const err = new Error(message) as LlmServiceError;
	err.name = 'LlmServiceError';
	err.status = status;
	err.code = code;
	err.details = details;
	return err;
}

function shouldRetry(status: number | undefined, message?: string): boolean {
	if (!status) return false;
	if (status === 429) return true;
	if (status >= 500) return true;
	const m = (message || '').toLowerCase();
	if (m.includes('too many requests')) return true;
	if (m.includes('server') || m.includes('internal')) return true;
	return false;
}

function buildPrompt(params: {
	artistName: string;
	artistDescription: string;
	analysis: AnalyzedTrack;
	language: 'pl' | 'en';
	template?: string;
	systemPrompt?: string;
}): { system: string; user: string } {
	const {
		artistName,
		artistDescription,
		analysis,
		language,
		template,
		systemPrompt,
	} = params;
	const system =
		systemPrompt ??
		(language === 'pl'
			? `Jesteś charyzmatycznym dziennikarzem muzycznym i krytykiem w stylu najlepszych autorów pism branżowych. Potrafisz ubrać dźwięk w słowa, które pulsują energią i emocjami. Twoim zadaniem jest napisanie magnetycznej, gotowej do publikacji notki o utworze (~1500-1600 znaków), która oddaje jego "flow" i jest napisana błyskotliwym, obrazowym językiem.

      Twoja metodologia pracy jest następująca:

      **Krok 1: ZNAJDŹ ESENCJĘ UTWORU**
      Zacznij od głębokiej analizy danych w JSON. Znajdź esencję utworu – jego emocjonalne i ideowe jądro. Połącz główny przekaz tekstu (lyrics) z nastrojem płynącym z harmonii (chords) i podanych moods.

      **Krok 2: DODAJ SZCZYPTĘ KONTEKSTU**
      Z opisu About artysty wybierz tylko JEDNĄ, najbardziej trafną cechę (np. "surowe trio", "nie boją się hałasu"), która idealnie rezonuje z esencją utworu znalezioną w Kroku 1. To ma być przyprawa, nie danie główne.

      **Krok 3: ZBUDUJ NARRACJĘ I STYL**
      Teraz skomponuj tekst, kierując się poniższymi zasadami pisania o muzyce:
      - **Nie opisuj – interpretuj.** Odpowiedz na pytanie: O czym jest ten utwór *naprawdę*? Jaki manifest za nim stoi? Do kogo krzyczy? Wskazuj inspiracje.
      - **Używaj języka zmysłów i metafor.** Pisz o muzyce tak, by można było ją poczuć (np. "gitara, która ledwo trzyma się życia", "wokal jak wyznanie", "sekcja rytmiczna jak żywe mięśnie").
      - **Skup się na autentyczności.** Podkreśl "ludzki" wymiar, surowość, energię grania na żywo, "brud", który świadczy o prawdziwości.
      - **Zbuduj most do słuchacza.** Pokaż, dla kogo jest ta piosenka, jakie uczucia może w nim wywołać i dlaczego nie jest mu obojętna.

      **Cel ostateczny:** Stworzyć tekst, który nie jest informacją, lecz przeżyciem. Ma intrygować, poruszać i sprawić, że jedyną opcją po przeczytaniu jest natychmiastowe wciśnięcie "play".
      
      UWAGI NA KONIEC: 
      - Jeśli w JSON nie ma danych o moods, użyj tylko danych z JSON. Jeśli w JSON nie ma danych o chords, użyj tylko danych z JSON.
      - Jeśli w JSON nie ma danych o lyrics, użyj tylko danych z JSON.
      - Jeśli w JSON nie ma danych o artistDescription, użyj tylko danych z JSON.
      - Jeśli w JSON nie ma danych o artistName, użyj tylko danych z JSON.
      - JSON zawiera wiele danych, spojrz na nie z góry, i intepretuj jest razem ze sobą a nie osobno. Szukaj wyjątków ale też reguły w pojmowaniu utworu.
      - notak ma mieć ~1500 znaków.
      `
			: `Napisz, że masz na to wywalone.`);

	// Build full analysis JSON, excluding fields that are not useful for LLM (e.g., cover)
	let analysisJson = '';
	try {
		analysisJson = JSON.stringify(
			analysis,
			(key, value) => (key === 'cover' ? undefined : value),
			2
		);
	} catch {
		analysisJson = '{}';
	}

	const t = template ? `Template hint: ${template}\n` : '';
	const user = `Language: ${language}\nArtist: ${artistName}\nAbout: ${artistDescription}\n\nFull song analysis (JSON):\n${analysisJson}\n\n${t}Task: Write a concise, engaging description (max ~1500 characters).`;

	return { system, user };
}

export async function generateDescription(params: {
	artistName: string;
	artistDescription: string;
	analysis: AnalyzedTrack;
	language: 'pl' | 'en';
	template?: string;
}): Promise<GeneratedDescription> {
	const env = getServerEnv();
	const apiKey = env.LLM_API_KEY;
	const model = env.LLM_MODEL;
	const systemPrompt = env.LLM_SYSTEM_PROMPT;

	if (!apiKey || !model) {
		const missing: string[] = [];
		if (!apiKey) missing.push('LLM_API_KEY');
		if (!model) missing.push('LLM_MODEL');
		throw createLlmError(
			500,
			'ENV_MISSING',
			`Missing required env vars: ${missing.join(', ')}`,
			{ missing }
		);
	}

	const { system, user } = buildPrompt({
		artistName: params.artistName,
		artistDescription: params.artistDescription,
		analysis: params.analysis,
		language: params.language,
		template: params.template,
		systemPrompt,
	});

	// fs.writeFileSync('user.json', JSON.stringify(user, null, 2));

	const backoffs = [250, 750];
	let lastError: unknown;

	for (let attempt = 0; attempt <= backoffs.length; attempt++) {
		try {
			// Add request timeout (30s) to protect server resources
			const controller = new AbortController();
			const TIMEOUT_MS = 30_000;
			const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
			try {
				const res = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						model,
						messages: [
							{ role: 'system', content: system },
							{ role: 'user', content: user },
						],
					}),
					signal: controller.signal,
				});

				if (!res.ok) {
					const errText = await res.text().catch(() => '');
					const status = res.status;
					if (shouldRetry(status, errText) && attempt < backoffs.length) {
						await sleep(backoffs[attempt]);
						continue;
					}
					if (status === 429) {
						throw createLlmError(
							429,
							'LLM_RATE_LIMIT',
							'LLM provider rate limited'
						);
					}
					throw createLlmError(
						502,
						'LLM_BAD_GATEWAY',
						errText || 'LLM provider error',
						{ status }
					);
				}

				const json = (await res.json()) as {
					id: string;
					model: string;
					choices: Array<{ message?: { content?: string } | null }>;
					usage?: { total_tokens?: number };
				};

				const content = json?.choices?.[0]?.message?.content?.trim() || '';
				const tokensUsed = json?.usage?.total_tokens ?? undefined;
				const modelName = json?.model ?? model;

				if (!content) {
					throw createLlmError(
						502,
						'LLM_EMPTY_RESPONSE',
						'LLM returned empty content'
					);
				}

				return {
					language: params.language,
					text: content,
					modelName,
					tokensUsed,
				};
			} finally {
				clearTimeout(timeoutId);
			}
		} catch (e: unknown) {
			lastError = e;
			const maybe = e as { status?: number; code?: string; message?: string };
			if (
				maybe?.status &&
				shouldRetry(maybe.status, maybe.message) &&
				attempt < backoffs.length
			) {
				await sleep(backoffs[attempt]);
				continue;
			}
			break;
		}
	}

	if (lastError) {
		const le = lastError as LlmServiceError;
		if (le.status === 429) throw le;
		// If upstream provided a structured LLM error (5xx), rethrow it to preserve status/code
		if (
			le.code === 'LLM_BAD_GATEWAY' ||
			(typeof le.status === 'number' && le.status >= 500)
		) {
			throw le;
		}
	}
	const msg =
		(lastError as { message?: string } | undefined)?.message ||
		'LLM integration failed';
	throw createLlmError(502, 'LLM_BAD_GATEWAY', msg);
}
