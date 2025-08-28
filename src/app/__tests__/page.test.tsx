import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from '../page';
import { analysisResultStorage } from '@/lib/typedSession';
import * as analysis from '@/lib/analysis';

// Mock the analysis module
jest.mock('@/lib/analysis');
const mockedAnalyzeAudio = analysis.analyzeAudio as jest.Mock;
const mockedValidate = analysis.validateAudioFile as jest.Mock;

describe('Home Page - Audio Analysis Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    // Default: server validation passes
    mockedValidate.mockResolvedValue({ ok: true });
  });

  it('should trigger analysis, update UI, and save to sessionStorage on success', async () => {
    const mockAnalysisResult = { id: 'xyz-789', provider: 'stub', data: { tempo: 140, key: 'G' } };
    mockedAnalyzeAudio.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Short delay
      return mockAnalysisResult;
    });

    render(<Page />);

    // 0. Fill the form
    fireEvent.change(screen.getByLabelText(/Nazwa artysty/i), { target: { value: 'Test Artist' } });
    fireEvent.change(screen.getByLabelText(/Opis artysty/i), { target: { value: 'A'.repeat(51) } });

    // 1. Upload a valid file
    const file = new File(['(⌐□_□)'], 'test-track.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/Plik utworu/i);
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText(file.name); // Wait for the file name to appear

    // 2. Click the analyze button
    const analyzeButton = screen.getByRole('button', { name: /Analizuj utwór/i });
    await act(async () => {
      fireEvent.click(analyzeButton);
    });

    // 3. Assert loading state and analysis call
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analiza audio.../i })).toBeInTheDocument();
    });
    expect(mockedAnalyzeAudio).toHaveBeenCalledWith(file, expect.any(Object));

    // 4. Assert result is saved and UI updates
    await waitFor(() => {
      expect(analysisResultStorage.get()).toEqual(mockAnalysisResult);
    });
    
    // After analysis, the generate button should appear
    const generateButton = await screen.findByRole('button', { name: /Generuj opis/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('should allow canceling the analysis', async () => {
    // Mock analyzeAudio to simulate a long-running process that can be aborted
    const abortSpy = jest.fn();
    mockedAnalyzeAudio.mockImplementation(async (_file: File, { signal }: { signal: AbortSignal }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          abortSpy();
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    render(<Page />);

    // Fill the form
    fireEvent.change(screen.getByLabelText(/Nazwa artysty/i), { target: { value: 'Test Artist' } });
    fireEvent.change(screen.getByLabelText(/Opis artysty/i), { target: { value: 'A'.repeat(51) } });

    const file = new File(['(⌐□_□)'], 'cancellable.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/Plik utworu/i);
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText(file.name);

    const analyzeButton = screen.getByRole('button', { name: /Analizuj utwór/i });
    await act(async () => {
      fireEvent.click(analyzeButton);
    });

    const cancelButton = await screen.findByRole('button', { name: /Anuluj/i });
    fireEvent.click(cancelButton);

    // Wait for the UI to return to the idle state and assert the correct button is present
    const finalAnalyzeButton = await screen.findByRole('button', { name: /Analizuj utwór/i });
    expect(finalAnalyzeButton).toBeInTheDocument();
    expect(screen.queryByText(/Analiza audio.../i)).not.toBeInTheDocument();
    
    // Check that the abort signal was triggered on the mock
    expect(abortSpy).toHaveBeenCalled();
  });

  it('should handle analysis errors gracefully', async () => {
    const errorMessage = 'Analysis failed!';
    mockedAnalyzeAudio.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Short delay
      throw new Error(errorMessage);
    });

    render(<Page />);

    // Fill the form
    fireEvent.change(screen.getByLabelText(/Nazwa artysty/i), { target: { value: 'Test Artist' } });
    fireEvent.change(screen.getByLabelText(/Opis artysty/i), { target: { value: 'A'.repeat(51) } });

    const file = new File(['(⌐□_□)'], 'error.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/Plik utworu/i);
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText(file.name);

    const analyzeButton = screen.getByRole('button', { name: /Analizuj utwór/i });
    await act(async () => {
      fireEvent.click(analyzeButton);
    });

    // Wait for error message to be displayed
    await waitFor(() => {
      const fileInput = screen.getByLabelText(/Plik utworu/i);
      const errorId = fileInput.getAttribute('aria-describedby');
      expect(document.getElementById(errorId!)).toHaveTextContent(/Błąd analizy/i);
    });

    // Assert UI returns to idle state but shows an error
    const finalAnalyzeButton = await screen.findByRole('button', { name: /Analizuj utwór/i });
    expect(finalAnalyzeButton).toBeInTheDocument();
  });

  it('should load initial state from sessionStorage', () => {
    const mockAnalysisResult = { id: 'restored-456', provider: 'stub', data: { tempo: 90, key: 'D' } };
    analysisResultStorage.set(mockAnalysisResult);

    render(<Page />);

    // Check that the UI reflects the completed state from the session
    const submitButton = screen.getByRole('button', { name: /analizuj utwór/i });
    expect(submitButton).toBeEnabled();
    // You might also check if a results component is rendered with the data
  });
});
