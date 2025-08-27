"use client";

import type { AudioAnalysisResult } from "./typedSession";

// Server validation endpoint helper
export type ValidateAudioResult = { ok: true } | { ok: false; error: string };

export async function validateAudioFile(file: File, opts?: { signal?: AbortSignal }): Promise<ValidateAudioResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/validate-audio", {
    method: "POST",
    body: form,
    signal: opts?.signal,
  });
  // Always try to parse JSON for consistent error surface
  const json = (await res.json().catch(() => ({ ok: false, error: "UNKNOWN" }))) as ValidateAudioResult;
  return json;
}

// Simple analysis stub to simulate an API call with abort support.
export async function analyzeAudio(
  file: File,
  opts?: { signal?: AbortSignal }
): Promise<AudioAnalysisResult> {
  const { signal } = opts ?? {};

  // Simulate variable latency 1.2s - 2.5s
  const delay = 1200 + Math.floor(Math.random() * 1300);

  return new Promise<AudioAnalysisResult>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve({
        id: `${Date.now()}`,
        provider: "stub",
        data: {
          fileName: file.name,
          size: file.size,
          type: file.type,
          tempo: 120 + Math.round(Math.random() * 40),
          mood: ["energetic", "melancholic", "uplifting"][Math.floor(Math.random() * 3)],
        },
      });
    }, delay);

    // Safety: if aborted, clear the timer
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
      },
      { once: true }
    );
  });
}

