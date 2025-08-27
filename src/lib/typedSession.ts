"use client";

import { SESSION_KEYS } from "./constants";
import type { ArtistFormValue } from "@/components/ArtistForm";

// Define the session storage schema
type SessionStorageSchema = {
  [SESSION_KEYS.ARTIST_FORM]: ArtistFormValue;
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
