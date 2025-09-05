import type { AnalyzedTrack } from '@/lib/types/analysis';
import { getServerEnv } from './env';

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
	songTitle: string;
	artistDescription: string;
	analysis: AnalyzedTrack;
	language: 'pl' | 'en';
	template?: string;
	systemPrompt?: string;
}): { system: string; user: string } {
	const {
		artistName,
		artistDescription,
		songTitle,
		analysis,
		language,
		template,
		systemPrompt,
	} = params;
	const system =
		systemPrompt ??
		(language === 'pl'
			? `Jesteś ekspertem w dziedzinie komunikacji prasowej branży muzycznej, łączącym umiejętności charizmatycznego dziennikarza muzycznego z wiedzą o najlepszych praktykach PR-owych. Twoje zadanie to napisanie profesjonalnej, gotowej do publikacji notki prasowej o utworze (~2000-2600 znaków), która spełnia standardy branżowe oraz posiada magnetyczną siłę przyciągania uwagi mediów.

			## METODOLOGIA PRACY

			### KROK 1: ANALIZA I ESENCJA
			Przeprowadź głęboką analizę danych JSON, identyfikując:
			*   Emocjonalne i ideowe jądro utworu poprzez połączenie 'lyrics', 'chords' i 'moods' i innych elementów.
			*   Unikalny "news hook" - co czyni ten utwór wartym uwagi mediów.
			*   Główny przekaz artystyczny i jego uniwersalny wymiar.
					
			### KROK 2: KONTEKST I POZYCJONOWANIE
			Z opisu 'About' artysty wybierz JEDNĄ kluczową cechę, która:
			*   Idealnie rezonuje z esencją utworu z Kroku 1.
			*   Buduje wiarygodność artysty w kontekście tego konkretnego wydania.
			*   Stanowi "przyprawę", nie dominuje narracji.

			### KROK 3: STRUKTURA PROFESJONALNA
			Zbuduj notkę według sprawdzonej struktury branżowej:

			**NAGŁÓWEK (8-14 słów):** Konkretny, chwytliwy, unikający clickbaitu, zawierający kluczowe informacje.

			**LEAD (pierwszy akapit):** Odpowiada na 5W: kto, co, kiedy, gdzie, dlaczego. Najważniejsze informacje na początku.

			**2-3 AKAPITY GŁÓWNE** zawierające:
			*   Szczegóły o brzmieniu, tematyce i kontekście powstania.
			*   Naturalny cytat artysty (nieformalny, autentyczny).
			*   Informacje o dostępności i platformach dystrybucji.

			**ELEMENTY OBOWIĄZKOWE:**
			*   Data premiery i platformy streamingowe.
			*   Krótka charakterystyka gatunkowa.
			*   Linki do materiałów promocyjnych.
			*   Informacje kontaktowe.

			### KROK 4: JĘZYK I STYL
			Stosuj zasady efektywnej komunikacji prasowej:

			#### PROFESJONALIZM Z CHARAKTEREM:
			*   Pisz w trzeciej osobie, zachowując obiektywność.
			*   Używaj języka zmysłów i metafor muzycznych.
			*   Balansuj informacyjność z angażującą narracją.
			*   Unikaj żargonu branżowego i przesadnej promocyjności.

			#### WARTOŚĆ DZIENNIKARSKA:
			*   Podkreśl autentyczność i "ludzki" wymiar muzyki.
			*   Wskaż inspiracje i kontekst kulturowy.
			*   Zbuduj pomost do potencjalnego słuchacza.
			*   Odpowiedz na pytanie: "Dlaczego to ma znaczenie TERAZ?".

			**CALL TO ACTION:**
			Zakończ jasnym, konkretnym wezwaniem do działania (streaming, koncert, więcej informacji).

			#### ZASADY JAKOŚCI:
			*   Zachowaj zwięzłość - każde zdanie musi mieć cel.
			*   Używaj aktywnej strony głosu.
			*   Buduj logiczny przepływ informacji od najważniejszych do szczegółów.
			*   Unikaj powtórzeń i zbędnych ozdobników.

			#### UWAGI TECHNICZNE:
			*   Jeśli dane w JSON są niekompletne, pracuj tylko z dostępnymi informacjami.
			*   Interpretuj wszystkie dane holistycznie, szukając wzorców i wyjątków.
			*   Długość: 2000-2600 znaków ze spacjami.
			*   Priorytet: profesjonalizm + magnetyczna siła przyciągania uwagi.

			## CEL OSTATECZNY
			Stworzyć notkę, która nie tylko informuje, ale przekonuje dziennikarzy, że ten utwór zasługuje na uwagę medialną i ma potencjał zainteresowania szerokiej publiczności.
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
	const user = `Language: ${language}\nArtist: ${artistName}\nSong title: ${songTitle}\nAbout: ${artistDescription}\n\nFull song analysis (JSON):\n${analysisJson}\n\n${t}Task: Write a concise, engaging description (max ~2600 characters).`;

	return { system, user };
}

export async function generateDescription(params: {
	artistName: string;
	songTitle: string;
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
		songTitle: params.songTitle,
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
