"use client";

import React from "react";
import { AUDIO, UI_TEXT } from "@/lib/constants";
import { validateAudioFile } from "@/lib/utils";

export type AudioUploadValue = File | null;

type Props = {
  value: AudioUploadValue;
  onChange: (file: AudioUploadValue) => void;
  error?: string | null;
  setError?: (msg: string | null) => void;
};


export default function AudioUpload({ value, onChange, error, setError }: Props) {
  const [isValidating, setIsValidating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement | null>(null);

  // Ensure input element clears when value is reset (e.g., global reset)
  React.useEffect(() => {
    if (!value && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [value]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    // Reset state on new file selection
    setError?.(null);
    onChange(null);

    if (!file) return;

    // Early synchronous validations (type and size) for immediate feedback
    const allowedExts = AUDIO.ACCEPT_EXT.split(',').map((s) => s.trim().replace(/^\./, '').toLowerCase());
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const mimeOk = (AUDIO.ACCEPT_MIME as readonly string[]).includes(file.type);
    const extOk = !!fileExt && allowedExts.includes(fileExt);
    if (!mimeOk && !extOk) {
      setError?.(UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID);
      // Move focus for accessibility
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        errorRef.current?.focus();
      });
      return;
    }

    if (file.size > AUDIO.MAX_SIZE_BYTES) {
      setError?.(UI_TEXT.VALIDATION_MESSAGES.AUDIO_SIZE_INVALID);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        errorRef.current?.focus();
      });
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateAudioFile(file);
      if (result.isValid) {
        setError?.(null);
        onChange(file);
      } else {
        setError?.(result.message ?? null);
        onChange(null); // Clear the file if invalid
        // Move focus for accessibility
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          errorRef.current?.focus();
        });
      }
    } finally {
      setIsValidating(false);
    }
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
    setError?.(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      errorRef.current?.focus();
    });
  }

  return (
    <div className="grid gap-2">
      <label htmlFor="audioFile" className="font-medium">
        {UI_TEXT.FORM_LABELS.AUDIO_FILE}
      </label>
      <input
        ref={inputRef}
        id="audioFile"
        name="audioFile"
        type="file"
        accept={AUDIO.ACCEPT_EXT}
        onChange={handleFileChange}
        data-testid="audio-input"
        className="w-full rounded-lg border-2 aa-border aa-dashed aa-field px-3 py-2 focus:outline-none disabled:opacity-50"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "audioFile-error" : undefined}
        disabled={isValidating}
      />
      {isValidating ? (
        <p className="text-xs aa-text-secondary">Weryfikacja pliku...</p>
      ) : (
        <p className="text-xs aa-text-secondary">
          Przeciągnij i upuść plik audio (MP3, WAV) lub kliknij, aby wybrać
        </p>
      )}
      {value && (
        <div className="flex items-center justify-between text-sm aa-text-secondary">
          <span>{value.name}</span>
          <button type="button" data-testid="audio-clear" className="text-[color:var(--color-accent)] underline disabled:opacity-50" onClick={handleClear} disabled={isValidating}>
            Usuń
          </button>
        </div>
      )}
      {error && (
        <p
          id="audioFile-error"
          ref={errorRef}
          data-testid="audio-error"
          className="text-sm text-[color:var(--color-error)]"
          role="alert"
          aria-live="polite"
          tabIndex={-1}
        >
          {error}
        </p>
      )}
    </div>
  );
}

