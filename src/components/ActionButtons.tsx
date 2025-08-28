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
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {UI_TEXT.BUTTONS.COPY}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={disabled}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {UI_TEXT.BUTTONS.DOWNLOAD}
        </button>
        {copied && (
          <span role="status" aria-live="polite" className="text-sm text-green-700">
            {UI_TEXT.FEEDBACK.COPIED}
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
        >
          {UI_TEXT.BUTTONS.RESET}
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
