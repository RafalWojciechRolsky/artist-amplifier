"use client";

import React from "react";
import { AUDIO, UI_TEXT } from "@/lib/constants";

export type AudioUploadValue = File | null;

type Props = {
  value: AudioUploadValue;
  onChange: (file: AudioUploadValue) => void;
  error?: string | null;
  setError?: (msg: string | null) => void;
};

function validateFile(file: File): string | null {
  const allowed = new Set<string>(AUDIO.ACCEPT_MIME as readonly string[]);
  if (!allowed.has(file.type)) {
    return UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID;
  }
  if (file.size > AUDIO.MAX_SIZE_BYTES) {
    return UI_TEXT.VALIDATION_MESSAGES.AUDIO_SIZE_INVALID;
  }
  return null;
}

export default function AudioUpload({ value, onChange, error, setError }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement | null>(null);

  // Ensure input element clears when value is reset (e.g., global reset)
  React.useEffect(() => {
    if (!value && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [value]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const msg = validateFile(file);
      if (msg) {
        setError?.(msg);
        onChange(null); // Clear the file if invalid
        // Move focus for accessibility
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          errorRef.current?.focus();
        });
      } else {
        // Client-side validation only
        setError?.(null);
        onChange(file);
      }
    } else {
      onChange(null);
    }
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
    setError?.(UI_TEXT.VALIDATION_MESSAGES.AUDIO_REQUIRED);
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
        className="w-full rounded-lg border-2 aa-border aa-dashed aa-field px-3 py-2 focus:outline-none"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "audioFile-error" : undefined}
      />
      <p className="text-xs aa-text-secondary">
        Przeciągnij i upuść plik audio (MP3, WAV) lub kliknij, aby wybrać
      </p>
      {value && (
        <div className="flex items-center justify-between text-sm aa-text-secondary">
          <span>{value.name}</span>
          <button type="button" data-testid="audio-clear" className="text-[color:var(--color-accent)] underline" onClick={handleClear}>
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

