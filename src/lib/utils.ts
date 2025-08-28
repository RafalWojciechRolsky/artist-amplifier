"use client";

// Utility: normalize and sanitize a filename into a safe, lowercase slug
export function sanitizeFilename(input: string): string {
  const ascii = input
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "") // remove diacritics
    .replace(/ß/g, "ss")
    .replace(/[łŁ]/g, "l");
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") // non-alphanumeric -> underscore
    .replace(/^_+|_+$/g, ""); // trim underscores
  return slug || "plik";
}

// Build filename for generated description e.g. `nazwa_artysty_opis.txt`
export function buildDescriptionFilename(artistName: string): string {
  return `${sanitizeFilename(artistName)}_opis.txt`;
}

// Copy text to clipboard, with fallback for older browsers and tests
type ClipboardNav = { clipboard?: { writeText?: (t: string) => Promise<void> } } | undefined;

export async function copyToClipboard(text: string): Promise<boolean> {
  // Resolve navigator in a way compatible with JSDOM tests
  const testNav = (typeof global !== 'undefined'
    ? (global as unknown as { navigator?: ClipboardNav }).navigator
    : undefined);
  const nav = testNav
    ?? (globalThis as unknown as { navigator?: ClipboardNav }).navigator
    ?? (typeof window !== 'undefined' ? (window as unknown as { navigator?: ClipboardNav }).navigator : undefined)
    ?? (typeof navigator !== 'undefined' ? (navigator as ClipboardNav) : undefined);
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return true;
    }
  } catch {
    // will try fallback below
  }
  // Fallback: use a temporary textarea
  try {
    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// Trigger a client-side download of a text file
export function downloadTextFile(filename: string, content: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
