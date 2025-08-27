"use client";

import { SESSION_KEYS } from "./constants";
import type { ArtistFormValue } from "@/components/ArtistForm";

// Minimal shape for an audio analysis result. The exact fields may vary by provider,
// so we store a generic record with at least an id and provider for traceability.
export type AudioAnalysisResult = {
  id: string;
  provider: string;
  // Arbitrary payload returned by the analysis API
  data: Record<string, unknown>;
};

// Define the session storage schema
type SessionStorageSchema = {
  [SESSION_KEYS.ARTIST_FORM]: ArtistFormValue;
  [SESSION_KEYS.ANALYSIS_RESULT]: AudioAnalysisResult;
};

// Type-safe sessionStorage wrapper
export class TypedSessionStorage {
  static get<K extends keyof SessionStorageSchema>(
    key: K
  ): SessionStorageSchema[K] | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as SessionStorageSchema[K];
    } catch {
      return null;
    }
  }

  static set<K extends keyof SessionStorageSchema>(
    key: K,
    value: SessionStorageSchema[K]
  ): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  }

  static remove<K extends keyof SessionStorageSchema>(key: K): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }
}

// Convenience functions for specific keys
export const artistFormStorage = {
  get: () => TypedSessionStorage.get(SESSION_KEYS.ARTIST_FORM),
  set: (value: ArtistFormValue) => TypedSessionStorage.set(SESSION_KEYS.ARTIST_FORM, value),
  remove: () => TypedSessionStorage.remove(SESSION_KEYS.ARTIST_FORM),
};

export const analysisResultStorage = {
  get: () => TypedSessionStorage.get(SESSION_KEYS.ANALYSIS_RESULT),
  set: (value: AudioAnalysisResult) =>
    TypedSessionStorage.set(SESSION_KEYS.ANALYSIS_RESULT, value),
  remove: () => TypedSessionStorage.remove(SESSION_KEYS.ANALYSIS_RESULT),
};

