import type { ArtistFormValue } from '@/components/ArtistForm';
import type { AnalysisResult } from '@/lib/types/analysis';

type GenerateSuccess = {
  language: string;
  text: string;
  outline: string[];
  modelName: string;
  tokensUsed: number;
};

type GenerateApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
};

function mapApiErrorToMessage(err: unknown): string {
  const apiErr = (err as GenerateApiError)?.error;
  if (!apiErr) return 'Wystąpił nieznany błąd. Spróbuj ponownie.';
  switch (apiErr.code) {
    case 'RATE_LIMIT':
      return 'Zbyt wiele żądań. Spróbuj ponownie później.';
    case 'BAD_CONTENT_TYPE':
      return 'Błędny typ żądania. Spróbuj ponownie.';
    case 'MISSING_FILE':
      return 'Brak pliku audio w żądaniu.';
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'Nieobsługiwany format pliku. Dozwolone: MP3 lub WAV.';
    case 'PAYLOAD_TOO_LARGE':
      return 'Plik jest zbyt duży (maks. 50 MB).';
    case 'INVALID_CONTENT':
      return 'Plik nie wygląda na prawidłowy MP3/WAV.';
    case 'READ_ERROR':
      return 'Nie udało się odczytać pliku. Spróbuj ponownie.';
    case 'INVALID_ARTIST_NAME':
      return 'Pole „Nazwa artysty” jest wymagane.';
    case 'INVALID_ARTIST_DESCRIPTION':
      return 'Opis artysty musi mieć od 50 do 1000 znaków.';
    default:
      return apiErr.message || 'Wystąpił błąd podczas generowania opisu.';
  }
}

export async function generateDescription(
  form: ArtistFormValue,
  analysis: AnalysisResult,
  opts?: { signal?: AbortSignal; language?: string; template?: string }
): Promise<string> {
  const payload = {
    artistName: form.artistName,
    artistDescription: form.artistDescription,
    language: opts?.language ?? 'pl',
    template: opts?.template,
    analysis,
  } as const;

  let res: Response;
  try {
    res = await fetch('/api/audio/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: opts?.signal,
    });
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; message?: string };
    if (
      err?.name === 'AbortError' ||
      err?.code === 'ABORT_ERR' ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('aborted'))
    ) {
      throw new Error('Aborted');
    }
    throw new Error('Problem z połączeniem sieciowym. Spróbuj ponownie.');
  }

  if (!res.ok) {
    // Attempt to parse standardized API error; fallback to status text
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = (await res.json().catch(() => null)) as GenerateApiError | null;
      const msg = mapApiErrorToMessage(json ?? {});
      throw new Error(msg);
    }
    throw new Error(`Błąd serwera (${res.status}). Spróbuj ponownie.`);
  }

  const data = (await res.json()) as GenerateSuccess;
  return data.text;
}
