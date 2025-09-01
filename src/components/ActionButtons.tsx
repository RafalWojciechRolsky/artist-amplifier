"use client";

import React from 'react';
import { UI_TEXT } from '@/lib/constants';
import { buildDescriptionFilename, copyToClipboard, downloadTextFile } from '@/lib/utils';

interface ActionButtonsProps {
  artistName: string;
  text: string;
  onReset: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ artistName, text, onReset }) => {
  const [copied, setCopied] = React.useState(false);
  const disabled = !text?.trim();

  async function handleCopy() {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  function handleDownload() {
    const filename = buildDescriptionFilename(artistName || 'artysta');
    downloadTextFile(filename, text);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={disabled}
          data-testid="copy-button"
          className="px-4 py-2 rounded-lg border aa-border aa-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {UI_TEXT.BUTTONS.COPY}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={disabled}
          data-testid="download-button"
          className="px-4 py-2 rounded-lg border aa-border aa-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {UI_TEXT.BUTTONS.DOWNLOAD}
        </button>
        {copied && (
          <span role="status" aria-live="polite" className="text-sm text-[var(--color-success)]">
            {UI_TEXT.FEEDBACK.COPIED}
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={onReset}
          data-testid="reset-button"
          className="px-4 py-2 rounded-lg border aa-btn-ghost"
        >
          {UI_TEXT.BUTTONS.RESET}
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
