import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ActionButtons from '@/components/ActionButtons';

jest.mock('@/lib/utils', () => ({
  copyToClipboard: jest.fn(async () => true),
  downloadTextFile: jest.fn(),
  buildDescriptionFilename: jest.fn((name: string) => `${name}_opis.txt`),
}));

import { copyToClipboard, downloadTextFile, buildDescriptionFilename } from '@/lib/utils';

describe('ActionButtons', () => {
  test('renders buttons and handles copy/download/reset', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();

    render(
      <ActionButtons artistName="Artysta" text="Hello world" onReset={onReset} />
    );

    const copyBtn = screen.getByRole('button', { name: /Kopiuj do schowka/i });
    const downloadBtn = screen.getByRole('button', { name: /Pobierz jako .txt/i });
    const resetBtn = screen.getByRole('button', { name: /Reset/i });

    expect(copyBtn).toBeEnabled();
    expect(downloadBtn).toBeEnabled();
    expect(resetBtn).toBeEnabled();

    await user.click(copyBtn);
    expect(copyToClipboard).toHaveBeenCalledWith('Hello world');
    expect(await screen.findByText(/Skopiowano!/i)).toBeInTheDocument();

    await user.click(downloadBtn);
    expect(buildDescriptionFilename).toHaveBeenCalledWith('Artysta');
    expect(downloadTextFile).toHaveBeenCalledWith('Artysta_opis.txt', 'Hello world');

    await user.click(resetBtn);
    expect(onReset).toHaveBeenCalled();
  });

  test('disables copy and download when text is empty', () => {
    render(<ActionButtons artistName="X" text="  " onReset={() => {}} />);
    expect(screen.getByRole('button', { name: /Kopiuj do schowka/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Pobierz jako .txt/i })).toBeDisabled();
  });
});
