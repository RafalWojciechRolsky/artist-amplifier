"use client";

import React from "react";
import { UI_TEXT } from "@/lib/constants";

export type AnalysisStatusType =
  | "idle"
  | "validating"
  | "analyzing"
  | "polling"
  | "generating"
  | "ready"
  | "readyDescription"
  | "error";

export function AnalysisStatus({ status }: { status: AnalysisStatusType }) {
  if (status === "idle") return null;

  const message = (() => {
    switch (status) {
      case "validating":
        return UI_TEXT.STATUS.VALIDATING;
      case "analyzing":
        return UI_TEXT.STATUS.ANALYZING;
      case "polling":
        return UI_TEXT.STATUS.POLLING;
      case "generating":
        return UI_TEXT.BUTTONS.GENERATE_LOADING;
      case "ready":
        return UI_TEXT.STATUS.DONE;
      case "readyDescription":
        return UI_TEXT.STATUS.READY;
      case "error":
        return UI_TEXT.STATUS.ERROR;
      default:
        return undefined;
    }
  })();

  if (!message) return null;

  return (
    <p
      className="text-sm aa-text-secondary"
      aria-live="polite"
      role="status"
      data-testid="status-banner"
    >
      {message}
    </p>
  );
}
