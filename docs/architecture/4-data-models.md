# 4. Data Models

Minimalne interfejsy TypeScript (MVP). Współdzielone typy umieszczamy w `src/lib/types.ts` (ew. później w `packages/shared`).

```ts
export type SupportedAudioMime = 'audio/mpeg' | 'audio/wav';
export type UILanguage = 'pl' | 'en';

export interface ArtistInput {
	artistName: string;
	artistDescription: string; // wymagane, 50–1000 znaków
	language?: UILanguage; // opcjonalne, domyślnie 'pl'
	// Atrybuty pliku (plik wysyłamy do /api/audio/generate jako FormData)
	audioFileName: string;
	audioMimeType: SupportedAudioMime;
	audioSizeBytes: number; // ≤ 50 MB
}

export interface AudioAnalysis {
	durationSec: number;
	bpm?: number;
	musicalKey?: string; // np. "C", "Am"
	energy?: number; // 0..1
}

export interface GeneratedDescription {
	language: UILanguage;
	text: string;
	outline?: string[];
	modelName?: string;
	tokensUsed?: number;
}

export interface ApiError {
	error: {
		code: string;
		message: string;
		details?: Record<string, any>;
		timestamp: string;
		requestId: string;
	};
}
```

---
