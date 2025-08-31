// Transformer utilities for Music.ai raw payloads

export interface ChordInfo {
	start: number;
	end: number;
	chord_majmin: string;
}

type ChordRaw = {
	start?: unknown;
	end?: unknown;
	chord_majmin?: unknown;
	[k: string]: unknown;
};

export interface AnalyzedTrack {
	lyrics: string;
	chords: ChordInfo[];
	moods: string[];
	genres: string[];
	instruments: string[];
	movements: string[];
	energyLevel: string;
	emotion: string;
	language: string;
	key: string;
	timeSignature: string;
	voiceGender: string;
	voicePresence: string;
	musicalEra: string;
}

function asString(v: unknown): string {
	return typeof v === 'string' ? v : '';
}

function toArrayOfStrings(v: unknown): string[] {
	if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
	if (typeof v === 'string') {
		const s = v.trim();
		try {
			const parsed = JSON.parse(s);
			if (Array.isArray(parsed))
				return parsed.map((x) => String(x)).filter(Boolean);
		} catch {}
		// Fallback: split on commas after stripping brackets/quotes
		const inner = s.replace(/^\[/, '').replace(/\]$/, '');
		return inner
			.split(',')
			.map((x) => x.replace(/^\s*"|"\s*$/g, '').trim())
			.filter(Boolean);
	}
	return [];
}

async function fetchJsonArray<T = unknown>(
	url: string | undefined
): Promise<T[] | null> {
	if (!url) return null;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const data = (await res.json()) as unknown;
		return Array.isArray(data) ? (data as T[]) : null;
	} catch {
		return null;
	}
}

function simplifyChords(arr: ChordRaw[] | null): ChordInfo[] {
	if (!Array.isArray(arr)) return [];
	return arr
		.map((o) => ({
			start: Number(o?.start ?? 0),
			end: Number(o?.end ?? 0),
			chord_majmin: String(o?.chord_majmin ?? ''),
		}))
		.filter(
			(c) =>
				Number.isFinite(c.start) &&
				Number.isFinite(c.end) &&
				c.chord_majmin !== ''
		);
}

function joinLyrics(
	lines: Array<{ text?: string } | Record<string, unknown>> | null
): string {
	if (!Array.isArray(lines)) return '';
	const texts = lines
		.map((o) => {
			const t = (o as { text?: unknown })?.text;
			return typeof t === 'string' ? t : '';
		})
		.filter(Boolean);
	return texts.join('\n');
}

export async function transformMusicAiRawToAnalyzedTrack(
	raw: Record<string, unknown>
): Promise<AnalyzedTrack> {
	const moods = toArrayOfStrings(raw['Mood']);
	const genres = Array.from(
		new Set<string>([
			...toArrayOfStrings(raw['Genre']),
			...toArrayOfStrings(raw['Subgenre']),
		])
	);
	const instruments = toArrayOfStrings(raw['Instruments']);
	const movements = toArrayOfStrings(raw['Movement']);

	const energyLevel = asString(raw['Energy']);
	const emotion = asString(raw['Emotion']);
	const language = asString(raw['Language']);
	const key = asString(raw['Root Key']);
	const timeSignature = asString(raw['Time signature']);
	const voiceGender = asString(raw['Voide gender']);
	const voicePresence = asString(raw['Voice presence']);
	const musicalEra = asString(raw['Musical era']);

	const lyricsUrl = asString(raw['Lyrics']);
	const chordsUrl = asString(raw['Chords structure']);

	const [lyricsArr, chordsArr] = await Promise.all([
		fetchJsonArray<Record<string, unknown>>(lyricsUrl),
		fetchJsonArray<ChordRaw>(chordsUrl),
	]);

	const lyrics = joinLyrics(lyricsArr);
	const chords = simplifyChords(chordsArr);

	return {
		lyrics,
		chords,
		moods,
		genres,
		instruments,
		movements,
		energyLevel,
		emotion,
		language,
		key,
		timeSignature,
		voiceGender,
		voicePresence,
		musicalEra,
	};
}
