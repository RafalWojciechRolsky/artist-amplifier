import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioUpload, { AudioUploadValue } from '../AudioUpload';
import { UI_TEXT } from '@/lib/constants';


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

  // Server validation test removed - functionality moved to form submission

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
