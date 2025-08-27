"use client";

import React from "react";
import { AUDIO, UI_TEXT } from "@/lib/constants";
import { validateAudioFile } from "@/lib/analysis";

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
  const [validating, setValidating] = React.useState(false);

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
        // Client checks passed; run server validation
        setValidating(true);
        setError?.(null);
        onChange(file);
        validateAudioFile(file)
          .then((res) => {
            if (!res.ok) {
              // Map server error codes to UI messages
              let message: string = UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID;
              if (res.error === "FILE_TOO_LARGE") message = UI_TEXT.VALIDATION_MESSAGES.AUDIO_SIZE_INVALID;
              if (res.error === "INVALID_CONTENT") message = UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID;
              if (res.error === "READ_ERROR") message = UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID;
              setError?.(message);
              onChange(null);
              requestAnimationFrame(() => {
                inputRef.current?.focus();
                errorRef.current?.focus();
              });
            }
          })
          .catch(() => {
            // Network or other failure -> surface generic error
            setError?.(UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID);
            onChange(null);
            requestAnimationFrame(() => {
              inputRef.current?.focus();
              errorRef.current?.focus();
            });
          })
          .finally(() => setValidating(false));
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
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "audioFile-error" : undefined}
        aria-busy={validating || undefined}
      />
      {value && (
        <div className="flex items-center justify-between text-sm text-gray-700">
          <span>{value.name}</span>
          <button type="button" className="text-blue-600 underline" onClick={handleClear}>
            Usuń
          </button>
        </div>
      )}
      {error && (
        <p
          id="audioFile-error"
          ref={errorRef}
          className="text-sm text-red-600"
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

