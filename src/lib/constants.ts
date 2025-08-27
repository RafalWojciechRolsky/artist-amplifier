// Application constants for centralized configuration management

// Session storage keys
export const SESSION_KEYS = {
  ARTIST_FORM: 'aa:v1:artist_form',
} as const;

// Form validation limits
export const VALIDATION_LIMITS = {
  MIN_DESCRIPTION: 50,
  MAX_DESCRIPTION: 1000,
} as const;

// UI text constants
export const UI_TEXT = {
  FORM_LABELS: {
    ARTIST_NAME: 'Nazwa artysty/zespołu',
    ARTIST_DESCRIPTION: 'Opis artysty',
  },
  VALIDATION_MESSAGES: {
    ARTIST_NAME_REQUIRED: "Pole 'Nazwa artysty/zespołu' jest wymagane.",
    ARTIST_DESCRIPTION_REQUIRED: "Pole 'Opis artysty' jest wymagane.",
    DESCRIPTION_TOO_SHORT: (min: number) => `Opis musi mieć co najmniej ${min} znaków.`,
    DESCRIPTION_TOO_LONG: (max: number) => `Opis może mieć maksymalnie ${max} znaków.`,
  },
  BUTTONS: {
    SUBMIT_IDLE: 'Generuj opis',
    SUBMIT_LOADING: 'Generowanie...',
  },
} as const;
