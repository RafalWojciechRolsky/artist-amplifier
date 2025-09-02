import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import * as analysis from '@/lib/analysis';
import * as generate from '@/lib/api/generate';

jest.mock('@/lib/analysis');
jest.mock('@/lib/api/generate');
import { VALIDATION_LIMITS } from '@/lib/constants';

const { MIN_DESCRIPTION } = VALIDATION_LIMITS;

// TC3.2 Odtworzenie po odświeżeniu (restore on refresh)
// Given data previously saved in sessionStorage
// When the page is reloaded
// Then the form is prefilled with previous values

describe('Home integration', () => {
  // TC3.2 Odtworzenie po odświeżeniu (restore on refresh)
  // Given data previously saved in sessionStorage
  // When the page is reloaded
  // Then the form is prefilled with previous values
  test('restores form values from sessionStorage on remount', async () => {
    const user = userEvent.setup();

    // First mount – fill values to trigger setSession side effect
    const { unmount } = render(<Home />);
    const name1 = screen.getByLabelText(/nazwa artysty\/zespołu/i) as HTMLInputElement;
    const title1 = screen.getByLabelText(/tytuł utworu/i) as HTMLInputElement;
    const desc1 = screen.getByLabelText(/opis artysty/i) as HTMLTextAreaElement;

    await user.type(name1, 'Artist X');
    await user.type(title1, 'Song X');
    await user.type(desc1, 'Z'.repeat(60)); // >= MIN_DESCRIPTION

    // Unmount to simulate navigation/refresh
    unmount();

    // Second mount – should read from session and prefill
    render(<Home />);
    const name2 = await screen.findByLabelText(/nazwa artysty\/zespołu/i);
    const title2 = await screen.findByLabelText(/tytuł utworu/i);
    const desc2 = await screen.findByLabelText(/opis artysty/i);
    expect((name2 as HTMLInputElement).value).toBe('Artist X');
    expect((title2 as HTMLInputElement).value).toBe('Song X');
    expect((desc2 as HTMLTextAreaElement).value).toBe('Z'.repeat(60));
  });

  // TC7.1 Przekazanie stanu do page.tsx
  // TC7.2 Przejścia stanów (idle -> analyzing)
  // Given valid data in the form
  // When the user submits the form
  // Then the app state changes to 'analyzing' and the button is disabled
  test('updates state to analyzing and disables button on submit', async () => {
    const user = userEvent.setup();
    // Arrange mocks: validation ok, analysis pending to keep 'analyzing' state visible
    (analysis.validateAudioFile as jest.Mock).mockResolvedValue({ ok: true });
    (analysis.analyzeAudio as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<Home />);

    const nameInput = screen.getByLabelText(/nazwa artysty\/zespołu/i);
    const titleInput = screen.getByLabelText(/tytuł utworu/i);
    const descInput = screen.getByLabelText(/opis artysty/i);
    const audioInput = screen.getByLabelText(/plik utworu/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /analizuj utwór/i });

    // Fill the form with valid data
    await user.type(nameInput, 'Test Artist');
    await user.type(titleInput, 'Valid Title');
    await user.type(descInput, 'a'.repeat(MIN_DESCRIPTION));
    const file = new File(['aaa'], 'sample.mp3', { type: 'audio/mpeg' });
    await user.upload(audioInput, file);

    // Submit the form
    await user.click(submitBtn);

    // Assert that the button is now in an 'analyzing' state
    const analyzingBtn = await screen.findByRole('button', { name: /analiza audio.../i });
    expect(analyzingBtn).toBeInTheDocument();
    expect(analyzingBtn).toBeDisabled();
  });

  test('generates a description after successful analysis', async () => {
    const user = userEvent.setup();
    // Arrange mocks
    (analysis.validateAudioFile as jest.Mock).mockResolvedValue({ ok: true });
    (analysis.analyzeAudio as jest.Mock).mockResolvedValue({
      id: 'mock-id',
      provider: 'stub',
      data: { tempo: 130, mood: 'uplifting' },
    });
    (generate.generateDescription as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
      return 'This is a generated mock description.';
    });

    render(<Home />);

    const nameInput = screen.getByLabelText(/nazwa artysty\/zespołu/i);
    const titleInput = screen.getByLabelText(/tytuł utworu/i);
    const descInput = screen.getByLabelText(/opis artysty/i);
    const audioInput = screen.getByLabelText(/plik utworu/i);
    const analyzeBtn = screen.getByRole('button', { name: /analizuj utwór/i });

    // Act: Fill form and analyze
    await user.type(nameInput, 'Test Artist');
    await user.type(titleInput, 'Hit Single');
    await user.type(descInput, 'b'.repeat(MIN_DESCRIPTION));
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    await user.upload(audioInput, file);
    await user.click(analyzeBtn);

    // Assert: Analysis completes and generate button appears
    const generateBtn = await screen.findByRole('button', { name: /generuj opis/i });
    expect(generateBtn).toBeInTheDocument();
    expect(generateBtn).toBeEnabled();

    // Act: Generate description
    await user.click(generateBtn);

    // Assert: Generating state - button text changes and is disabled
    const generatingButton = await screen.findByRole('button', { name: /generowanie opisu.../i });
    expect(generatingButton).toBeDisabled();

    // Assert: Generation completes and text editor is updated
    await waitFor(() => {
      const editor = screen.getByPlaceholderText(/tutaj pojawi się wygenerowany opis.../i);
      expect(editor).toHaveValue('This is a generated mock description.');
    });

    // Final state: generate button is enabled again
    const finalGenerateBtn = await screen.findByRole('button', { name: /generuj opis/i });
    expect(finalGenerateBtn).toBeEnabled();
  });

  test('reset clears UI state and sessionStorage', async () => {
    const user = userEvent.setup();
    // Arrange mocks
    (analysis.validateAudioFile as jest.Mock).mockResolvedValue({ ok: true });
    (analysis.analyzeAudio as jest.Mock).mockResolvedValue({
      id: 'mock-id-2',
      provider: 'stub',
      data: { tempo: 110 },
    });
    (generate.generateDescription as jest.Mock).mockResolvedValue('Gen text');

    render(<Home />);

    const nameInput = screen.getByLabelText(/nazwa artysty\/zespołu/i) as HTMLInputElement;
    const titleInput = screen.getByLabelText(/tytuł utworu/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/opis artysty/i) as HTMLTextAreaElement;
    const audioInput = screen.getByLabelText(/plik utworu/i) as HTMLInputElement;
    const analyzeBtn = screen.getByRole('button', { name: /analizuj utwór/i });

    await user.type(nameInput, 'Reset Artist');
    await user.type(titleInput, 'Reset Song');
    await user.type(descInput, 'q'.repeat(60));
    const file = new File(['x'], 'reset.mp3', { type: 'audio/mpeg' });
    await user.upload(audioInput, file);
    await user.click(analyzeBtn);

    const generateBtn = await screen.findByRole('button', { name: /generuj opis/i });
    await user.click(generateBtn);
    // generation can be very fast in tests; assert editor shows the generated text
    await screen.findByDisplayValue('Gen text');

    // Reset
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    await user.click(resetBtn);

    // Assert form cleared
    expect(nameInput.value).toBe('');
    expect(titleInput.value).toBe('');
    expect(descInput.value).toBe('');
    expect(audioInput.value).toBe('');

    // The generated section should disappear (status back to idle)
    expect(screen.queryByText(/Wygenerowany opis/i)).not.toBeInTheDocument();

    // SessionStorage cleared
    expect(sessionStorage.getItem('aa:v1:artist_form')).toBeNull();
    expect(sessionStorage.getItem('aa:v1:audio_analysis_result')).toBeNull();
    expect(sessionStorage.getItem('aa:v1:generated_description')).toBeNull();
  });
});
