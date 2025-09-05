"use client";

import React from "react";

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border p-3 text-sm text-[color:var(--color-error)] border-[color:var(--color-error)] bg-[color:var(--color-error-bg,#fff7f7)]"
      data-testid="error-banner"
    >
      {message}
    </div>
  );
}
