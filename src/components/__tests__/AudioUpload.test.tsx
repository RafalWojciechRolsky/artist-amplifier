import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioUpload, { AudioUploadValue } from '../AudioUpload';
import { UI_TEXT } from '@/lib/constants';
import * as analysis from '@/lib/analysis';

jest.mock('@/lib/analysis', () => ({
  validateAudioFile: jest.fn(),
}));

describe('AudioUpload Component', () => {
  const mockOnChange = jest.fn();
  const mockSetError = jest.fn();
  const mockValue: AudioUploadValue = null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the file input', () => {
    render(
      <AudioUpload
        value={mockValue}
        onChange={mockOnChange}
        setError={mockSetError}
      />
    );
    expect(screen.getByLabelText(/Plik utworu/i)).toBeInTheDocument();
  });

  it('handles a valid file selection', async () => {
    render(
      <AudioUpload
        value={mockValue}
        onChange={mockOnChange}
        setError={mockSetError}
      />
    );

    const file = new File(['(⌐□_□)'], 'song.mp3', { type: 'audio/mpeg' });
    (analysis.validateAudioFile as jest.Mock).mockResolvedValue({ ok: true });
    const input = screen.getByLabelText(/Plik utworu/i);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(file);
      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  it('rejects a file with an invalid extension', () => {
    render(
      <AudioUpload
        value={mockValue}
        onChange={mockOnChange}
        setError={mockSetError}
      />
    );

    const file = new File(['...'], 'image.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Plik utworu/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnChange).toHaveBeenCalledWith(null);
    expect(mockSetError).toHaveBeenCalledWith(UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID);
  });

  it('rejects a file after server validation (invalid content)', async () => {
    render(
      <AudioUpload
        value={mockValue}
        onChange={mockOnChange}
        setError={mockSetError}
      />
    );

    const file = new File(['not-mp3'], 'fake.mp3', { type: 'audio/mpeg' });
    (analysis.validateAudioFile as jest.Mock).mockResolvedValue({ ok: false, error: 'INVALID_CONTENT' });

    const input = screen.getByLabelText(/Plik utworu/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(null);
      expect(mockSetError).toHaveBeenCalledWith(UI_TEXT.VALIDATION_MESSAGES.AUDIO_FORMAT_INVALID);
    });

    // Note: The component is controlled; it renders error from props.
    // We assert callbacks were invoked with expected values.
  });

  it('rejects a file that is too large', () => {
    render(
      <AudioUpload
        value={mockValue}
        onChange={mockOnChange}
        setError={mockSetError}
      />
    );

    const largeFile = new File(['a'.repeat(51 * 1024 * 1024)], 'large-song.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Plik utworu/i);

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(mockOnChange).toHaveBeenCalledWith(null);
    expect(mockSetError).toHaveBeenCalledWith(UI_TEXT.VALIDATION_MESSAGES.AUDIO_SIZE_INVALID);
  });
});
