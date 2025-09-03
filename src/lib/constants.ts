// Application constants for centralized configuration management

// Session storage keys
export const SESSION_KEYS = {
  ARTIST_FORM: 'aa:v1:artist_form',
  ANALYSIS_RESULT: 'aa:v1:audio_analysis_result',
  GENERATED_DESCRIPTION: 'aa:v1:generated_description',
} as const;

// Form validation limits
export const VALIDATION_LIMITS = {
  MIN_DESCRIPTION: 50,
  MAX_DESCRIPTION: 1000,
} as const;

// Audio upload constraints
export const AUDIO = {
  MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_DURATION_SECONDS: 10 * 60, // 10 minutes
  ACCEPT_MIME: ['audio/mpeg', 'audio/wav'] as const,
  ACCEPT_EXT: '.mp3,.wav',
} as const;

// UI text constants
export const UI_TEXT = {
  FORM_LABELS: {
    ARTIST_NAME: 'Nazwa artysty/zespołu',
    SONG_TITLE: 'Tytuł utworu',
    ARTIST_DESCRIPTION: 'Opis artysty',
    AUDIO_FILE: 'Plik utworu (.mp3 / .wav, do 50MB)',
  },
  VALIDATION_MESSAGES: {
    ARTIST_NAME_REQUIRED: "Pole 'Nazwa artysty/zespołu' jest wymagane.",
    SONG_TITLE_REQUIRED: "Pole 'Tytuł utworu' jest wymagane.",
    ARTIST_DESCRIPTION_REQUIRED: "Pole 'Opis artysty' jest wymagane.",
    DESCRIPTION_TOO_SHORT: (min: number) => `Opis musi mieć co najmniej ${min} znaków.`,
    DESCRIPTION_TOO_LONG: (max: number) => `Opis może mieć maksymalnie ${max} znaków.`,
    AUDIO_REQUIRED: 'Wybierz plik audio (.mp3 lub .wav).',
    AUDIO_FORMAT_INVALID: 'Nieprawidłowy format pliku. Dozwolone: .mp3, .wav.',
    AUDIO_SIZE_INVALID: 'Plik jest zbyt duży. Maksymalny rozmiar to 50MB.',
    AUDIO_DURATION_INVALID: 'Plik audio jest zbyt długi. Maksymalna długość to 10 minut.',
  },
  ERROR_MESSAGES: {
    UPLOAD_FAILED: 'Nie udało się przesłać pliku do magazynu. Spróbuj ponownie.',
    CHECKSUM_FAILED: 'Nie udało się obliczyć sumy kontrolnej pliku. Spróbuj ponownie.',
    NETWORK_ERROR: 'Problem z połączeniem sieciowym. Spróbuj ponownie.',
    JOB_ID_MISSING: 'Serwer przetwarza analizę, ale nie zwrócił identyfikatora zadania.',
    ANALYSIS_TIMEOUT: 'Przekroczono czas oczekiwania na wynik analizy. Spróbuj ponownie za chwilę.',
    STATUS_NETWORK_ERROR: 'Problem z połączeniem sieciowym podczas sprawdzania statusu.',
    SERVER_ERROR: (status: number) => `Błąd serwera (${status}). Spróbuj ponownie.`,
  },
  BUTTONS: {
    SUBMIT_IDLE: 'Analizuj utwór',
    SUBMIT_LOADING: 'Analiza audio...',
    GENERATE_IDLE: 'Generuj opis',
    GENERATE_LOADING: 'Generowanie opisu...',
    CANCEL: 'Anuluj',
    COPY: 'Kopiuj do schowka',
    DOWNLOAD: 'Pobierz jako .txt',
    RESET: 'Reset',
  },
  STATUS: {
    READY: 'Gotowe do generowania',
    ANALYZING: 'Analiza',
    ERROR: 'Błąd analizy',
    DONE: 'Ukończono analizę',
  },
  FEEDBACK: {
    COPIED: 'Skopiowano!'
  },
} as const;
